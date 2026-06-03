import logging
import time
from collections.abc import Iterable
from typing import Any

import numpy as np
from pinecone import PineconeApiException, ServiceException
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential,
)

from app.models.graph_extraction import KnowledgeGraphExtraction
from app.services.graph.state import GraphState
from app.services.llm import chat_model, embeddings, pinecone_index


SUMMARY_CHUNK_LIMIT = 10
PINECONE_UPSERT_BATCH_SIZE = 100
PINECONE_RETRY_ATTEMPTS = 3
NO_RELATED_CONTEXT_ANALYSIS = "No related documents found in the knowledge base."
CONTEXTUAL_ANALYSIS_UNAVAILABLE = (
    "Contextual analysis is unavailable because cross-referencing failed."
)

logger = logging.getLogger(__name__)


def _message_content_as_text(content: Any) -> str:
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item["text"])
        return "\n".join(parts)

    return str(content)


def _batched(items: list[dict[str, Any]], size: int) -> Iterable[list[dict[str, Any]]]:
    for start in range(0, len(items), size):
        yield items[start : start + size]


def _is_transient_pinecone_error(exception: BaseException) -> bool:
    if isinstance(exception, (ConnectionError, TimeoutError, ServiceException)):
        return True

    if isinstance(exception, PineconeApiException):
        status = getattr(exception, "status", None)
        return status == 429 or (isinstance(status, int) and status >= 500)

    return False


def _match_metadata(match: Any) -> dict[str, Any]:
    if isinstance(match, dict):
        metadata = match.get("metadata", {})
    else:
        metadata = getattr(match, "metadata", {})

    return metadata if isinstance(metadata, dict) else {}


def _usage_metadata(response: Any) -> Any:
    return getattr(response, "usage_metadata", None)


def _select_relevant_chunk_indices(
    chunk_embeddings: list[list[float]], limit: int
) -> list[int]:
    """Return indices of the ``limit`` chunks most representative of the document.

    There is no search query at summarization time, so "most relevant" is
    interpreted as "closest to the document's semantic center": we score each
    chunk by cosine similarity to the centroid of all chunk embeddings and keep
    the top ``limit``. Selected indices are returned in original document order
    so the resulting summary input stays coherent.
    """
    count = len(chunk_embeddings)
    if count <= limit:
        return list(range(count))

    matrix = np.asarray(chunk_embeddings, dtype=np.float64)
    centroid = matrix.mean(axis=0)
    centroid_norm = float(np.linalg.norm(centroid))
    chunk_norms = np.linalg.norm(matrix, axis=1)

    denominator = chunk_norms * centroid_norm
    scores = np.zeros(count, dtype=np.float64)
    nonzero = denominator > 0
    scores[nonzero] = (matrix[nonzero] @ centroid) / denominator[nonzero]

    top_indices = np.argsort(scores)[-limit:]
    return sorted(int(index) for index in top_indices)


def _require_text_chunks(state: GraphState, node_name: str) -> list[str]:
    text_chunks = state.get("text_chunks", [])
    if not text_chunks:
        raise ValueError(f"{node_name} requires 'text_chunks' with at least one chunk")

    return text_chunks


def _require_summary(state: GraphState, node_name: str) -> str:
    summary = state.get("summary", "")
    if not summary:
        raise ValueError(
            f"{node_name} requires 'summary'; ensure summarize_document ran first"
        )

    return summary


def _graph_extraction_input(state: GraphState) -> str:
    summary = state.get("summary", "")
    if summary:
        return summary

    text_chunks = _require_text_chunks(state, "extract_graph_elements")
    return "\n\n".join(text_chunks[:SUMMARY_CHUNK_LIMIT])


@retry(
    stop=stop_after_attempt(PINECONE_RETRY_ATTEMPTS),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception(_is_transient_pinecone_error),
    reraise=True,
    before_sleep=before_sleep_log(logger, logging.WARNING),
)
def _upsert_vectors(vectors: list[dict[str, Any]], namespace: str) -> None:
    # ``namespace`` is the owning user_id: Pinecone keeps each namespace fully
    # isolated, so a user can never read or overwrite another tenant's vectors.
    pinecone_index.upsert(vectors=vectors, namespace=namespace)


@retry(
    stop=stop_after_attempt(PINECONE_RETRY_ATTEMPTS),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception(_is_transient_pinecone_error),
    reraise=True,
    before_sleep=before_sleep_log(logger, logging.WARNING),
)
def _query_similar_chunks(
    summary_embedding: list[float], document_id: str, namespace: str
) -> Any:
    return pinecone_index.query(
        vector=summary_embedding,
        top_k=5,
        include_metadata=True,
        namespace=namespace,
        filter={
            "$and": [
                {"document_id": {"$ne": document_id}},
                {"type": {"$eq": "chunk"}},
            ]
        },
    )


