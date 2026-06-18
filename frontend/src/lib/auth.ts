import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { SignJWT } from "jose";

import { API_BASE } from "@/lib/config";

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

type BackendUser = {
  id: string;
  email: string;
  name?: string | null;
};

type BackendLoginResponse = BackendUser & {
  access_token: string;
};

type NextAuthLogMetadata =
  | Error
  | {
      error?: Error;
      message?: string;
      [key: string]: unknown;
    };

function getAuthLogMessage(metadata: NextAuthLogMetadata): string {
  if (metadata instanceof Error) {
    return metadata.message;
  }

  if (metadata.error instanceof Error) {
    return metadata.error.message;
  }

  return typeof metadata.message === "string" ? metadata.message : "";
}

function isStaleSessionCookieError(
  code: string,
  metadata: NextAuthLogMetadata
): boolean {
  return (
    code === "JWT_SESSION_ERROR" &&
    getAuthLogMessage(metadata).includes("decryption operation failed")
  );
}

function requireNextAuthSecret(): string {
  if (NEXTAUTH_SECRET) {
    return NEXTAUTH_SECRET;
  }

  throw new Error(
    "NEXTAUTH_SECRET is not configured. It signs both the NextAuth session " +
      "and the backend access token, so it must be shared with the FastAPI API."
  );
}

// The FastAPI backend verifies bearer tokens with PyJWT using HS256 and
// the shared NEXTAUTH_SECRET. We mint a matching token here that carries the
// user's id as the `sub` claim — the single tenant boundary for every store.
async function mintBackendAccessToken(subject: string): Promise<string> {
  const backendSigningKey = new TextEncoder().encode(requireNextAuthSecret());

  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(backendSigningKey);
}

async function authorizeCredentials(
  email: string,
  password: string
): Promise<BackendLoginResponse | null> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as BackendLoginResponse;
  } catch {
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  secret: NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
  },
  logger: {
    error(code, metadata) {
      if (isStaleSessionCookieError(code, metadata)) {
        return;
      }

      console.error(
        `[next-auth][error][${code}]`,
        `\nhttps://next-auth.js.org/errors#${code.toLowerCase()}`,
        getAuthLogMessage(metadata),
        metadata
      );
    },
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    }),
    // Basic fallback so the platform stays usable without an OAuth provider.
    // This is intentionally minimal; wire it to a real user store before
    // production use.
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim();
        const password = credentials?.password;
        if (!email || !password) {
          return null;
        }

        const user = await authorizeCredentials(email, password);
        if (!user) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          accessToken: user.access_token,
        };
      },
    }),
  ],
  callbacks: {
    // Persist the canonical user id onto the token's `sub` claim on sign-in.
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      if (user?.accessToken) {
        token.accessToken = user.accessToken;
      } else if (token.sub && !token.accessToken) {
        token.accessToken = await mintBackendAccessToken(token.sub);
      }
      return token;
    },
    // Surface the user id and a backend-verifiable access token on the session
    // so client fetchers can attach `Authorization: Bearer <token>`.
    async session({ session, token }) {
      if (token.sub) {
        session.user = { ...session.user, id: token.sub };
      }
      if (token.accessToken) {
        session.accessToken = token.accessToken;
      }
      return session;
    },
  },
};
