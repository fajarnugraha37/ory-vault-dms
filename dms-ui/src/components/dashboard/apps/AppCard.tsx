"use client";

import React, { useState } from "react";
import { 
  VaultCard, 
  VaultButton, 
  VaultBadge 
} from "@/components/shared/VaultPrimitives";
import { 
  Key, 
  Trash2, 
  Eye, 
  EyeOff, 
  ExternalLink,
  Shield,
  Layers,
  Copy
} from "lucide-react";
import { toast } from "sonner";

export function AppCard({ client, onDelete }: { client: any; onDelete: (id: string) => void }) {
  const [showSecret, setShowSecret] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <VaultCard spotlight={true} className="overflow-hidden border-white/[0.06] bg-white/[0.02]">
        <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-accent/10 rounded-xl border border-accent/20">
                    <Layers className="text-accent" size={20} />
                </div>
                <div>
                    <h3 className="font-semibold text-white tracking-tight">{client.client_name || "Untitled_App"}</h3>
                    <VaultBadge className="mt-1">OAuth2_Client</VaultBadge>
                </div>
            </div>
            <VaultButton 
                variant="destructive" 
                size="icon" 
                className="bg-transparent border-white/10 text-foreground-muted hover:text-red-400"
                onClick={() => onDelete(client.client_id)}
            >
                <Trash2 size={16} />
            </VaultButton>
        </div>

        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-[10px] font-mono text-foreground-subtle uppercase tracking-widest ml-1">Client_Identifier</label>
                <div className="flex items-center gap-2 p-3 bg-black/40 border border-white/[0.06] rounded-xl group">
                    <code className="text-xs font-mono text-foreground/80 truncate flex-1">{client.client_id}</code>
                    <button onClick={() => copyToClipboard(client.client_id)} className="p-1.5 hover:text-accent transition-colors opacity-0 group-hover:opacity-100">
                        <Copy size={14} />
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-mono text-foreground-subtle uppercase tracking-widest ml-1">Secret_Key</label>
                <div className="flex items-center gap-2 p-3 bg-black/40 border border-white/[0.06] rounded-xl group">
                    <code className="text-xs font-mono text-foreground/80 truncate flex-1">
                        {showSecret ? client.client_secret : "••••••••••••••••••••••••"}
                    </code>
                    <button onClick={() => setShowSecret(!showSecret)} className="p-1.5 hover:text-white transition-colors">
                        {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                </div>
            </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-mono text-foreground-muted uppercase">
                <Shield size={12} />
                Scope: nodes.read nodes.write
            </div>
            <button className="text-[10px] font-mono text-accent hover:text-accent-bright transition-colors uppercase tracking-widest flex items-center gap-1">
                Details <ExternalLink size={12} />
            </button>
        </div>
    </VaultCard>
  );
}
