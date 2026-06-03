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
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 border-b bg-background/92 backdrop-blur">
        <div className="container mx-auto flex min-h-16 flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <Link href="/dashboard" className="flex w-fit flex-col">
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Knowledge Base
            </span>
            <span className="text-xs text-muted-foreground">
              Graph memory workspace
            </span>
          </Link>

          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Button
                  key={item.href}
                  asChild
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn("shrink-0", isActive && "font-semibold")}
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

          <div className="flex items-center gap-2">
            <span className="hidden max-w-48 truncate text-xs text-muted-foreground lg:inline">
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

      <main className="flex-1">{children}</main>
    </div>
  );
}
