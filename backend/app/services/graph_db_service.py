import logging
import re
from collections import defaultdict
from typing import Any

from app.db.neo4j_client import get_neo4j_driver
from app.models.graph_extraction import KnowledgeGraphExtraction


logger = logging.getLogger(__name__)

_RELATIONSHIP_TYPE_PATTERN = re.compile(r"[^A-Z0-9_]+")

# A single-tenant deployment enforced global uniqueness on ``Entity.name``.
# Under multi-tenancy every user owns a distinct node variant for the same
# concept (e.g. "Machine Learning"), so uniqueness must be the *composite*
# (name, user_id). The legacy global constraint is dropped first because it
# would otherwise collapse two users' entities into one shared node.
_LEGACY_GRAPH_CONSTRAINTS = ("DROP CONSTRAINT entity_name IF EXISTS",)

# Uniqueness constraints also create a backing index, so MERGE on these
# properties becomes an index lookup instead of a full label scan and is
# safe against duplicates under concurrent writes (e.g. Celery workers).
_GRAPH_CONSTRAINTS = (
    "CREATE CONSTRAINT entity_name_user IF NOT EXISTS "
    "FOR (e:Entity) REQUIRE (e.name, e.user_id) IS UNIQUE",
    "CREATE CONSTRAINT document_id IF NOT EXISTS "
    "FOR (d:Document) REQUIRE d.id IS UNIQUE",
)


def ensure_graph_constraints() -> None:
    """Create the uniqueness constraints required for de-duplicated MERGEs.

    Idempotent: uses ``IF NOT EXISTS``/``IF EXISTS`` so it is safe to call on
    every startup, and migrates the legacy single-tenant constraint.
    """
    driver = get_neo4j_driver()
    with driver.session() as session:
        for statement in _LEGACY_GRAPH_CONSTRAINTS:
            session.run(statement)
        for statement in _GRAPH_CONSTRAINTS:
            session.run(statement)

    logger.info("ensured Neo4j graph constraints")


def _normalize_relationship_type(predicate: str) -> str:
    relationship_type = _RELATIONSHIP_TYPE_PATTERN.sub(
        "_", predicate.upper().strip()
    ).strip("_")

    if not relationship_type:
        return "RELATED_TO"

    if relationship_type[0].isdigit():
        return f"REL_{relationship_type}"

    return relationship_type


def _dedupe_entities(extraction_data: KnowledgeGraphExtraction) -> list[dict[str, str]]:
    entities_by_name: dict[str, dict[str, str]] = {}

    for entity in extraction_data.entities:
        name = entity.name.strip()
        entity_type = entity.type.strip()
        if not name:
            continue

        entities_by_name.setdefault(
            name,
            {
                "name": name,
                "type": entity_type,
            },
        )

    return list(entities_by_name.values())


def _relationships_by_type(
    extraction_data: KnowledgeGraphExtraction,
) -> dict[str, list[dict[str, str]]]:
    relationships: dict[str, list[dict[str, str]]] = defaultdict(list)
    seen: set[tuple[str, str, str]] = set()

    for relationship in extraction_data.relationships:
        source = relationship.source.strip()
        target = relationship.target.strip()
        predicate = relationship.predicate.strip()
        if not source or not target:
            continue

        relationship_type = _normalize_relationship_type(predicate)
        key = (source, target, relationship_type)
        if key in seen:
            continue

        seen.add(key)
        relationships[relationship_type].append(
            {
                "source": source,
                "target": target,
                "predicate": predicate or "RELATED_TO",
            }
        )

    return dict(relationships)


def _run_write_triples_transaction(
    tx: Any,
    doc_id: str,
    user_id: str,
    entities: list[dict[str, str]],
    relationships_by_type: dict[str, list[dict[str, str]]],
) -> None:
    # Every MERGE/MATCH below is bounded by ``user_id`` so nodes and edges are
    # owned by exactly one tenant; the same concept extracted by two users
    # resolves to two distinct node variants.

    # Query 1: create or reuse the document node for this user.
    tx.run(
        """
        MERGE (d:Document {id: $doc_id, user_id: $user_id})
        """,
        doc_id=doc_id,
        user_id=user_id,
    )

    # Query 2: merge all extracted entities in one pass.
    if entities:
        tx.run(
            """
            UNWIND $entities AS entity
            MERGE (e:Entity {name: entity.name, user_id: $user_id})
            ON CREATE SET e.type = entity.type
            ON MATCH SET e.type = coalesce(e.type, entity.type)
            """,
            entities=entities,
            user_id=user_id,
        )

    # Query 3: merge typed relationship edges between this user's entity nodes.
    for relationship_type, relationships in relationships_by_type.items():
        tx.run(
            f"""
            UNWIND $relationships AS relationship
            MATCH (source:Entity {{name: relationship.source, user_id: $user_id}})
            MATCH (target:Entity {{name: relationship.target, user_id: $user_id}})
            MERGE (source)-[r:{relationship_type}]->(target)
            ON CREATE SET r.predicate = relationship.predicate
            ON MATCH SET r.predicate = coalesce(r.predicate, relationship.predicate)
            """,
            relationships=relationships,
            user_id=user_id,
        )

    # Query 4: explicitly connect this document to every entity it mentions.
    if entities:
        tx.run(
            """
            MATCH (d:Document {id: $doc_id, user_id: $user_id})
            UNWIND $entities AS entity
            MATCH (e:Entity {name: entity.name, user_id: $user_id})
            MERGE (d)-[:MENTIONS]->(e)
            """,
            doc_id=doc_id,
            user_id=user_id,
            entities=entities,
        )


