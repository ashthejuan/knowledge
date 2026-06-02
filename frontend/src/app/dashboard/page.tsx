import type { Metadata } from "next";
import Link from "next/link";
import { ChatCircleText, UploadSimple } from "@phosphor-icons/react/dist/ssr";

import { KnowledgeGraph } from "@/components/knowledge-graph";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Memory Dashboard",
  description:
    "Map the semantic relationship vectors connecting your documents, entities, and concepts.",
};

export default function DashboardPage() {
  return (
    <div className="container mx-auto flex flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Memory Dashboard
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Your operational hub for mapping the semantic relationship vectors
          that link documents, entities, and concepts across the knowledge
          base.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Button
          asChild
          variant="outline"
          className="h-auto flex-col items-start gap-2 border-dashed p-5 text-left"
        >
          <Link href="/ingest">
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <UploadSimple weight="duotone" data-icon="inline-start" />
              Ingest Documents
            </span>
            <span className="text-xs/relaxed font-normal text-muted-foreground">
              Drag and drop files to extract entities and grow the graph.
            </span>
          </Link>
        </Button>

        <Button
          asChild
          className="h-auto flex-col items-start gap-2 p-5 text-left"
        >
          <Link href="/chat">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <ChatCircleText weight="duotone" data-icon="inline-start" />
              Launch GraphRAG Chat
            </span>
            <span className="text-xs/relaxed font-normal text-primary-foreground/80">
              Ask grounded questions across your unified vector context.
            </span>
          </Link>
        </Button>
      </div>

      <KnowledgeGraph />
    </div>
  );
}
