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
import { requireAuth } from "@/lib/require-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <div className="container mx-auto flex flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Profile
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Review your account identity, tenant boundary, and uploaded knowledge
          sources.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[0.8fr_1.2fr]">
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
            <ProfileField
              icon={FileText}
              label="User ID"
              value={session.user?.id ?? "Unavailable"}
              mono
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
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
      </section>

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
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
              <FileText className="text-muted-foreground" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">No sources uploaded yet</p>
                <p className="text-xs text-muted-foreground">
                  Add a PDF or URL to populate your profile library.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/ingest">Open ingest</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[840px] border-collapse text-sm">
                <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Uploaded</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((document) => (
                    <tr key={document.id} className="border-t">
                      <td className="max-w-md px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="truncate font-medium">
                            {getDisplayName(document)}
                          </span>
                          <span className="truncate font-mono text-xs text-muted-foreground">
                            {document.id}
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
                        <StatusPill status={document.status} />
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
    </div>
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
    <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
      <Icon className="mt-0.5 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          {label}
        </p>
        <p className={cn("truncate text-sm font-medium", mono && "font-mono")}>
          {value}
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/30 p-4">
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const Icon =
    status === "completed" ? CheckCircle2 : status === "failed" ? XCircle : Clock3;

  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs font-medium capitalize">
      <Icon
        className={cn(
          status === "completed" && "text-primary",
          status === "failed" && "text-destructive",
          status === "cancelled" && "text-muted-foreground",
          !["completed", "failed"].includes(status) && "text-muted-foreground"
        )}
      />
      {status}
    </span>
  );
}
