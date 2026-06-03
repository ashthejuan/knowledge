import type { Metadata } from "next";

import { IngestWizard } from "@/components/ingest-wizard";
import {
  WorkspacePage,
  WorkspacePageHeader,
} from "@/components/workspace-layout";
import { requireAuth } from "@/lib/require-auth";

export const metadata: Metadata = {
  title: "Knowledge Capture",
  description:
    "Upload academic files or parse high-density URLs into your neural graph index.",
};

export default async function IngestPage() {
  await requireAuth("/ingest");

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        eyebrow="Source intake"
        title="Knowledge Capture"
        description="Upload academic files or parse high-density URLs into your neural graph index."
      />

      <IngestWizard />
    </WorkspacePage>
  );
}
