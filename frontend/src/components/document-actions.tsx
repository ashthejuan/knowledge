"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Ban, Trash2 } from "lucide-react";

import {
  AuthenticationRequiredError,
  getAuthHeaders,
  throwIfUnauthorized,
} from "@/lib/auth-fetch";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

const API_BASE = "http://localhost:8000";

type DocumentAction = "cancel" | "delete";

export function DocumentActions({
  documentId,
  status,
  label,
}: {
  documentId: string;
  status: string;
  label: string;
}) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<DocumentAction | null>(
    null
  );
  const canCancel = ["pending", "processing"].includes(status);

  async function runAction(action: DocumentAction) {
    const confirmed =
      action === "cancel"
        ? window.confirm(`Stop processing "${label}"?`)
        : window.confirm(
            `Delete "${label}" from SQL, MinIO, and Pinecone vectors? This cannot be undone.`
          );

    if (!confirmed) return;

    setPendingAction(action);

    try {
      const response = await fetch(
        action === "cancel"
          ? `${API_BASE}/api/ingest/documents/${documentId}/cancel`
          : `${API_BASE}/api/ingest/documents/${documentId}`,
        {
          method: action === "cancel" ? "PATCH" : "DELETE",
          headers: { ...(await getAuthHeaders()) },
        }
      );
      throwIfUnauthorized(response);

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          detail?: string;
        } | null;
        throw new Error(
          body?.detail ??
            (action === "cancel"
              ? "Could not stop document processing."
              : "Could not delete the document.")
        );
      }

      toast.success(
        action === "cancel" ? "Processing stopped" : "Document deleted"
      );
      router.refresh();
    } catch (caughtError) {
      if (caughtError instanceof AuthenticationRequiredError) {
        return;
      }

      toast.error(
        caughtError instanceof Error
          ? caughtError.message
          : "Document action failed."
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {canCancel ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pendingAction !== null}
          onClick={() => void runAction("cancel")}
        >
          {pendingAction === "cancel" ? (
            <Spinner />
          ) : (
            <Ban data-icon="inline-start" />
          )}
          Stop
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pendingAction !== null}
        onClick={() => void runAction("delete")}
      >
        {pendingAction === "delete" ? (
          <Spinner />
        ) : (
          <Trash2 data-icon="inline-start" />
        )}
        Delete
      </Button>
    </div>
  );
}
