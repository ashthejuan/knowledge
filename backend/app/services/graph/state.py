from typing import TypedDict


class GraphState(TypedDict):
    """Shared state passed between nodes in the LangGraph pipeline.

    Each node reads the fields it needs and writes back its results, so the
    state accumulates data as it flows from one node to the next.
    """

    document_id: str
    text_chunks: list[str]
    summary: str
    contextual_analysis: str
