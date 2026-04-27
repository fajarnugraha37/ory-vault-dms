"use client";

import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { VaultButton } from "@/components/shared/VaultPrimitives";
import { MoveRight, Database, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { useVault } from "@/context/VaultContext";
import { toast } from "sonner";

export const MoveDialog = ({ open, onOpenChange, node }: { open: boolean, onOpenChange: (o: boolean) => void, node: any }) => {
  const { mutateNodes } = useVault();
  const [targetParentId, setTargetParentId] = useState("");
  const [loading, setLoading] = useState(false);

  const onExecuteMove = async () => {
    if (!node) return;
    setLoading(true);
    try {
        await api.put(`/api/nodes/${node.id}/move`, { 
            parent_id: targetParentId.trim() === "" ? null : targetParentId 
        });
        toast.success("Identity relocation successful");
        mutateNodes();
        setTargetParentId("");
        onOpenChange(false);
    } catch (e: any) {
        toast.error(e.response?.data?.error || "Relocation failed");
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background-elevated border-white/[0.08] p-0 overflow-hidden backdrop-blur-3xl shadow-2xl">
        <DialogHeader className="p-8 pb-4 border-b border-white/[0.06] bg-accent/5">
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg border border-accent/20">
                <MoveRight size={18} className="text-accent" />
            </div>
            <div className="flex flex-col">
                <span className="text-white text-lg tracking-tight">Identity_Relocation</span>
                <span className="text-[10px] font-mono text-foreground-muted uppercase tracking-[0.2em]">{node?.name}</span>
            </div>
          </DialogTitle>
          <DialogDescription className="px-1 text-[10px] text-foreground-muted uppercase tracking-widest mt-2">
            Target a new parent directory or restore to system root.
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-8 space-y-6">
          <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                    <Label className="text-[9px] uppercase font-mono text-foreground-subtle ml-1">Parent_UUID</Label>
                    <Input 
                        value={targetParentId} 
                        onChange={e => setTargetParentId(e.target.value)} 
                        placeholder="0000-0000-..." 
                        className="bg-white/[0.02] border-white/[0.06] font-mono h-12 text-xs" 
                    />
                </div>
                <div className="flex items-end">
                    <VaultButton 
                        variant="secondary" 
                        className="h-12 px-4 text-[10px] border-white/10" 
                        onClick={() => setTargetParentId("")}
                    >
                        ROOT
                    </VaultButton>
                </div>
              </div>

              <div className={cn(
                  "p-4 rounded-xl border transition-all flex items-center gap-3",
                  targetParentId === "" ? "bg-accent/5 border-accent/20" : "bg-white/[0.02] border-white/[0.06]"
              )}>
                <Database size={18} className={targetParentId === "" ? "text-accent" : "text-foreground-muted"} />
                <div>
                    <p className="text-[10px] font-bold text-white uppercase tracking-widest">
                        {targetParentId === "" ? "Target:_System_Root" : "Target:_Custom_Node"}
                    </p>
                    <p className="text-[9px] text-foreground-muted uppercase mt-0.5">
                        {targetParentId === "" ? "Restoring node to top-level hierarchy" : "Relocating to specified identifier"}
                    </p>
                </div>
              </div>
          </div>

          <VaultButton 
              onClick={onExecuteMove} 
              className="w-full h-14"
              isLoading={loading}
          >
              EXECUTE_RELOCATION <ChevronRight size={16} className="ml-1" />
          </VaultButton>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
    return <label className={cn("text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}>{children}</label>
}
