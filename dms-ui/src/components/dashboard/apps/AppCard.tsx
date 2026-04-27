"use client";

import React from "react";
import { VaultCard, VaultButton, VaultBadge } from "@/components/shared/VaultPrimitives";
import { Fingerprint, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

interface AppCardProps {
  client: any;
  onDelete: (id: string) => void;
}

export const AppCard = ({ client, onDelete }: AppCardProps) => {
  return (
    <Card className="border-2 border-slate-200 hover:border-slate-900 rounded-2xl transition-all group bg-white">
        <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    <Fingerprint size={24} />
                </div>
                <div>
                    <h4 className="font-black text-slate-900">{client.client_name || "Unnamed Application"}</h4>
                    <div className="flex items-center gap-2 mt-1">
                        <code className="text-[10px] font-mono text-slate-400">{client.client_id}</code>
                        <VaultButton variant="ghost" size="icon" className="h-4 w-4 text-slate-300" onClick={() => {navigator.clipboard.writeText(client.client_id); toast.success("ID Copied");}}>
                            <Copy size={10} />
                        </VaultButton>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="text-right mr-4 hidden md:block">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Redirect_URIs</p>
                    <div className="flex flex-col items-end gap-1 mt-1">
                        {client.redirect_uris?.map((u: string, i: number) => (
                            <code key={i} className="text-[8px] bg-slate-50 px-2 py-0.5 rounded border border-slate-100 text-slate-500 font-mono">{u}</code>
                        ))}
                    </div>
                </div>
                <VaultButton 
                    variant="outline" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl border-2 text-red-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200"
                    onClick={() => onDelete(client.client_id)}
                >
                    <Trash2 size={16} />
                </VaultButton>
            </div>
        </div>
    </Card>
  );
};

// Internal local Card just to satisfy Shadcn component if needed, 
// but we will use our Primitives mainly.
import { Card } from "@/components/ui/card";
