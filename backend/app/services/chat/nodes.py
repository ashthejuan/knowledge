import re
from typing import Any, Dict, List

from app.db.neo4j_client import get_neo4j_driver
from app.services.chat.state import ChatState
from app.services.llm import chat_model, embeddings, pinecone_index

VECTOR_RETRIEVAL_TOP_K = 10
GRAPH_RETRIEVAL_LIMIT = 20
ENTITY_TOKEN_PATTERN = re.compile(r"\b[A-Z][A-Za-z0-9]*(?:[- ][A-Z][A-Za-z0-9]*)*\b")

REFINE_QUERY_PROMPT = (
    "Given the following conversation history and a new user query, rewrite the "
    "query into a standalone, descriptive search query that captures the user's "
    "intent without changing the meaning."
)


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


def _format_chat_history(chat_history: List[Dict[str, str]]) -> str:
    if not chat_history:
        return "No prior conversation history."

    lines: list[str] = []
    for message in chat_history:
        role = message.get("role", "unknown")
        content = message.get("content", "")
        lines.append(f"{role}: {content}")

    return "\n".join(lines)


def _match_metadata(match: Any) -> dict[str, Any]:
    if isinstance(match, dict):
        metadata = match.get("metadata", {})
    else:
        metadata = getattr(match, "metadata", {})

    return metadata if isinstance(metadata, dict) else {}


def _extract_entities(query: str) -> list[str]:
    seen: set[str] = set()
    entities: list[str] = []

    for entity in ENTITY_TOKEN_PATTERN.findall(query):
        normalized = entity.strip()
        if not normalized:
            continue

        key = normalized.casefold()
        if key in seen:
            continue

        seen.add(key)
        entities.append(normalized)

    return entities


def refine_query(state: ChatState) -> dict[str, str]:
    response = chat_model.invoke(
        [
            ("system", REFINE_QUERY_PROMPT),
            (
                "user",
                "Conversation history:\n"
                f"{_format_chat_history(state.get('chat_history', []))}\n\n"
                "New user query:\n"
                f"{state['query']}",
            ),
        ]
    )

    return {
        "refined_query": _message_content_as_text(response.content).strip(),
    }


def retrieve_vectors(state: ChatState) -> dict[str, list[str]]:
    refined_query = state["refined_query"]
    query_embedding = embeddings.embed_query(refined_query)
    query_result = pinecone_index.query(
        vector=query_embedding,
        top_k=VECTOR_RETRIEVAL_TOP_K,
        include_metadata=True,
        filter={"type": {"$eq": "chunk"}},
    )

    matches = (
        query_result.get("matches", [])
        if isinstance(query_result, dict)
        else getattr(query_result, "matches", [])
    )
    retrieved_chunks = [
        str(metadata["text"]).strip()
        for match in matches
        if (metadata := _match_metadata(match)).get("text")
    ]

    return {
        "vector_context": retrieved_chunks,
    }


def retrieve_graph(state: ChatState) -> dict[str, list[str]]:
    entities = _extract_entities(state["refined_query"])
    if not entities:
        return {"graph_context": []}

    normalized_entities = [entity.casefold() for entity in entities]
    cypher = """
    MATCH (e:Entity)
    WHERE e.name IN $entities OR toLower(e.name) IN $normalized_entities
    MATCH (e)-[r]-(adjacent)
    RETURN
        CASE
            WHEN startNode(r) = e
            THEN e.name + " " + type(r) + " " + adjacent.name
            ELSE adjacent.name + " " + type(r) + " " + e.name
        END AS relationship
    LIMIT $limit
    """

    relationships: list[str] = []
    driver = get_neo4j_driver()
    with driver.session() as session:
        result = session.run(
            cypher,
            entities=entities,
            normalized_entities=normalized_entities,
            limit=GRAPH_RETRIEVAL_LIMIT,
        )
        for record in result:
            relationship = record["relationship"]
            if relationship:
                relationships.append(str(relationship))

    return {
        "graph_context": relationships,
    }
