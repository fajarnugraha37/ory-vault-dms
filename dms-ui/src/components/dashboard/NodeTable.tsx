"use client";

import React from "react";
import { 
  File, 
  Folder, 
  MoreVertical, 
  Share2, 
  Trash2, 
  Download, 
  Edit2,
  Move
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VaultBadge } from "@/components/shared/VaultPrimitives";
import { motion, AnimatePresence } from "framer-motion";
import { formatBytes, cn } from "@/lib/utils";

// Define locally but ensure it matches the Context's node or is compatible
interface Node {
  id: string;
  name: string;
  type: 'folder' | 'file';
  updated_at: string;
  user_permission?: string; // Optional to match context
  mime_type?: string;
  size_bytes?: number;
}

interface NodeTableProps {
  nodes: any[]; // Use any temporarily to bypass the "Two types with same name" issue if needed, 
                // or just fix the interface to be compatible.
  onNavigate: (id: string) => void;
  onAction: (action: string, node: any) => void;
  isLoading?: boolean;
}

export function NodeTable({ nodes, onNavigate, onAction, isLoading }: NodeTableProps) {
  if (!isLoading && nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-full">
          <Folder size={48} className="text-foreground-muted/20" />
        </div>
        <p className="text-sm font-medium text-foreground-muted uppercase tracking-widest">
          No_Nodes_Detected
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-white/[0.06] hover:bg-transparent">
            <TableHead className="w-[50%] text-foreground-muted font-medium text-[10px] uppercase tracking-widest py-4">Name</TableHead>
            <TableHead className="text-foreground-muted font-medium text-[10px] uppercase tracking-widest py-4">Type</TableHead>
            <TableHead className="text-foreground-muted font-medium text-[10px] uppercase tracking-widest py-4">Size</TableHead>
            <TableHead className="text-foreground-muted font-medium text-[10px] uppercase tracking-widest py-4">Modified</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence mode="popLayout">
            {nodes.map((node, index) => (
              <motion.tr
                key={node.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2, delay: index * 0.03, ease: [0.16, 1, 0.3, 1] }}
                className="group border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors cursor-pointer"
                onClick={() => node.type === "folder" && onNavigate(node.id)}
              >
                <TableCell className="py-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg border border-white/[0.06] transition-colors group-hover:border-accent/30",
                      node.type === "folder" ? "bg-accent/5 text-accent" : "bg-white/[0.03] text-foreground-muted"
                    )}>
                      {node.type === "folder" ? <Folder size={16} /> : <File size={16} />}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm text-foreground/90 group-hover:text-white transition-colors">
                        {node.name}
                      </span>
                      {node.user_permission && node.user_permission !== "owner" && (
                        <span className="text-[10px] text-accent/60 font-mono uppercase tracking-tighter">
                          Shared_{node.user_permission}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <VaultBadge className="bg-transparent border-white/10 text-foreground-muted text-[9px]">
                    {node.type === "folder" ? "DIR" : node.mime_type?.split("/")[1]?.toUpperCase() || "BIN"}
                  </VaultBadge>
                </TableCell>
                <TableCell className="text-xs text-foreground-muted font-mono">
                  {node.type === "file" ? formatBytes(node.size_bytes || 0) : "--"}
                </TableCell>
                <TableCell className="text-xs text-foreground-muted font-mono">
                  {new Date(node.updated_at).toLocaleDateString()}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 text-foreground-muted hover:text-white transition-colors rounded-lg hover:bg-white/[0.05]">
                        <MoreVertical size={16} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-background-elevated border-white/[0.06] backdrop-blur-2xl">
                      {node.type === "file" && (
                        <DropdownMenuItem onClick={() => onAction("download", node)} className="gap-2 text-xs">
                          <Download size={14} /> Download
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onAction("rename", node)} className="gap-2 text-xs">
                        <Edit2 size={14} /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAction("move", node)} className="gap-2 text-xs">
                        <Move size={14} /> Move
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onAction("share", node)} className="gap-2 text-xs">
                        <Share2 size={14} /> Share Access
                      </DropdownMenuItem>
                      <div className="h-px bg-white/[0.06] my-1" />
                      <DropdownMenuItem 
                        onClick={() => onAction("delete", node)} 
                        className="gap-2 text-xs text-red-400 focus:text-red-400 focus:bg-red-400/10"
                      >
                        <Trash2 size={14} /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  );
}
