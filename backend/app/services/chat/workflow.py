from langgraph.graph import StateGraph, START, END
from app.services.chat.nodes import refine_query, retrieve_vectors, retrieve_graph, generate_answer
from app.services.chat.state import ChatState

builder = StateGraph(ChatState)

builder.add_node("refine_query", refine_query)
builder.add_node("retrieve_vectors", retrieve_vectors)
builder.add_node("retrieve_graph", retrieve_graph)
builder.add_node("generate_answer", generate_answer)

# Define Execution Path
builder.add_edge(START, "refine_query")
builder.add_edge("refine_query", "retrieve_vectors")
builder.add_edge("refine_query", "retrieve_graph") # Can execute in parallel
builder.add_edge("retrieve_vectors", "generate_answer")
builder.add_edge("retrieve_graph", "generate_answer")
builder.add_edge("generate_answer", END)

chat_rag_agent = builder.compile()