import type { Metadata } from "next";

import { IngestWizard } from "@/components/ingest-wizard";

export const metadata: Metadata = {
  title: "Knowledge Capture",
  description:
    "Upload academic files or parse high-density URLs into your neural graph index.",
};

export default function IngestPage() {
  return (
    <div className="container mx-auto py-10 px-4 min-h-screen">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Knowledge Capture
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Upload academic files or parse high-density URLs into your neural
          graph index.
        </p>
      </header>

      <IngestWizard />
    </div>
  );
}
