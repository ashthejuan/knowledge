export interface GraphNode {
    id: string;       // Unique identifier (e.g., entity name or document ID)
    label: string;    // Display text
    type: 'Document' | 'Entity' | 'Concept' | 'Technology'; // Grouping for coloring
  }
  
  export interface GraphLink {
    source: string;   // ID of source node
    target: string;   // ID of target node
    label: string;    // The relationship predicate (e.g., "MENTIONS", "DEPENDS_ON")
  }
  
  export interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
  }