"use client"

import { useState } from "react"
import useSWR from "swr"
import { api, fetcher } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { 
  Plus, 
  Trash2, 
  ExternalLink, 
  Globe, 
  ShieldCheck, 
  Fingerprint,
  ArrowLeft,
  Settings,
  Database,
  Copy
  } from "lucide-react";

interface OAuth2Client {
  id: string;
  client_id: string;
  client_name?: string;
  created_at: string;
  redirect_uris?: string[];
}

export default function AppsManagementPage() {
  const { data: clients, mutate } = useSWR<OAuth2Client[]>('/api/oauth2/clients', fetcher);
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
      mutate();
      toast.success("Application registered successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (clientId: string) => {
    if (!confirm("Are you sure you want to delete this application? Access tokens will be revoked.")) return;
    
    try {
      await api.delete(`/api/oauth2/clients/${clientId}`);
      mutate();
      toast.success("Application removed");
    } catch (err) {
      toast.error("Deletion failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      <nav className="bg-white border-b-4 border-slate-900 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2 rounded-lg"><Settings size={20} /></div>
          <span className="font-black text-2xl tracking-tighter uppercase italic">App_Forge <span className="text-slate-400">Portal</span></span>
        </div>
        <Button variant="outline" size="sm" asChild className="border-2 font-black text-xs rounded-xl hover:bg-slate-900 hover:text-white transition-all">
          <a href="/dashboard/documents"><ArrowLeft size={14} className="mr-2"/> Back to Vault</a>
        </Button>
      </nav>

      <main className="p-8 max-w-4xl mx-auto space-y-10 mt-4">
        {/* Registration Section */}
        <Card className="border-4 border-slate-900 rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(79,70,229,0.2)] overflow-hidden bg-white">
          <CardHeader className="bg-slate-900 text-white p-8">
            <CardTitle className="text-2xl font-black uppercase italic tracking-tight">Register_New_App</CardTitle>
            <CardDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">
              Create an OAuth2 Client for Third-Party Integration
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <Button 
              onClick={handleCreate} 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-8 rounded-2xl text-sm uppercase tracking-[0.2em] shadow-lg transition-all active:translate-y-1"
            >
              <Plus size={20} className="mr-2" /> {loading ? "PROVISIONING..." : "CREATE APPLICATION"}
            </Button>
          </CardContent>
        </Card>

        {/* Credentials Reveal (One-time) */}
        {createdClient && (
          <div className="bg-emerald-50 border-4 border-emerald-500 rounded-[2rem] p-8 space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <ShieldCheck size={24} />
              <h3 className="font-black uppercase italic tracking-tight text-xl">Credentials_Generated</h3>
            </div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-4">SAVE THESE NOW! They will not be shown again.</p>
            
            <div className="grid gap-4">
              <div className="bg-white border-2 border-emerald-200 p-4 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Client ID</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-400" onClick={() => {navigator.clipboard.writeText(createdClient.client_id); toast.success("Copied!");}}><Copy size={12}/></Button>
                </div>
                <code className="text-xs font-mono font-bold break-all text-slate-800">{createdClient.client_id}</code>
              </div>
              <div className="bg-white border-2 border-emerald-200 p-4 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Client Secret</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-400" onClick={() => {navigator.clipboard.writeText(createdClient.client_secret); toast.success("Copied!");}}><Copy size={12}/></Button>
                </div>
                <code className="text-xs font-mono font-bold break-all text-pink-600">{createdClient.client_secret}</code>
              </div>
            </div>
            <Button variant="outline" className="w-full border-2 border-emerald-500 text-emerald-700 font-black rounded-xl h-12 mt-2" onClick={() => setCreatedClient(null)}>I HAVE SAVED THEM</Button>
          </div>
        )}

        {/* List of Applications */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Globe size={20} className="text-slate-400" />
            <h2 className="font-black text-slate-900 uppercase tracking-tight text-xl italic">Active_Integrations</h2>
            <Badge variant="secondary" className="ml-2 font-black rounded-lg">{clients?.length || 0}</Badge>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {clients?.map((client) => (
              <Card key={client.client_id} className="border-2 border-slate-200 hover:border-slate-900 rounded-2xl transition-all group">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <Fingerprint size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900">{client.client_name || "Unnamed Application"}</h4>
                      <p className="text-[10px] font-mono text-slate-400 mt-1">{client.client_id}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right mr-4 hidden md:block">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Redirects</p>
                        <div className="flex gap-1 justify-end">
                            {client.redirect_uris?.slice(0, 2).map((u, i) => <Badge key={i} variant="outline" className="text-[8px] h-4">URI</Badge>)}
                            {(client.redirect_uris?.length || 0) > 2 && <Badge variant="outline" className="text-[8px] h-4">+{client.redirect_uris!.length - 2}</Badge>}
                        </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-10 w-10 rounded-xl border-2 text-red-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200"
                      onClick={() => handleDelete(client.client_id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {!clients?.length && !loading && (
              <div className="text-center py-20 bg-slate-100/50 rounded-[2.5rem] border-2 border-dashed border-slate-300">
                <Database size={40} className="mx-auto text-slate-300 mb-4" />
                <p className="font-black text-slate-400 uppercase tracking-widest text-xs">No applications registered</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
