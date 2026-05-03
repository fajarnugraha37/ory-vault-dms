"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VaultButton } from "@/components/shared/VaultPrimitives";
import { useVault } from "@/context/VaultContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function DeleteDialog({ open, onOpenChange, node }: { open: boolean, onOpenChange: (o: boolean) => void, node: any }) {
  const [loading, setLoading] = useState(false);
  const { mutateNodes } = useVault();

  const handleDelete = async () => {
    if (!node) return;
    setLoading(true);
    try {
      await api.delete(`/api/nodes/${node.id}`);
      toast.success("Deleted successfully");
      mutateNodes();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background-elevated border-white/[0.06] backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Trash2 size={18} className="text-red-400" />
            Delete {node?.type === "folder" ? "Folder" : "File"}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-foreground-muted">
            Are you sure you want to delete <span className="font-bold text-white">{node?.name}</span>?
            This action cannot be undone.
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <VaultButton variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</VaultButton>
          <VaultButton variant="destructive" size="sm" onClick={handleDelete} isLoading={loading}>DELETE</VaultButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
