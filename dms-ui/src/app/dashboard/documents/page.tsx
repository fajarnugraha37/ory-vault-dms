"use client";

import React from "react";
import { VaultProvider, useVault } from "@/context/VaultContext";
import { Navbar } from "@/components/layout/Navbar";
import { VaultHeader, VaultCard } from "@/components/shared/VaultPrimitives";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronRight } from "lucide-react";

// Components
import { NodeTable } from "@/components/dashboard/nodes/NodeTable";
import { CreateFolderDialog } from "@/components/dashboard/dialogs/NodeActions";
import { UploadDialog } from "@/components/dashboard/dialogs/UploadDialog";

function DocumentExplorerContent() {
  const { 
    activeTab, setActiveTab, folderHistory, navigateTo 
  } = useVault();

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans text-slate-900">
      <Navbar actions={<UploadDialog />} />

      <main className="p-8 max-w-[1200px] mx-auto space-y-8 mt-4">
        <VaultHeader 
            title="Vault Operations" 
            subtitle="Secure document management and cryptographic signals" 
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-between items-end mb-6">
                <TabsList className="bg-slate-200/50 p-1 rounded-2xl border-2 border-slate-200">
                    <TabsTrigger value="owned" className="rounded-xl px-10 font-black text-[10px] tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">MY_VAULT</TabsTrigger>
                    <TabsTrigger value="shared" className="rounded-xl px-10 font-black text-[10px] tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all">SHARED</TabsTrigger>
                </TabsList>
                
                {activeTab === "owned" && <CreateFolderDialog />}
            </div>

            <VaultCard variant="blue" className="overflow-hidden p-0 border-4">
                {/* Breadcrumbs Header */}
                <div className="bg-slate-50 border-b-4 border-slate-900 p-6">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white border-2 border-slate-900/10 p-4 rounded-2xl shadow-inner">
                        {folderHistory.map((fh, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span 
                                    className={`cursor-pointer transition-colors px-2 py-1 rounded-lg ${i === folderHistory.length - 1 ? 'text-blue-600 bg-blue-50 font-black' : 'hover:bg-slate-100 hover:text-slate-900'}`} 
                                    onClick={() => navigateTo(fh.id, fh.name, true)}
                                >
                                    {fh.name.toUpperCase().replace(" ", "_")}
                                </span>
                                {i < folderHistory.length - 1 && <ChevronRight size={14} className="text-slate-300" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Table Content */}
                <NodeTable />
            </VaultCard>
        </Tabs>
      </main>

      <footer className="mt-20 border-t-4 border-slate-900 p-8 text-center bg-white">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-300">
            Secure_Vault_Protocol_v1.2 // Zero_Trust_Hardened
          </p>
      </footer>
    </div>
  );
}

export default function DocumentExplorerPage() {
  return (
    <VaultProvider>
      <DocumentExplorerContent />
    </VaultProvider>
  );
}
