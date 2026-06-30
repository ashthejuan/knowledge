"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, TriangleAlert } from "lucide-react";

import {
  AuthenticationRequiredError,
  getAuthHeaders,
  throwIfUnauthorized,
} from "@/lib/auth-fetch";
import { API_BASE } from "@/lib/config";
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

export function AccountDeletionActions() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function beginDelete() {
    toast.warning("Deleting your account is permanent", {
      description:
        "This will remove your profile, sources, files, vectors, and graph data.",
    });
    setConfirmOpen(true);
  }

  async function deleteAccount() {
    setIsDeleting(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/account`, {
        method: "DELETE",
        headers: { ...(await getAuthHeaders()) },
      });
      throwIfUnauthorized(response);

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          detail?: string;
        } | null;
        throw new Error(body?.detail ?? "Could not delete your account.");
      }

      toast.success("Account deleted", {
        description: "Your workspace data has been removed.",
      });
      await signOut({ callbackUrl: "/signin" });
    } catch (caughtError) {
      if (caughtError instanceof AuthenticationRequiredError) {
        return;
      }

      toast.error(
        caughtError instanceof Error
          ? caughtError.message
          : "Account deletion failed."
      );
    } finally {
      setIsDeleting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={isDeleting}
        onClick={beginDelete}
      >
        {isDeleting ? <Spinner /> : <Trash2 data-icon="inline-start" />}
        Delete account
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlert className="text-destructive" />
              Delete this account?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your account information, uploaded files,
              saved links, RAG vectors, and knowledge graph nodes. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void deleteAccount();
              }}
            >
              {isDeleting ? <Spinner /> : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
