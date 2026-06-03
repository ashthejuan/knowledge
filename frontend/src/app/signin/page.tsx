import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { SignInForm } from "./signin-form";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your private knowledge base workspace.",
};

type SignInPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string | string[];
  }>;
};

function safeCallbackUrl(value: string | string[] | undefined): string {
  const callbackUrl = Array.isArray(value) ? value[0] : value;

  if (!callbackUrl || !callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return "/dashboard";
  }

  return callbackUrl;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  const params = searchParams ? await searchParams : undefined;

  return <SignInForm callbackUrl={safeCallbackUrl(params?.callbackUrl)} />;
}
