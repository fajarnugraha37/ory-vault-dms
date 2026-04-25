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
  RefreshCcw, 
  Trash2, 
  LogOut,
  ChevronRight,
  Database,
  AlertTriangle
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
  ip_address: string;
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
    status: string
    verified: boolean
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
  
  const [selectedUser, setSelectedUser] = useState<Identity | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTraits, setEditTraits] = useState<any>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [recoveryLink, setRecoveryLink] = useState<string | null>(null);

  const { data: sessions, mutate: mutateSessions } = useSWR<Session[]>(
    selectedUser ? `/admin-api/identities/${selectedUser.id}/sessions` : null,
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
    } catch (err) {
      toast.error("Failed to generate link");
    } finally {
      setLoading(null);
    }
  };

  const saveTraits = () => 
    handleAction('Update Profile', () => axios.patch(`/admin-api/identities/${selectedUser!.id}/traits`, editTraits, { withCredentials: true }).then(() => setIsEditing(false)));

  const handleDeleteUser = () =>
    handleAction('Delete Identity', () => axios.delete(`/admin-api/identities/${selectedUser!.id}`, { withCredentials: true }).then(() => setSelectedUser(null)));

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
      <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 text-white p-2 rounded-lg"><Shield size={20} /></div>
          <span className="font-bold text-xl tracking-tight uppercase italic">Vault_Ops <span className="text-slate-400 font-normal">v0.4.1</span></span>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/">Dashboard Hub</a>
        </Button>
      </nav>

      <main className="p-8 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* User List */}
        <div className="lg:col-span-8 space-y-8">
          <Card className="border-slate-200 shadow-sm overflow-hidden rounded-3xl">
            <CardHeader className="bg-white border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2"><Database size={18} className="text-slate-400" /> Identity Directory</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow className="bg-slate-50/50"><TableHead className="pl-8">Subject</TableHead><TableHead>Status</TableHead><TableHead className="text-right pr-8">Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {identities.map((user) => (
                    <TableRow key={user.id} className={`cursor-pointer hover:bg-slate-50/80 transition-all ${selectedUser?.id === user.id ? 'bg-blue-50/50' : ''}`} onClick={() => setSelectedUser(user)}>
                      <TableCell className="pl-8 py-6">
                        <div className="font-bold text-slate-900 text-base">{user.traits.email}</div>
                        <div className="text-[10px] font-mono text-slate-400 uppercase">{user.id}</div>
                      </TableCell>
                      <TableCell><Badge variant={user.state === 'active' ? 'default' : 'destructive'} className="font-black text-[9px]">{user.state.toUpperCase()}</Badge></TableCell>
                      <TableCell className="text-right pr-8"><ChevronRight size={16} className={`ml-auto transition-transform ${selectedUser?.id === user.id ? 'translate-x-1 text-blue-600' : 'text-slate-300'}`} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Audit Logs */}
          <Card className="border-slate-200 shadow-sm rounded-3xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg flex items-center gap-2"><History size={18} className="text-red-500" /> Audit Timeline</CardTitle>
                <Badge variant="outline" className="font-mono text-[9px] text-slate-400">LIVE_SIGNALS</Badge>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] p-4 bg-slate-50/50 border rounded-2xl">
                <div className="space-y-4">
                   {audits?.map((log, i) => (
                     <div key={i} className="text-[10px] font-mono border-b border-slate-100 pb-3 flex flex-col gap-1">
                        <div className="flex justify-between">
                            <span className="text-blue-600 font-bold">ADMIN:{log.admin_id.substring(0,8)}</span>
                            <span className="text-slate-400">[{new Date(log.timestamp).toLocaleString()}]</span>
                        </div>
                        <div>
                            <span className="font-black text-slate-900 uppercase bg-white border px-1.5 py-0.5 rounded mr-2">{log.action}</span>
                            <span className="text-slate-500">{log.details}</span>
                        </div>
                     </div>
                   ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Detail Sidebar */}
        <div className="lg:col-span-4">
          {selectedUser ? (
            <div className="space-y-6 sticky top-[88px]">
              <Card className="border-slate-900 border-2 shadow-2xl rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-slate-900 text-white">
                   <div className="flex justify-between items-center">
                    <CardTitle className="font-black uppercase italic tracking-tighter text-xl">Subject_Posture</CardTitle>
                    <Button variant="ghost" size="sm" className="text-[10px] font-black hover:bg-slate-800 text-blue-400" onClick={() => setIsEditing(!isEditing)}>
                        {isEditing ? "DISCARD" : "EDIT_PROFILE"}
                    </Button>
                   </div>
                </CardHeader>
                <CardContent className="space-y-8 p-8">
                  {isEditing ? (
                    <div className="space-y-5">
                        <div className="space-y-1.5"><Label className="text-[10px] font-black text-slate-400 ml-1">FIRST_NAME</Label><Input value={editTraits.first_name || ''} onChange={e => setEditTraits({...editTraits, first_name: e.target.value})} className="rounded-xl border-2" /></div>
                        <div className="space-y-1.5"><Label className="text-[10px] font-black text-slate-400 ml-1">LAST_NAME</Label><Input value={editTraits.last_name || ''} onChange={e => setEditTraits({...editTraits, last_name: e.target.value})} className="rounded-xl border-2" /></div>
                        <div className="space-y-1.5"><Label className="text-[10px] font-black text-slate-400 ml-1">DIVISION</Label><Input value={editTraits.division || ''} onChange={e => setEditTraits({...editTraits, division: e.target.value})} className="rounded-xl border-2" /></div>
                        
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button className="w-full font-black text-xs py-6 rounded-2xl shadow-lg active:translate-y-1 transition-all">APPLY_CHANGES</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Confirm Profile Update?</DialogTitle>
                                    <DialogDescription>This will modify the user's primary identity traits in Ory Kratos.</DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                    <Button onClick={saveTraits}>Confirm Update</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                  ) : (
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 flex flex-col items-center justify-center text-center">
                              <Label className="text-[8px] font-black text-slate-400 uppercase mb-2">Verification</Label>
                              <div className={`text-[10px] font-black ${isVerified ? 'text-green-600' : 'text-red-500'}`}>{isVerified ? 'VERIFIED' : 'PENDING'}</div>
                           </div>
                           <div className="p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 flex flex-col items-center justify-center text-center">
                              <Label className="text-[8px] font-black text-slate-400 uppercase mb-2">2FA Status</Label>
                              <div className={`text-[10px] font-black ${is2FA ? 'text-green-600' : 'text-amber-600'}`}>{is2FA ? 'ENFORCED' : 'DISABLED'}</div>
                           </div>
                        </div>
                        
                        <div className="bg-slate-50 rounded-[1.5rem] p-6 space-y-4 font-mono text-xs border-2 border-slate-100">
                            <div className="flex justify-between border-b pb-2 text-slate-500"><span>SUBJECT:</span> <span className="font-bold text-slate-900">{selectedUser.traits.first_name} {selectedUser.traits.last_name}</span></div>
                            <div className="flex justify-between border-b pb-2 text-slate-500"><span>DEPT:</span> <span className="font-bold text-slate-900">{selectedUser.traits.division || 'NOT_SET'}</span></div>
                            <div className="flex justify-between text-slate-500"><span>EMAIL:</span> <span className="font-bold text-blue-600 underline">{selectedUser.traits.email}</span></div>
                        </div>
                    </div>
                  )}

                  <Tabs defaultValue="actions">
                    <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-100 rounded-xl h-10">
                      <TabsTrigger value="actions" className="font-black text-[10px] rounded-lg">OPERATIONS</TabsTrigger>
                      <TabsTrigger value="metadata" className="font-black text-[10px] rounded-lg">METADATA</TabsTrigger>
                    </TabsList>
                    <TabsContent value="actions" className="space-y-6 pt-6">
                       <div className="grid grid-cols-2 gap-3">
                          <Dialog>
                            <DialogTrigger asChild><Button variant="outline" className="text-[10px] font-black h-10 rounded-xl uppercase tracking-tighter">Toggle Access</Button></DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Switch Identity State?</DialogTitle>
                                <DialogDescription>User status will be set to {selectedUser.state === 'active' ? 'INACTIVE' : 'ACTIVE'}.</DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                <Button onClick={toggleState}>Proceed</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button variant="secondary" className="text-[10px] font-black h-10 rounded-xl uppercase tracking-tighter" onClick={generateRecovery}>Recovery Link</Button>
                       </div>
                       
                       {!isVerified && (
                            <Dialog>
                                <DialogTrigger asChild><Button variant="outline" className="w-full text-[10px] font-black h-10 rounded-xl border-blue-200 text-blue-700 bg-blue-50/50">VERIFY EMAIL MANUALLY</Button></DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>Mark as Verified?</DialogTitle><DialogDescription>This bypasses the standard email challenge flow.</DialogDescription></DialogHeader>
                                    <DialogFooter><Button onClick={manualVerify}>Verify Now</Button></DialogFooter>
                                </DialogContent>
                            </Dialog>
                       )}
                       
                       {recoveryLink && (
                          <div className="p-4 bg-slate-900 rounded-2xl text-[9px] font-mono text-green-400 break-all border-4 border-blue-900 shadow-inner">
                            <div className="flex items-center gap-2 mb-2 text-white font-black"><AlertTriangle size={12} className="text-amber-400"/> CONFIDENTIAL_LINK</div>
                            {recoveryLink}
                          </div>
                       )}

                       <div className="space-y-4 pt-4 border-t border-slate-100">
                          <div className="flex justify-between items-center px-1">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Smartphone size={12}/> Sessions</Label>
                            
                            <Dialog>
                                <DialogTrigger asChild><Button variant="link" className="h-auto p-0 text-[10px] font-black text-red-500 underline underline-offset-4">REVOKE ALL</Button></DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>Revoke All Active Sessions?</DialogTitle><DialogDescription>The user will be logged out from all devices immediately.</DialogDescription></DialogHeader>
                                    <DialogFooter><Button variant="destructive" onClick={revokeAllSessions}>Revoke All</Button></DialogFooter>
                                </DialogContent>
                            </Dialog>
                          </div>
                          
                          <ScrollArea className="h-44 rounded-2xl border-2 border-slate-100 bg-slate-50/30 p-2">
                             {sessions?.map(s => (
                               <div key={s.id} className="p-4 bg-white border-2 border-slate-100 rounded-2xl mb-2 flex justify-between items-center shadow-sm hover:border-slate-400 transition-all">
                                  <div className="space-y-1">
                                    <div className="text-[11px] font-black text-slate-900">{s.devices[0]?.ip_address}</div>
                                    <div className="text-[8px] text-slate-400 font-mono truncate max-w-[150px]">{s.devices[0]?.user_agent}</div>
                                  </div>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-white hover:bg-red-500 rounded-xl transition-all"><LogOut size={14}/></Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader><DialogTitle>Revoke Session?</DialogTitle><DialogDescription>End access for this specific device/IP.</DialogDescription></DialogHeader>
                                        <DialogFooter><Button variant="destructive" onClick={() => revokeSession(s.id)}>Revoke Now</Button></DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                               </div>
                             ))}
                             {!sessions?.length && <div className="text-center py-12 text-[10px] text-slate-300 font-mono italic">NO_SESSIONS_FOUND</div>}
                          </ScrollArea>
                       </div>

                       <div className="pt-6 border-t border-slate-100">
                          <Dialog>
                            <DialogTrigger asChild><Button variant="ghost" className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 font-black text-[10px] tracking-widest uppercase">DESTROY IDENTITY</Button></DialogTrigger>
                            <DialogContent>
                              <DialogHeader><DialogTitle className="text-red-600">Permanently Delete Subject?</DialogTitle><DialogDescription>All data, sessions, and recovery options for this identity will be destroyed. This is irreversible.</DialogDescription></DialogHeader>
                              <DialogFooter><Button variant="destructive" className="w-full font-black" onClick={handleDeleteUser}>CONFIRM_DESTRUCTION</Button></DialogFooter>
                            </DialogContent>
                          </Dialog>
                       </div>
                    </TabsContent>
                    <TabsContent value="metadata" className="pt-6 space-y-4">
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Admin_Metadata</Label>
                          <pre className="p-4 bg-slate-900 text-blue-400 rounded-2xl text-[10px] border font-mono shadow-inner overflow-auto h-40">
                            {JSON.stringify(selectedUser.metadata_admin || {}, null, 2)}
                          </pre>
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Public_Metadata</Label>
                          <pre className="p-4 bg-white border-2 rounded-2xl text-[10px] font-mono shadow-sm overflow-auto h-40">
                            {JSON.stringify(selectedUser.metadata_public || {}, null, 2)}
                          </pre>
                       </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-4 border-dashed rounded-[3rem] p-32 text-center sticky top-[88px] bg-white/50">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-10 shadow-xl border-4 border-slate-50 text-slate-200">
                <User size={48} />
              </div>
              <p className="text-slate-400 font-black text-xs uppercase tracking-[0.4em] leading-loose">Awaiting Subject Selection<br/>for Posture Analysis</p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
