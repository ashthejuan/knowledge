import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export async function requireAuth(callbackUrl: string) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return session;
}
