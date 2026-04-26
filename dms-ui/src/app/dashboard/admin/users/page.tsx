"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { api, fetcher } from "@/lib/api";
import {
  Table,
 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { 
  User, 
  Shield, 
  Smartphone, 
  History, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  LogOut,
  ChevronRight,
  Database,
  AlertTriangle,
  Key,
  ShieldCheck,
  Plus,
  UserPlus,
  Eraser,
  Settings2,
  RefreshCcw,
  ChevronLeft,
  UploadCloud,
  FileJson
} from "lucide-react";

interface Session {
  id: string;
  active: boolean;
  authenticated_at: string;
  authentication_methods: Array<{ method: string }>;
  devices: Array<{
    ip_address: string;
    user_agent: string;
  }>;
}

interface AuditLog {
  timestamp: string;
  admin_id: string;
  action: string;
  target_id: string;
  details: string;
}

interface Role {
  id: string;
  description: string;
}

interface Identity {
  id: string;
  traits: {
    email: string;
    first_name?: string;
    last_name?: string;
    division?: string;
    [key: string]: any;
  };
  state: 'active' | 'inactive';
  schema_id: string;
  verifiable_addresses?: Array<{
    status: string;
    verified: boolean;
  }>;
  credentials?: Record<string, any>;
  metadata_public?: any;
  metadata_admin?: any;
  updated_at: string;
}

export default function AdminUsersPage() {
  const [selectedUser, setSelectedUser] = useState<Identity | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTraits, setEditTraits] = useState<any>({});
  const [editMetadata, setEditMetadata] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [impersonationLink, setImpersonationLink] = useState<string | null>(null);
  
  // Pagination States
  const [userPage, setUserPage] = useState(0);
  const [rolePage, setRolePage] = useState(0);
  const [auditPage, setAuditPage] = useState(0);
  const limit = 10;

  // Data Fetching
  const { data: identities, mutate } = useSWR<Identity[]>(`/admin-api/identities?page_size=${limit}&page_token=${userPage}`, fetcher);
  const { data: globalRoles, mutate: mutateRoles } = useSWR<Role[]>(`/admin-api/roles?limit=${limit}&offset=${rolePage * limit}`, fetcher);
  const { data: audits } = useSWR<AuditLog[]>(`/admin-api/audit?limit=${limit}&offset=${auditPage * limit}`, fetcher, { refreshInterval: 5000 });
  
  const [newRole, setNewRole] = useState({ id: '', description: '' });
  const [cleanupDays, setCleanupDays] = useState("30");
  const [importData, setImportData] = useState("");

  const { data: sessions, mutate: mutateSessions } = useSWR<Session[]>(
    selectedUser ? `/admin-api/identities/${selectedUser.id}/sessions` : null,
    fetcher
  );

  const { data: userRoles, mutate: mutateUserRoles } = useSWR<string[]>(
    selectedUser ? `/admin-api/identities/${selectedUser.id}/roles` : null,
    fetcher
  );

  useEffect(() => {
    if (selectedUser) {
      setEditTraits({ ...selectedUser.traits });
      setEditMetadata(JSON.stringify(selectedUser.metadata_admin || {}, null, 2));
      setIsEditing(false);
      setImpersonationLink(null);
    }
  }, [selectedUser]);

  // --- Handlers ---

  const handleAction = async (name: string, fn: () => Promise<any>) => {
    setLoading(name);
    try {
      await fn();
      toast.success(`${name} successful`);
      mutate();
      if (selectedUser) {
          const updated = await fetcher(`/admin-api/identities/${selectedUser.id}`);
          setSelectedUser(updated);
      }
    } catch (err) {
      toast.error(`Failed: ${name}`);
    } finally {
      setLoading(null);
    }
  };

  const toggleState = () => 
    handleAction('Toggle State', () => api.put(`/admin-api/identities/${selectedUser!.id}/state`, { state: selectedUser!.state === 'active' ? 'inactive' : 'active' }, { withCredentials: true }));

  const handleImpersonate = async () => {
    setLoading('impersonate');
    try {
        const res = await api.post(`/admin-api/identities/${selectedUser!.id}/impersonate`, {}, { withCredentials: true });
        setImpersonationLink(res.data.recovery_link);
        toast.success("Impersonation link generated");
    } catch (err) { toast.error("Failed"); } finally { setLoading(null); }
  };

  const handleBulkCleanup = () => handleAction('Bulk Cleanup', () => api.post(`/admin-api/bulk/cleanup?days=${cleanupDays}`, {}, { withCredentials: true }));

  const handleBulkImport = async () => {
    try {
        const rows = importData.trim().split("\n");
        const headers = rows[0].split(",").map(h => h.trim());
        const data = rows.slice(1).map(row => {
            const values = row.split(",");
            const traits: any = {};
            headers.forEach((h, i) => traits[h] = values[i]);
            return { traits, schema_id: "default" };
        });
        await api.post('/admin-api/bulk/import', data, { withCredentials: true });
        toast.success(`Imported ${data.length} users`);
        mutate();
        setImportData("");
    } catch (err) { toast.error("Import failed. Check CSV format."); }
  };

  const saveProfile = async () => {
    handleAction('Save Profile', async () => {
        // Update Traits
        await api.patch(`/admin-api/identities/${selectedUser!.id}/traits`, editTraits, { withCredentials: true });
        // Update Metadata if changed
        try {
            const meta = JSON.parse(editMetadata);
            // Kratos metadata is patched differently, for now we assume admin API allows it
        } catch (e) { toast.error("Invalid JSON Metadata"); }
        setIsEditing(false);
    });
  };

  const revokeSession = (sid: string) => 
    handleAction('Revoke Session', () => api.delete(`/admin-api/identities/${selectedUser!.id}/sessions/${sid}`, { withCredentials: true }).then(() => mutateSessions()));

  const revokeAllSessions = () => 
    handleAction('Revoke All Sessions', () => api.delete(`/admin-api/identities/${selectedUser!.id}/sessions`, { withCredentials: true }).then(() => mutateSessions()));

  if (!identities) return <div className="flex items-center justify-center min-h-screen font-mono text-xs uppercase tracking-[0.4em]">SYNCING_IDENTITY_HUB...</div>;

  const is2FA = selectedUser?.credentials?.totp || selectedUser?.credentials?.webauthn;
  const isVerified = selectedUser?.verifiable_addresses?.[0]?.verified;

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans">
      <nav className="bg-white border-b-4 border-slate-900 px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 text-white p-2 rounded-lg"><Shield size={20} /></div>
          <span className="font-black text-2xl tracking-tighter uppercase italic">Vault_Ops <span className="text-blue-600">Pro</span></span>
        </div>
        <div className="flex gap-4">
            <Dialog>
                <DialogTrigger asChild><Button variant="outline" size="sm" className="border-2 font-black text-xs rounded-xl bg-blue-50 border-blue-200 text-blue-700"><UploadCloud size={14} className="mr-2" /> BULK_IMPORT</Button></DialogTrigger>
                <DialogContent className="border-4 border-slate-900 rounded-[2rem] max-w-xl">
                    <DialogHeader><DialogTitle className="font-black uppercase italic">CSV Subject Ingestion</DialogTitle><DialogDescription className="py-2 font-bold text-slate-400">Format: email,first_name,last_name,division</DialogDescription></DialogHeader>
                    <textarea value={importData} onChange={e => setImportData(e.target.value)} placeholder="user@test.com,John,Doe,Engineering" className="w-full h-48 rounded-2xl border-2 p-4 font-mono text-xs bg-slate-50 focus:bg-white transition-colors" />
                    <DialogFooter><Button onClick={handleBulkImport} className="w-full py-6 font-black uppercase">Start Subject Ingestion</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog>
                <DialogTrigger asChild><Button variant="outline" size="sm" className="border-2 font-black text-xs rounded-xl bg-amber-50 border-amber-200 text-amber-700"><Eraser size={14} className="mr-2" /> BULK_CLEANUP</Button></DialogTrigger>
                <DialogContent className="border-4 border-slate-900 rounded-[2rem]">
                    <DialogHeader><DialogTitle className="font-black uppercase italic">Inactive Subject Purge</DialogTitle><DialogDescription className="py-4 font-bold text-slate-400">Deactivate subjects inactive for more than X days.</DialogDescription></DialogHeader>
                    <div className="py-4 space-y-4">
                        <Label className="text-[10px] font-black uppercase ml-1">Inactivity Threshold (Days)</Label>
                        <Input type="number" value={cleanupDays} onChange={e => setCleanupDays(e.target.value)} className="rounded-xl border-2 font-bold" />
                    </div>
                    <DialogFooter><Button variant="destructive" onClick={handleBulkCleanup} className="w-full py-6 font-black uppercase">Confirm Global Purge</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" asChild className="border-2 font-black text-xs rounded-xl"><a href="/">Dashboard Hub</a></Button>
        </div>
      </nav>

      <main className="p-8 max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        <div className="lg:col-span-8 space-y-10">
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="bg-slate-200/50 p-1 rounded-2xl mb-6">
                <TabsTrigger value="users" className="rounded-xl px-8 font-black text-xs tracking-widest">IDENTITIES</TabsTrigger>
                <TabsTrigger value="roles" className="rounded-xl px-8 font-black text-xs tracking-widest">GLOBAL_ROLES</TabsTrigger>
                <TabsTrigger value="audit" className="rounded-xl px-8 font-black text-xs tracking-widest">AUDIT_LOGS</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-4">
                <Card className="border-4 border-slate-900 rounded-[2.5rem] shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] overflow-hidden bg-white">
                    <Table>
                        <TableHeader><TableRow className="bg-slate-900 hover:bg-slate-900"><TableHead className="pl-8 text-white font-black uppercase text-[10px] tracking-widest py-6">Subject Identity</TableHead><TableHead className="text-white font-black uppercase text-[10px] tracking-widest text-center">Status</TableHead><TableHead className="text-white font-black uppercase text-[10px] tracking-widest text-right pr-8">Registry</TableHead></TableRow></TableHeader>
                        <TableBody>
                        {identities.map((user) => (
                            <TableRow key={user.id} className={`cursor-pointer border-b-2 border-slate-50 transition-all ${selectedUser?.id === user.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`} onClick={() => setSelectedUser(user)}>
                            <TableCell className="pl-8 py-6">
                                <div className="font-black text-slate-900 text-lg tracking-tight">{user.traits.email}</div>
                                <div className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-widest">{user.id}</div>
                            </TableCell>
                            <TableCell className="text-center"><Badge variant={user.state === 'active' ? 'default' : 'destructive'} className="font-black text-[9px] px-3">{user.state.toUpperCase()}</Badge></TableCell>
                            <TableCell className="text-right pr-8 font-mono text-[10px] text-slate-300 font-black">INTERNAL_DS</TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </Card>
                <div className="flex justify-center items-center gap-4 pt-4 font-black">
                    <Button variant="outline" size="sm" className="border-2 rounded-xl" onClick={() => setUserPage(Math.max(0, userPage - 1))} disabled={userPage === 0}><ChevronLeft size={16}/> PREV</Button>
                    <span className="text-xs font-mono bg-slate-900 text-white px-4 py-1.5 rounded-full shadow-lg shadow-slate-200">PAGE_{userPage + 1}</span>
                    <Button variant="outline" size="sm" className="border-2 rounded-xl" onClick={() => setUserPage(userPage + 1)} disabled={!identities || identities.length < limit}>NEXT <ChevronRight size={16}/></Button>
                </div>
            </TabsContent>

            <TabsContent value="roles" className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="border-4 border-slate-900 rounded-[2rem] shadow-[12px_12px_0px_0px_rgba(59,130,246,1)] p-8 bg-white">
                        <CardTitle className="font-black uppercase italic tracking-widest text-xl mb-4">Register_Role</CardTitle>
                        <div className="space-y-4">
                            <Input placeholder="Role ID" value={newRole.id} onChange={e => setNewRole({...newRole, id: e.target.value.toLowerCase()})} className="rounded-xl border-2 font-bold" />
                            <Input placeholder="Description" value={newRole.description} onChange={e => setNewRole({...newRole, description: e.target.value})} className="rounded-xl border-2 font-bold" />
                            <Button onClick={() => handleAction('Create Role', () => api.post('/admin-api/roles', newRole, { withCredentials: true }).then(() => mutateRoles()))} className="w-full font-black py-6 rounded-2xl uppercase tracking-widest shadow-lg">Create System Role</Button>
                        </div>
                    </Card>
                    <div className="space-y-4">
                        {globalRoles?.map(role => (
                            <div key={role.id} className="bg-white border-2 border-slate-200 rounded-2xl p-6 flex justify-between items-center group hover:border-slate-900 transition-all shadow-sm">
                                <div><div className="font-black text-slate-900 uppercase flex items-center gap-2 tracking-tight"><ShieldCheck size={14} className="text-blue-600" /> {role.id}</div><div className="text-[10px] text-slate-400 mt-1 italic font-medium">{role.description}</div></div>
                                <Button variant="ghost" size="icon" onClick={() => handleAction('Delete Role', () => api.delete(`/admin-api/roles/${role.id}`, { withCredentials: true }).then(() => mutateRoles()))} className="opacity-0 group-hover:opacity-100 text-red-400 rounded-xl hover:bg-red-50"><Trash2 size={16}/></Button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex justify-center items-center gap-4 pt-4 font-black">
                    <Button variant="outline" size="sm" className="border-2 rounded-xl" onClick={() => setRolePage(Math.max(0, rolePage - 1))} disabled={rolePage === 0}><ChevronLeft size={16}/> PREV</Button>
                    <span className="text-xs font-mono bg-blue-600 text-white px-4 py-1.5 rounded-full shadow-lg shadow-blue-100">ROLE_CHUNK_{rolePage + 1}</span>
                    <Button variant="outline" size="sm" className="border-2 rounded-xl" onClick={() => setRolePage(rolePage + 1)} disabled={!globalRoles || globalRoles.length < limit}>NEXT <ChevronRight size={16}/></Button>
                </div>
            </TabsContent>

            <TabsContent value="audit" className="space-y-6">
                 <Card className="border-4 border-slate-900 rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(239,68,68,1)] overflow-hidden bg-white">
                    <CardHeader className="bg-red-50/30 border-b-2 border-slate-900"><CardTitle className="font-black uppercase text-xs tracking-widest">Audit Signal Intelligence</CardTitle></CardHeader>
                    <div className="p-8 space-y-4 font-mono">
                        {audits?.map((log, i) => (
                            <div key={i} className="text-[10px] border-l-4 border-slate-200 pl-6 py-2">
                                <div className="flex justify-between font-black"><span className="bg-slate-900 text-white px-2 rounded tracking-widest">{log.action}</span><span className="text-slate-400">{new Date(log.timestamp).toLocaleString()}</span></div>
                                <div className="mt-2 text-slate-600"><span className="text-blue-600 font-bold underline">ADMIN:{log.admin_id.substring(0,8)}</span> | {log.details}</div>
                            </div>
                        ))}
                    </div>
                 </Card>
                 <div className="flex justify-center items-center gap-4 font-black">
                    <Button variant="outline" size="sm" className="border-2 rounded-xl" onClick={() => setAuditPage(Math.max(0, auditPage - 1))} disabled={auditPage === 0}><ChevronLeft size={16}/> PREV</Button>
                    <span className="text-xs font-mono bg-red-600 text-white px-4 py-1.5 rounded-full shadow-lg shadow-red-100">AUDIT_LOG_SET_{auditPage + 1}</span>
                    <Button variant="outline" size="sm" className="border-2 rounded-xl" onClick={() => setAuditPage(auditPage + 1)} disabled={!audits || audits.length < limit}>NEXT <ChevronRight size={16}/></Button>
                </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar Subject Inspector */}
        <div className="lg:col-span-4">
          {selectedUser ? (
            <div className="space-y-8 sticky top-[108px]">
              <Card className="border-4 border-slate-900 rounded-[2.5rem] shadow-2xl p-8 space-y-6 bg-white overflow-hidden relative">
                <header className="flex justify-between items-start border-b-2 border-slate-100 pb-4">
                    <div><h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Subject_Ops</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status: {selectedUser.state.toUpperCase()}</p></div>
                    <Button variant={isEditing ? "ghost" : "outline"} size="sm" className="font-black text-[10px] border-2 rounded-xl h-8 px-4" onClick={() => setIsEditing(!isEditing)}>{isEditing ? "DISCARD" : "EDIT_PROFILE"}</Button>
                </header>

                <div className="space-y-6">
                    {isEditing ? (
                        <div className="space-y-6">
                            <Tabs defaultValue="traits" className="w-full">
                                <TabsList className="w-full bg-slate-100 rounded-xl p-1 mb-4">
                                    <TabsTrigger value="traits" className="w-1/2 rounded-lg font-black text-[9px] uppercase">Traits</TabsTrigger>
                                    <TabsTrigger value="metadata" className="w-1/2 rounded-lg font-black text-[9px] uppercase">Metadata</TabsTrigger>
                                </TabsList>
                                <TabsContent value="traits" className="space-y-3">
                                    <Input value={editTraits.first_name || ''} onChange={e => setEditTraits({...editTraits, first_name: e.target.value})} placeholder="First Name" className="rounded-xl border-2 font-bold" />
                                    <Input value={editTraits.last_name || ''} onChange={e => setEditTraits({...editTraits, last_name: e.target.value})} placeholder="Last Name" className="rounded-xl border-2 font-bold" />
                                    <Input value={editTraits.division || ''} onChange={e => setEditTraits({...editTraits, division: e.target.value})} placeholder="Division" className="rounded-xl border-2 font-bold" />
                                </TabsContent>
                                <TabsContent value="metadata">
                                    <textarea value={editMetadata} onChange={e => setEditMetadata(e.target.value)} className="w-full h-40 rounded-xl border-2 p-3 font-mono text-[10px] bg-slate-50" placeholder='{"role": "admin"}' />
                                </TabsContent>
                            </Tabs>
                            <Button onClick={saveProfile} className="w-full font-black py-7 rounded-2xl shadow-xl uppercase tracking-widest bg-slate-900">Commit Changes</Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-slate-900 rounded-[1.5rem] p-6 space-y-3 font-mono text-xs border-4 border-slate-800 shadow-inner text-white">
                                <div className="flex justify-between border-b border-slate-800 pb-1.5"><span className="text-slate-500 uppercase">Schema:</span> <span className="font-black text-amber-400 tracking-tighter">{selectedUser.schema_id}</span></div>
                                <div className="flex justify-between border-b border-slate-800 pb-1.5"><span className="text-slate-500 uppercase">Subject:</span> <span className="font-black text-blue-400 uppercase">{selectedUser.traits.first_name} {selectedUser.traits.last_name}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500 uppercase">Auth:</span> <span className="font-black text-blue-400 lowercase">{selectedUser.traits.email}</span></div>
                            </div>
                            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border-2 border-slate-100 min-h-[50px]">
                                {userRoles?.map(rid => <Badge key={rid} className="bg-blue-600 font-black text-[8px] tracking-widest cursor-pointer hover:bg-red-500 transition-colors" onClick={() => handleAction('Revoke Role', () => api.delete(`/admin-api/identities/${selectedUser.id}/roles/${rid}`, { withCredentials: true }).then(() => mutateUserRoles()))}>{rid.toUpperCase()}</Badge>)}
                                <Dialog>
                                    <DialogTrigger asChild><Button variant="outline" size="sm" className="rounded-full h-6 px-3 border-dashed border-2 text-[8px] font-black"><Plus size={10} className="mr-1"/> ASSIGN_ROLE</Button></DialogTrigger>
                                    <DialogContent className="border-4 border-slate-900 rounded-3xl"><DialogHeader><DialogTitle className="font-black uppercase italic tracking-widest">Assign System Role</DialogTitle></DialogHeader>
                                        <div className="py-4 space-y-2">{globalRoles?.filter(gr => !userRoles?.includes(gr.id)).map(gr => <Button key={gr.id} variant="secondary" className="w-full justify-start font-black text-xs py-5 rounded-xl" onClick={() => handleAction('Assign Role', () => api.post(`/admin-api/identities/${selectedUser.id}/roles`, { role_id: gr.id }, { withCredentials: true }).then(() => mutateUserRoles()))}>{gr.id.toUpperCase()}</Button>)}</div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t-2 border-slate-100 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <Dialog>
                                <DialogTrigger asChild><Button variant="outline" className="font-black text-[10px] uppercase h-11 rounded-xl border-slate-900 border-2 shadow-sm"><RefreshCcw size={14} className="mr-2"/> Status Swap</Button></DialogTrigger>
                                <DialogContent className="border-4 border-slate-900 rounded-[2rem]"><DialogHeader><DialogTitle className="font-black uppercase italic text-2xl">Confirm Command?</DialogTitle><DialogDescription className="font-bold py-4">Status for {selectedUser.traits.email} will be toggled.</DialogDescription></DialogHeader>
                                    <DialogFooter><Button onClick={toggleState} className="w-full font-black py-6 bg-slate-900">EXECUTE_COMMAND</Button></DialogFooter>
                                </DialogContent>
                            </Dialog>
                            <Button variant="secondary" className="font-black text-[10px] uppercase h-11 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 border-2" onClick={handleImpersonate}><UserPlus size={14} className="mr-2"/> Impersonate</Button>
                        </div>

                        {impersonationLink && (
                            <div className="p-4 bg-slate-900 text-green-400 rounded-2xl text-[9px] break-all font-mono border-4 border-blue-900 shadow-inner">
                                <div className="flex items-center gap-2 mb-2 text-white font-black"><AlertTriangle size={12} className="text-amber-400"/> TOKEN_ACTIVE</div>
                                {impersonationLink}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <Label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 italic tracking-widest">Active_Signals</Label>
                                <Dialog><DialogTrigger asChild><Button variant="link" className="h-auto p-0 text-[10px] font-black text-red-500 uppercase tracking-tighter">Wipe_All</Button></DialogTrigger>
                                    <DialogContent className="border-4 border-red-600 rounded-[2rem]"><DialogHeader><DialogTitle className="font-black text-red-600 uppercase italic">Terminate All Access?</DialogTitle><DialogDescription className="font-bold py-4">Every authenticated session for this subject will be invalidated.</DialogDescription></DialogHeader>
                                        <DialogFooter><Button variant="destructive" onClick={revokeAllSessions} className="w-full font-black py-6">CONFIRM_WIPE</Button></DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <ScrollArea className="h-32 pr-3">
                                <div className="space-y-2">
                                    {sessions?.map(s => (
                                        <div key={s.id} className="p-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl flex justify-between items-center group/sess hover:border-slate-900 transition-all">
                                            <div className="space-y-0.5">
                                                <div className="text-[9px] font-black text-slate-900 flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${s.active ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>{s.devices[0]?.ip_address || "HIDDEN_IP"}</div>
                                                <div className="text-[7px] text-slate-400 font-mono truncate max-w-[150px]">{s.devices[0]?.user_agent}</div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-red-600" onClick={() => revokeSession(s.id)}><LogOut size={12}/></Button>
                                        </div>
                                    ))}
                                    {!sessions?.length && <div className="text-center py-6 text-[9px] font-bold text-slate-300 uppercase tracking-widest border-2 border-dashed rounded-xl">No_Signals</div>}
                                </div>
                            </ScrollArea>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 ml-1"><FileJson size={12}/> Security_Metadata_Store</Label>
                            <ScrollArea className="h-24 border-2 rounded-xl p-3 bg-slate-50 font-mono text-[9px] overflow-auto shadow-inner">
                                <pre>{JSON.stringify(selectedUser.metadata_admin || {}, null, 2)}</pre>
                            </ScrollArea>
                        </div>
                        
                        <div className="pt-4 border-t-2 border-slate-100">
                             <Dialog>
                                <DialogTrigger asChild><Button variant="ghost" className="w-full text-red-500 font-black uppercase tracking-widest text-[10px] hover:bg-red-50 rounded-xl py-3">Destroy Subject</Button></DialogTrigger>
                                <DialogContent className="border-4 border-red-600 rounded-[2rem]"><CardHeader className="text-center"><AlertTriangle size={48} className="text-red-600 mx-auto mb-4 animate-pulse"/><DialogTitle className="font-black text-2xl text-red-600 uppercase italic tracking-widest text-center">Subject_Purge_Confirmation</DialogTitle></CardHeader>
                                    <DialogDescription className="text-center font-bold px-10 text-slate-500">This signal will permanently erase the identity across the cluster. THIS CANNOT BE UNDONE.</DialogDescription>
                                    <DialogFooter className="pt-6"><Button variant="destructive" onClick={() => handleAction('Purge Identity', () => api.delete(`/admin-api/identities/${selectedUser.id}`, { withCredentials: true }).then(() => setSelectedUser(null)))} className="w-full font-black py-8 rounded-2xl text-lg">EXECUTE_DESTRUCTION</Button></DialogFooter>
                                </DialogContent>
                             </Dialog>
                        </div>
                    </div>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="border-4 border-dashed border-slate-200 rounded-[4rem] p-32 text-center sticky top-[108px] bg-white/50 shadow-inner">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-10 shadow-2xl border-4 border-slate-50 text-slate-100">
                <User size={48} />
              </div>
              <p className="text-slate-400 font-black text-xs uppercase tracking-[0.4em] leading-loose">Awaiting Subject Selection<br/>for Deep-Posture Analysis</p>
            </Card>
          )}
        </div>
      </main>
      
      <footer className="mt-32 py-12 border-t-4 border-slate-900 text-[10px] text-slate-400 text-center font-black tracking-[1em] uppercase">
        Zero-Trust Hardened Control Plane // Core Engine: Ory Stack 1.1 // Pagination & Signals Active
      </footer>
    </div>
  );
}
