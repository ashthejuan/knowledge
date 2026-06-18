import { Message } from "@/types/chat";
import { getAuthHeaders, throwIfUnauthorized } from "@/lib/auth-fetch";
import { API_BASE } from "@/lib/config";

export async function* streamChatResponse(
  message: string,
  history: Message[]
): AsyncGenerator<string, void, unknown> {
  // Format the history to match the backend expectation
  const formattedHistory = history.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const response = await fetch(`${API_BASE}/api/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeaders()),
    },
    body: JSON.stringify({
      message,
      history: formattedHistory,
    }),
  });

  throwIfUnauthorized(response);

  if (!response.ok || !response.body) {
    throw new Error("Failed to generate streaming response from GraphRAG engine.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    
    // Yield decrypted text tokens as they land
    yield decoder.decode(value, { stream: true });
  }
}
