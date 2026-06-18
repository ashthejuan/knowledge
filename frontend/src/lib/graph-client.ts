import { GraphData } from "@/types/graph";
import { getAuthHeaders, throwIfUnauthorized } from "@/lib/auth-fetch";
import { API_BASE } from "@/lib/config";

export async function fetchSubgraph(): Promise<GraphData> {
  const response = await fetch(`${API_BASE}/api/graph/subgraph`, {
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
