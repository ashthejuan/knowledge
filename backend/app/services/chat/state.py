import operator
from typing import Annotated, List, Dict
from typing_extensions import TypedDict


class ChatState(TypedDict):
    query: str                        # Current user question
    chat_history: List[Dict[str, str]] # Prior turns: [{"role": "user", "content": "..."}, ...]
    # vector_context / graph_context use operator.add reducers so the vector and
    # graph retrievers can run as parallel branches: LangGraph appends each
    # branch's returned chunks instead of letting one write overwrite the other.
    vector_context: Annotated[List[str], operator.add]  # Text chunks from Pinecone
    graph_context: Annotated[List[str], operator.add]   # Relationships/Concepts from Neo4j
    refined_query: str                # Rewritten query optimized for search
    response: str                     # Final answer to stream back to the user