def summarize_document(state: GraphState) -> GraphState:
    document_id = state["document_id"]
    text_chunks = _require_text_chunks(state, "summarize_document")

    try:
        embedding_started_at = time.perf_counter()
        chunk_embeddings = embeddings.embed_documents(text_chunks)
    except Exception:
        logger.exception(
            "failed to embed document chunks for summary selection",
            extra={"document_id": document_id, "chunk_count": len(text_chunks)},
        )
        raise

    logger.info(
        "embedded document chunks for summary selection",
        extra={
            "document_id": document_id,
            "chunk_count": len(text_chunks),
            "latency_seconds": round(time.perf_counter() - embedding_started_at, 3),
        },
    )

    selected_indices = _select_relevant_chunk_indices(
        chunk_embeddings, SUMMARY_CHUNK_LIMIT
    )
    chunks_for_summary = [text_chunks[index] for index in selected_indices]
    text = "\n\n".join(chunks_for_summary)

    try:
        started_at = time.perf_counter()
        response = chat_model.invoke(
            [
                (
                    "system",
                    "You are an expert analyst. Provide a comprehensive, "
                    "structured summary of the following text.",
                ),
                ("user", text),
            ]
        )
    except Exception:
        logger.exception(
            "failed to summarize document",
            extra={"document_id": document_id},
        )
        raise

    logger.info(
        "summarized document",
        extra={
            "document_id": document_id,
            "chunk_count": len(text_chunks),
            "chunks_summarized": len(chunks_for_summary),
            "latency_seconds": round(time.perf_counter() - started_at, 3),
            "usage_metadata": _usage_metadata(response),
        },
    )

    return {
        **state,
        "summary": _message_content_as_text(response.content),
        "chunk_embeddings": chunk_embeddings,
    }


def extract_graph_elements(state: GraphState) -> GraphState:
    document_id = state["document_id"]
    text = _graph_extraction_input(state)
    structured_llm = chat_model.with_structured_output(KnowledgeGraphExtraction)

    try:
        started_at = time.perf_counter()
        extracted_graph_data = structured_llm.invoke(
            [
                (
                    "system",
                    "Extract all key technical concepts, entities, and explicit "
                    "structural relationships from the following text summary. "
                    "Maintain extreme consistency with entity naming.",
                ),
                ("user", text),
            ]
        )
    except Exception:
        logger.exception(
            "failed to extract graph elements",
            extra={"document_id": document_id},
        )
        raise

    logger.info(
        "extracted graph elements",
        extra={
            "document_id": document_id,
            "entity_count": len(extracted_graph_data.entities),
            "relationship_count": len(extracted_graph_data.relationships),
            "latency_seconds": round(time.perf_counter() - started_at, 3),
        },
    )

    return {
        **state,
        "extracted_graph_data": extracted_graph_data,
    }


