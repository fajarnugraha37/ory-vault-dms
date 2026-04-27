"use client";

import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { VaultButton } from "@/components/shared/VaultPrimitives";
import { UploadCloud } from "lucide-react";
import { api } from "@/lib/api";
import { useVault } from "@/context/VaultContext";
import { toast } from "sonner";

export const UploadDialog = ({ open, onOpenChange, nodeId }: { open: boolean, onOpenChange: (o: boolean) => void, nodeId?: string | null }) => {
  const { currentFolder, mutateNodes, folderHistory } = useVault();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append("file", file);
    if (currentFolder) formData.append("parent_id", currentFolder);
    if (nodeId) formData.append("node_id", nodeId);

    try {
      await api.post("/api/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / (p.total || file.size)))
      });
      toast.success(nodeId ? "New version uploaded" : "File uploaded");
      setFile(null);
      onOpenChange(false);
      mutateNodes();
    } catch (err: any) { 
      toast.error("Upload failed"); 
    } finally { 
      setIsUploading(false); 
    }
  };

  const targetName = folderHistory[folderHistory.length - 1]?.name || "Root";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background-elevated border-white/[0.06] backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadCloud size={18} className="text-accent" />
            {nodeId ? "Upload New Version" : `Upload to ${targetName}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-6">
          <Input 
              type="file" 
              onChange={(e) => setFile(e.target.files?.[0] || null)} 
              className="bg-white/[0.03] border-white/[0.06] focus:border-accent h-12 file:bg-accent file:text-white file:border-0 file:rounded file:mr-4 file:px-3 file:py-1 file:text-xs" 
          />
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-accent">
                <span>Transmitting_Data...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-1 bg-white/5" />
            </div>
          )}
        </div>
        <DialogFooter className="gap-3">
          <VaultButton variant="ghost" onClick={() => onOpenChange(false)}>Cancel</VaultButton>
          <VaultButton onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? "PROCESS_SYNC..." : "EXECUTE_UPLOAD"}
          </VaultButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
