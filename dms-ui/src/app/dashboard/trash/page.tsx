"use client";

import React from "react";
import useSWR from "swr";
import { api, fetcher } from "@/lib/api";
import { Navbar } from "@/components/layout/Navbar";
import { 
  VaultHeader, 
  VaultCard, 
  VaultButton, 
  VaultBadge 
} from "@/components/shared/VaultPrimitives";
import { 
  Trash2, 
  RotateCcw, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function TrashPage() {
  const { data: nodes, mutate, isLoading } = useSWR("/api/nodes?show_deleted=true", fetcher);

  const handleRestore = async (id: string) => {
    try {
      await api.put(`/api/nodes/${id}/restore`);
      toast.success("Identity restored to vault");
      mutate();
    } catch (e) {
      toast.error("Restoration protocol failed");
    }
  };

  return (
    <div className="pb-20">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 pt-12 space-y-10">
        <VaultHeader 
          title="Containment_Zone" 
          subtitle="Archive of soft-deleted nodes pending permanent infrastructure purging."
        />

        <div className="flex items-center gap-3 p-4 bg-red-500/[0.03] border border-red-500/20 rounded-2xl">
            <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                <ShieldAlert className="text-red-500" size={18} />
            </div>
            <p className="text-[10px] font-mono text-red-400 uppercase tracking-widest leading-none">
                Warning: Items in containment are scheduled for periodic garbage collection.
            </p>
        </div>

        <VaultCard className="p-0 border-white/[0.06] overflow-hidden">
            <Table>
                <TableHeader className="bg-white/[0.02]">
                    <TableRow className="border-b border-white/[0.06] hover:bg-transparent">
                        <TableHead className="pl-8 text-foreground-muted font-medium text-[10px] uppercase tracking-widest py-4">Subject_Node</TableHead>
                        <TableHead className="text-foreground-muted font-medium text-[10px] uppercase tracking-widest py-4">Deleted_By</TableHead>
                        <TableHead className="text-right pr-8"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <AnimatePresence>
                        {nodes?.map((node: any, index: number) => (
                            <motion.tr 
                                key={node.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
                            >
                                <TableCell className="pl-8 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/[0.03] rounded-lg border border-white/10">
                                            <Trash2 size={16} className="text-foreground-muted" />
                                        </div>
                                        <span className="font-medium text-sm text-foreground/90">{node.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <VaultBadge className="border-white/10 text-foreground-muted">
                                        {node.deleted_by || "SYSTEM"}
                                    </VaultBadge>
                                </TableCell>
                                <TableCell className="text-right pr-8">
                                    <VaultButton variant="secondary" size="sm" onClick={() => handleRestore(node.id)}>
                                        <RotateCcw size={14} className="mr-2" /> RESTORE
                                    </VaultButton>
                                </TableCell>
                            </motion.tr>
                        ))}
                    </AnimatePresence>
                </TableBody>
            </Table>
            {!nodes?.length && !isLoading && (
                <div className="text-center py-24 text-foreground-muted/20 font-mono text-[10px] uppercase tracking-[0.3em]">
                    Containment_Empty
                </div>
            )}
        </VaultCard>
      </main>
    </div>
  );
}