def embed_and_store(state: GraphState) -> GraphState:
    document_id = state["document_id"]
    user_id = state["user_id"]
    text_chunks = _require_text_chunks(state, "embed_and_store")

    vectors: list[dict[str, Any]] = []

    cached_embeddings = state.get("chunk_embeddings")
    if cached_embeddings and len(cached_embeddings) == len(text_chunks):
        chunk_embeddings = cached_embeddings
        logger.info(
            "reused cached chunk embeddings from summarize_document",
            extra={"document_id": document_id, "chunk_count": len(text_chunks)},
        )
    else:
        try:
            embedding_started_at = time.perf_counter()
            chunk_embeddings = embeddings.embed_documents(text_chunks)
        except Exception:
            logger.exception(
                "failed to embed document chunks",
                extra={"document_id": document_id, "chunk_count": len(text_chunks)},
            )
            raise

        logger.info(
            "embedded document chunks",
            extra={
                "document_id": document_id,
                "chunk_count": len(text_chunks),
                "latency_seconds": round(time.perf_counter() - embedding_started_at, 3),
            },
        )
    vectors.extend(
        {
            "id": f"{document_id}_chunk_{index}",
            "values": embedding,
            "metadata": {
                "document_id": document_id,
                "text": chunk,
                "type": "chunk",
            },
        }
        for index, (chunk, embedding) in enumerate(zip(text_chunks, chunk_embeddings))
    )

    summary = state.get("summary", "")
    if summary:
        try:
            summary_embedding_started_at = time.perf_counter()
            # Stored vectors use document/index-mode embeddings; querying uses
            # query-mode (see cross_reference). Identical for symmetric models
            # like text-embedding-3-small, but keeps retrieval correct if the
            # embedding backend is ever swapped for an asymmetric model.
            summary_embedding = embeddings.embed_documents([summary])[0]
        except Exception:
            logger.exception(
                "failed to embed document summary",
                extra={"document_id": document_id},
            )
            raise

        logger.info(
            "embedded document summary",
            extra={
                "document_id": document_id,
                "latency_seconds": round(
                    time.perf_counter() - summary_embedding_started_at, 3
                ),
            },
        )
        vectors.append(
            {
                "id": f"{document_id}_summary",
                "values": summary_embedding,
                "metadata": {
                    "document_id": document_id,
                    "text": summary,
                    "type": "summary",
                },
            }
        )

    upserted_count = 0
    try:
        for batch in _batched(vectors, PINECONE_UPSERT_BATCH_SIZE):
            upsert_started_at = time.perf_counter()
            _upsert_vectors(batch, namespace=user_id)
            upserted_count += len(batch)
            logger.info(
                "upserted Pinecone vector batch",
                extra={
                    "document_id": document_id,
                    "batch_size": len(batch),
                    "upserted_count": upserted_count,
                    "total_vectors": len(vectors),
                    "latency_seconds": round(time.perf_counter() - upsert_started_at, 3),
                },
            )
    except Exception:
        logger.exception(
            "failed to upsert Pinecone vectors; vector IDs are deterministic, "
            "so rerunning embed_and_store is idempotent",
            extra={
                "document_id": document_id,
                "upserted_count": upserted_count,
                "total_vectors": len(vectors),
            },
        )
        raise

    return state


def cross_reference(state: GraphState) -> GraphState:
    current_document_id = state["document_id"]
    user_id = state["user_id"]
    summary = _require_summary(state, "cross_reference")
    try:
        embedding_started_at = time.perf_counter()
        summary_embedding = embeddings.embed_query(summary)
        logger.info(
            "embedded summary for cross-reference",
            extra={
                "document_id": current_document_id,
                "latency_seconds": round(time.perf_counter() - embedding_started_at, 3),
            },
        )

        query_started_at = time.perf_counter()
        query_result = _query_similar_chunks(
            summary_embedding, current_document_id, namespace=user_id
        )
        logger.info(
            "queried Pinecone for cross-reference context",
            extra={
                "document_id": current_document_id,
                "latency_seconds": round(time.perf_counter() - query_started_at, 3),
            },
        )
    except Exception:
        logger.exception(
            "cross-reference retrieval failed",
            extra={"document_id": current_document_id},
        )
        return {
            **state,
            "contextual_analysis": CONTEXTUAL_ANALYSIS_UNAVAILABLE,
        }

    matches = (
        query_result.get("matches", [])
        if isinstance(query_result, dict)
        else getattr(query_result, "matches", [])
    )
    retrieved_chunks = [
        str(metadata["text"])
        for match in matches
        if (metadata := _match_metadata(match)).get("text")
    ]
    logger.info(
        "selected cross-reference chunks",
        extra={
            "document_id": current_document_id,
            "match_count": len(matches),
            "context_chunk_count": len(retrieved_chunks),
        },
    )

    if not retrieved_chunks:
        return {
            **state,
            "contextual_analysis": NO_RELATED_CONTEXT_ANALYSIS,
        }

    retrieved_context = "\n\n---\n\n".join(retrieved_chunks)

    try:
        analysis_started_at = time.perf_counter()
        response = chat_model.invoke(
            [
                (
                    "system",
                    "Analyze how this new document [Summary] relates to the user's "
                    "existing knowledge base [Retrieved Context]. Identify overlaps, "
                    "contradictions, or continuations.",
                ),
                (
                    "user",
                    f"[Summary]\n{summary}\n\n[Retrieved Context]\n{retrieved_context}",
                ),
            ]
        )
        logger.info(
            "generated cross-reference analysis",
            extra={
                "document_id": current_document_id,
                "latency_seconds": round(time.perf_counter() - analysis_started_at, 3),
                "usage_metadata": _usage_metadata(response),
            },
        )
    except Exception:
        logger.exception(
            "cross-reference analysis generation failed",
            extra={"document_id": current_document_id},
        )
        return {
            **state,
            "contextual_analysis": CONTEXTUAL_ANALYSIS_UNAVAILABLE,
        }

    return {
        **state,
        "contextual_analysis": _message_content_as_text(response.content),
    }
