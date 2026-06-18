from neo4j import GraphDatabase

from app.core.config import get_required_env

_driver = None


class Neo4jConfigurationError(RuntimeError):
    """Raised when the Neo4j client cannot be configured from the environment."""


def _required_env(name: str) -> str:
    try:
        return get_required_env(name)
    except RuntimeError as exc:
        raise Neo4jConfigurationError(str(exc)) from exc


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
