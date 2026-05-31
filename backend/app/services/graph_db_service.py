import logging
import re
from collections import defaultdict
from typing import Any

from app.db.neo4j_client import get_neo4j_driver
from app.models.graph_extraction import KnowledgeGraphExtraction


logger = logging.getLogger(__name__)

_RELATIONSHIP_TYPE_PATTERN = re.compile(r"[^A-Z0-9_]+")

# Uniqueness constraints also create a backing index, so MERGE on these
# properties becomes an index lookup instead of a full label scan and is
# safe against duplicates under concurrent writes (e.g. Celery workers).
_GRAPH_CONSTRAINTS = (
    "CREATE CONSTRAINT entity_name IF NOT EXISTS "
    "FOR (e:Entity) REQUIRE e.name IS UNIQUE",
    "CREATE CONSTRAINT document_id IF NOT EXISTS "
    "FOR (d:Document) REQUIRE d.id IS UNIQUE",
)


def ensure_graph_constraints() -> None:
    """Create the uniqueness constraints required for de-duplicated MERGEs.

    Idempotent: uses ``IF NOT EXISTS`` so it is safe to call on every startup.
    """
    driver = get_neo4j_driver()
    with driver.session() as session:
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
    entities: list[dict[str, str]],
    relationships_by_type: dict[str, list[dict[str, str]]],
) -> None:
    # Query 1: create or reuse the document node.
    tx.run(
        """
        MERGE (d:Document {id: $doc_id})
        """,
        doc_id=doc_id,
    )

    # Query 2: merge all extracted entities in one pass.
    if entities:
        tx.run(
            """
            UNWIND $entities AS entity
            MERGE (e:Entity {name: entity.name})
            ON CREATE SET e.type = entity.type
            ON MATCH SET e.type = coalesce(e.type, entity.type)
            """,
            entities=entities,
        )

    # Query 3: merge typed relationship edges between existing entity nodes.
    for relationship_type, relationships in relationships_by_type.items():
        tx.run(
            f"""
            UNWIND $relationships AS relationship
            MATCH (source:Entity {{name: relationship.source}})
            MATCH (target:Entity {{name: relationship.target}})
            MERGE (source)-[r:{relationship_type}]->(target)
            ON CREATE SET r.predicate = relationship.predicate
            ON MATCH SET r.predicate = coalesce(r.predicate, relationship.predicate)
            """,
            relationships=relationships,
        )

    # Query 4: explicitly connect this document to every entity it mentions.
    if entities:
        tx.run(
            """
            MATCH (d:Document {id: $doc_id})
            UNWIND $entities AS entity
            MATCH (e:Entity {name: entity.name})
            MERGE (d)-[:MENTIONS]->(e)
            """,
            doc_id=doc_id,
            entities=entities,
        )


def write_triples_to_neo4j(
    doc_id: str, extraction_data: KnowledgeGraphExtraction
) -> None:
    """Persist extracted knowledge graph triples for a document into Neo4j."""
    if not doc_id.strip():
        raise ValueError("doc_id is required to write triples to Neo4j")

    entities = _dedupe_entities(extraction_data)
    relationships_by_type = _relationships_by_type(extraction_data)

    driver = get_neo4j_driver()
    with driver.session() as session:
        session.execute_write(
            _run_write_triples_transaction,
            doc_id.strip(),
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
