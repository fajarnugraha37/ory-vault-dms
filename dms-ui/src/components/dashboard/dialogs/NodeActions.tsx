"use client";

import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { VaultButton } from "@/components/shared/VaultPrimitives";
import { Edit2, FolderPlus } from "lucide-react";
import { api } from "@/lib/api";
import { useVault } from "@/context/VaultContext";

export const RenameDialog = ({ item }: { item: any }) => {
  const { handleAction } = useVault();
  const [newName, setNewName] = useState(item.name);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <VaultButton variant="outline" size="icon" className="h-8 w-8 text-slate-600 border-2" title="Rename">
            <Edit2 size={14} />
        </VaultButton>
      </DialogTrigger>
      <DialogContent className="border-4 border-slate-900 rounded-[2rem] bg-white">
        <DialogHeader>
          <DialogTitle className="font-black uppercase italic tracking-tight">Rename_{item.type}</DialogTitle>
        </DialogHeader>
        <div className="py-6">
          <Input value={newName} onChange={e => setNewName(e.target.value)} className="rounded-xl border-2 font-bold h-14" />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <VaultButton onClick={() => handleAction('Rename', () => api.put(`/api/nodes/${item.id}/rename`, { name: newName }))} className="w-full py-7">
                SAVE_CHANGES
            </VaultButton>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const CreateFolderDialog = () => {
  const { handleAction, currentFolder } = useVault();
  const [name, setName] = useState("");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <VaultButton variant="outline" size="sm" className="font-black text-[10px] h-10 px-6">
            <FolderPlus size={14} className="mr-2" /> NEW_FOLDER
        </VaultButton>
      </DialogTrigger>
      <DialogContent className="border-4 border-slate-900 rounded-[2rem] bg-white">
        <DialogHeader>
          <DialogTitle className="font-black uppercase italic tracking-tight">Initialize_Directory</DialogTitle>
        </DialogHeader>
        <div className="py-6">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Folder Name" className="rounded-xl border-2 font-bold h-14" />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <VaultButton onClick={() => handleAction('Folder Creation', () => api.post("/api/nodes", { name, parent_id: currentFolder }).then(() => setName("")))} className="w-full py-7">
                CREATE_FOLDER
            </VaultButton>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
