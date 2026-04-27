"use client";

import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { VaultButton } from "@/components/shared/VaultPrimitives";
import { MoveRight, Database } from "lucide-react";
import { api } from "@/lib/api";
import { useVault } from "@/context/VaultContext";

export const MoveDialog = ({ item }: { item: any }) => {
  const { handleAction } = useVault();
  const [targetParentId, setTargetParentId] = useState("");

  const onExecuteMove = async () => {
    await handleAction('Move', () => api.put(`/api/nodes/${item.id}/move`, { 
        parent_id: targetParentId.trim() === "" ? null : targetParentId 
    }));
    setTargetParentId("");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <VaultButton variant="outline" size="icon" className="h-8 w-8 text-emerald-600 border-2" title="Move">
            <MoveRight size={14} />
        </VaultButton>
      </DialogTrigger>
      <DialogContent className="border-4 border-slate-900 rounded-[2rem] bg-white">
        <DialogHeader>
          <DialogTitle className="font-black uppercase italic tracking-tight text-xl">Move_{item.type}</DialogTitle>
          <DialogDescription className="font-bold text-[10px] text-slate-400 uppercase tracking-widest mt-2">
            Enter Target Folder UUID or set to Root level.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-6">
          <div className="flex gap-3">
            <Input 
                value={targetParentId} 
                onChange={e => setTargetParentId(e.target.value)} 
                placeholder="Folder UUID" 
                className="flex-1 rounded-xl border-2 font-mono h-14 text-xs bg-slate-50 focus:bg-white transition-colors" 
            />
            <VaultButton 
                variant="outline" 
                className="font-black text-[10px] rounded-xl border-2 px-6 h-14 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200" 
                onClick={() => setTargetParentId("")}
            >
                ROOT
            </VaultButton>
          </div>
          {targetParentId === "" && (
            <div className="bg-emerald-50 border-2 border-emerald-100 p-4 rounded-2xl flex items-center gap-3 animate-in zoom-in-95 duration-200">
              <div className="bg-white p-2 rounded-lg border-2 border-emerald-200">
                 <Database size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none">Target:_Home_Vault</p>
                <p className="text-[9px] font-bold text-emerald-500 uppercase mt-1">Item will be moved to root directory</p>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <VaultButton onClick={onExecuteMove} className="w-full py-7 text-xs bg-emerald-600 hover:bg-emerald-700">
                EXECUTE_RELOCATION
            </VaultButton>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
