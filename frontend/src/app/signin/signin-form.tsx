"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function resolveSignInTarget(url: string | null | undefined, fallback: string): string {
  if (!url) {
    return fallback;
  }

  try {
    const parsed = new URL(url);
    if (parsed.origin === window.location.origin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    if (url.startsWith("/") && !url.startsWith("//")) {
      return url;
    }
  }

  return fallback;
}

export function SignInForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push(resolveSignInTarget(result?.url, callbackUrl));
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-[#f4efe4] px-6 py-12 text-[#18221b]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(20,91,61,0.22),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(208,119,55,0.2),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.92),rgba(244,239,228,0.76))]" />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-2xl shadow-[#315b40]/10 backdrop-blur-xl sm:p-8"
      >
        <Link
          href="/register"
          className="mb-8 inline-flex rounded-full border border-[#18221b]/15 bg-white/55 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#315b40] shadow-sm backdrop-blur"
        >
          Knowledge Base
        </Link>

        <div className="mb-8">
          <div className="mb-4 h-1.5 w-16 rounded-full bg-[#315b40]" />
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#18221b]">
            Sign in
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#647067]">
            Continue to your private graph workspace.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#526357]">
              Email
            </span>
            <Input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-12 rounded-xl border-[#d6cdbd] bg-white/80 px-4 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#526357]">
              Password
            </span>
            <Input
              required
              minLength={8}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              className="h-12 rounded-xl border-[#d6cdbd] bg-white/80 px-4 text-sm"
            />
          </label>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 h-12 w-full rounded-xl bg-[#315b40] text-sm font-semibold text-white shadow-lg shadow-[#315b40]/20 hover:bg-[#254833]"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>

        <p className="mt-5 text-center text-sm text-[#647067]">
          Need an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-[#315b40] underline-offset-4 hover:underline"
          >
            Register
          </Link>
        </p>
      </form>
    </main>
  );
}
