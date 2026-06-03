import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth";

// NextAuth returns a single handler that services every auth verb. The App
// Router exposes it for both GET (session, callbacks) and POST (sign in/out).
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