_DELETE_DOCUMENT_GRAPH_QUERY = """
MATCH (d:Document {id: $doc_id, user_id: $user_id})
OPTIONAL MATCH (d)-[:MENTIONS]->(e:Entity {user_id: $user_id})
WITH d, collect(DISTINCT e) AS mentionedEntities
DETACH DELETE d
WITH [entity IN mentionedEntities WHERE entity IS NOT NULL] AS mentionedEntities
UNWIND mentionedEntities AS e
WITH e
WHERE NOT EXISTS {
  MATCH (:Document {user_id: e.user_id})-[:MENTIONS]->(e)
}
DETACH DELETE e
"""


def _run_delete_document_graph_transaction(
    tx: Any, doc_id: str, user_id: str
) -> None:
    tx.run(
        _DELETE_DOCUMENT_GRAPH_QUERY,
        doc_id=doc_id,
        user_id=user_id,
    )


def delete_document_graph(doc_id: str, user_id: str) -> None:
    """Remove a document's graph node and any tenant entities it exclusively mentions.

    Idempotent: succeeds when the document node is already absent. Shared entities
    remain when another document for the same user still mentions them.
    """
    if not doc_id.strip():
        raise ValueError("doc_id is required to delete document graph from Neo4j")
    if not user_id.strip():
        raise ValueError("user_id is required to delete document graph from Neo4j")

    driver = get_neo4j_driver()
    with driver.session() as session:
        session.execute_write(
            _run_delete_document_graph_transaction,
            doc_id.strip(),
            user_id.strip(),
        )

    logger.info(
        "deleted document graph from Neo4j",
        extra={"document_id": doc_id, "user_id": user_id},
    )


def write_triples_to_neo4j(
    doc_id: str, user_id: str, extraction_data: KnowledgeGraphExtraction
) -> None:
    """Persist extracted knowledge graph triples for a document into Neo4j."""
    if not doc_id.strip():
        raise ValueError("doc_id is required to write triples to Neo4j")
    if not user_id.strip():
        raise ValueError("user_id is required to write triples to Neo4j")

    entities = _dedupe_entities(extraction_data)
    relationships_by_type = _relationships_by_type(extraction_data)

    driver = get_neo4j_driver()
    with driver.session() as session:
        session.execute_write(
            _run_write_triples_transaction,
            doc_id.strip(),
            user_id.strip(),
            entities,
            relationships_by_type,
        )

    relationship_count = sum(
        len(relationships) for relationships in relationships_by_type.values()
    )
    logger.info(
        "wrote graph triples to Neo4j",
        extra={
            "document_id": doc_id,
            "entity_count": len(entities),
            "relationship_count": relationship_count,
        },
    )


def fetch_subgraph(user_id: str, limit: int = 100) -> dict[str, list[dict[str, str]]]:
    """Return a deduplicated node/link payload for frontend graph renderers.

    The traversal is constrained so that both endpoints of every returned edge
    belong to ``user_id``; a tenant can only ever visualize their own subgraph.
    """
    driver = get_neo4j_driver()
    query = """
    MATCH (s)-[r]->(t)
    WHERE s.user_id = $user_id AND t.user_id = $user_id
    RETURN
        coalesce(s.name, s.id) AS source_id,
        coalesce(t.name, t.id) AS target_id,
        coalesce(s.name, s.id) AS source_label,
        coalesce(t.name, t.id) AS target_label,
        coalesce(s.type, head(labels(s))) AS source_type,
        coalesce(t.type, head(labels(t))) AS target_type,
        coalesce(r.predicate, type(r)) AS relationship_label
    LIMIT $limit
    """

    nodes_by_id: dict[str, dict[str, str]] = {}
    links: list[dict[str, str]] = []

    with driver.session() as session:
        result = session.run(query, user_id=user_id, limit=limit)
        for record in result:
            source_id = record["source_id"]
            target_id = record["target_id"]
            source_label = record["source_label"]
            target_label = record["target_label"]
            source_type = record["source_type"]
            target_type = record["target_type"]
            relationship_label = record["relationship_label"]

            if source_id:
                nodes_by_id.setdefault(
                    source_id,
                    {
                        "id": source_id,
                        "label": source_label or source_id,
                        "type": source_type or "Entity",
                    },
                )
            if target_id:
                nodes_by_id.setdefault(
                    target_id,
                    {
                        "id": target_id,
                        "label": target_label or target_id,
                        "type": target_type or "Entity",
                    },
                )

            if source_id and target_id:
                links.append(
                    {
                        "source": source_id,
                        "target": target_id,
                        "label": relationship_label,
                    }
                )

    return {"nodes": list(nodes_by_id.values()), "links": links}
