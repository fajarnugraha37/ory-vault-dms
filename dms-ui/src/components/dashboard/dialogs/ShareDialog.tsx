"use client";

import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { VaultButton, VaultBadge } from "@/components/shared/VaultPrimitives";
import { Share2, UserX, Copy, Link as LinkIcon, Users, Shield } from "lucide-react";
import { api, fetcher } from "@/lib/api";
import { useVault } from "@/context/VaultContext";
import useSWR from "swr";
import { toast } from "sonner";

interface AccessRelation {
  user_id: string;
  email?: string;
  relation: string;
}

export const ShareDialog = ({ item }: { item: any }) => {
  const { handleAction, mutateNodes } = useVault();
  const [shareEmail, setShareEmail] = useState("");
  const [shareRelation, setShareRelation] = useState("viewer");
  const [publicToken, setPublicToken] = useState<string | null>(item.public_link_token);

  const { data: accessList, mutate: mutateAccess } = useSWR<AccessRelation[]>(`/api/nodes/${item.id}/access`, fetcher);

  const handleShare = async () => {
    if (!shareEmail) return;
    await handleAction('Sharing', () => api.post(`/api/nodes/${item.id}/share`, { 
        email: shareEmail, 
        relation: shareRelation 
    }));
    setShareEmail("");
    mutateAccess();
  };

  const handleRevoke = async (userId: string, rel: string) => {
    await handleAction('Revoking Access', () => api.delete(`/api/nodes/${item.id}/share/${userId}`, { 
        data: { relation: rel } 
    }));
    mutateAccess();
  };

  const handlePublicLink = async () => {
    await handleAction('Generate Link', () => api.post(`/api/documents/${item.id}/public-link`, {}).then(res => {
        setPublicToken(res.data.public_link_token);
        mutateNodes();
    }));
  };

  const handleRevokePublic = async () => {
    await handleAction('Revoke Link', () => api.delete(`/api/documents/${item.id}/public-link`).then(() => {
        setPublicToken(null);
        mutateNodes();
    }));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <VaultButton variant="outline" size="icon" className="h-8 w-8 text-indigo-600 border-2" title="Share">
            <Share2 size={14} />
        </VaultButton>
      </DialogTrigger>
      <DialogContent className="border-4 border-slate-900 rounded-[2rem] bg-white p-0 overflow-hidden max-w-md">
        <DialogHeader className="bg-slate-900 text-white p-6">
          <DialogTitle className="font-black uppercase italic tracking-tight flex items-center gap-2">
            <Shield size={20} className="text-indigo-400" /> Share_Resource
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6">
          <Tabs defaultValue="share" className="w-full">
            <TabsList className="w-full bg-slate-100 p-1 rounded-xl mb-6">
              <TabsTrigger value="share" className="w-1/3 text-[10px] font-black uppercase tracking-widest">Share</TabsTrigger>
              <TabsTrigger value="access" className="w-1/3 text-[10px] font-black uppercase tracking-widest">Users</TabsTrigger>
              {item.type === 'file' && <TabsTrigger value="public" className="w-1/3 text-[10px] font-black uppercase tracking-widest">Public</TabsTrigger>}
            </TabsList>

            <TabsContent value="share" className="space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity (Email)</p>
                <Input value={shareEmail} onChange={e => setShareEmail(e.target.value)} placeholder="user@example.com" className="rounded-xl border-2 font-bold h-12" />
              </div>
              <div className="flex gap-2 p-1 bg-slate-50 rounded-xl border-2">
                <VaultButton variant={shareRelation === 'viewer' ? 'default' : 'ghost'} className="flex-1 rounded-lg text-[9px] h-10" onClick={() => setShareRelation('viewer')}>VIEWER</VaultButton>
                <VaultButton variant={shareRelation === 'editor' ? 'default' : 'ghost'} className="flex-1 rounded-lg text-[9px] h-10" onClick={() => setShareRelation('editor')}>EDITOR</VaultButton>
              </div>
              <VaultButton onClick={handleShare} className="w-full py-7 text-xs bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200">GRANT_ACCESS_SIGNAL</VaultButton>
            </TabsContent>

            <TabsContent value="access">
              <ScrollArea className="h-56 border-2 border-slate-100 rounded-2xl p-2 bg-slate-50/50">
                {accessList?.map(acc => (
                  <div key={acc.user_id} className="flex justify-between items-center p-3 bg-white border-2 border-slate-100 rounded-xl mb-2 hover:border-slate-200 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-slate-900 truncate max-w-[180px]">{acc.email || acc.user_id.substring(0,18)}</span>
                      <VaultBadge className={`${acc.relation === 'owner' ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-400'} mt-1 self-start`}>
                        {acc.relation}
                      </VaultBadge>
                    </div>
                    {acc.relation !== 'owner' && (
                      <VaultButton variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleRevoke(acc.user_id, acc.relation)}>
                        <UserX size={14}/>
                      </VaultButton>
                    )}
                  </div>
                ))}
                {!accessList?.length && <div className="text-center py-10 text-slate-300 font-black text-[10px] uppercase tracking-tighter">No_Collaborators_Found</div>}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="public" className="space-y-6">
              {publicToken ? (
                <div className="p-5 bg-emerald-50 border-4 border-emerald-500/20 rounded-[1.5rem] flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                     <div className="bg-emerald-500 w-2 h-2 rounded-full animate-pulse" />
                     <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Public_Signal_Active</span>
                  </div>
                  <div className="bg-white border-2 border-emerald-100 p-3 rounded-xl font-mono text-[9px] break-all text-emerald-800 shadow-inner">
                    {`${window.location.origin}/public/${publicToken}`}
                  </div>
                  <div className="flex gap-3 mt-1">
                    <VaultButton className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-12 text-[10px]" onClick={() => {navigator.clipboard.writeText(`${window.location.origin}/public/${publicToken}`); toast.success("Link Copied!");}}>COPY_URL</VaultButton>
                    <VaultButton variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50 h-12 text-[10px]" onClick={handleRevokePublic}>REVOKE_LINK</VaultButton>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 space-y-4">
                    <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
                        <LinkIcon size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Generate a non-guessable token for direct read access without login.</p>
                    </div>
                    <VaultButton onClick={handlePublicLink} className="w-full py-7 bg-slate-900">INITIALIZE_PUBLIC_LINK</VaultButton>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
