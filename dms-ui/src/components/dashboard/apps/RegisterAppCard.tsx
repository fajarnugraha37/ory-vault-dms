"use client";

import React, { useState } from "react";
import { VaultCard, VaultButton } from "@/components/shared/VaultPrimitives";
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, ShieldCheck, Copy } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export const RegisterAppCard = ({ onSuccess }: { onSuccess: () => void }) => {
  const [appName, setAppName] = useState("");
  const [redirectUris, setRedirectUris] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdClient, setCreatedClient] = useState<any>(null);

  const handleCreate = async () => {
    if (!appName.trim() || !redirectUris.trim()) {
      toast.error("App name and redirect URIs are required");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/oauth2/clients", {
        client_name: appName,
        redirect_uris: redirectUris.split(",").map(s => s.trim())
      });
      
      setCreatedClient(res.data);
      setAppName("");
      setRedirectUris("");
      onSuccess();
      toast.success("Application registered successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (createdClient) {
    return (
      <VaultCard variant="emerald" className="p-8 space-y-4 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center gap-2 text-emerald-700">
          <ShieldCheck size={24} />
          <h3 className="font-black uppercase italic tracking-tight text-xl">Credentials_Generated</h3>
        </div>
        <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-4">SAVE THESE NOW! They will not be shown again.</p>
        
        <div className="grid gap-4">
          <div className="bg-white border-2 border-emerald-200 p-4 rounded-xl">
            <div className="flex justify-between items-center mb-1">
                <p className="text-[9px] font-black text-slate-400 uppercase">Client ID</p>
                <VaultButton variant="ghost" size="icon" className="h-6 w-6 text-emerald-400" onClick={() => {navigator.clipboard.writeText(createdClient.client_id); toast.success("Copied!");}}><Copy size={12}/></VaultButton>
            </div>
            <code className="text-xs font-mono font-bold break-all text-slate-800">{createdClient.client_id}</code>
          </div>
          <div className="bg-white border-2 border-emerald-200 p-4 rounded-xl">
            <div className="flex justify-between items-center mb-1">
                <p className="text-[9px] font-black text-slate-400 uppercase">Client Secret</p>
                <VaultButton variant="ghost" size="icon" className="h-6 w-6 text-emerald-400" onClick={() => {navigator.clipboard.writeText(createdClient.client_secret); toast.success("Copied!");}}><Copy size={12}/></VaultButton>
            </div>
            <code className="text-xs font-mono font-bold break-all text-pink-600">{createdClient.client_secret}</code>
          </div>
        </div>
        <VaultButton variant="outline" className="w-full border-emerald-500 text-emerald-700 h-12 mt-2" onClick={() => setCreatedClient(null)}>I HAVE SAVED THEM</VaultButton>
      </VaultCard>
    );
  }

  return (
    <VaultCard variant="indigo" className="overflow-hidden bg-white sticky top-28">
      <CardHeader className="bg-slate-900 text-white p-8">
        <CardTitle className="text-2xl font-black uppercase italic tracking-tight">Register_New_App</CardTitle>
        <CardDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">
          Create an OAuth2 Client for Third-Party Integration
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">App Display Name</Label>
            <Input 
              value={appName} 
              onChange={e => setAppName(e.target.value)} 
              placeholder="e.g. My Custom Bot" 
              className="rounded-xl border-2 font-bold h-14 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Redirect URIs (comma separated)</Label>
            <Input 
              value={redirectUris} 
              onChange={e => setRedirectUris(e.target.value)} 
              placeholder="https://my-app.com/callback" 
              className="rounded-xl border-2 font-mono h-14 text-xs"
            />
          </div>
        </div>
        <VaultButton 
          onClick={handleCreate} 
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-8 text-sm"
        >
          <Plus size={20} className="mr-2" /> {loading ? "PROVISIONING..." : "CREATE APPLICATION"}
        </VaultButton>
      </CardContent>
    </VaultCard>
  );
};
