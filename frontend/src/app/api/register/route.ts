const BACKEND_API_URL = process.env.BACKEND_API_URL ?? "http://localhost:8000";

type RegisterPayload = {
  email?: unknown;
  password?: unknown;
  name?: unknown;
};

async function readRegisterPayload(request: Request): Promise<RegisterPayload | null> {
  try {
    return (await request.json()) as RegisterPayload;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const payload = await readRegisterPayload(request);
  if (!payload) {
    return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(`${BACKEND_API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    return Response.json(
      { detail: "Registration service is unavailable" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = { detail: "Registration failed" };
  }

  return Response.json(body, { status: response.status });
}
