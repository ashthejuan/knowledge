"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  CheckCircle,
  CloudArrowUp,
  FileText,
  LinkSimple,
  WarningCircle,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import {
  AuthenticationRequiredError,
  getAuthHeaders,
  throwIfUnauthorized,
} from "@/lib/auth-fetch";
import { API_BASE } from "@/lib/config";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const POLL_INTERVAL_MS = 2000;

type IngestTab = "pdf" | "url";
type PipelineStatus =
  | "idle"
  | "pending"
  | "processing"
  | "completed"
  | "failed";

interface StatusResponse {
  id: string;
  status: Exclude<PipelineStatus, "idle">;
  source_type: "pdf" | "url";
  filename: string | null;
}

const STATUS_COPY: Record<
  Exclude<PipelineStatus, "idle">,
  { title: string; description: string }
> = {
  pending: {
    title: "Queued for processing",
    description: "Your source is in transit to the worker cluster.",
  },
  processing: {
    title: "Agents reasoning",
    description: "Extracting entities and weaving them into your graph index.",
  },
  completed: {
    title: "Vector indexing complete",
    description: "This source is now searchable across your knowledge base.",
  },
  failed: {
    title: "Ingestion interrupted",
    description: "Something went wrong while processing this source.",
  },
};

export function IngestWizard() {
  const [activeTab, setActiveTab] = useState<IngestTab>("pdf");
  const [urlInput, setUrlInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>("idle");

  useEffect(() => {
    if (!activeDocId) return;
    if (pipelineStatus === "completed" || pipelineStatus === "failed") return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/ingest/status/${activeDocId}`,
          { headers: { ...(await getAuthHeaders()) } }
        );
        throwIfUnauthorized(response);
        if (!response.ok) return;

        const data: StatusResponse = await response.json();
        setPipelineStatus(data.status);
      } catch {
        // Transient polling failures are ignored; the next tick retries.
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [activeDocId, pipelineStatus]);

  useEffect(() => {
    if (pipelineStatus === "completed") {
      toast.success(STATUS_COPY.completed.title, {
        description: STATUS_COPY.completed.description,
      });
    } else if (pipelineStatus === "failed") {
      toast.error(STATUS_COPY.failed.title, {
        description: STATUS_COPY.failed.description,
      });
    }
  }, [pipelineStatus]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsSubmitting(true);
    setActiveDocId(null);
    setPipelineStatus("pending");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE}/api/ingest/pdf`, {
        method: "POST",
        headers: { ...(await getAuthHeaders()) },
        body: formData,
      });
      throwIfUnauthorized(response);
      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      setActiveDocId(data.document_id);
    } catch (caughtError) {
      if (caughtError instanceof AuthenticationRequiredError) {
        return;
      }
      setPipelineStatus("failed");
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    multiple: false,
    disabled: isSubmitting,
  });

  async function handleUrlSubmit(event: React.FormEvent) {
    event.preventDefault();

    const trimmed = urlInput.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setActiveDocId(null);
    setPipelineStatus("pending");

    try {
      const response = await fetch(`${API_BASE}/api/ingest/url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({ url: trimmed }),
      });
      throwIfUnauthorized(response);
      if (!response.ok) throw new Error("Submission failed");

      const data = await response.json();
      setActiveDocId(data.document_id);
      setUrlInput("");
    } catch (caughtError) {
      if (caughtError instanceof AuthenticationRequiredError) {
        return;
      }
      setPipelineStatus("failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Source</CardTitle>
        <CardDescription>
          Choose an intake channel and hand it off to the ingestion pipeline.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <ToggleGroup
          type="single"
          value={activeTab}
          onValueChange={(value) => {
            if (value) setActiveTab(value as IngestTab);
          }}
          variant="outline"
          className="grid w-full grid-cols-2"
          aria-label="Ingestion source type"
        >
          <ToggleGroupItem value="pdf" className="h-9 flex-1">
            <FileText weight="duotone" data-icon="inline-start" />
            PDF Upload
          </ToggleGroupItem>
          <ToggleGroupItem value="url" className="h-9 flex-1">
            <LinkSimple weight="duotone" data-icon="inline-start" />
            Article URL
          </ToggleGroupItem>
        </ToggleGroup>

        {activeTab === "pdf" ? (
          <div
            {...getRootProps()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-8 py-16 text-center transition-colors duration-200",
              isDragActive && "border-primary bg-primary/5",
              isSubmitting && "pointer-events-none opacity-50"
            )}
          >
            <input {...getInputProps()} aria-label="PDF file upload" />
            <CloudArrowUp
              weight="duotone"
              className="size-8 text-muted-foreground"
            />
            <p className="text-sm font-medium text-foreground">
              {isDragActive ? "Drop the PDF here" : "Drag & drop a PDF"}
            </p>
            <p className="text-xs text-muted-foreground">
              or click to browse — single PDF documents only.
            </p>
          </div>
        ) : (
          <form onSubmit={handleUrlSubmit} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Input
                type="url"
                value={urlInput}
                onChange={(event) => setUrlInput(event.target.value)}
                placeholder="https://example.com/article"
                autoComplete="off"
                disabled={isSubmitting}
                aria-label="Article URL"
                required
              />
              <Button type="submit" disabled={isSubmitting || !urlInput.trim()}>
                {isSubmitting ? (
                  <Spinner />
                ) : (
                  <LinkSimple weight="bold" data-icon="inline-start" />
                )}
                Parse
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Submit a high-density article URL to distill into your neural
              graph index.
            </p>
          </form>
        )}

        {pipelineStatus !== "idle" && (
          <PipelineMonitor status={pipelineStatus} docId={activeDocId} />
        )}
      </CardContent>
    </Card>
  );
}

function PipelineMonitor({
  status,
  docId,
}: {
  status: Exclude<PipelineStatus, "idle">;
  docId: string | null;
}) {
  const copy = STATUS_COPY[status];
  const isFailed = status === "failed";
  const isCompleted = status === "completed";

  return (
    <Alert
      variant={isFailed ? "destructive" : "default"}
      className={cn(
        isCompleted && "border-success/30 bg-success/5 text-foreground"
      )}
    >
      <StatusIcon status={status} />
      <AlertTitle>{copy.title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-1">
        <span>{copy.description}</span>
        {docId && (
          <span className="font-mono text-[0.625rem] text-muted-foreground">
            {docId}
          </span>
        )}
      </AlertDescription>
    </Alert>
  );
}

function StatusIcon({ status }: { status: Exclude<PipelineStatus, "idle"> }) {
  switch (status) {
    case "pending":
      return <Spinner className="text-warning" />;
    case "processing":
      return <Spinner className="text-primary" />;
    case "completed":
      return <CheckCircle weight="fill" className="text-success" />;
    case "failed":
      return <WarningCircle weight="fill" />;
  }
}
