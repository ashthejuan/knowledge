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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background">
        <div className="container mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-6 lg:px-8">
          <Link href="/dashboard" className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">
              Knowledge Base
            </span>
            <span className="text-xs text-muted-foreground">
              Graph memory workspace
            </span>
          </Link>

          <nav className="flex items-center gap-1 overflow-x-auto overflow-y-hidden">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Button
                  key={item.href}
                  asChild
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn("h-9 shrink-0 px-3 text-sm font-medium")}
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
