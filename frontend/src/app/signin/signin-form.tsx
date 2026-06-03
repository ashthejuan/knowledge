"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useState, useTransition } from "react";

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

function ButtonLoader() {
  return (
    <span
      aria-hidden="true"
      className="mr-2 size-4 animate-spin border-2 border-white/35 border-t-white"
    />
  );
}

export function SignInForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, startTransition] = useTransition();
  const [oauthProvider, setOauthProvider] = useState<"google" | "github" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const isLoading = isSubmitting || isNavigating;

  function handleOAuthSignIn(provider: "google" | "github") {
    setError(null);
    setOauthProvider(provider);
    void signIn(provider, { callbackUrl });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError("Invalid email or password.");
        setIsSubmitting(false);
        return;
      }

      const target = resolveSignInTarget(result?.url, callbackUrl);
      startTransition(() => {
        router.push(target);
        router.refresh();
      });
    } catch {
      setError("Sign in failed. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-[#f4efe4] px-6 py-12 text-[#18221b]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(20,91,61,0.22),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(208,119,55,0.2),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.92),rgba(244,239,228,0.76))]" />
      <form
        onSubmit={handleSubmit}
        aria-busy={isLoading}
        className="relative z-10 w-full max-w-md border border-white/70 bg-white/80 p-8 shadow-2xl shadow-[#315b40]/10 backdrop-blur-xl sm:p-10"
      >
        <Link
          href="/register"
          className="mb-8 inline-flex border border-[#18221b]/15 bg-white/55 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#315b40] shadow-sm backdrop-blur"
        >
          Knowledge Base
        </Link>

        <div className="mb-10">
          <div className="mb-5 h-1.5 w-16 bg-[#315b40]" />
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#18221b]">
            Sign in
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#647067]">
            Sign in with Google, GitHub, or your email and password.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            disabled={isLoading || oauthProvider !== null}
            onClick={() => handleOAuthSignIn("google")}
            className="h-12 border-[#d6cdbd] bg-white/75 text-sm font-semibold text-[#26332a] hover:bg-white"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="mr-2 size-4">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.15v2.84C3.96 20.53 7.67 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.15A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.15 4.94l3.69-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.67 1 3.96 3.47 2.15 7.06l3.69 2.84C6.71 7.31 9.14 5.38 12 5.38z"
              />
            </svg>
            {oauthProvider === "google" ? "Opening..." : "Google"}
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={isLoading || oauthProvider !== null}
            onClick={() => handleOAuthSignIn("github")}
            className="h-12 border-[#d6cdbd] bg-[#18221b] text-sm font-semibold text-white hover:bg-[#26332a]"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="mr-2 size-4 fill-current"
            >
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.16c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18A11.1 11.1 0 0 1 12 6c.98 0 1.95.13 2.87.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
            </svg>
            {oauthProvider === "github" ? "Opening..." : "GitHub"}
          </Button>
        </div>

        <div className="my-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-[#d6cdbd]" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7a857d]">
            or
          </span>
          <div className="h-px flex-1 bg-[#d6cdbd]" />
        </div>

        <div className="flex flex-col gap-5">
          <label className="block">
            <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-[#526357]">
              Email
            </span>
            <Input
              required
              type="email"
              value={email}
              disabled={isLoading || oauthProvider !== null}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-12 border-[#d6cdbd] bg-white/80 px-4 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-[#526357]">
              Password
            </span>
            <div className="relative">
              <Input
                required
                minLength={8}
                type={showPassword ? "text" : "password"}
                value={password}
                disabled={isLoading || oauthProvider !== null}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                className="h-12 border-[#d6cdbd] bg-white/80 px-4 pr-20 text-sm"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                disabled={isLoading || oauthProvider !== null}
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-semibold text-[#315b40] transition hover:bg-[#315b40]/10 disabled:pointer-events-none disabled:opacity-50"
              >
                {showPassword ? "Hide" : "View"}
              </button>
            </div>
          </label>
        </div>

        {error ? (
          <div className="mt-6 border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={isLoading || oauthProvider !== null}
          className="mt-8 h-12 w-full bg-[#315b40] text-sm font-semibold text-white shadow-lg shadow-[#315b40]/20 hover:bg-[#254833]"
        >
          {isLoading ? (
            <>
              <ButtonLoader />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>

        <p className="mt-6 text-center text-sm text-[#647067]">
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
