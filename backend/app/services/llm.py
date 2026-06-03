import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from pinecone import Pinecone


load_dotenv(Path(__file__).resolve().parents[2] / ".env")

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL")

# Pinecone index was created with OpenAI text-embedding-3-small (1536 dims),
# so we must embed both ingested chunks and queries with the same model.
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
LLM_REQUEST_TIMEOUT_SECONDS = float(os.getenv("LLM_REQUEST_TIMEOUT_SECONDS", "60"))
LLM_MAX_RETRIES = int(os.getenv("LLM_MAX_RETRIES", "3"))
EMBEDDING_REQUEST_TIMEOUT_SECONDS = float(
    os.getenv("EMBEDDING_REQUEST_TIMEOUT_SECONDS", "60")
)
EMBEDDING_MAX_RETRIES = int(os.getenv("EMBEDDING_MAX_RETRIES", "3"))

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "knowledge-base")

if not OPENROUTER_API_KEY:
    raise RuntimeError("OPENROUTER_API_KEY is not configured")

if not OPENAI_API_KEY:
    raise RuntimeError(
        "OPENAI_API_KEY is not configured. It is required to generate "
        "text-embedding-3-small embeddings that match the Pinecone index."
    )

if not PINECONE_API_KEY:
    raise RuntimeError("PINECONE_API_KEY is not configured")


# OpenRouter exposes an OpenAI-compatible API, so we reuse LangChain's
# ChatOpenAI client and just point it at the OpenRouter base URL.
chat_model = ChatOpenAI(
    model=OPENROUTER_MODEL,
    api_key=OPENROUTER_API_KEY,
    base_url=OPENROUTER_BASE_URL,
    temperature=0.0,
    request_timeout=LLM_REQUEST_TIMEOUT_SECONDS,
    max_retries=LLM_MAX_RETRIES,
)

# Ingestion graph pipeline (summarize, structured extraction, cross-reference)
# uses OpenAI directly for reliable structured output and lower latency.
graph_chat_model = ChatOpenAI(
    model=OPENAI_MODEL,
    api_key=OPENAI_API_KEY,
    temperature=0.0,
    request_timeout=LLM_REQUEST_TIMEOUT_SECONDS,
    max_retries=LLM_MAX_RETRIES,
)

embeddings = OpenAIEmbeddings(
    model=EMBEDDING_MODEL,
    api_key=OPENAI_API_KEY,
    request_timeout=EMBEDDING_REQUEST_TIMEOUT_SECONDS,
    max_retries=EMBEDDING_MAX_RETRIES,
)

pinecone_client = Pinecone(api_key=PINECONE_API_KEY)
pinecone_index = pinecone_client.Index(PINECONE_INDEX_NAME)
