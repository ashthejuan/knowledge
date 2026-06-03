import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    // HS256 JWT (signed with NEXTAUTH_SECRET) for the FastAPI backend.
    accessToken?: string;
    user?: {
      id?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
  }
}
