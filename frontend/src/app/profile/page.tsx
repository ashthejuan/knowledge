import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Mail,
  Upload,
  UserRound,
  XCircle,
} from "lucide-react";

import { DocumentActions } from "@/components/document-actions";
import {
  WorkspacePage,
  WorkspacePageHeader,
  WorkspaceSection,
} from "@/components/workspace-layout";
import { requireAuth } from "@/lib/require-auth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

const BACKEND_API_URL = process.env.BACKEND_API_URL ?? "http://localhost:8000";

export const metadata: Metadata = {
  title: "Profile",
  description: "View account details and uploaded knowledge sources.",
};

type DocumentListItem = {
  id: string;
  status:
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | "cancelled"
    | string;
  source_type: "pdf" | "url" | string;
  filename: string | null;
  source_url: string | null;
  created_at: string;
  updated_at: string;
};

async function getDocuments(accessToken?: string): Promise<DocumentListItem[]> {
  if (!accessToken) {
    return [];
  }

  const response = await fetch(`${BACKEND_API_URL}/api/ingest/documents`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  return (await response.json()) as DocumentListItem[];
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getDisplayName(document: DocumentListItem): string {
  return document.filename ?? document.source_url ?? "Untitled source";
}

export default async function ProfilePage() {
  const session = await requireAuth("/profile");
  const documents = await getDocuments(session.accessToken);
  const completedCount = documents.filter(
    (document) => document.status === "completed"
  ).length;

  return (
    <WorkspacePage>
      <WorkspacePageHeader
        eyebrow="Workspace identity"
        title="Profile"
        description="Review your account identity, tenant boundary, and uploaded knowledge sources."
      />

      <WorkspaceSection className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound data-icon="inline-start" />
              Account
            </CardTitle>
            <CardDescription>
              Details from the active authenticated session.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ProfileField
              icon={UserRound}
              label="Name"
              value={session.user?.name ?? "Not provided"}
            />
            <ProfileField
              icon={Mail}
              label="Email"
              value={session.user?.email ?? "Not provided"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace Summary</CardTitle>
            <CardDescription>
              Current ingestion state across your private knowledge base.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Metric label="Sources" value={documents.length} />
            <Metric label="Indexed" value={completedCount} />
            <Metric
              label="In progress"
              value={
                documents.filter((document) =>
                  ["pending", "processing"].includes(document.status)
                ).length
              }
            />
          </CardContent>
        </Card>
      </WorkspaceSection>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Uploaded Sources</CardTitle>
            <CardDescription>
              PDFs and URLs submitted to the ingestion pipeline.
            </CardDescription>
          </div>
          <Button asChild size="sm">
            <Link href="/ingest">
              <Upload data-icon="inline-start" />
              Add source
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <Empty className="min-h-56 border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileText />
                </EmptyMedia>
                <EmptyTitle>No sources uploaded yet</EmptyTitle>
                <EmptyDescription>
                  Add a PDF or URL to populate your profile library.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild variant="outline" size="sm">
                  <Link href="/ingest">Open ingest</Link>
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="max-h-[480px] overflow-auto rounded-lg border border-border">
              <table className="w-full min-w-[840px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 border-b border-border bg-muted text-left text-xs font-medium text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Uploaded</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((document) => (
                    <tr
                      key={document.id}
                      className="border-b border-border transition-colors duration-200 hover:bg-muted/50"
                    >
                      <td className="max-w-md px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <span className="truncate font-medium">
                            {getDisplayName(document)}
                          </span>
                          {document.source_url ? (
                            <a
                              href={document.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 truncate text-xs font-medium text-primary"
                            >
                              <ExternalLink data-icon="inline-start" />
                              {document.source_url}
                            </a>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {document.source_type}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={document.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(document.created_at)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(document.updated_at)}
                      </td>
                      <td className="px-4 py-3">
                        <DocumentActions
                          documentId={document.id}
                          status={document.status}
                          label={getDisplayName(document)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </WorkspacePage>
  );
}

function ProfileField({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-border bg-muted/30 p-4">
      <Icon className="mt-0.5 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={cn("truncate text-sm font-medium", mono && "font-mono")}>
          {value}
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const Icon =
    status === "completed" ? CheckCircle2 : status === "failed" ? XCircle : Clock3;

  const variant =
    status === "completed"
      ? "default"
      : status === "failed"
        ? "destructive"
        : status === "cancelled"
          ? "outline"
          : "secondary";

  return (
    <Badge variant={variant} className="capitalize">
      <Icon data-icon="inline-start" />
      {status}
    </Badge>
  );
}
