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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  User,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Search,
  History,
  Users,
  Key,
  Database,
  RefreshCw,
  MoreVertical,
  Activity,
  Mail,
  Lock,
  LogOut,
  FileJson,
  Edit3,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Eraser,
  UploadCloud,
  Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Identity {
  id: string;
  state: "active" | "inactive";
  traits: {
    email?: string;
    first_name?: string;
    last_name?: string;
    division?: string;
    [key: string]: any;
  };
  metadata_admin?: any;
  created_at: string;
}

interface ListIdentitiesResponse {
  identities: Identity[];
  next_page_token: string;
}

export default function AdminControlPage() {
  const router = useRouter();
  const { data: me, isLoading: meLoading } = useSWR("/api/me", fetcher);

  // Redirect if not admin
  useEffect(() => {
    if (!meLoading && me && me.roles && !me.roles.includes('admin')) {
      toast.error("ADMIN_PROTOCOL_DENIED: Redirecting to secure node.");
      router.push("/dashboard/documents");
    }
  }, [me, meLoading, router]);


  // Pagination States (Kratos uses Opaque Tokens)
  const [pageToken, setPageToken] = useState("");
  const [historyTokens, setHistoryTokens] = useState<string[]>([]);

  const [auditPage, setAuditPage] = useState(0);
  const [rolePage, setRolePage] = useState(0);
  const limit = 10;

  const {
    data: identityData,
    mutate: mutateUsers,
    isLoading,
  } = useSWR<ListIdentitiesResponse>(
    `/admin-api/identities?page_size=${limit}&page_token=${pageToken}`,
    fetcher,
  );
  const { data: auditLogs } = useSWR<any[]>(
    `/admin-api/audit?limit=${limit}&offset=${auditPage * limit}`,
    fetcher,
  );
  const { data: globalRoles, mutate: mutateGlobalRoles } = useSWR<any[]>(
    `/admin-api/roles?limit=${limit}&offset=${rolePage * limit}`,
    fetcher,
  );

  const [selectedUser, setSelectedUser] = useState<Identity | null>(null);
  const [newRole, setNewRole] = useState({ id: "", description: "" });
  const [cleanupDays, setCleanupDays] = useState("30");
  const [importData, setImportData] = useState("");

  const [editTraits, setEditTraits] = useState<any>({});
  const [editMetadata, setEditMetadata] = useState("");

  const { data: userSessions, mutate: mutateSessions } = useSWR(
    selectedUser ? `/admin-api/identities/${selectedUser.id}/sessions` : null,
    fetcher,
  );
  const { data: userRoles, mutate: mutateUserRoles } = useSWR(
    selectedUser ? `/admin-api/identities/${selectedUser.id}/roles` : null,
    fetcher,
  );

  useEffect(() => {
    if (selectedUser) {
      setEditTraits({ ...selectedUser.traits });
      setEditMetadata(
        JSON.stringify(selectedUser.metadata_admin || {}, null, 2),
      );
    }
  }, [selectedUser]);

  const handleAction = async (name: string, fn: () => Promise<any>) => {
    try {
      await fn();
      toast.success(`${name} successful`);
      mutateUsers();
      if (selectedUser) {
        mutateSessions();
        mutateUserRoles();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || `Failed: ${name}`);
    }
  };

  const handleNextPage = () => {
    if (identityData?.next_page_token) {
      setHistoryTokens([...historyTokens, pageToken]);
      setPageToken(identityData.next_page_token);
    }
  };

  const handlePrevPage = () => {
    const prev = historyTokens.pop();
    setPageToken(prev || "");
    setHistoryTokens([...historyTokens]);
  };

  const saveProfile = async () => {
    handleAction("Update Identity", async () => {
      await api.patch(
        `/admin-api/identities/${selectedUser!.id}/traits`,
        editTraits,
      );
      try {
        const metaObj = JSON.parse(editMetadata);
        await api.put(
          `/admin-api/identities/${selectedUser!.id}/metadata`,
          metaObj,
        );
      } catch (e) {
        toast.error("Invalid Metadata JSON");
        throw e;
      }
    });
  };

  const handleBulkImport = async () => {
    try {
      const rows = importData.trim().split("\n");
      const headers = rows[0].split(",").map((h) => h.trim());
      const data = rows.slice(1).map((row) => {
        const values = row.split(",");
        const traits: any = {};
        headers.forEach((h, i) => (traits[h] = values[i]));
        return { traits, schema_id: "default" };
      });
      await handleAction("Bulk Import", () =>
        api.post("/admin-api/bulk/import", data),
      );
      setImportData("");
    } catch (err) {
      toast.error("Check CSV format.");
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans text-slate-900">
      <Navbar />

      <main className="p-8 max-w-7xl mx-auto space-y-10 mt-4">
        <VaultHeader
          title="Admin Control"
          subtitle="Hardened identity infrastructure and global security state"
        />

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-slate-200/50 p-1 rounded-2xl border-2 border-slate-200 mb-8">
            <TabsTrigger
              value="users"
              className="rounded-xl px-8 font-black text-[10px] tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white uppercase"
            >
              Identities
            </TabsTrigger>
            <TabsTrigger
              value="audit"
              className="rounded-xl px-8 font-black text-[10px] tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white uppercase"
            >
              Audit_Logs
            </TabsTrigger>
            <TabsTrigger
              value="roles"
              className="rounded-xl px-8 font-black text-[10px] tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white uppercase"
            >
              System_Roles
            </TabsTrigger>
            <TabsTrigger
              value="ops"
              className="rounded-xl px-8 font-black text-[10px] tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white uppercase"
            >
              Infra_Ops
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <VaultCard variant="slate" className="overflow-hidden p-0 border-4">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900 hover:bg-slate-900">
                    <TableHead className="pl-8 text-white font-black uppercase text-[10px] py-6">
                      Identity_Subject
                    </TableHead>
                    <TableHead className="text-white font-black uppercase text-[10px] py-6">
                      Status
                    </TableHead>
                    <TableHead className="text-white font-black uppercase text-[10px] py-6 text-right pr-8">
                      Operations
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white">
                  {identityData?.identities?.map((user) => (
                    <TableRow
                      key={user.id}
                      className="border-b-2 border-slate-50 hover:bg-slate-50/50 transition-colors"
                    >
                      <TableCell className="pl-8 py-4 flex items-center gap-4">
                        <div className="p-2 bg-slate-100 rounded-lg border-2 border-slate-200">
                          <User size={16} />
                        </div>
                        <div>
                          <div className="font-black text-sm">
                            {user.traits?.email || "NO_EMAIL"}
                          </div>
                          <div className="text-[9px] font-mono text-slate-300 italic">
                            {user.id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <VaultBadge
                          className={
                            user.state === "active"
                              ? "text-green-600 border-green-200 bg-green-50"
                              : "text-red-600 border-red-200 bg-red-50"
                          }
                        >
                          {user.state}
                        </VaultBadge>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex justify-end gap-2">
                          <VaultButton
                            variant="outline"
                            size="sm"
                            className="h-9 text-[9px] px-4"
                            onClick={() => setSelectedUser(user)}
                          >
                            MANAGE_NODE
                          </VaultButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!identityData?.identities?.length && !isLoading && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="py-20 text-center font-black text-slate-300 uppercase italic"
                      >
                        Empty_Registry
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </VaultCard>
            {/* User Pagination (Token-based) */}
            <div className="flex justify-center gap-4 mt-8">
              <VaultButton
                variant="outline"
                className="h-10 px-6 text-[10px]"
                disabled={historyTokens.length === 0}
                onClick={handlePrevPage}
              >
                <ChevronLeft size={16} /> PREV
              </VaultButton>
              <div className="bg-slate-900 text-white px-6 h-10 flex items-center rounded-xl font-black text-[10px] uppercase italic tracking-widest shadow-lg shadow-blue-100">
                IDENT_STREAM
              </div>
              <VaultButton
                variant="outline"
                className="h-10 px-6 text-[10px]"
                disabled={!identityData?.next_page_token}
                onClick={handleNextPage}
              >
                <ChevronRight size={16} />
              </VaultButton>
            </div>
          </TabsContent>

          <TabsContent value="audit">
            <VaultCard className="overflow-hidden p-0 border-4">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900">
                    <TableHead className="pl-8 text-white font-black uppercase text-[10px] py-6">
                      Audit_Stream
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white">
                  {auditLogs?.map((log, i) => (
                    <TableRow key={i} className="border-b-2 border-slate-50">
                      <TableCell className="pl-8 py-4">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-slate-50 rounded-lg">
                            <Activity size={14} className="text-blue-500" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-[11px] uppercase">
                              {log.action}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400">
                              {new Date(log.timestamp).toLocaleString()} // Sub:{" "}
                              {log.user_id?.substring(0, 8)}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </VaultCard>
            <div className="flex justify-center gap-4 mt-8">
              <VaultButton
                variant="outline"
                className="h-10 px-6 text-[10px]"
                disabled={auditPage === 0}
                onClick={() => setAuditPage(auditPage - 1)}
              >
                <ChevronLeft size={16} />
              </VaultButton>
              <VaultButton
                variant="outline"
                className="h-10 px-6 text-[10px]"
                disabled={!auditLogs || auditLogs.length < limit}
                onClick={() => setAuditPage(auditPage + 1)}
              >
                <ChevronRight size={16} />
              </VaultButton>
            </div>
          </TabsContent>

          <TabsContent value="roles">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4">
                <VaultCard variant="blue" className="p-8 space-y-6">
                  <h3 className="font-black italic uppercase text-sm">
                    Register_New_Role
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-[9px] font-black uppercase ml-1">
                        Role_ID
                      </Label>
                      <Input
                        placeholder="e.g. support"
                        value={newRole.id}
                        onChange={(e) =>
                          setNewRole({
                            ...newRole,
                            id: e.target.value.toLowerCase(),
                          })
                        }
                        className="border-2 rounded-xl h-12 font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-[9px] font-black uppercase ml-1">
                        Description
                      </Label>
                      <Input
                        placeholder="Brief description"
                        value={newRole.description}
                        onChange={(e) =>
                          setNewRole({
                            ...newRole,
                            description: e.target.value,
                          })
                        }
                        className="border-2 rounded-xl h-12 font-bold"
                      />
                    </div>
                    <VaultButton
                      onClick={() =>
                        handleAction("Role Creation", () =>
                          api.post("/admin-api/roles", newRole).then(() => {
                            mutateGlobalRoles();
                            setNewRole({ id: "", description: "" });
                          }),
                        )
                      }
                      className="w-full h-12 bg-blue-600"
                    >
                      REGISTER_ROLE
                    </VaultButton>
                  </div>
                </VaultCard>
              </div>
              <div className="lg:col-span-8 space-y-4">
                {globalRoles?.map((role) => (
                  <div
                    key={role.id}
                    className="p-5 bg-white border-4 border-slate-900 rounded-2xl flex justify-between items-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="text-green-600" />
                      <div>
                        <span className="font-black uppercase italic tracking-tighter text-lg">
                          {role.id}
                        </span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {role.description}
                        </p>
                      </div>
                    </div>
                    <VaultButton
                      variant="outline"
                      size="icon"
                      className="text-red-500 border-2"
                      onClick={() =>
                        handleAction("Role Deletion", () =>
                          api
                            .delete(`/admin-api/roles/${role.id}`)
                            .then(() => mutateGlobalRoles()),
                        )
                      }
                    >
                      <Trash2 size={16} />
                    </VaultButton>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ops">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <VaultCard
                variant="destructive"
                className="p-8 space-y-4 border-4"
              >
                <Eraser size={32} className="text-red-600" />
                <h3 className="font-black text-xl uppercase italic">
                  Cleanup_Protocol
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Wipe stale identities that haven't performed a handshake in X
                  days.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={cleanupDays}
                    onChange={(e) => setCleanupDays(e.target.value)}
                    className="w-24 border-2 rounded-xl font-black h-12"
                  />
                  <VaultButton
                    className="flex-1 bg-red-600"
                    onClick={() =>
                      handleAction("Cleanup", () =>
                        api.post(`/admin-api/bulk/cleanup?days=${cleanupDays}`),
                      )
                    }
                  >
                    EXECUTE_PURGE
                  </VaultButton>
                </div>
              </VaultCard>

              <VaultCard variant="indigo" className="p-8 space-y-4 border-4">
                <UploadCloud size={32} className="text-indigo-600" />
                <h3 className="font-black text-xl uppercase italic">
                  Mass_Ingestion
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Bulk import identities via CSV data (email, first_name,
                  last_name).
                </p>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder="email,first_name,last_name"
                  className="w-full h-24 border-2 rounded-xl p-3 font-mono text-[10px] bg-slate-50"
                />
                <VaultButton
                  className="w-full bg-indigo-600 h-12"
                  onClick={handleBulkImport}
                >
                  INITIALIZE_IMPORT
                </VaultButton>
              </VaultCard>
            </div>
          </TabsContent>
        </Tabs>

        {/* --- DEEP MANAGEMENT DIALOG --- */}
        <Dialog
          open={!!selectedUser}
          onOpenChange={() => setSelectedUser(null)}
        >
          <DialogContent className="max-w-4xl border-4 border-slate-900 rounded-[2.5rem] bg-white p-0 overflow-hidden shadow-2xl">
            <DialogHeader className="bg-slate-900 text-white p-8">
              <DialogTitle className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                <ShieldCheck size={28} className="text-blue-400" />{" "}
                Identity_Control_Plane
              </DialogTitle>
              <DialogDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">
                Managing Subject: {selectedUser?.traits.email}
              </DialogDescription>
            </DialogHeader>

            <div className="p-8">
              <Tabs defaultValue="traits" className="w-full">
                <TabsList className="w-full bg-slate-100 p-1 rounded-xl mb-8">
                  <TabsTrigger
                    value="traits"
                    className="w-1/4 text-[9px] font-black uppercase"
                  >
                    Traits
                  </TabsTrigger>
                  <TabsTrigger
                    value="access"
                    className="w-1/4 text-[9px] font-black uppercase"
                  >
                    Roles
                  </TabsTrigger>
                  <TabsTrigger
                    value="sessions"
                    className="w-1/4 text-[9px] font-black uppercase"
                  >
                    Sessions
                  </TabsTrigger>
                  <TabsTrigger
                    value="security"
                    className="w-1/4 text-[9px] font-black uppercase"
                  >
                    Ops
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="traits" className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase">
                        First_Name
                      </Label>
                      <Input
                        value={editTraits.first_name || ""}
                        onChange={(e) =>
                          setEditTraits({
                            ...editTraits,
                            first_name: e.target.value,
                          })
                        }
                        className="border-2 rounded-xl font-bold h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase">
                        Last_Name
                      </Label>
                      <Input
                        value={editTraits.last_name || ""}
                        onChange={(e) =>
                          setEditTraits({
                            ...editTraits,
                            last_name: e.target.value,
                          })
                        }
                        className="border-2 rounded-xl font-bold h-12"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label className="text-[9px] font-black uppercase">
                        Division
                      </Label>
                      <Input
                        value={editTraits.division || ""}
                        onChange={(e) =>
                          setEditTraits({
                            ...editTraits,
                            division: e.target.value,
                          })
                        }
                        className="border-2 rounded-xl font-bold h-12"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label className="text-[9px] font-black uppercase ml-1 flex items-center gap-1">
                        <FileJson size={10} /> Metadata (JSON)
                      </Label>
                      <textarea
                        value={editMetadata}
                        onChange={(e) => setEditMetadata(e.target.value)}
                        className="w-full h-32 rounded-xl border-2 p-4 font-mono text-[10px] bg-slate-50 focus:bg-white transition-colors outline-none"
                      />
                    </div>
                  </div>
                  <VaultButton
                    onClick={saveProfile}
                    className="w-full py-7 bg-slate-900"
                  >
                    COMMIT_IDENTITY_PATCH
                  </VaultButton>
                </TabsContent>

                <TabsContent value="access" className="space-y-6">
                  <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest italic">
                      Assigned_Roles:
                    </h4>
                    <div className="flex flex-wrap gap-2 mb-8">
                      {userRoles?.map((rid: string) => (
                        <VaultBadge
                          key={rid}
                          className="bg-blue-600 text-white border-blue-600 px-4 py-2 text-[10px]"
                        >
                          {rid.toUpperCase()}{" "}
                          <button
                            className="ml-2 font-black text-white hover:text-red-200"
                            onClick={() =>
                              handleAction("Role Revoke", () =>
                                api.delete(
                                  `/admin-api/identities/${selectedUser!.id}/roles/${rid}`,
                                ),
                              )
                            }
                          >
                            ×
                          </button>
                        </VaultBadge>
                      ))}
                    </div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest italic">
                      Available_Roles:
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {globalRoles
                        ?.filter((gr: any) => !userRoles?.includes(gr.id))
                        .map((gr: any) => (
                          <button
                            key={gr.id}
                            className="text-left p-3 border-2 border-slate-200 hover:border-slate-900 rounded-xl transition-all text-[10px] font-black uppercase group flex justify-between items-center"
                            onClick={() =>
                              handleAction("Role Assign", () =>
                                api.post(
                                  `/admin-api/identities/${selectedUser!.id}/roles`,
                                  { role_id: gr.id },
                                ),
                              )
                            }
                          >
                            {gr.id}{" "}
                            <Plus
                              size={12}
                              className="text-slate-300 group-hover:text-slate-900"
                            />
                          </button>
                        ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="sessions" className="space-y-4">
                  {userSessions?.map((s: any) => (
                    <div
                      key={s.id}
                      className="p-4 bg-white border-2 border-slate-200 rounded-2xl flex justify-between items-center"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${s.active ? "bg-green-500 animate-pulse" : "bg-slate-300"}`}
                        />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase">
                            ID: {s.id.substring(0, 12)}...
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">
                            IP: {s.devices?.[0]?.ip_address || "HIDDEN"}
                          </span>
                        </div>
                      </div>
                      <VaultButton
                        variant="outline"
                        size="icon"
                        className="text-red-500 border-2"
                        onClick={() =>
                          handleAction("Revoke Session", () =>
                            api.delete(
                              `/admin-api/identities/${selectedUser!.id}/sessions/${s.id}`,
                            ),
                          )
                        }
                      >
                        <LogOut size={14} />
                      </VaultButton>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent
                  value="security"
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <VaultButton
                    variant="outline"
                    className="h-20 flex-col gap-2 border-2 border-blue-200 text-blue-600"
                    onClick={() =>
                      handleAction("Trigger Recovery", () =>
                        api.post(
                          `/admin-api/identities/${selectedUser!.id}/recovery`,
                        ),
                      )
                    }
                  >
                    <Lock size={20} />
                    <span className="text-[10px]">RECOVERY_EMAIL</span>
                  </VaultButton>
                  <VaultButton
                    variant="outline"
                    className="h-20 flex-col gap-2 border-2 border-red-200 text-red-600"
                    onClick={() =>
                      handleAction("Purge Identity", () =>
                        api
                          .delete(`/admin-api/identities/${selectedUser!.id}`)
                          .then(() => setSelectedUser(null)),
                      )
                    }
                  >
                    <Trash2 size={20} />
                    <span className="text-[10px]">PURGE_SUBJECT</span>
                  </VaultButton>
                </TabsContent>
              </Tabs>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
