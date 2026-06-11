import type { Metadata } from "next";
import Link from "next/link";
import { ChatCircleText, UploadSimple } from "@phosphor-icons/react/dist/ssr";

import { KnowledgeGraph } from "@/components/knowledge-graph";
import {
  WorkspacePage,
  WorkspacePageHeader,
  WorkspaceSection,
} from "@/components/workspace-layout";
import { Button } from "@/components/ui/button";
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
          <Button asChild variant="outline" className="h-auto p-0">
            <Link href="/ingest" className="flex w-full flex-col items-start gap-2 p-6 text-left">
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <UploadSimple weight="duotone" data-icon="inline-start" />
                Ingest Documents
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                Drag and drop files to extract entities and grow the graph.
              </span>
            </Link>
          </Button>

          <Button asChild className="h-auto p-0">
            <Link href="/chat" className="flex w-full flex-col items-start gap-2 p-6 text-left">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <ChatCircleText weight="duotone" data-icon="inline-start" />
                Launch GraphRAG Chat
              </span>
              <span className="text-xs font-normal text-primary-foreground/80">
                Ask grounded questions across your unified vector context.
              </span>
            </Link>
          </Button>
        </div>

        <KnowledgeGraph />
      </WorkspaceSection>
    </WorkspacePage>
  );
}
