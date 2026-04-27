"use client";

import React, { useEffect } from "react";
import { VaultProvider, useVault } from "@/context/VaultContext";
import { Navbar } from "@/components/layout/Navbar";
import { VaultHeader, VaultCard, VaultButton, VaultBadge } from "@/components/shared/VaultPrimitives";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Trash2, 
  RefreshCcw, 
  FileText, 
  Folder as FolderIcon,
  Database,
  History
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

function TrashContent() {
  const { nodes, isLoading, handleAction, mutateNodes, me } = useVault();

  const handleRestore = async (id: string) => {
    await handleAction('Restoration', () => api.put(`/api/nodes/${id}/restore`));
  };

  const handlePurge = async (id: string) => {
    if (!confirm("PERMANENT DELETE? This cannot be undone.")) return;
    // For now, purge will just call the same delete endpoint 
    // but the backend will eventually need a 'hard delete' flag.
    toast.error("Hard purge not yet implemented in backend core.");
  };

  const myUserId = me?.user_id;
  // In Trash page, we explicitly fetch with show_deleted=true (managed in Context by detecting pathname)
  const filteredNodes = nodes?.filter(n => n.owner_id === myUserId) || [];

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans text-slate-900">
      <Navbar />

      <main className="p-8 max-w-[1000px] mx-auto space-y-8 mt-4">
        <VaultHeader 
            title="Recycle Bin" 
            subtitle="Review and restore items before permanent deletion" 
        />

        <VaultCard variant="destructive" className="overflow-hidden p-0 border-4">
            <div className="bg-red-50 border-b-4 border-slate-900 p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-red-500 text-white p-2 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <History size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Storage_Policy</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Deleted items are kept for 30 days</p>
                    </div>
                </div>
            </div>

            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-900 hover:bg-slate-900 border-0">
                        <TableHead className="pl-8 text-white font-black uppercase text-[10px] tracking-widest py-6">Deleted_Item</TableHead>
                        <TableHead className="text-white font-black uppercase text-[10px] tracking-widest py-6">Type</TableHead>
                        <TableHead className="text-white font-black uppercase text-[10px] tracking-widest py-6">Deleted_At</TableHead>
                        <TableHead className="text-white font-black uppercase text-[10px] tracking-widest py-6 text-right pr-8">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className="bg-white">
                    {filteredNodes.map((item) => (
                        <TableRow key={item.id} className="border-b-2 border-slate-50 hover:bg-red-50/30 transition-colors group">
                            <TableCell className="pl-8 py-5 flex items-center gap-4">
                                <div className="p-2.5 rounded-xl border-2 bg-slate-50 text-slate-400">
                                    {item.type === 'folder' ? <FolderIcon size={18} /> : <FileText size={18} />}
                                </div>
                                <div>
                                    <div className="font-black text-slate-400 line-through text-sm tracking-tight">{item.name}</div>
                                    <div className="text-[9px] font-mono text-slate-300 mt-0.5">UID_{item.id.substring(0,8)}...</div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <VaultBadge className="text-slate-300 border-slate-200 uppercase">{item.type}</VaultBadge>
                            </TableCell>
                            <TableCell>
                                <span className="text-[10px] font-bold text-slate-400">{item.deleted_at ? new Date(item.deleted_at).toLocaleDateString() : 'N/A'}</span>
                            </TableCell>
                            <TableCell className="text-right pr-8">
                                <div className="flex justify-end gap-2">
                                    <VaultButton 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-9 text-[10px] px-4 border-green-200 text-green-600 hover:bg-green-50 hover:border-green-600"
                                        onClick={() => handleRestore(item.id)}
                                    >
                                        <RefreshCcw size={14} className="mr-2" /> RESTORE
                                    </VaultButton>
                                    <VaultButton 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-9 w-9 text-red-500 border-2"
                                        onClick={() => handlePurge(item.id)}
                                    >
                                        <Trash2 size={16} />
                                    </VaultButton>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}

                    {!filteredNodes.length && !isLoading && (
                        <TableRow>
                            <TableCell colSpan={4} className="py-24 text-center">
                                <Database size={40} className="mx-auto text-slate-200 mb-4" />
                                <p className="font-black text-slate-300 uppercase tracking-widest text-[10px]">Your bin is empty. Efficiency confirmed.</p>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </VaultCard>
      </main>
    </div>
  );
}

export default function TrashPage() {
  return (
    <VaultProvider>
      <TrashContent />
    </VaultProvider>
  );
}
