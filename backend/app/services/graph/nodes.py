from collections.abc import Iterable
from typing import Any

from app.services.graph.state import GraphState
from app.services.llm import chat_model, embeddings, pinecone_index


SUMMARY_CHUNK_LIMIT = 5
PINECONE_UPSERT_BATCH_SIZE = 100


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


def _match_metadata(match: Any) -> dict[str, Any]:
    if isinstance(match, dict):
        metadata = match.get("metadata", {})
    else:
        metadata = getattr(match, "metadata", {})

    return metadata if isinstance(metadata, dict) else {}


def summarize_document(state: GraphState) -> GraphState:
    chunks_for_summary = state["text_chunks"][:SUMMARY_CHUNK_LIMIT]
    text = "\n\n".join(chunks_for_summary)

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

    return {
        **state,
        "summary": _message_content_as_text(response.content),
    }


def embed_and_store(state: GraphState) -> GraphState:
    document_id = state["document_id"]
    text_chunks = state["text_chunks"]

    vectors: list[dict[str, Any]] = []
    if text_chunks:
        chunk_embeddings = embeddings.embed_documents(text_chunks)
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
            for index, (chunk, embedding) in enumerate(
                zip(text_chunks, chunk_embeddings)
            )
        )

    summary = state.get("summary", "")
    if summary:
        summary_embedding = embeddings.embed_documents([summary])[0]
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

    for batch in _batched(vectors, PINECONE_UPSERT_BATCH_SIZE):
        pinecone_index.upsert(vectors=batch)

    return state


def cross_reference(state: GraphState) -> GraphState:
    current_document_id = state["document_id"]
    summary = state["summary"]
    summary_embedding = embeddings.embed_query(summary)

    query_result = pinecone_index.query(
        vector=summary_embedding,
        top_k=5,
        include_metadata=True,
        filter={
            "$and": [
                {"document_id": {"$ne": current_document_id}},
                {"type": {"$eq": "chunk"}},
            ]
        },
    )

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
    retrieved_context = "\n\n---\n\n".join(retrieved_chunks)

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

    return {
        **state,
        "contextual_analysis": _message_content_as_text(response.content),
    }
