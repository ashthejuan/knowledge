import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ChatCircleText, UploadSimple } from "@phosphor-icons/react/dist/ssr";

import { KnowledgeGraph } from "@/components/knowledge-graph";
import {
  WorkspacePage,
  WorkspacePageHeader,
  WorkspaceSection,
} from "@/components/workspace-layout";
import { cn } from "@/lib/utils";
import { requireAuth } from "@/lib/require-auth";

export const metadata: Metadata = {
  title: "Memory Dashboard",
  description:
    "Map the semantic relationship vectors connecting your documents, entities, and concepts.",
};

export default async function DashboardPage() {
  await requireAuth("/dashboard");

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        eyebrow="Private graph workspace"
        title="Memory Dashboard"
        description="Your operational hub for mapping the semantic relationship vectors that link documents, entities, and concepts across the knowledge base."
      />

      <WorkspaceSection>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <WorkspaceLinkCard
            href="/ingest"
            icon={<UploadSimple weight="duotone" className="size-4 text-primary" />}
            title="Ingest Documents"
            description="Drag and drop files or submit URLs to extract entities and grow the graph."
            accent="border-border bg-card text-card-foreground"
            actionLabel="Open ingest"
          />

          <WorkspaceLinkCard
            href="/chat"
            icon={<ChatCircleText weight="duotone" className="size-4 text-primary" />}
            title="Launch GraphRAG Chat"
            description="Ask grounded questions across your unified vector context and graph assets."
            accent="border-border bg-card text-card-foreground"
            actionLabel="Open chat"
          />
        </div>

        <KnowledgeGraph />
      </WorkspaceSection>
    </WorkspacePage>
  );
}

function WorkspaceLinkCard({
  href,
  icon,
  title,
  description,
  actionLabel,
  accent,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-full flex-col justify-between rounded-lg border p-6 text-left shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        accent
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
          {icon}
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold tracking-[-0.01em] text-foreground">
            {title}
          </h2>
          <p className="max-w-[34ch] text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 text-xs font-medium text-foreground/80">
        <span>{actionLabel}</span>
        <ArrowRight className="size-3.5" />
      </div>
    </Link>
  );
}
