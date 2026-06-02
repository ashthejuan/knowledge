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

const API_BASE = "http://localhost:8000";
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

  // Long-poll the tracking endpoint while a document is mid-flight. The effect
  // is keyed to both the active id and the latest status so it tears down its
  // timer the moment the pipeline reaches a terminal state.
  useEffect(() => {
    if (!activeDocId) return;
    if (pipelineStatus === "completed" || pipelineStatus === "failed") return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/ingest/status/${activeDocId}`
        );
        if (!response.ok) return;

        const data: StatusResponse = await response.json();
        setPipelineStatus(data.status);
      } catch {
        // Transient polling failures are ignored; the next tick retries.
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [activeDocId, pipelineStatus]);

  // Surface an accessible snackbar exactly once per terminal transition.
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
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      setActiveDocId(data.document_id);
    } catch {
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      if (!response.ok) throw new Error("Submission failed");

      const data = await response.json();
      setActiveDocId(data.document_id);
      setUrlInput("");
    } catch {
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

      <CardContent className="flex flex-col gap-4">
        <div
          role="tablist"
          aria-label="Ingestion source type"
          className="grid grid-cols-2 gap-2 rounded-md bg-secondary/40 p-1"
        >
          <Button
            role="tab"
            aria-selected={activeTab === "pdf"}
            variant={activeTab === "pdf" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("pdf")}
          >
            <FileText weight="duotone" data-icon="inline-start" />
            PDF Upload
          </Button>
          <Button
            role="tab"
            aria-selected={activeTab === "url"}
            variant={activeTab === "url" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("url")}
          >
            <LinkSimple weight="duotone" data-icon="inline-start" />
            Article URL
          </Button>
        </div>

        {activeTab === "pdf" ? (
          <div
            {...getRootProps()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input px-6 py-12 text-center transition-colors",
              isDragActive && "border-ring bg-input/30",
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
            <div className="flex items-center gap-2">
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

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-3">
      <StatusIcon status={status} />
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium text-foreground">{copy.title}</p>
        <p className="text-xs text-muted-foreground">{copy.description}</p>
        {docId && (
          <p className="font-mono text-[0.625rem] text-muted-foreground">
            {docId}
          </p>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: Exclude<PipelineStatus, "idle"> }) {
  switch (status) {
    case "pending":
      return <Spinner className="mt-0.5 size-5 text-amber-500" />;
    case "processing":
      return <Spinner className="mt-0.5 size-5 text-primary" />;
    case "completed":
      return (
        <CheckCircle weight="fill" className="mt-0.5 size-5 text-emerald-500" />
      );
    case "failed":
      return (
        <WarningCircle
          weight="fill"
          className="mt-0.5 size-5 text-destructive"
        />
      );
  }
}
