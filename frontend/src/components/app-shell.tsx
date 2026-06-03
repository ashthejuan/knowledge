"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Upload,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ingest", label: "Ingest", icon: Upload },
  { href: "/chat", label: "Chat", icon: MessageSquareText },
  { href: "/profile", label: "Profile", icon: UserRound },
];

const AUTH_ROUTES = new Set(["/signin", "/register"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const hideChrome = AUTH_ROUTES.has(pathname) || pathname === "/";

  if (hideChrome) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#f4efe4] text-[#18221b]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(20,91,61,0.22),transparent_27%),radial-gradient(circle_at_86%_12%,rgba(208,119,55,0.18),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.9),rgba(244,239,228,0.76))]" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 bg-[#d07737]/10 blur-3xl" />
      <header className="sticky top-0 z-20 border-b border-white/70 bg-white/62 shadow-sm shadow-[#315b40]/5 backdrop-blur-xl">
        <div className="container mx-auto flex min-h-20 flex-col gap-4 px-6 py-4 sm:px-8 md:flex-row md:items-center md:justify-between md:py-5 lg:px-10">
          <Link
            href="/dashboard"
            className="flex w-fit flex-col border border-[#18221b]/15 bg-white/55 px-5 py-3 shadow-sm backdrop-blur"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#315b40]">
              Knowledge Base
            </span>
            <span className="text-[0.7rem] text-[#647067]">
              Graph memory workspace
            </span>
          </Link>

          <nav className="flex items-center gap-2 overflow-x-auto overflow-y-hidden">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Button
                  key={item.href}
                  asChild
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-10 shrink-0 px-4 text-xs uppercase tracking-[0.14em]",
                    isActive && "border-[#315b40]/20 bg-white/75 text-[#18221b]"
                  )}
                >
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon data-icon="inline-start" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden max-w-48 truncate text-xs text-[#647067] lg:inline">
              {session?.user?.email ?? session?.user?.name}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void signOut({ callbackUrl: "/signin" })}
            >
              <LogOut data-icon="inline-start" />
              Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1">{children}</main>
    </div>
  );
}
