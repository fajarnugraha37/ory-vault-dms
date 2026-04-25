"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import axios from "axios";
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
  Plus
} from "lucide-react";

const fetcher = (url: string) => axios.get(url, { withCredentials: true }).then(res => res.data);

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
  target: string;
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
  };
  state: 'active' | 'inactive';
  verifiable_addresses?: Array<{
    status: string;
    verified: boolean;
  }>;
  credentials?: Record<string, any>;
  metadata_public?: any;
  metadata_admin?: any;
  created_at: string;
  updated_at: string;
}

export default function AdminUsersPage() {
  const { data: identities, mutate } = useSWR<Identity[]>('/admin-api/identities', fetcher);
  const { data: audits } = useSWR<AuditLog[]>('/admin-api/audit', fetcher, { refreshInterval: 5000 });
  const { data: globalRoles, mutate: mutateRoles } = useSWR<Role[]>('/admin-api/roles', fetcher);
  
  const [selectedUser, setSelectedUser] = useState<Identity | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTraits, setEditTraits] = useState<any>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [recoveryLink, setRecoveryLink] = useState<string | null>(null);
  
  // New Role Form State
  const [newRole, setNewRole] = useState({ id: '', description: '' });

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
      setIsEditing(false);
      setRecoveryLink(null);
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

  const revokeSession = (sid: string) => 
    handleAction('Revoke Session', () => axios.delete(`/admin-api/identities/${selectedUser!.id}/sessions/${sid}`, { withCredentials: true }).then(() => mutateSessions()));

  const revokeAllSessions = () => 
    handleAction('Revoke All Sessions', () => axios.delete(`/admin-api/identities/${selectedUser!.id}/sessions`, { withCredentials: true }).then(() => mutateSessions()));

  const toggleState = () => 
    handleAction('Toggle State', () => axios.put(`/admin-api/identities/${selectedUser!.id}/state`, { state: selectedUser!.state === 'active' ? 'inactive' : 'active' }, { withCredentials: true }));

  const manualVerify = () => 
    handleAction('Verify Email', () => axios.post(`/admin-api/identities/${selectedUser!.id}/verify`, {}, { withCredentials: true }));

  const generateRecovery = async () => {
    setLoading('recovery');
    try {
      const res = await axios.post(`/admin-api/identities/${selectedUser!.id}/recovery`, {}, { withCredentials: true });
      setRecoveryLink(res.data.recovery_link);
      toast.success("Recovery link generated");
    } catch (err) { toast.error("Failed to generate link"); } finally { setLoading(null); }
  };

  const saveTraits = () => 
    handleAction('Update Profile', () => axios.patch(`/admin-api/identities/${selectedUser!.id}/traits`, editTraits, { withCredentials: true }).then(() => setIsEditing(false)));

  const handleDeleteUser = () =>
    handleAction('Delete Identity', () => axios.delete(`/admin-api/identities/${selectedUser!.id}`, { withCredentials: true }).then(() => setSelectedUser(null)));

  // RBAC Handlers
  const createGlobalRole = async () => {
    if (!newRole.id) return;
    try {
        await axios.post('/admin-api/roles', newRole, { withCredentials: true });
        toast.success("Role created");
        mutateRoles();
        setNewRole({ id: '', description: '' });
    } catch (err) { toast.error("Failed to create role"); }
  };

  const deleteGlobalRole = async (id: string) => {
    if (!confirm(`Delete role ${id}?`)) return;
    try {
        await axios.delete(`/admin-api/roles/${id}`, { withCredentials: true });
        toast.success("Role deleted");
        mutateRoles();
    } catch (err) { toast.error("Failed to delete role"); }
  };

  const assignUserRole = async (roleId: string) => {
    try {
        await axios.post(`/admin-api/identities/${selectedUser!.id}/roles`, { role_id: roleId }, { withCredentials: true });
        toast.success("Role assigned");
        mutateUserRoles();
    } catch (err) { toast.error("Failed to assign role"); }
  };

  const removeUserRole = async (roleId: string) => {
    try {
        await axios.delete(`/admin-api/identities/${selectedUser!.id}/roles/${roleId}`, { withCredentials: true });
        toast.success("Role removed");
        mutateUserRoles();
    } catch (err) { toast.error("Failed to remove role"); }
  };

  if (!identities) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <Database size={48} className="text-slate-200 animate-bounce mb-4" />
        <p className="text-slate-400 font-mono text-xs uppercase tracking-[0.4em]">SYNCING_IDENTITY_VAULT...</p>
    </div>
  );

  const is2FA = selectedUser?.credentials?.totp || selectedUser?.credentials?.webauthn;
  const isVerified = selectedUser?.verifiable_addresses?.[0]?.verified;

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <nav className="bg-white border-b-4 border-slate-900 px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 text-white p-2 rounded-lg"><Shield size={20} /></div>
          <span className="font-black text-2xl tracking-tighter uppercase italic">Vault_Ops <span className="text-blue-600">Pro</span></span>
        </div>
        <Button variant="outline" size="sm" asChild className="border-2 font-black text-xs rounded-xl">
          <a href="/">Dashboard Hub</a>
        </Button>
      </nav>

      <main className="p-8 max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Directory Column */}
        <div className="lg:col-span-8 space-y-10">
          
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="bg-slate-200/50 p-1 rounded-2xl mb-6">
                <TabsTrigger value="users" className="rounded-xl px-8 font-black text-xs">IDENTITIES</TabsTrigger>
                <TabsTrigger value="roles" className="rounded-xl px-8 font-black text-xs">GLOBAL_ROLES</TabsTrigger>
                <TabsTrigger value="audit" className="rounded-xl px-8 font-black text-xs">AUDIT_LOGS</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
                <Card className="border-4 border-slate-900 rounded-[2.5rem] shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] overflow-hidden bg-white">
                    <Table>
                        <TableHeader><TableRow className="bg-slate-900 hover:bg-slate-900"><TableHead className="pl-8 text-white font-black uppercase text-[10px] tracking-widest py-6">Subject Identity</TableHead><TableHead className="text-white font-black uppercase text-[10px] tracking-widest text-center">Status</TableHead><TableHead className="text-white font-black uppercase text-[10px] tracking-widest text-right pr-8">Registry</TableHead></TableRow></TableHeader>
                        <TableBody>
                        {identities.map((user) => (
                            <TableRow key={user.id} className={`cursor-pointer border-b-2 border-slate-50 transition-all ${selectedUser?.id === user.id ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`} onClick={() => setSelectedUser(user)}>
                            <TableCell className="pl-8 py-6">
                                <div className="font-black text-slate-900 text-lg tracking-tight">{user.traits.email}</div>
                                <div className="text-[10px] font-mono text-slate-400 mt-1">{user.id}</div>
                            </TableCell>
                            <TableCell className="text-center"><Badge variant={user.state === 'active' ? 'default' : 'destructive'} className="font-black text-[9px] px-3">{user.state.toUpperCase()}</Badge></TableCell>
                            <TableCell className="text-right pr-8 font-mono text-[10px] text-slate-300 font-black tracking-widest">INTERNAL_DB</TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </Card>
            </TabsContent>

            <TabsContent value="roles">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="border-4 border-slate-900 rounded-[2rem] shadow-[12px_12px_0px_0px_rgba(59,130,246,1)] p-8">
                        <CardHeader className="px-0 pt-0">
                            <CardTitle className="font-black uppercase italic tracking-widest text-xl">Create_Role</CardTitle>
                            <CardDescription className="text-[10px] font-bold">Define system permission groups</CardDescription>
                        </CardHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black ml-1">ROLE_ID</Label>
                                <Input placeholder="e.g. documentation_editor" value={newRole.id} onChange={e => setNewRole({...newRole, id: e.target.value.toLowerCase()})} className="rounded-xl border-2 font-bold" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black ml-1">DESCRIPTION</Label>
                                <Input placeholder="Can edit and delete documents" value={newRole.description} onChange={e => setNewRole({...newRole, description: e.target.value})} className="rounded-xl border-2 font-bold" />
                            </div>
                            <Button onClick={createGlobalRole} className="w-full font-black py-6 rounded-2xl mt-2"><Plus size={16} className="mr-2"/> REGISTER_ROLE</Button>
                        </div>
                    </Card>

                    <div className="space-y-4">
                        {globalRoles?.map(role => (
                            <Card key={role.id} className="border-2 border-slate-200 rounded-2xl p-6 hover:border-slate-900 transition-all flex justify-between items-center group shadow-sm bg-white">
                                <div>
                                    <div className="font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                                        <ShieldCheck size={14} className="text-blue-600" />
                                        {role.id}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1 font-medium italic">{role.description}</div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => deleteGlobalRole(role.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16}/></Button>
                            </Card>
                        ))}
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="audit">
                 <Card className="border-4 border-slate-900 rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(239,68,68,1)] overflow-hidden bg-white">
                    <CardHeader className="bg-red-50/50 border-b-2 border-slate-900">
                        <CardTitle className="font-black uppercase text-sm tracking-[0.3em] flex items-center gap-3">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            Immutable Audit Stream
                        </CardTitle>
                    </CardHeader>
                    <ScrollArea className="h-[500px]">
                        <div className="p-8 space-y-6 font-mono">
                            {audits?.map((log, i) => (
                                <div key={i} className="text-[10px] border-l-4 border-slate-200 pl-6 py-2 relative">
                                    <div className="absolute -left-[7px] top-4 w-3 h-3 bg-white border-2 border-slate-400 rounded-full"></div>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="bg-slate-900 text-white px-2 py-0.5 rounded font-black tracking-widest">{log.action}</span>
                                        <span className="text-slate-400 font-bold">{new Date(log.timestamp).toLocaleString()}</span>
                                    </div>
                                    <div className="text-slate-600 mt-2">
                                        <span className="text-blue-600 font-bold underline">ADMIN:{log.admin_id.substring(0,8)}</span> 
                                        <span className="mx-2 text-slate-300">|</span> 
                                        {log.details}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                 </Card>
            </TabsContent>
          </Tabs>

        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4">
          {selectedUser ? (
            <div className="space-y-8 sticky top-[108px]">
              
              <Card className="border-4 border-slate-900 rounded-[2.5rem] shadow-2xl p-8 space-y-10 bg-white">
                <header className="flex justify-between items-start border-b-2 border-slate-100 pb-6">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Subject_Ops</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Deep Identity Control</p>
                    </div>
                    <Button variant={isEditing ? "ghost" : "outline"} size="sm" className="font-black text-[10px] border-2 rounded-xl" onClick={() => setIsEditing(!isEditing)}>
                        {isEditing ? "CANCEL" : "EDIT_TRAITS"}
                    </Button>
                </header>

                {isEditing ? (
                  <div className="space-y-6">
                    <div className="space-y-2"><Label className="text-[10px] font-black text-slate-400 uppercase ml-2">FIRST_NAME</Label><Input value={editTraits.first_name || ''} onChange={e => setEditTraits({...editTraits, first_name: e.target.value})} className="rounded-xl border-2 py-6 font-bold" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black text-slate-400 uppercase ml-2">LAST_NAME</Label><Input value={editTraits.last_name || ''} onChange={e => setEditTraits({...editTraits, last_name: e.target.value})} className="rounded-xl border-2 py-6 font-bold" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black text-slate-400 uppercase ml-2">DIVISION</Label><Input value={editTraits.division || ''} onChange={e => setEditTraits({...editTraits, division: e.target.value})} className="rounded-xl border-2 py-6 font-bold" /></div>
                    
                    <Dialog>
                        <DialogTrigger asChild><Button className="w-full font-black py-7 rounded-2xl shadow-xl tracking-[0.2em] active:translate-y-1">COMMIT_UPDATE</Button></DialogTrigger>
                        <DialogContent className="rounded-[2rem] border-4 border-slate-900">
                            <DialogHeader><DialogTitle className="font-black text-2xl italic tracking-tighter uppercase">Confirm Modification?</DialogTitle><DialogDescription className="font-bold py-4">Applying these changes will rewrite the primary subject traits in the distributed registry.</DialogDescription></DialogHeader>
                            <DialogFooter><DialogClose asChild><Button variant="outline" className="rounded-xl font-black uppercase text-xs">Abort</Button></DialogClose><Button onClick={saveTraits} className="rounded-xl font-black uppercase text-xs">Execute Update</Button></DialogFooter>
                        </DialogContent>
                    </Dialog>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="bg-slate-900 rounded-[1.5rem] p-8 space-y-4 font-mono text-xs border-4 border-slate-800 shadow-inner text-white">
                        <div className="flex justify-between border-b border-slate-800 pb-2"><span className="text-slate-500">SUBJECT:</span> <span className="font-black text-blue-400 uppercase">{selectedUser.traits.first_name} {selectedUser.traits.last_name}</span></div>
                        <div className="flex justify-between border-b border-slate-800 pb-2"><span className="text-slate-500">DEPT:</span> <span className="font-black">{selectedUser.traits.division || 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">EMAIL:</span> <span className="font-black text-blue-400 lowercase italic">{selectedUser.traits.email}</span></div>
                    </div>

                    {/* RBAC Assignment Section */}
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Assigned_Roles</Label>
                        <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 min-h-[60px]">
                            {userRoles?.map(roleId => (
                                <Badge key={roleId} className="bg-blue-600 hover:bg-red-600 transition-colors cursor-pointer font-black text-[9px] gap-2 py-1" onClick={() => removeUserRole(roleId)}>
                                    {roleId.toUpperCase()} <LogOut size={10} />
                                </Badge>
                            ))}
                            {!userRoles?.length && <span className="text-[10px] text-slate-300 font-bold italic py-1">NO_ROLES_ASSIGNED</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                           <Dialog>
                                <DialogTrigger asChild><Button variant="outline" size="sm" className="w-full text-[9px] font-black rounded-lg h-8 uppercase"><Plus size={12} className="mr-1" /> Add Role</Button></DialogTrigger>
                                <DialogContent className="rounded-3xl border-4 border-slate-900">
                                    <DialogHeader><DialogTitle className="font-black uppercase italic">Assign_System_Role</DialogTitle></DialogHeader>
                                    <div className="space-y-2 py-4">
                                        {globalRoles?.filter(gr => !userRoles?.includes(gr.id)).map(gr => (
                                            <Button key={gr.id} variant="secondary" className="w-full justify-start font-black text-xs h-12" onClick={() => assignUserRole(gr.id)}>{gr.id.toUpperCase()}</Button>
                                        ))}
                                    </div>
                                </DialogContent>
                           </Dialog>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 flex flex-col items-center">
                          <Label className="text-[8px] font-black text-slate-400 uppercase mb-2">2FA_ENFORCEMENT</Label>
                          <div className={`text-[10px] font-black ${is2FA ? 'text-green-600' : 'text-amber-600'}`}>{is2FA ? 'ACTIVE' : 'NONE'}</div>
                       </div>
                       <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 flex flex-col items-center">
                          <Label className="text-[8px] font-black text-slate-400 uppercase mb-2">AUTH_STATUS</Label>
                          <div className={`text-[10px] font-black ${isVerified ? 'text-green-600' : 'text-red-500'}`}>{isVerified ? 'TRUSTED' : 'PENDING'}</div>
                       </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4 pt-6 border-t-2 border-slate-100">
                   <div className="grid grid-cols-2 gap-4">
                      <Dialog>
                        <DialogTrigger asChild><Button variant="outline" className="h-12 rounded-xl font-black text-[10px] uppercase tracking-widest border-slate-900 border-2 shadow-sm">Toggle State</Button></DialogTrigger>
                        <DialogContent className="border-4 border-slate-900 rounded-[2rem]">
                            <DialogHeader><DialogTitle className="font-black uppercase italic text-2xl">Access_Inversion?</DialogTitle><DialogDescription className="font-bold py-4">The identity will be set to {selectedUser.state === 'active' ? 'INACTIVE (LOCKED)' : 'ACTIVE'}.</DialogDescription></DialogHeader>
                            <DialogFooter><Button onClick={toggleState} className="w-full font-black py-6">CONFIRM_INVERSION</Button></DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button variant="secondary" className="h-12 rounded-xl font-black text-[10px] uppercase tracking-widest bg-blue-50 text-blue-600" onClick={generateRecovery}>Recovery Link</Button>
                   </div>

                   {!isVerified && (
                      <Dialog>
                        <DialogTrigger asChild><Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] rounded-xl uppercase tracking-widest">Manual Verification</Button></DialogTrigger>
                        <DialogContent className="border-4 border-slate-900 rounded-[2rem]">
                            <DialogHeader><DialogTitle className="font-black italic uppercase">Bypass Verification?</DialogTitle><DialogDescription className="py-4 font-bold text-slate-500">Force the status to COMPLETED and mark the verifiable address as TRUSTED.</DialogDescription></DialogHeader>
                            <DialogFooter><Button onClick={manualVerify} className="w-full font-black py-6 bg-blue-600">FORCE_TRUST</Button></DialogFooter>
                        </DialogContent>
                      </Dialog>
                   )}

                   {recoveryLink && (
                      <div className="p-5 bg-slate-900 text-green-400 rounded-3xl text-xs break-all font-mono border-4 border-blue-900 shadow-inner">
                        <div className="flex items-center gap-2 mb-3 text-white font-black"><AlertTriangle size={14} className="text-amber-400"/> SECRET_TOKEN_DETECTED</div>
                        {recoveryLink}
                      </div>
                   )}

                   {/* Individual Sessions */}
                   <div className="mt-8 space-y-4">
                      <div className="flex justify-between items-center px-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest italic text-slate-400">Device_Sessions</Label>
                        <Dialog>
                            <DialogTrigger asChild><Button variant="link" className="h-auto p-0 text-[10px] font-black text-red-500">TERMINATE_ALL</Button></DialogTrigger>
                            <DialogContent className="border-4 border-red-600 rounded-[2rem]">
                                <DialogHeader><DialogTitle className="font-black text-red-600 uppercase text-2xl">Total Session Wipe?</DialogTitle><DialogDescription className="font-bold py-4">Every authenticated signal for this identity will be invalidated across all nodes.</DialogDescription></DialogHeader>
                                <DialogFooter><Button variant="destructive" onClick={revokeAllSessions} className="w-full font-black py-6">CONFIRM_WIPE</Button></DialogFooter>
                            </DialogContent>
                        </Dialog>
                      </div>
                      
                      <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {sessions?.map(s => (
                          <div key={s.id} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl flex justify-between items-center group/sess hover:border-slate-900 transition-all">
                             <div className="space-y-1">
                                <div className="text-[10px] font-black text-slate-900 flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${s.active ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
                                  {s.devices[0]?.ip_address}
                                </div>
                                <div className="text-[8px] text-slate-400 font-mono truncate max-w-[150px]">{s.devices[0]?.user_agent}</div>
                             </div>
                             <Dialog>
                                <DialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-red-600 transition-colors"><LogOut size={14}/></Button></DialogTrigger>
                                <DialogContent className="border-2 border-slate-900">
                                    <DialogHeader><DialogTitle className="font-black uppercase">Terminate Session?</DialogTitle></DialogHeader>
                                    <DialogFooter><Button variant="destructive" onClick={() => revokeSession(s.id)}>End Access</Button></DialogFooter>
                                </DialogContent>
                             </Dialog>
                          </div>
                        ))}
                      </div>
                   </div>

                   <div className="pt-10 border-t-2 border-slate-100 mt-6">
                      <Dialog>
                        <DialogTrigger asChild><Button variant="ghost" className="w-full text-red-600 hover:text-white hover:bg-red-600 font-black text-[10px] tracking-[0.3em] uppercase py-6 rounded-2xl transition-all shadow-xl shadow-red-50">DESTROY_IDENTITY</Button></DialogTrigger>
                        <DialogContent className="border-4 border-red-600 rounded-[2.5rem] bg-white">
                            <CardHeader className="text-center pb-0">
                                <AlertTriangle size={64} className="text-red-600 mx-auto mb-4 animate-pulse" />
                                <DialogTitle className="font-black text-red-600 text-3xl uppercase tracking-tighter">Identity_Purge</DialogTitle>
                            </CardHeader>
                            <DialogDescription className="text-center font-bold text-slate-600 px-10 py-6">
                                WARNING: This action will permanently wipe the subject from the Ory Vault and all associated DMS data. This signal cannot be reversed.
                            </DialogDescription>
                            <DialogFooter className="flex-col gap-4">
                                <Button variant="destructive" className="w-full font-black py-8 rounded-2xl text-lg shadow-2xl" onClick={handleDeleteUser}>EXECUTE_DESTRUCTION</Button>
                                <DialogClose asChild><Button variant="ghost" className="w-full font-black text-slate-400">ABORT_COMMAND</Button></DialogClose>
                            </DialogFooter>
                        </DialogContent>
                      </Dialog>
                   </div>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="border-4 border-dashed border-slate-200 rounded-[4rem] p-32 text-center sticky top-[108px] bg-white/50">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-10 shadow-2xl border-4 border-slate-50 text-slate-100">
                <User size={48} />
              </div>
              <p className="text-slate-400 font-black text-xs uppercase tracking-[0.4em] leading-loose">Awaiting Subject Selection<br/>for Deep-Posture Analysis</p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
