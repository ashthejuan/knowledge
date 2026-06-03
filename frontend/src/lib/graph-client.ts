import { GraphData } from "@/types/graph";
import { getAuthHeaders, throwIfUnauthorized } from "@/lib/auth-fetch";

export async function fetchSubgraph(): Promise<GraphData> {
  const response = await fetch("http://localhost:8000/api/graph/subgraph", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeaders()),
    },
  });

  throwIfUnauthorized(response);

  if (!response.ok) {
    throw new Error("Failed to fetch graph data from Neo4j backend.");
  }

  return response.json();
}