from typing import TypedDict

from typing_extensions import NotRequired


class GraphState(TypedDict):
    """Shared state passed between nodes in the LangGraph pipeline.

    Each node reads the fields it needs and writes back its results, so the
    state accumulates data as it flows from one node to the next.
    """

    document_id: str
    text_chunks: list[str]
    summary: str
    contextual_analysis: str
    # Cached chunk embeddings produced by summarize_document (used to pick the
    # most representative chunks) and reused by embed_and_store to avoid
    # embedding every chunk twice in the same pipeline run.
    chunk_embeddings: NotRequired[list[list[float]]]
