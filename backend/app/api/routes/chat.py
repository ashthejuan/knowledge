from collections.abc import Iterator
from typing import Any

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import AliasChoices, BaseModel, ConfigDict, Field, field_validator


router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatStreamRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    message: str = Field(
        min_length=1,
        validation_alias=AliasChoices("message", "current_message", "query"),
        description="Current user message to answer",
    )
    history: list[ChatMessage] = Field(
        default_factory=list,
        validation_alias=AliasChoices("history", "chat_history"),
        description="Prior conversation turns",
    )

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message must not be empty")
        return value


def _content_as_text(content: Any) -> str:
    if isinstance(content, str):
        return content

    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item["text"])
        return "".join(parts)

    return str(content)


def _stream_generated_tokens(payload: ChatStreamRequest, chat_rag_agent: Any) -> Iterator[str]:
    graph_input = {
        "query": payload.message,
        "chat_history": [message.model_dump() for message in payload.history],
        "vector_context": [],
        "graph_context": [],
    }

    for chunk, metadata in chat_rag_agent.stream(graph_input, stream_mode="messages"):
        # Only forward tokens emitted by the final answer node.
        if metadata.get("langgraph_node") != "generate_answer":
            continue

        text = _content_as_text(getattr(chunk, "content", chunk))
        if text:
            yield text


@router.post("/stream")
def stream_chat(payload: ChatStreamRequest) -> StreamingResponse:
    from app.services.chat.workflow import chat_rag_agent

    return StreamingResponse(
        _stream_generated_tokens(payload, chat_rag_agent),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
