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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const [confirmAction, setConfirmAction] = useState<DocumentAction | null>(
    null
  );
  const canCancel = ["pending", "processing"].includes(status);
  const isDeleteConfirm = confirmAction === "delete";

  async function executeAction(action: DocumentAction) {
    setPendingAction(action);
    setConfirmAction(null);

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
        action === "cancel" ? "Processing stopped" : "Source deleted",
        {
          description:
            action === "cancel"
              ? `"${label}" is no longer being indexed.`
              : `"${label}" was removed from your knowledge base.`,
        }
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
    <>
      <div className="flex flex-wrap items-center gap-3">
        {canCancel ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pendingAction !== null}
            onClick={() => setConfirmAction("cancel")}
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
          onClick={() => setConfirmAction("delete")}
        >
          {pendingAction === "delete" ? (
            <Spinner />
          ) : (
            <Trash2 data-icon="inline-start" />
          )}
          Delete
        </Button>
      </div>

      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmAction(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isDeleteConfirm ? "Delete source?" : "Stop processing?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isDeleteConfirm ? (
                <>
                  <span className="font-medium text-foreground">
                    &ldquo;{label}&rdquo;
                  </span>{" "}
                  will be removed from the database. This cannot be
                  undone.
                </>
              ) : (
                <>
                  <span className="font-medium text-foreground">
                    &ldquo;{label}&rdquo;
                  </span>{" "}
                  will stop indexing but remain in your library.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendingAction !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant={isDeleteConfirm ? "destructive" : "default"}
              disabled={pendingAction !== null}
              onClick={() => {
                if (confirmAction) {
                  void executeAction(confirmAction);
                }
              }}
            >
              {pendingAction !== null ? (
                <Spinner />
              ) : isDeleteConfirm ? (
                "Delete"
              ) : (
                "Stop"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
