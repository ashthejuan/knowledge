from neo4j.exceptions import Neo4jError, ServiceUnavailable
from pydantic import BaseModel, Field

from fastapi import APIRouter, HTTPException, status

from app.core.security import CurrentUser
from app.db.neo4j_client import Neo4jConfigurationError
from app.services.graph_db_service import fetch_subgraph


router = APIRouter(prefix="/api/graph", tags=["graph"])


class GraphNode(BaseModel):
    id: str = Field(description="Unique node identifier for graph layout libraries")
    label: str = Field(description="Display label for the node")
    type: str = Field(description="Node category used for graph grouping")


class GraphLink(BaseModel):
    source: str = Field(description="Source node id")
    target: str = Field(description="Target node id")
    label: str = Field(description="Relationship label between source and target")


class SubgraphResponse(BaseModel):
    nodes: list[GraphNode]
    links: list[GraphLink]


@router.get("/subgraph", response_model=SubgraphResponse)
def get_subgraph(user_id: CurrentUser) -> SubgraphResponse:
    try:
        payload = fetch_subgraph(user_id=user_id, limit=100)
    except (Neo4jConfigurationError, Neo4jError, ServiceUnavailable) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Neo4j graph database is unavailable. Check NEO4J_URI, DNS, "
                "and network connectivity."
            ),
        ) from exc

    return SubgraphResponse(**payload)
