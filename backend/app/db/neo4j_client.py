import os
from pathlib import Path

from dotenv import load_dotenv
from neo4j import GraphDatabase

_driver = None


load_dotenv(Path(__file__).resolve().parents[2] / ".env")


class Neo4jConfigurationError(RuntimeError):
    """Raised when the Neo4j client cannot be configured from the environment."""


def _required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise Neo4jConfigurationError(f"{name} is not configured")
    return value


def get_neo4j_driver():
    global _driver
    if _driver is None:
        uri = _required_env("NEO4J_URI")
        user = _required_env("NEO4J_USER")
        password = _required_env("NEO4J_PASSWORD")

        _driver = GraphDatabase.driver(
            uri,
            auth=(user, password),
            connection_timeout=5,
        )
    return _driver