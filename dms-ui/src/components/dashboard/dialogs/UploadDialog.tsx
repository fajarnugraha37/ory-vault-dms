"use client";

import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { VaultButton } from "@/components/shared/VaultPrimitives";
import { UploadCloud, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useVault } from "@/context/VaultContext";
import { toast } from "sonner";

export const UploadDialog = ({ nodeId }: { nodeId?: string | null }) => {
  const { currentFolder, mutateNodes, folderHistory } = useVault();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [open, setOpen] = useState(false);

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
      setOpen(false);
      mutateNodes();
    } catch (err: any) { 
      toast.error("Upload failed"); 
    } finally { 
      setIsUploading(false); 
    }
  };

  const targetName = folderHistory[folderHistory.length - 1].name;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {nodeId ? (
             <VaultButton variant="outline" size="icon" className="h-8 w-8 text-blue-600 border-2" title="Upload New Version">
                <UploadCloud size={14} />
             </VaultButton>
        ) : (
            <VaultButton variant="default" size="sm" className="shadow-lg h-10 px-6">
                <UploadCloud size={16} className="mr-2" /> UPLOAD
            </VaultButton>
        )}
      </DialogTrigger>
      <DialogContent className="border-4 border-slate-900 rounded-[2rem] bg-white">
        <DialogHeader>
          <DialogTitle className="font-black uppercase italic tracking-tight">
            {nodeId ? "Upload New Version" : `Upload to ${targetName}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-6">
          <div className="group relative">
            <Input 
                type="file" 
                onChange={(e) => setFile(e.target.files?.[0] || null)} 
                className="border-2 rounded-xl h-16 cursor-pointer file:font-black file:uppercase file:text-[10px] file:bg-slate-100 file:border-0 file:h-full file:mr-4" 
            />
          </div>
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-blue-600">
                <span>Transmitting_Data...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-3 rounded-full border-2 border-slate-900 bg-slate-100" />
            </div>
          )}
        </div>
        <DialogFooter>
          <VaultButton onClick={handleUpload} disabled={!file || isUploading} className="w-full py-7 text-sm">
            {isUploading ? "PROCESS_SYNC..." : "EXECUTE_UPLOAD"}
          </VaultButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
