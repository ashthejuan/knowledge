from typing import Any, Dict, List

from app.services.chat.state import ChatState
from app.services.llm import chat_model

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
