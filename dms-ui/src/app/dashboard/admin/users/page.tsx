"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { api, fetcher } from "@/lib/api";
import { Navbar } from "@/components/layout/Navbar";
import {
  VaultHeader,
  VaultCard,
  VaultButton,
  VaultBadge,
} from "@/components/shared/VaultPrimitives";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  ShieldCheck,
  Activity,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Eraser,
  UploadCloud,
  Terminal,
  Database,
  History,
  Lock,
  Key,
  Trash2,
  RefreshCcw,
  Power,
  Edit3
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function AdminControlPage() {
  const router = useRouter();
  const { data: me, isLoading: meLoading } = useSWR("/api/me", fetcher);

  useEffect(() => {
    if (!meLoading && me && me.roles && !me.roles.includes('admin')) {
      toast.error("ADMIN_PROTOCOL_DENIED: Access restricted.");
      router.push("/dashboard/documents");
    }
  }, [me, meLoading, router]);

  const [pageToken, setPageToken] = useState("");
  const [historyTokens, setHistoryTokens] = useState<string[]>([]);
  const [auditPage, setAuditPage] = useState(0);
  const limit = 10;

  const { data: identityData, mutate: mutateUsers } = useSWR(
    `/admin-api/identities?page_size=${limit}&page_token=${pageToken}`,
    fetcher
  );
  const { data: auditLogs } = useSWR(
    `/admin-api/audit?limit=${limit}&offset=${auditPage * limit}`,
    fetcher
  );

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newRole, setNewRole] = useState("");
  const [bulkDays, setBulkDays] = useState("30");

  const handleUpdateState = async (id: string, currentState: string) => {
    const newState = currentState === "active" ? "inactive" : "active";
    try {
      await api.put(`/admin-api/identities/${id}/state`, { state: newState });
      toast.success(`Identity status updated to ${newState}`);
      mutateUsers();
      if (selectedUser?.id === id) setSelectedUser({...selectedUser, state: newState});
    } catch (e) { toast.error("Failed to update status"); }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !newRole) return;
    try {
      await api.post(`/admin-api/identities/${selectedUser.id}/roles`, { role_id: newRole });
      toast.success(`Role ${newRole} assigned`);
      setNewRole("");
      mutateUsers();
      // Refresh selected user data (including roles)
      const { data: updated } = await api.get(`/admin-api/identities/${selectedUser.id}`);
      setSelectedUser(updated);
    } catch (e) { toast.error("Failed to assign role"); }
  };

  const handleRevokeRole = async (roleId: string) => {
    try {
      await api.delete(`/admin-api/identities/${selectedUser.id}/roles/${roleId}`);
      toast.success("Role revoked");
      mutateUsers();
      const { data: updated } = await api.get(`/admin-api/identities/${selectedUser.id}`);
      setSelectedUser(updated);
    } catch (e) { toast.error("Failed to revoke role"); }
  };

  const handleRevokeSession = async (sid: string) => {
    try {
      await api.delete(`/admin-api/identities/${selectedUser.id}/sessions/${sid}`);
      toast.success("Session terminated");
      const { data: updated } = await api.get(`/admin-api/identities/${selectedUser.id}`);
      setSelectedUser(updated);
    } catch (e) { toast.error("Failed to terminate session"); }
  };

  const handleRecovery = async () => {
    try {
      const { data } = await api.post(`/admin-api/identities/${selectedUser.id}/recovery`);
      navigator.clipboard.writeText(data.recovery_link);
      toast.success("Recovery link copied to clipboard");
    } catch (e) { toast.error("Failed to generate link"); }
  };

  return (
    <div className="pb-20">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 pt-12 space-y-10">
        <VaultHeader
          title="Identity_Control"
          subtitle="Administrative gateway for subject management and infrastructure security auditing."
        />

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-white/[0.03] border border-white/[0.06] p-1 rounded-xl mb-12">
            <TabsTrigger value="users" className="px-8 text-xs font-medium uppercase tracking-widest">Subjects</TabsTrigger>
            <TabsTrigger value="audit" className="px-8 text-xs font-medium uppercase tracking-widest">Audit_Log</TabsTrigger>
            <TabsTrigger value="ops" className="px-8 text-xs font-medium uppercase tracking-widest">Infra_Ops</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <VaultCard className="p-0 border-white/[0.06] overflow-hidden">
              <Table>
                <TableHeader className="bg-white/[0.02]">
                  <TableRow className="border-b border-white/[0.06] hover:bg-transparent">
                    <TableHead className="pl-8 text-foreground-muted font-medium text-[10px] uppercase tracking-widest py-4">Identity_Subject</TableHead>
                    <TableHead className="text-foreground-muted font-medium text-[10px] uppercase tracking-widest py-4">State</TableHead>
                    <TableHead className="text-foreground-muted font-medium text-[10px] uppercase tracking-widest py-4">Roles</TableHead>
                    <TableHead className="text-right pr-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {identityData?.identities?.map((user: any, index: number) => (
                    <motion.tr 
                      key={user.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors group"
                    >
                      <TableCell className="pl-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/[0.03] rounded-lg border border-white/10 group-hover:border-accent/30 transition-colors">
                            <User size={16} className="text-foreground-muted group-hover:text-accent transition-colors" />
                          </div>
                          <div>
                            <div className="font-medium text-sm text-foreground/90">{user.traits?.email}</div>
                            <div className="text-[10px] font-mono text-foreground-subtle tracking-tighter uppercase">{user.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <VaultBadge className={user.state === "active" ? "border-green-500/30 text-green-400 bg-green-500/5" : "border-red-500/30 text-red-400 bg-red-500/5"}>
                          {user.state}
                        </VaultBadge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                            {user.roles?.map((r: string) => (
                                <span key={r} className="text-[9px] font-mono text-accent-bright bg-accent/5 border border-accent/20 px-1.5 rounded uppercase">{r}</span>
                            ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex justify-end gap-2">
                            <button 
                                onClick={() => handleUpdateState(user.id, user.state)}
                                className={cn("p-2 rounded-lg border transition-all", user.state === 'active' ? "border-red-500/20 text-red-400 hover:bg-red-500/10" : "border-green-500/20 text-green-400 hover:bg-green-500/10")}
                                title={user.state === 'active' ? "Deactivate" : "Activate"}
                            >
                                <Power size={14} />
                            </button>
                            <VaultButton variant="ghost" size="sm" onClick={() => setSelectedUser(user)}>
                            MANAGE
                            </VaultButton>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </VaultCard>

            <div className="flex justify-center gap-4">
              <VaultButton variant="secondary" size="sm" disabled={historyTokens.length === 0} onClick={() => {
                const prev = historyTokens.pop();
                setPageToken(prev || "");
                setHistoryTokens([...historyTokens]);
              }}>
                <ChevronLeft size={16} /> PREV
              </VaultButton>
              <VaultButton variant="secondary" size="sm" disabled={!identityData?.next_page_token} onClick={() => {
                setHistoryTokens([...historyTokens, pageToken]);
                setPageToken(identityData.next_page_token);
              }}>
                NEXT <ChevronRight size={16} />
              </VaultButton>
            </div>
          </TabsContent>

          <TabsContent value="audit">
             <VaultCard className="p-0 overflow-hidden border-white/[0.06]">
                <Table>
                    <TableHeader className="bg-white/[0.02]">
                        <TableRow className="border-b border-white/[0.06]">
                            <TableHead className="pl-8 text-[10px] uppercase font-mono py-4">Timestamp</TableHead>
                            <TableHead className="text-[10px] uppercase font-mono py-4">Action</TableHead>
                            <TableHead className="text-[10px] uppercase font-mono py-4">Subject</TableHead>
                            <TableHead className="text-[10px] uppercase font-mono py-4">IP_Addr</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {auditLogs?.map((log: any) => (
                            <TableRow key={log.id} className="border-b border-white/[0.02]">
                                <TableCell className="pl-8 text-xs font-mono text-foreground-muted">{new Date(log.created_at).toLocaleString()}</TableCell>
                                <TableCell><VaultBadge>{log.action}</VaultBadge></TableCell>
                                <TableCell className="text-xs text-foreground/80 font-mono tracking-tighter">{log.target_id?.substring(0,12)}...</TableCell>
                                <TableCell className="text-xs font-mono text-foreground-subtle">{log.ip_address}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
             </VaultCard>
          </TabsContent>

          <TabsContent value="ops" className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <VaultCard className="space-y-6 p-8">
                <div className="flex items-center gap-3 text-red-400">
                    <Eraser size={20} />
                    <h3 className="font-semibold tracking-tight">Bulk_Cleanup_Protocol</h3>
                </div>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-mono text-foreground-subtle">Retention_Days</Label>
                        <Input value={bulkDays} onChange={e => setBulkDays(e.target.value)} type="number" className="bg-white/[0.03] border-white/[0.06] h-12" />
                    </div>
                    <VaultButton variant="destructive" className="w-full" onClick={async () => {
                         try {
                            await api.post(`/admin-api/ops/cleanup?days=${bulkDays}`);
                            toast.success("Cleanup protocol executed");
                          } catch (e) { toast.error("Cleanup failed"); }
                    }}>
                        EXECUTE_PERMANENT_PURGE
                    </VaultButton>
                </div>
             </VaultCard>

             <VaultCard className="space-y-6 p-8">
                <div className="flex items-center gap-3 text-accent">
                    <Database size={20} />
                    <h3 className="font-semibold tracking-tight">Infrastructure_Seeding</h3>
                </div>
                <div className="p-6 border border-dashed border-white/10 rounded-2xl text-center">
                    <UploadCloud size={32} className="mx-auto text-foreground-muted/20 mb-3" />
                    <p className="text-[10px] text-foreground-muted uppercase tracking-widest">CSV_IMPORT_PENDING</p>
                </div>
                <VaultButton variant="secondary" className="w-full" disabled>
                    INITIALIZE_BULK_PROVISION
                </VaultButton>
             </VaultCard>
          </TabsContent>
        </Tabs>

        {/* --- USER DETAIL DIALOG --- */}
        <Dialog open={!!selectedUser} onOpenChange={(o) => !o && setSelectedUser(null)}>
          <DialogContent className="max-w-2xl bg-background-elevated border-white/[0.08] p-0 overflow-hidden backdrop-blur-3xl">
             <div className="bg-accent/5 p-8 border-b border-white/[0.06]">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-accent/10 rounded-2xl border border-accent/20">
                            <User className="text-accent" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-white tracking-tight">{selectedUser?.traits?.email}</h2>
                            <p className="text-xs font-mono text-foreground-muted uppercase tracking-widest">Subject_ID: {selectedUser?.id}</p>
                        </div>
                    </div>
                    <VaultBadge className={selectedUser?.state === "active" ? "border-green-500/30 text-green-400 bg-green-500/5" : "border-red-500/30 text-red-400 bg-red-500/5"}>
                        {selectedUser?.state}
                    </VaultBadge>
                </div>
             </div>

             <div className="p-8">
                <Tabs defaultValue="traits">
                    <TabsList className="bg-white/[0.03] border border-white/[0.06] mb-8">
                        <TabsTrigger value="traits" className="text-[10px] uppercase">Traits</TabsTrigger>
                        <TabsTrigger value="roles" className="text-[10px] uppercase">RBAC_Roles</TabsTrigger>
                        <TabsTrigger value="sessions" className="text-[10px] uppercase">Active_Sessions</TabsTrigger>
                        <TabsTrigger value="security" className="text-[10px] uppercase text-red-400">Security</TabsTrigger>
                    </TabsList>

                    <TabsContent value="traits" className="grid grid-cols-2 gap-4">
                        {selectedUser && Object.entries(selectedUser.traits || {}).map(([k, v]: [string, any]) => (
                            <div key={k} className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl group hover:border-white/10 transition-colors">
                                <Label className="text-[9px] uppercase font-mono text-foreground-subtle block mb-1">{k}</Label>
                                <div className="flex justify-between items-center">
                                    <p className="text-sm font-medium text-white truncate">{String(v)}</p>
                                    <Edit3 size={12} className="text-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
                                </div>
                            </div>
                        ))}
                    </TabsContent>

                    <TabsContent value="roles" className="space-y-6">
                        <div className="flex gap-2">
                            <Input value={newRole} onChange={e => setNewRole(e.target.value)} placeholder="e.g. administrator" className="bg-white/[0.02] border-white/[0.06] h-12" />
                            <VaultButton onClick={handleAssignRole}>GRANT</VaultButton>
                        </div>
                        <div className="space-y-2">
                            {selectedUser?.roles?.map((r: string) => (
                                <div key={r} className="flex justify-between items-center p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl group hover:border-white/10 transition-colors">
                                    <span className="text-sm font-mono text-accent-bright font-bold uppercase tracking-tight">{r}</span>
                                    <button onClick={() => handleRevokeRole(r)} className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-all p-1">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="sessions" className="space-y-4">
                         {selectedUser?.sessions?.map((s: any) => (
                            <div key={s.id} className="flex justify-between items-center p-5 bg-white/[0.02] border border-white/[0.06] rounded-xl group">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-xs font-bold text-white uppercase tracking-tight">Active_Session</span>
                                    </div>
                                    <div className="text-[10px] font-mono text-foreground-muted uppercase tracking-tighter">Auth_At: {s.authenticated_at ? new Date(s.authenticated_at).toLocaleString() : "Unknown"}</div>
                                    <div className="text-[10px] font-mono text-foreground-subtle truncate max-w-[200px]">{s.id}</div>
                                </div>
                                <VaultButton variant="destructive" size="sm" className="h-9 text-[10px]" onClick={() => handleRevokeSession(s.id)}>TERMINATE</VaultButton>
                            </div>
                         ))}
                         {!selectedUser?.sessions?.length && (
                             <div className="text-center py-20 text-foreground-muted/20 font-mono text-[10px] uppercase">Zero_Active_Sessions</div>
                         )}
                    </TabsContent>

                    <TabsContent value="security" className="space-y-4 pt-4">
                        <VaultCard className="p-8 border-red-500/20 bg-red-500/[0.02] space-y-6">
                            <div className="flex items-center gap-3 text-red-500">
                                <ShieldCheck size={20} />
                                <h4 className="font-bold uppercase tracking-tight">Identity_Recovery_Protocol</h4>
                            </div>
                            <p className="text-xs text-foreground-muted leading-relaxed uppercase tracking-tight">
                                This action generates a one-time cryptographic link bypassing standard password verification. 
                                USE ONLY DURING AUTHENTICATION LOSS.
                            </p>
                            <VaultButton variant="secondary" className="w-full border-red-500/20 text-red-400" onClick={handleRecovery}>
                                GENERATE_RECOVERY_SIGNAL
                            </VaultButton>
                        </VaultCard>
                    </TabsContent>
                </Tabs>
             </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
