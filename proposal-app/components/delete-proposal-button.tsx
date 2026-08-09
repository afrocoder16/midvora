"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProposalStatus } from "@/lib/types";

// Permanently deletes a proposal from the admin list. Confirmation is required
// because there is no undo — the row, its signature, and its uploaded PDF/logo
// all go away.
export function DeleteProposalButton({
  proposalId,
  clientName,
  status,
}: {
  proposalId: string;
  clientName: string;
  status: ProposalStatus;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/proposals/${proposalId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? "Could not delete proposal.");
        setDeleting(false);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (deleting) return;
    setOpen(next);
    if (!next) setError(null);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this proposal?</DialogTitle>
            <DialogDescription>
              {clientName}&rsquo;s proposal will be permanently removed, along with its uploaded
              PDF and logo. The share link will stop working. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {status === "signed" && (
            <p className="rounded-card border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              This proposal has been signed. Deleting it also erases the signature record — only
              do this for test proposals, never for a real client agreement.
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
