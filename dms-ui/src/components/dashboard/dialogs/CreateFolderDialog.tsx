"use client";

import React, { useState } from "react";
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
import { FolderPlus } from "lucide-react";

export function CreateFolderDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { currentFolder, mutateNodes } = useVault();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Folder name cannot be empty");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/nodes", { name, parent_id: currentFolder });
      toast.success("Folder created successfully");
      mutateNodes();
      setName("");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Failed to create folder");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background-elevated border-white/[0.06] backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <FolderPlus size={18} className="text-accent" />
            Create New Folder
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[10px] uppercase font-mono text-foreground-subtle ml-1">Folder_Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Project_Specs"
              className="bg-white/[0.03] border-white/[0.06] focus:border-accent h-12"
              autoFocus
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <VaultButton variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</VaultButton>
          <VaultButton variant="primary" size="sm" onClick={handleCreate} isLoading={loading}>INITIALIZE_FOLDER</VaultButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
