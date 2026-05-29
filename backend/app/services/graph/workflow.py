from langgraph.graph import END, START, StateGraph

from app.services.graph.nodes import cross_reference, embed_and_store, summarize_document
from app.services.graph.state import GraphState


graph = StateGraph(GraphState)

graph.add_node("summarizer", summarize_document)
graph.add_node("embedder", embed_and_store)
graph.add_node("cross_referencer", cross_reference)

graph.add_edge(START, "summarizer")
graph.add_edge("summarizer", "embedder")
graph.add_edge("embedder", "cross_referencer")
graph.add_edge("cross_referencer", END)

ingestion_pipeline = graph.compile()
