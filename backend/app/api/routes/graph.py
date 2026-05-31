from pydantic import BaseModel, Field

from fastapi import APIRouter

from app.services.graph_db_service import fetch_subgraph


router = APIRouter(prefix="/api/graph", tags=["graph"])


class GraphNode(BaseModel):
    id: str = Field(description="Unique node identifier for graph layout libraries")
    name: str = Field(description="Display label for the node")


class GraphLink(BaseModel):
    source: str = Field(description="Source node id")
    target: str = Field(description="Target node id")
    type: str = Field(description="Relationship type between source and target")


class SubgraphResponse(BaseModel):
    nodes: list[GraphNode]
    links: list[GraphLink]


@router.get("/subgraph", response_model=SubgraphResponse)
def get_subgraph() -> SubgraphResponse:
    payload = fetch_subgraph(limit=100)
    return SubgraphResponse(**payload)
