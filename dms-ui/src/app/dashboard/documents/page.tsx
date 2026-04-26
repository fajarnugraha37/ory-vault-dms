"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate as globalMutate } from "swr";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  UploadCloud, 
  DownloadCloud,
  Trash2,
  Share2,
  Shield,
  File,
  Database,
  FolderPlus,
  Folder as FolderIcon,
  ChevronRight,
  ArrowLeft,
  Link as LinkIcon,
  History,
  Edit2,
  MoveRight,
  UserX,
  Copy,
  Users,
  Fingerprint,
  Settings
} from "lucide-react";

const formatBytes = (bytes?: number) => {
  if (!bytes || bytes === 0) return '-';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface Node {
  id: string;
  name: string;
  type: 'folder' | 'file';
  parent_id: string | null;
  owner_id: string;
  user_permission?: string;
  created_at: string;
  updated_at: string;
  mime_type?: string;
  size_bytes?: number;
  version?: number;
  public_link_token?: string | null;
}

interface AccessRelation {
    user_id: string;
    email?: string;
    relation: string;
}

export default function DocumentExplorerPage() {
  const [activeTab, setActiveTab] = useState("owned");
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<{id: string | null, name: string}[]>([{id: null, name: "Root"}]);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'type' | 'size'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState(20);
  const [offset, setOffset] = useState(0);
  
  const { data: me } = useSWR('/api/me', fetcher);
  
  const nodesUrl = `/api/nodes?limit=${pageSize}&offset=${offset}&sort_by=${sortBy}&sort_order=${sortOrder}${currentFolder ? `&parent_id=${currentFolder}` : ''}`;
  const { data: nodes, mutate: mutateNodes } = useSWR<Node[]>(nodesUrl, fetcher);

  // States
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [updateNodeId, setUpdateNodeId] = useState<string | null>(null);

  const [newFolderName, setNewFolderName] = useState("");
  const [shareObj, setShareObj] = useState<{id: string, token?: string | null} | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRelation, setShareRelation] = useState("viewer");

  const [renameObj, setRenameObj] = useState<{id: string, name: string} | null>(null);
  const [newName, setNewName] = useState("");

  const [moveObj, setMoveObj] = useState<Node | null>(null);
  const [targetParentId, setTargetParentId] = useState("");

  const { data: accessList, mutate: mutateAccess } = useSWR<AccessRelation[]>(shareObj ? `/api/nodes/${shareObj.id}/access` : null, fetcher);

  useEffect(() => {
    setOffset(0);
    mutateNodes();
  }, [currentFolder, activeTab, sortBy, sortOrder, pageSize]);

  const handleAction = async (name: string, fn: () => Promise<any>) => {
    try {
      await fn();
      toast.success(`${name} successful`);
      mutateNodes();
    } catch (err: any) {
      toast.error(err.response?.data?.error || `Failed: ${name}`);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append("file", file);
    if (currentFolder) formData.append("parent_id", currentFolder);
    if (updateNodeId) formData.append("node_id", updateNodeId);

    try {
      await api.post("/api/documents", formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / (p.total || file.size)))
      });
      toast.success(updateNodeId ? "New version uploaded" : "File uploaded");
      setFile(null);
      setUpdateNodeId(null);
      mutateNodes();
    } catch (err: any) { toast.error("Upload failed"); } finally { setIsUploading(false); }
  };

  const handleDownload = async (node: Node) => {
    if (node.type !== 'file') return;
    try {
      const res = await api.get(`/api/documents/${node.id}/download`, { withCredentials: true, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', node.name);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) { toast.error("Download failed or access denied"); }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    handleAction('Folder Creation', () => api.post("/api/nodes", {
        name: newFolderName,
        parent_id: currentFolder
    }, { withCredentials: true }).then(() => setNewFolderName("")));
  };

  const handleRename = async () => {
    if (!renameObj || !newName.trim()) return;
    handleAction('Rename', () => api.put(`/api/nodes/${renameObj.id}/rename`, { name: newName }, { withCredentials: true }).then(() => {
        setRenameObj(null);
        setNewName("");
    }));
  };

  const handleMove = async () => {
    if (!moveObj) return;
    handleAction('Move', () => api.put(`/api/nodes/${moveObj.id}/move`, { parent_id: targetParentId.trim() === "" ? null : targetParentId }, { withCredentials: true }).then(() => {
        setMoveObj(null);
        setTargetParentId("");
    }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item? This will also affect all nested items.")) return;
    handleAction('Deletion', () => api.delete(`/api/nodes/${id}`, { withCredentials: true }));
  };

  const handleShare = async () => {
    if (!shareObj || !shareEmail) return;
    handleAction('Sharing', () => api.post(`/api/nodes/${shareObj.id}/share`, { email: shareEmail, relation: shareRelation }, { withCredentials: true }).then(() => {
        setShareEmail("");
        mutateAccess();
    }));
  };

  const handleRevoke = async (userId: string, rel: string) => {
    if (!shareObj) return;
    handleAction('Revoking Access', () => api.delete(`/api/nodes/${shareObj.id}/share/${userId}`, { data: { relation: rel }, withCredentials: true }).then(() => mutateAccess()));
  };

  const handlePublicLink = async () => {
    if (!shareObj) return;
    handleAction('Generate Link', () => api.post(`/api/documents/${shareObj.id}/public-link`, {}, { withCredentials: true }).then(res => {
        setShareObj({...shareObj, token: res.data.public_link_token});
        mutateNodes();
    }));
  };

  const handleRevokePublic = async () => {
    if (!shareObj) return;
    handleAction('Revoke Link', () => api.delete(`/api/documents/${shareObj.id}/public-link`, { withCredentials: true }).then(() => {
        setShareObj({...shareObj, token: null});
        mutateNodes();
    }));
  };

  const navigateTo = (id: string | null, name: string, isBack = false) => {
    setCurrentFolder(id);
    if (isBack) {
        const idx = folderHistory.findIndex(h => h.id === id);
        if (idx !== -1) {
            setFolderHistory(folderHistory.slice(0, idx + 1));
        } else {
            setFolderHistory([{id: null, name: "Root"}]);
        }
    } else {
        setFolderHistory([...folderHistory, { id, name }]);
    }
  };

  const myUserId = me?.user_id;

  const toggleSort = (field: 'name' | 'date' | 'type' | 'size') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Filter based on active tab (Owned vs Shared)
  const filteredNodes = nodes?.filter(n => activeTab === "owned" ? n.owner_id === myUserId : n.owner_id !== myUserId) || [];

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans">
      <nav className="bg-white border-b-4 border-slate-900 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-lg"><FileText size={20} /></div>
          <span className="font-black text-2xl tracking-tighter uppercase italic">Vault_Ops <span className="text-slate-400">DMS</span></span>
        </div>
        <div className="flex gap-4">
            <Button variant="outline" size="sm" asChild className="border-2 font-black text-[10px] rounded-xl hover:bg-slate-900 hover:text-white transition-all">
                <a href="/dashboard/apps"><Settings size={14} className="mr-2"/> MANAGE_APPS</a>
            </Button>
            <Dialog>
                <DialogTrigger asChild><Button variant="default" size="sm" className="font-black text-xs rounded-xl shadow-lg" onClick={() => setUpdateNodeId(null)}><UploadCloud size={16} className="mr-2" /> UPLOAD</Button></DialogTrigger>
                <DialogContent className="border-4 border-slate-900 rounded-[2rem]">
                    <DialogHeader><DialogTitle className="font-black uppercase italic">Upload to {folderHistory[folderHistory.length-1].name}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="border-2 rounded-xl h-14" />
                        {isUploading && <div className="space-y-2"><div className="flex justify-between text-[10px] font-black"><span>UPLOADING...</span><span>{uploadProgress}%</span></div><Progress value={uploadProgress} className="h-2" /></div>}
                    </div>
                    <DialogFooter><Button onClick={handleUpload} disabled={!file || isUploading} className="w-full font-black py-6 rounded-xl">Execute</Button></DialogFooter>
                </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" asChild className="border-2 font-black text-xs rounded-xl"><a href="/">Dashboard Hub</a></Button>
        </div>
      </nav>

      <main className="p-8 max-w-[1200px] mx-auto space-y-8 mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-between items-end mb-6">
                <TabsList className="bg-slate-200/50 p-1 rounded-2xl">
                    <TabsTrigger value="owned" className="rounded-xl px-8 font-black text-xs tracking-widest">MY_VAULT</TabsTrigger>
                    <TabsTrigger value="shared" className="rounded-xl px-8 font-black text-xs tracking-widest">SHARED_WITH_ME</TabsTrigger>
                </TabsList>
                {activeTab === "owned" && (
                    <Dialog>
                        <DialogTrigger asChild><Button variant="outline" size="sm" className="font-black text-[10px] border-2 rounded-xl h-10 px-6"><FolderPlus size={14} className="mr-2" /> NEW_FOLDER</Button></DialogTrigger>
                        <DialogContent className="border-4 border-slate-900 rounded-[2rem]">
                            <DialogHeader><DialogTitle className="font-black uppercase italic">Create Folder</DialogTitle></DialogHeader>
                            <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Folder Name" className="rounded-xl border-2 font-bold h-12" />
                            <DialogFooter><DialogClose asChild><Button onClick={handleCreateFolder} className="w-full font-black py-6 rounded-xl">Create</Button></DialogClose></DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <Card className="border-4 border-slate-900 rounded-[2.5rem] shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] overflow-hidden bg-white">
                <CardHeader className="bg-slate-50 border-b-2 border-slate-100">
                    <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest bg-white border-2 border-slate-200 p-3 rounded-2xl">
                        {folderHistory.map((fh, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className={`cursor-pointer ${i === folderHistory.length - 1 ? 'text-blue-600 underline' : 'hover:text-slate-900'}`} onClick={() => navigateTo(fh.id, fh.name, true)}>{fh.name}</span>
                                {i < folderHistory.length - 1 && <ChevronRight size={12} />}
                            </div>
                        ))}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader><TableRow className="bg-slate-900 hover:bg-slate-900">
                            <TableHead className="pl-8 text-white font-black uppercase text-[10px] tracking-widest py-5 cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('name')}>Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}</TableHead>
                            <TableHead className="text-white font-black uppercase text-[10px] tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('type')}>Type {sortBy === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}</TableHead>
                            <TableHead className="text-white font-black uppercase text-[10px] tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('size')}>Size {sortBy === 'size' && (sortOrder === 'asc' ? '↑' : '↓')}</TableHead>
                            <TableHead className="text-white font-black uppercase text-[10px] tracking-widest cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => toggleSort('date')}>Created {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}</TableHead>
                            <TableHead className="text-white font-black uppercase text-[10px] tracking-widest text-right pr-8">Actions</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                            {filteredNodes.map((item) => (
                                <TableRow key={item.id} className="border-b-2 border-slate-50 hover:bg-slate-50/80 transition-colors">
                                    <TableCell className="pl-8 py-5 cursor-pointer flex items-center gap-3" onClick={() => item.type === 'folder' && navigateTo(item.id, item.name)}>
                                        <div className={`${item.type === 'folder' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-100 text-slate-500 border-slate-200'} p-2 rounded-lg border-2`}>
                                            {item.type === 'folder' ? <FolderIcon size={18} className="fill-blue-100" /> : <FileText size={18} />}
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-900">{item.name}</div>
                                            <div className="text-[9px] font-mono text-slate-400 flex items-center gap-2">
                                                {item.type === 'folder' ? `DIR_${item.id.split('-')[0]}` : `DOC_${item.id.split('-')[0]}`}
                                                {item.type === 'file' && item.version && item.version > 1 && <Badge variant="outline" className="text-[8px] h-4">v{item.version}</Badge>}
                                                {item.type === 'file' && item.public_link_token && <LinkIcon size={10} className="text-green-500"/>}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={item.type === 'folder' ? "outline" : "secondary"} className="font-mono text-[9px] border-2 uppercase">
                                            {item.type === 'folder' ? 'folder' : (item.mime_type?.split('/')[1] || 'file')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell><span className="text-[10px] font-bold text-slate-400">{formatBytes(item.size_bytes)}</span></TableCell>
                                    <TableCell><span className="text-[10px] font-bold text-slate-500">{new Date(item.created_at).toLocaleDateString()}</span></TableCell>
                                    <TableCell className="text-right pr-8" onClick={e => e.stopPropagation()}>
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-slate-400" onClick={() => {navigator.clipboard.writeText(item.id); toast.success("ID Copied");}} title="Copy ID"><Fingerprint size={14}/></Button>

                                            {item.type === 'file' && <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-blue-600" onClick={() => handleDownload(item)} title="Download"><DownloadCloud size={14}/></Button>}
                                            
                                            {(item.user_permission === 'owner' || item.user_permission === 'editor') && (
                                                <>
                                                    <Dialog>
                                                        <DialogTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-slate-600" onClick={() => {setRenameObj({id: item.id, name: item.name}); setNewName(item.name);}} title="Rename"><Edit2 size={14}/></Button></DialogTrigger>
                                                        <DialogContent className="border-4 border-slate-900 rounded-[2rem]">
                                                            <DialogHeader><DialogTitle className="font-black uppercase italic">Rename {item.type}</DialogTitle></DialogHeader>
                                                            <Input value={newName} onChange={e => setNewName(e.target.value)} className="rounded-xl border-2 font-bold h-12" />
                                                            <DialogFooter><DialogClose asChild><Button onClick={handleRename} className="w-full font-black py-6 rounded-xl">Save</Button></DialogClose></DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>

                                                    {item.user_permission === 'owner' && (
                                                        <Dialog>
                                                            <DialogTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-emerald-600" onClick={() => {setMoveObj(item); setTargetParentId("");}} title="Move"><MoveRight size={14}/></Button></DialogTrigger>
                                                            <DialogContent className="border-4 border-slate-900 rounded-[2rem]">
                                                                <DialogHeader>
                                                                    <DialogTitle className="font-black uppercase italic">Move {item.type}</DialogTitle>
                                                                    <DialogDescription className="font-bold text-[10px] text-slate-400 uppercase tracking-tight">
                                                                        Enter Target Folder UUID or set to Root level.
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <div className="space-y-4 py-4">
                                                                    <div className="flex gap-2">
                                                                        <Input value={targetParentId} onChange={e => setTargetParentId(e.target.value)} placeholder="Folder UUID" className="flex-1 rounded-xl border-2 font-mono h-12 text-xs" />
                                                                        <Button variant="secondary" className="font-black text-[10px] rounded-xl border-2 px-4 h-12 hover:bg-blue-50" onClick={() => setTargetParentId("")}>ROOT</Button>
                                                                    </div>
                                                                    {targetParentId === "" && (
                                                                        <div className="bg-blue-50 border-2 border-blue-100 p-3 rounded-xl flex items-center gap-2">
                                                                            <Database size={14} className="text-blue-600" />
                                                                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Target: Main Vault (Root)</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <DialogFooter><DialogClose asChild><Button onClick={handleMove} className="w-full font-black py-6 rounded-xl bg-slate-900 text-white uppercase text-xs tracking-widest">Execute Move</Button></DialogClose></DialogFooter>
                                                            </DialogContent>
                                                        </Dialog>
                                                    )}

                                                    {item.user_permission === 'owner' && (
                                                        <Dialog>
                                                            <DialogTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-indigo-600" onClick={() => setShareObj({id: item.id, token: item.public_link_token})} title="Share"><Share2 size={14}/></Button></DialogTrigger>
                                                            <DialogContent className="border-4 border-slate-900 rounded-[2rem]">
                                                                <DialogHeader><DialogTitle className="font-black uppercase italic">Share Access</DialogTitle></DialogHeader>
                                                                <Tabs defaultValue="share">
                                                                    <TabsList className="w-full bg-slate-100 p-1 rounded-xl mb-4">
                                                                        <TabsTrigger value="share" className="w-1/3 text-[9px] font-black">SHARE</TabsTrigger>
                                                                        <TabsTrigger value="access" className="w-1/3 text-[9px] font-black">USERS</TabsTrigger>
                                                                        {item.type === 'file' && <TabsTrigger value="public" className="w-1/3 text-[9px] font-black">PUBLIC</TabsTrigger>}
                                                                    </TabsList>
                                                                    <TabsContent value="share" className="space-y-4">
                                                                        <Input value={shareEmail} onChange={e => setShareEmail(e.target.value)} placeholder="Target Email" className="rounded-xl border-2 font-bold h-12" />
                                                                        <div className="flex gap-2"><Button variant={shareRelation === 'viewer' ? 'default' : 'outline'} className="flex-1 rounded-xl font-black h-12" onClick={() => setShareRelation('viewer')}>VIEWER</Button><Button variant={shareRelation === 'editor' ? 'default' : 'outline'} className="flex-1 rounded-xl font-black h-12" onClick={() => setShareRelation('editor')}>EDITOR</Button></div>
                                                                        <Button onClick={handleShare} className="w-full font-black py-6 rounded-xl bg-slate-900 text-white uppercase text-[10px] tracking-widest">Grant Access</Button>
                                                                    </TabsContent>
                                                                    <TabsContent value="access">
                                                                        <ScrollArea className="h-48 border-2 rounded-xl p-2 bg-slate-50">
                                                                            {accessList?.map(acc => (
                                                                                <div key={acc.user_id} className="flex justify-between items-center p-3 bg-white border rounded-xl mb-2">
                                                                                    <div className="text-[10px] font-black">
                                                                                        {acc.email || acc.user_id.substring(0,13) + "..."} 
                                                                                        <Badge variant="secondary" className="ml-2 text-[8px] uppercase">{acc.relation}</Badge>
                                                                                    </div>
                                                                                    {acc.relation !== 'owner' && (
                                                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleRevoke(acc.user_id, acc.relation)}>
                                                                                            <UserX size={12}/>
                                                                                        </Button>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                            {!accessList?.length && <div className="text-center py-8 text-slate-400 font-bold text-xs">NO_SHARED_USERS</div>}
                                                                        </ScrollArea>
                                                                    </TabsContent>
                                                                    {item.type === 'file' && (
                                                                        <TabsContent value="public" className="space-y-4">
                                                                            {shareObj?.token ? (
                                                                                <div className="p-4 bg-green-50 border-2 border-green-200 rounded-2xl flex flex-col gap-3">
                                                                                    <div className="text-[10px] font-black text-green-700 uppercase">Active Public Signal</div>
                                                                                    <div className="bg-white border p-3 rounded-xl font-mono text-[9px] break-all">{`${window.location.origin}/public/${shareObj.token}`}</div>
                                                                                    <div className="flex gap-2"><Button size="sm" className="flex-1 bg-green-600 font-black h-10 text-[10px] rounded-xl text-white" onClick={() => {navigator.clipboard.writeText(`${window.location.origin}/public/${shareObj?.token}`); toast.success("Copied!");}}>COPY</Button><Button size="sm" variant="destructive" className="flex-1 font-black h-10 text-[10px] rounded-xl" onClick={handleRevokePublic}>REVOKE</Button></div>
                                                                                </div>
                                                                            ) : <Button onClick={handlePublicLink} className="w-full h-12 rounded-xl bg-slate-900 font-black text-white uppercase text-xs">Generate Public Signal</Button>}
                                                                        </TabsContent>
                                                                    )}
                                                                </Tabs>
                                                            </DialogContent>
                                                        </Dialog>
                                                    )}
                                                    
                                                    {item.user_permission === 'owner' && (
                                                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-red-500" onClick={() => handleDelete(item.id)} title="Delete"><Trash2 size={14}/></Button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <div className="bg-slate-50 border-t-2 border-slate-100 p-6 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Show:</span>
                            <div className="flex gap-1">
                                {[20, 50, 100].map(sz => (
                                    <Button key={sz} variant={pageSize === sz ? "default" : "outline"} size="sm" className="h-8 w-10 font-black text-[10px] rounded-lg" onClick={() => {setPageSize(sz); setOffset(0);}}>{sz}</Button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button variant="outline" size="sm" className="font-black text-[10px] rounded-xl border-2 px-6 h-10" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - pageSize))}>PREV</Button>
                            <div className="bg-white border-2 border-slate-200 px-4 h-10 flex items-center rounded-xl font-black text-[10px] tracking-widest text-slate-600 italic">PAGE_{Math.floor(offset / pageSize) + 1}</div>
                            <Button variant="outline" size="sm" className="font-black text-[10px] rounded-xl border-2 px-6 h-10" disabled={(nodes?.length || 0) < pageSize} onClick={() => setOffset(offset + pageSize)}>NEXT</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
          </Tabs>
      </main>
    </div>
  );
}
