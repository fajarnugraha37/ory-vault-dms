"use client";

import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { VaultButton, VaultBadge } from "@/components/shared/VaultPrimitives";
import { Share2, UserX, Copy, Link as LinkIcon, Shield, RefreshCcw, Trash2 } from "lucide-react";
import { api, fetcher } from "@/lib/api";
import { useVault } from "@/context/VaultContext";
import useSWR from "swr";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AccessRelation {
  user_id: string;
  email?: string;
  relation: string;
}

export const ShareDialog = ({ open, onOpenChange, node }: { open: boolean, onOpenChange: (o: boolean) => void, node: any }) => {
  const { handleAction, mutateNodes } = useVault();
  const [shareEmail, setShareEmail] = useState("");
  const [shareRelation, setShareRelation] = useState("viewer");

  const { data: accessList, mutate: mutateAccess } = useSWR<AccessRelation[]>(node ? `/api/nodes/${node.id}/access` : null, fetcher);

  if (!node) return null;

  const handleShare = async () => {
    if (!shareEmail) return;
    await handleAction('Sharing', () => api.post(`/api/nodes/${node.id}/share`, { 
        email: shareEmail, 
        relation: shareRelation 
    }));
    setShareEmail("");
    mutateAccess();
  };

  const handleRevoke = async (userId: string, rel: string) => {
    await handleAction('Revoking Access', () => api.delete(`/api/nodes/${node.id}/share/${userId}`, { 
        data: { relation: rel } 
    }));
    mutateAccess();
  };

  const handlePublicLink = async () => {
    await handleAction('Generate Link', () => api.post(`/api/documents/${node.id}/public-link`, {}).then(() => {
        mutateNodes();
    }));
  };

  const handleRevokePublic = async () => {
    await handleAction('Revoke Link', () => api.delete(`/api/documents/${node.id}/public-link`).then(() => {
        mutateNodes();
    }));
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-background-elevated border-white/[0.08] p-0 overflow-hidden backdrop-blur-3xl shadow-2xl">
        <DialogHeader className="p-8 pb-4 border-b border-white/[0.06] bg-accent/5">
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg border border-accent/20">
                <Shield size={18} className="text-accent" />
            </div>
            <div className="flex flex-col">
                <span className="text-white text-lg tracking-tight">Access_Management</span>
                <span className="text-[10px] font-mono text-foreground-muted uppercase tracking-[0.2em]">{node.name}</span>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-8">
          <Tabs defaultValue="share" className="w-full">
            <TabsList className="bg-white/[0.03] border border-white/[0.06] p-1 rounded-xl mb-8">
              <TabsTrigger value="share" className="flex-1 text-[10px] font-medium uppercase tracking-widest">Grant</TabsTrigger>
              <TabsTrigger value="access" className="flex-1 text-[10px] font-medium uppercase tracking-widest">Collaborators</TabsTrigger>
              {node.type === 'file' && <TabsTrigger value="public" className="flex-1 text-[10px] font-medium uppercase tracking-widest">Public_Signal</TabsTrigger>}
            </TabsList>

            <TabsContent value="share" className="space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-foreground-muted uppercase tracking-widest ml-1">Identity_Subject (Email)</p>
                <Input 
                    value={shareEmail} 
                    onChange={e => setShareEmail(e.target.value)} 
                    placeholder="subject@identity.local" 
                    className="bg-white/[0.02] border-white/[0.06] focus:border-accent h-14" 
                />
              </div>
              
              <div className="space-y-2">
                <p className="text-[10px] font-mono text-foreground-muted uppercase tracking-widest ml-1">Permission_Protocol</p>
                <div className="flex gap-2 p-1 bg-white/[0.02] rounded-xl border border-white/[0.06]">
                    <button 
                        onClick={() => setShareRelation('viewer')}
                        className={cn(
                            "flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all",
                            shareRelation === 'viewer' ? "bg-accent text-white" : "text-foreground-muted hover:text-white"
                        )}
                    >
                        VIEWER
                    </button>
                    <button 
                        onClick={() => setShareRelation('editor')}
                        className={cn(
                            "flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all",
                            shareRelation === 'editor' ? "bg-accent text-white" : "text-foreground-muted hover:text-white"
                        )}
                    >
                        EDITOR
                    </button>
                </div>
              </div>

              <VaultButton onClick={handleShare} className="w-full h-14" disabled={!shareEmail}>
                INIT_ACCESS_SYNC
              </VaultButton>
            </TabsContent>

            <TabsContent value="access">
              <ScrollArea className="h-[280px] rounded-2xl border border-white/[0.06] bg-white/[0.01]">
                <div className="p-4 space-y-3">
                    {accessList?.map(acc => (
                    <div key={acc.user_id} className="flex justify-between items-center p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl group hover:border-white/10 transition-colors">
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-foreground/90 truncate max-w-[220px]">{acc.email || acc.user_id}</span>
                            <div className="flex gap-2 mt-1.5">
                                <VaultBadge className={cn("text-[8px] py-0", acc.relation === 'owner' ? "border-accent/40 text-accent-bright" : "border-white/10 text-foreground-muted")}>
                                    {acc.relation.toUpperCase()}
                                </VaultBadge>
                            </div>
                        </div>
                        {acc.relation !== 'owner' && (
                        <button onClick={() => handleRevoke(acc.user_id, acc.relation)} className="p-2 text-foreground-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                            <UserX size={16}/>
                        </button>
                        )}
                    </div>
                    ))}
                    {!accessList?.length && <div className="text-center py-20 text-foreground-muted/20 font-mono text-[10px] uppercase tracking-[0.2em]">Zero_Collaborators_Detected</div>}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="public" className="space-y-6">
              {node.public_link_token ? (
                <div className="p-6 bg-accent/[0.03] border border-accent/20 rounded-2xl space-y-5">
                  <div className="flex items-center gap-3">
                     <div className="bg-accent w-2 h-2 rounded-full animate-pulse shadow-[0_0_15px_rgba(94,106,210,1)]" />
                     <span className="text-[11px] font-mono text-accent-bright font-bold uppercase tracking-widest">Public_Signal_Broadcast_Active</span>
                  </div>
                  <div className="bg-black/60 border border-white/[0.06] p-4 rounded-xl font-mono text-[10px] break-all text-foreground-muted leading-relaxed shadow-inner">
                    {`${origin}/public/${node.public_link_token}`}
                  </div>
                  <div className="flex gap-4">
                    <VaultButton size="sm" variant="secondary" className="flex-1 h-12 text-[10px]" onClick={() => {navigator.clipboard.writeText(`${origin}/public/${node.public_link_token}`); toast.success("Signal link copied");}}>
                        <Copy size={12} className="mr-2" /> COPY_LINK
                    </VaultButton>
                    <VaultButton size="sm" variant="destructive" className="flex-1 h-12 text-[10px]" onClick={handleRevokePublic}>
                        <Trash2 size={12} className="mr-2" /> TERMINATE
                    </VaultButton>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 space-y-8">
                    <div className="p-12 bg-white/[0.01] border border-dashed border-white/[0.08] rounded-[2rem]">
                        <LinkIcon size={48} className="mx-auto text-foreground-muted/10 mb-4" />
                        <p className="text-[10px] text-foreground-muted/60 uppercase tracking-[0.2em] leading-relaxed max-w-[200px] mx-auto">Generate a cryptographically signed direct access signal.</p>
                    </div>
                    <VaultButton onClick={handlePublicLink} className="w-full h-14">
                        GENERATE_ACCESS_SIGNAL
                    </VaultButton>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
