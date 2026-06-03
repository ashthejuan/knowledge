from langgraph.graph import END, START, StateGraph

from app.services.graph.nodes import (
    cross_reference,
    embed_and_store,
    extract_graph_elements,
    persist_graph_elements,
    summarize_document,
)
from app.services.graph.state import GraphState


graph = StateGraph(GraphState)

graph.add_node("summarizer", summarize_document)
graph.add_node("embedder", embed_and_store)
graph.add_node("graph_builder", extract_graph_elements)
graph.add_node("graph_persister", persist_graph_elements)
graph.add_node("cross_referencer", cross_reference)

graph.add_edge(START, "summarizer")
graph.add_edge("summarizer", "embedder")
graph.add_edge("embedder", "graph_builder")
graph.add_edge("graph_builder", "graph_persister")
graph.add_edge("graph_persister", "cross_referencer")
graph.add_edge("cross_referencer", END)

ingestion_pipeline = graph.compile()
