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
  Edit3,
  Plus
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
  const { data: availableRoles } = useSWR("/admin-api/roles", fetcher);

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newRole, setNewRole] = useState("");
  const [bulkDays, setBulkDays] = useState("30");

  const [editingTrait, setEditingTrait] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [metadataValue, setMetadataValue] = useState("");

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean, title: string, message: string, onConfirm: () => void } | null>(null);
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null);
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
  const [newRoleData, setNewRoleData] = useState({ id: "", description: "" });

  useEffect(() => {
    if (selectedUser) {
      setMetadataValue(JSON.stringify(selectedUser.metadata_admin || {}, null, 2));
    }
  }, [selectedUser]);

  const handleUpdateState = async (id: string, currentState: string) => {
    const newState = currentState === "active" ? "inactive" : "active";
    setConfirmDialog({
      open: true,
      title: "STATE_CHANGE_PROTOCOL",
      message: `Are you sure you want to ${newState === 'active' ? 'ACTIVATE' : 'DEACTIVATE'} this identity subject? This will affect their access to all vault resources.`,
      onConfirm: async () => {
        try {
          await api.put(`/admin-api/identities/${id}/state`, { state: newState });
          toast.success(`Identity status updated to ${newState}`);
          mutateUsers();
          if (selectedUser?.id === id) setSelectedUser({...selectedUser, state: newState});
        } catch (e) { toast.error("Failed to update status"); }
        setConfirmDialog(null);
      }
    });
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

  const handleUpdateTrait = async () => {
    if (!selectedUser || !editingTrait) return;
    try {
      const updatedTraits = { ...selectedUser.traits, [editingTrait]: editingValue };
      await api.patch(`/admin-api/identities/${selectedUser.id}/traits`, updatedTraits);
      toast.success(`Trait ${editingTrait} updated`);
      setEditingTrait(null);
      mutateUsers();
      const { data: updated } = await api.get(`/admin-api/identities/${selectedUser.id}`);
      setSelectedUser(updated);
    } catch (e) { toast.error("Failed to update trait"); }
  };

  const handleUpdateMetadata = async () => {
    if (!selectedUser) return;
    try {
      const parsed = JSON.parse(metadataValue);
      await api.patch(`/admin-api/identities/${selectedUser.id}/metadata`, parsed);
      toast.success("Metadata updated");
      mutateUsers();
      const { data: updated } = await api.get(`/admin-api/identities/${selectedUser.id}`);
      setSelectedUser(updated);
    } catch (e) { toast.error("Invalid JSON or update failed"); }
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
            <TabsTrigger value="roles_mgmt" className="px-8 text-xs font-medium uppercase tracking-widest">Roles</TabsTrigger>
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

          <TabsContent value="roles_mgmt" className="space-y-6">
             <div className="flex justify-end">
                <VaultButton variant="primary" size="sm" onClick={() => setIsCreateRoleOpen(true)}>
                    <Plus size={14} className="mr-2" /> CREATE_NEW_ROLE
                </VaultButton>
             </div>
             <VaultCard className="p-0 border-white/[0.06] overflow-hidden">
                <Table>
                    <TableHeader className="bg-white/[0.02]">
                        <TableRow className="border-b border-white/[0.06]">
                            <TableHead className="pl-8 text-[10px] uppercase font-mono py-4">Role_ID</TableHead>
                            <TableHead className="text-[10px] uppercase font-mono py-4">Description</TableHead>
                            <TableHead className="text-right pr-8"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {availableRoles?.map((role: any) => (
                            <TableRow key={role.id} className="border-b border-white/[0.02]">
                                <TableCell className="pl-8 py-4">
                                    <span className="text-sm font-mono text-accent-bright font-bold uppercase">{role.id}</span>
                                </TableCell>
                                <TableCell className="text-xs text-foreground-muted">{role.description}</TableCell>
                                <TableCell className="text-right pr-8">
                                    <VaultButton variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={async () => {
                                        if (!confirm("Delete this role?")) return;
                                        try {
                                            await api.delete(`/admin-api/roles/${role.id}`);
                                            toast.success("Role deleted");
                                            mutateUsers();
                                        } catch (e) { toast.error("Failed to delete role"); }
                                    }}>
                                        <Trash2 size={14} />
                                    </VaultButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
             </VaultCard>
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
                            <React.Fragment key={log.id}>
                                <TableRow 
                                    className="border-b border-white/[0.02] cursor-pointer hover:bg-white/[0.02] transition-colors"
                                    onClick={() => setExpandedAudit(expandedAudit === log.id ? null : log.id)}
                                >
                                    <TableCell className="pl-8 text-xs font-mono text-foreground-muted">{new Date(log.timestamp).toLocaleString()}</TableCell>
                                    <TableCell><VaultBadge>{log.action}</VaultBadge></TableCell>
                                    <TableCell className="text-xs text-foreground/80 font-mono tracking-tighter">{log.target_id?.substring(0,12)}...</TableCell>
                                    <TableCell className="text-xs font-mono text-foreground-subtle">{log.ip_address}</TableCell>
                                </TableRow>
                                <AnimatePresence>
                                    {expandedAudit === log.id && (
                                        <TableRow className="bg-white/[0.01] border-b border-white/[0.02]">
                                            <TableCell colSpan={4} className="p-0">
                                                <motion.div 
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="p-8 space-y-4">
                                                        <div className="grid grid-cols-2 gap-8">
                                                            <div className="space-y-2">
                                                                <Label className="text-[9px] uppercase font-mono text-foreground-subtle">Admin_ID</Label>
                                                                <div className="text-xs font-mono text-white">{log.admin_id}</div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-[9px] uppercase font-mono text-foreground-subtle">User_Agent</Label>
                                                                <div className="text-[10px] font-mono text-foreground-muted break-all">{log.user_agent}</div>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-[9px] uppercase font-mono text-foreground-subtle">Details_Payload</Label>
                                                            <pre className="p-4 bg-black/40 rounded-xl border border-white/[0.06] text-[10px] font-mono text-accent-bright overflow-x-auto">
                                                                {JSON.stringify(log.details, null, 2)}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </AnimatePresence>
                            </React.Fragment>
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
                            await api.post(`/admin-api/bulk/cleanup?days=${bulkDays}`);
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
                 <div 
                    className="p-6 border border-dashed border-white/10 rounded-2xl text-center cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => document.getElementById('bulk-import')?.click()}
                 >
                     <UploadCloud size={32} className="mx-auto text-foreground-muted/20 mb-3" />
                     <p className="text-[10px] text-foreground-muted uppercase tracking-widest">CSV_IMPORT_PENDING</p>
                     <input 
                        id="bulk-import" 
                        type="file" 
                        className="hidden" 
                        accept=".json"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                                const text = await file.text();
                                const data = JSON.parse(text);
                                await api.post("/admin-api/bulk/import", data);
                                toast.success("Bulk import protocol completed");
                                mutateUsers();
                            } catch (e) { toast.error("Import failed: Invalid JSON format"); }
                        }}
                    />
                 </div>
                 <VaultButton variant="secondary" className="w-full" onClick={() => document.getElementById('bulk-import')?.click()}>
                     INITIALIZE_BULK_PROVISION
                 </VaultButton>
              </VaultCard>
           </TabsContent>
         </Tabs>

         <Dialog open={!!confirmDialog} onOpenChange={(o) => !o && setConfirmDialog(null)}>
            <DialogContent className="sm:max-w-[425px] bg-background-elevated border-white/[0.08] backdrop-blur-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-400">
                        <ShieldCheck size={18} />
                        {confirmDialog?.title}
                    </DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <p className="text-sm text-foreground-muted leading-relaxed uppercase tracking-tight">
                        {confirmDialog?.message}
                    </p>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <VaultButton variant="ghost" size="sm" onClick={() => setConfirmDialog(null)}>ABORT</VaultButton>
                    <VaultButton variant="primary" size="sm" className="bg-red-500 hover:bg-red-600 border-red-500/50" onClick={confirmDialog?.onConfirm}>CONFIRM_EXECUTION</VaultButton>
                </div>
            </DialogContent>
         </Dialog>

         <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
            <DialogContent className="sm:max-w-[425px] bg-background-elevated border-white/[0.08] backdrop-blur-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-white">
                        <ShieldCheck size={18} className="text-accent" />
                        INITIALIZE_NEW_ROLE
                    </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-mono text-foreground-subtle">Role_Identifier</Label>
                        <Input 
                            value={newRoleData.id} 
                            onChange={e => setNewRoleData({...newRoleData, id: e.target.value})}
                            placeholder="e.g. compliance_officer"
                            className="bg-white/[0.03] border-white/[0.06] h-12"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-mono text-foreground-subtle">Description</Label>
                        <Input 
                            value={newRoleData.description} 
                            onChange={e => setNewRoleData({...newRoleData, description: e.target.value})}
                            placeholder="Brief protocol description..."
                            className="bg-white/[0.03] border-white/[0.06] h-12"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <VaultButton variant="ghost" size="sm" onClick={() => setIsCreateRoleOpen(false)}>ABORT</VaultButton>
                    <VaultButton variant="primary" size="sm" onClick={async () => {
                        try {
                            await api.post("/admin-api/roles", newRoleData);
                            toast.success("Role created successfully");
                            mutateUsers();
                            setIsCreateRoleOpen(false);
                            setNewRoleData({ id: "", description: "" });
                        } catch (e) { toast.error("Failed to create role"); }
                    }}>COMMIT_ROLE</VaultButton>
                </div>
            </DialogContent>
         </Dialog>

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
                        <TabsTrigger value="metadata" className="text-[10px] uppercase">Metadata</TabsTrigger>
                        <TabsTrigger value="roles" className="text-[10px] uppercase">RBAC_Roles</TabsTrigger>
                        <TabsTrigger value="sessions" className="text-[10px] uppercase">Active_Sessions</TabsTrigger>
                        <TabsTrigger value="security" className="text-[10px] uppercase text-red-400">Security</TabsTrigger>
                    </TabsList>

                    <TabsContent value="traits" className="grid grid-cols-2 gap-4">
                        {selectedUser && Object.entries(selectedUser.traits || {}).map(([k, v]: [string, any]) => (
                            <div key={k} className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl group hover:border-white/10 transition-colors">
                                <Label className="text-[9px] uppercase font-mono text-foreground-subtle block mb-1">{k}</Label>
                                {editingTrait === k ? (
                                    <div className="flex gap-2 mt-1">
                                        <Input 
                                            value={editingValue} 
                                            onChange={e => setEditingValue(e.target.value)}
                                            className="h-8 text-xs bg-white/[0.05]"
                                            autoFocus
                                        />
                                        <VaultButton size="sm" className="h-8 px-2" onClick={handleUpdateTrait}>SAVE</VaultButton>
                                        <VaultButton variant="secondary" size="sm" className="h-8 px-2" onClick={() => setEditingTrait(null)}>X</VaultButton>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm font-medium text-white truncate">{String(v)}</p>
                                        <Edit3 
                                            size={12} 
                                            className="text-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-accent" 
                                            onClick={() => {
                                                setEditingTrait(k);
                                                setEditingValue(String(v));
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </TabsContent>

                    <TabsContent value="metadata" className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-mono text-foreground-subtle">Admin_Metadata (JSON)</Label>
                            <textarea 
                                value={metadataValue}
                                onChange={e => setMetadataValue(e.target.value)}
                                className="w-full h-48 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 font-mono text-xs text-foreground-muted focus:outline-none focus:border-accent resize-none"
                            />
                        </div>
                        <VaultButton className="w-full" onClick={handleUpdateMetadata}>UPDATE_METADATA_PROTOCOL</VaultButton>
                    </TabsContent>

                    <TabsContent value="roles" className="space-y-6">
                        <div className="flex gap-2">
                            <select 
                                value={newRole} 
                                onChange={e => setNewRole(e.target.value)} 
                                className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 text-sm text-white focus:outline-none focus:border-accent h-12"
                            >
                                <option value="" disabled className="bg-background-elevated text-foreground-muted">Select a role to assign...</option>
                                {availableRoles?.filter((r: any) => !selectedUser?.roles?.includes(r.id)).map((r: any) => (
                                    <option key={r.id} value={r.id} className="bg-background-elevated text-white">{r.id}</option>
                                ))}
                            </select>
                            <VaultButton onClick={handleAssignRole} disabled={!newRole}>GRANT</VaultButton>
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
                            {!selectedUser?.roles?.length && (
                                <div className="text-center py-10 text-foreground-muted/20 font-mono text-[10px] uppercase">Zero_Roles_Assigned</div>
                            )}
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
