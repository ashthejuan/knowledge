from pydantic import BaseModel, Field
from typing import List

class Entity(BaseModel):
    name: str = Field(description="The unique name of the entity, proper noun, or concept (e.g., 'LangGraph', 'Machine Learning')")
    type: str = Field(description="The category of the entity (e.g., 'Framework', 'Concept', 'Technology', 'Person')")

class Relationship(BaseModel):
    source: str = Field(description="The name of the source entity")
    target: str = Field(description="The name of the target entity")
    predicate: str = Field(description="The specific action or link relating the source to the target (e.g., 'DEPENDS_ON', 'IMPLEMENTS', 'USED_BY')")

class KnowledgeGraphExtraction(BaseModel):
    entities: List[Entity]
    relationships: List[Relationship]