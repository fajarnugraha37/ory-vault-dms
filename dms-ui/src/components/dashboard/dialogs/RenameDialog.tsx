"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VaultButton } from "@/components/shared/VaultPrimitives";
import { useVault } from "@/context/VaultContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Edit2 } from "lucide-react";

export function RenameDialog({ open, onOpenChange, node }: { open: boolean, onOpenChange: (o: boolean) => void, node: any }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { mutateNodes } = useVault();

  useEffect(() => {
    if (node) setName(node.name);
  }, [node]);

  const handleRename = async () => {
    if (!name || !node) return;
    setLoading(true);
    try {
      await api.put(`/api/nodes/${node.id}/rename`, { name });
      toast.success("Renamed successfully");
      mutateNodes();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to rename");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background-elevated border-white/[0.06] backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Edit2 size={18} className="text-accent" />
            Rename {node?.type === "folder" ? "Folder" : "File"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="rename" className="text-[10px] uppercase font-mono text-foreground-subtle ml-1">New_Identity_Label</Label>
            <Input
              id="rename"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/[0.03] border-white/[0.06] focus:border-accent h-12"
              autoFocus
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <VaultButton variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</VaultButton>
          <VaultButton variant="primary" size="sm" onClick={handleRename} isLoading={loading}>EXECUTE_RENAME</VaultButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
