import { getSession } from "next-auth/react";

export class AuthenticationRequiredError extends Error {
  constructor(message = "Sign in is required.") {
    super(message);
    this.name = "AuthenticationRequiredError";
  }
}

function buildSignInUrl(): string {
  const callbackUrl = `${window.location.pathname}${window.location.search}`;
  const signInUrl = new URL("/signin", window.location.origin);
  signInUrl.searchParams.set("callbackUrl", callbackUrl);

  return signInUrl.toString();
}

export function redirectToSignIn(): never {
  if (typeof window !== "undefined") {
    window.location.assign(buildSignInUrl());
  }

  throw new AuthenticationRequiredError();
}

/**
 * Build the `Authorization` header for outbound requests to the FastAPI
 * backend by pulling the backend access token off the active NextAuth session.
 *
 * Redirects to sign-in when there is no authenticated session so callers do
 * not accidentally issue anonymous requests to protected backend endpoints.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await getSession();
  const token = session?.accessToken;

  if (!token) {
    redirectToSignIn();
  }

  return { Authorization: `Bearer ${token}` };
}

export function throwIfUnauthorized(response: Response): void {
  if (response.status === 401) {
    redirectToSignIn();
  }
}
