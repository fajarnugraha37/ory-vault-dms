"use client";

import React, { useState, useMemo } from "react";
import { useVault } from "@/context/VaultContext";
import { VaultHeader, VaultCard, VaultButton } from "@/components/shared/VaultPrimitives";
import { NodeTable, NodeActionType } from "@/components/dashboard/NodeTable";
import { Navbar } from "@/components/layout/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadDialog } from "@/components/dashboard/dialogs/UploadDialog";
import { CreateFolderDialog } from "@/components/dashboard/dialogs/CreateFolderDialog";
import { MoveDialog } from "@/components/dashboard/dialogs/MoveDialog";
import { ShareDialog } from "@/components/dashboard/dialogs/ShareDialog";
import { RenameDialog } from "@/components/dashboard/dialogs/RenameDialog";
import { DeleteDialog } from "@/components/dashboard/dialogs/DeleteDialog";
import { 
  Plus, 
  Upload, 
  ChevronRight, 
  Home, 
  Search,
  ArrowUpAz,
  ArrowDownAz,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function DocumentsPage() {
  const { 
    nodes, 
    folderHistory, 
    navigateTo, 
    isLoading,
    sortBy,
    sortOrder,
    toggleSort,
    searchQuery,
    setSearchQuery
  } = useVault();

  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("owned");
  const { mutateNodes } = useVault();

  React.useEffect(() => {
    mutateNodes();
  }, [activeTab, mutateNodes]);

  // CRITICAL: Always use the "fresh" node from the SWR cache
  const selectedNode = useMemo(() => 
    nodes?.find(n => n.id === selectedNodeId) || null,
  [nodes, selectedNodeId]);

  const handleAction = (action: NodeActionType, node: any) => {
    setSelectedNodeId(node.id);
    setActiveDialog(action);
  };

  const sortedNodes = useMemo(() => {
    if (!nodes) return [];
    
    const filtered = nodes.filter(n => {
      if (activeTab === "owned") return n.user_permission === "owner";
      if (activeTab === "shared") return n.user_permission !== "owner";
      return true;
    });

    return [...filtered].sort((a, b) => {
      // 1. Always sort by type first (folder > file)
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      
      // 2. Then sort by user selection
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'type') {
        const aType = a.type === 'folder' ? 'DIR' : (a.mime_type || '');
        const bType = b.type === 'folder' ? 'DIR' : (b.mime_type || '');
        comparison = aType.localeCompare(bType);
      } else if (sortBy === 'size') {
        comparison = (a.size_bytes || 0) - (b.size_bytes || 0);
      } else if (sortBy === 'date' || sortBy === 'updated_at') {
        comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [nodes, sortBy, sortOrder]);

  return (
    <div className="pb-20">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 pt-12 space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <VaultHeader 
            title="Digital_Vault" 
            subtitle="Secure decentralized document storage with zero-trust cryptographic verification."
          />
          
          <div className="flex items-center gap-3 pb-2">
            <VaultButton variant="secondary" size="sm" onClick={() => setActiveDialog("upload")}>
              <Upload size={14} className="mr-2" /> Upload_Data
            </VaultButton>
            <VaultButton variant="primary" size="sm" onClick={() => setActiveDialog("create_folder")}>
              <Plus size={14} className="mr-2" /> New_Directory
            </VaultButton>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-6 py-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-8">
            <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {folderHistory.map((bc, i) => (
                <React.Fragment key={bc.id || "root"}>
                  {i > 0 && <ChevronRight size={14} className="text-white/10" />}
                  <button
                    onClick={() => navigateTo(bc.id, bc.name, true)}
                    className={cn(
                        "px-2 py-1 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2",
                        i === folderHistory.length - 1 ? "text-white" : "text-foreground-muted hover:text-white"
                    )}
                  >
                    {i === 0 && <Home size={14} />}
                    {bc.name}
                  </button>
                </React.Fragment>
              ))}
            </nav>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="block">
              <TabsList className="bg-white/[0.02] border-white/[0.04] h-9">
                <TabsTrigger value="owned" className="text-[10px] uppercase tracking-widest px-4">Owned</TabsTrigger>
                <TabsTrigger value="shared" className="text-[10px] uppercase tracking-widest px-4">Shared</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2 focus-within:border-accent/50 transition-colors">
              <Search size={14} className="text-foreground-muted mr-3" />
              <input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search subject..." 
                className="bg-transparent border-none outline-none text-xs text-foreground placeholder:text-foreground-subtle w-40 md:w-56"
              />
            </div>
          </div>
        </div>

        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={folderHistory.length > 0 ? folderHistory[folderHistory.length-1].id : "root"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <NodeTable 
                nodes={sortedNodes} 
                isLoading={isLoading} 
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={toggleSort}
                onNavigate={(id) => {
                    const node = nodes?.find(n => n.id === id);
                    if (node) navigateTo(id, node.name);
                }}
                onAction={handleAction}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <UploadDialog 
        open={activeDialog === "upload"} 
        onOpenChange={(open) => !open && setActiveDialog(null)} 
      />
      <CreateFolderDialog 
        open={activeDialog === "create_folder"} 
        onOpenChange={(open) => !open && setActiveDialog(null)} 
      />
      <MoveDialog 
        open={activeDialog === "move"} 
        node={selectedNode}
        onOpenChange={(open) => !open && setActiveDialog(null)} 
      />
      <ShareDialog 
        open={activeDialog === "share"} 
        node={selectedNode}
        onOpenChange={(open) => !open && setActiveDialog(null)} 
      />
      <RenameDialog 
        open={activeDialog === "rename"} 
        node={selectedNode}
        onOpenChange={(open) => !open && setActiveDialog(null)} 
      />
      <DeleteDialog 
        open={activeDialog === "delete"} 
        node={selectedNode}
        onOpenChange={(open) => !open && setActiveDialog(null)} 
      />
    </div>
  );
}
