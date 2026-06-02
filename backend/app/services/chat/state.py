from typing import List, Dict
from typing_extensions import TypedDict


class ChatState(TypedDict):
    query: str                        # Current user question
    chat_history: List[Dict[str, str]] # Prior turns: [{"role": "user", "content": "..."}, ...]
    vector_context: List[str]         # Text chunks retrieved from Pinecone
    graph_context: List[str]          # Relationships/Concepts retrieved from Neo4j
    refined_query: str                # Rewritten query optimized for search
    response: str                     # Final answer to stream back to the user
