"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate as globalMutate } from "swr";
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
  Users
} from "lucide-react";

const fetcher = (url: string) => axios.get(url, { withCredentials: true }).then(res => res.data);

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  owner_id: string;
  user_permission?: string;
  created_at: string;
}

interface Document {
  id: string;
  name: string;
  folder_id: string | null;
  owner_id: string;
  user_permission?: string;
  mime_type: string;
  size_bytes: number;
  version: number;
  public_link_token: string | null;
  created_at: string;
  updated_at: string;
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
  
  const { data: me } = useSWR('/api/me', fetcher);
  
  const docUrl = `/api/documents?limit=100&offset=0${currentFolder ? `&folder_id=${currentFolder}` : ''}`;
  const folderUrl = `/api/folders?limit=100&offset=0${currentFolder ? `&parent_id=${currentFolder}` : ''}`;
  
  const { data: documents, mutate: mutateDocs } = useSWR<Document[]>(docUrl, fetcher);
  const { data: folders, mutate: mutateFolders } = useSWR<Folder[]>(folderUrl, fetcher);

  // States
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [updateDocId, setUpdateDocId] = useState<string | null>(null);

  const [newFolderName, setNewFolderName] = useState("");
  const [shareObj, setShareObj] = useState<{id: string, type: 'Document' | 'Folder', token?: string | null} | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRelation, setShareRelation] = useState("viewer");

  const [renameObj, setRenameObj] = useState<{id: string, name: string, type: 'Document' | 'Folder'} | null>(null);
  const [newName, setNewName] = useState("");

  const [moveDoc, setMoveDoc] = useState<Document | null>(null);
  const [targetFolderId, setTargetFolderId] = useState("");

  const { data: accessList, mutate: mutateAccess } = useSWR<AccessRelation[]>(shareObj ? `/api/${shareObj.type === 'Document' ? 'documents' : 'folders'}/${shareObj.id}/access` : null, fetcher);

  useEffect(() => {
    // Forced revalidation on folder change
    mutateDocs();
    mutateFolders();
  }, [currentFolder]);

  const handleAction = async (name: string, fn: () => Promise<any>) => {
    try {
      await fn();
      toast.success(`${name} successful`);
      mutateDocs();
      mutateFolders();
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
    if (currentFolder) formData.append("folder_id", currentFolder);
    if (updateDocId) formData.append("document_id", updateDocId);

    try {
      await axios.post("/api/documents", formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / (p.total || file.size)))
      });
      toast.success("File uploaded");
      setFile(null);
      setUpdateDocId(null);
      mutateDocs();
    } catch (err: any) { toast.error("Upload failed"); } finally { setIsUploading(false); }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const res = await axios.get(`/api/documents/${doc.id}/download`, { withCredentials: true, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.name);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) { toast.error("Download failed or access denied"); }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    handleAction('Folder Creation', () => axios.post("/api/folders", {
        name: newFolderName,
        parent_id: currentFolder
    }, { withCredentials: true }).then(() => setNewFolderName("")));
  };

  const handleRename = async () => {
    if (!renameObj || !newName.trim()) return;
    const type = renameObj.type === 'Document' ? 'documents' : 'folders';
    handleAction('Rename', () => axios.put(`/api/${type}/${renameObj.id}/rename`, { name: newName }, { withCredentials: true }).then(() => {
        setRenameObj(null);
        setNewName("");
    }));
  };

  const handleMove = async () => {
    if (!moveDoc) return;
    handleAction('Move', () => axios.put(`/api/documents/${moveDoc.id}/move`, { folder_id: targetFolderId.trim() === "" ? null : targetFolderId }, { withCredentials: true }).then(() => {
        setMoveDoc(null);
        setTargetFolderId("");
    }));
  };

  const handleCopy = async (id: string) => {
    handleAction('Copy', () => axios.post(`/api/documents/${id}/copy`, {}, { withCredentials: true }));
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    handleAction('Deletion', () => axios.delete(`/api/documents/${id}`, { withCredentials: true }));
  };

  const handleDeleteFolder = async (id: string) => {
    if (!confirm("Delete folder and contents?")) return;
    handleAction('Folder Deletion', () => axios.delete(`/api/folders/${id}`, { withCredentials: true }));
  };

  const handleShare = async () => {
    if (!shareObj || !shareEmail) return;
    const type = shareObj.type === 'Document' ? 'documents' : 'folders';
    handleAction('Sharing', () => axios.post(`/api/${type}/${shareObj.id}/share`, { email: shareEmail, relation: shareRelation }, { withCredentials: true }).then(() => {
        setShareEmail("");
        mutateAccess();
    }));
  };

  const handleRevoke = async (userId: string, rel: string) => {
    if (!shareObj) return;
    const type = shareObj.type === 'Document' ? 'documents' : 'folders';
    handleAction('Revoking Access', () => axios.delete(`/api/${type}/${shareObj.id}/share/${userId}`, { data: { relation: rel }, withCredentials: true }).then(() => mutateAccess()));
  };

  const handlePublicLink = async () => {
    if (!shareObj || shareObj.type !== 'Document') return;
    handleAction('Generate Link', () => axios.post(`/api/documents/${shareObj.id}/public-link`, {}, { withCredentials: true }).then(res => {
        setShareObj({...shareObj, token: res.data.public_link_token});
        mutateDocs();
    }));
  };

  const handleRevokePublic = async () => {
    if (!shareObj || shareObj.type !== 'Document') return;
    handleAction('Revoke Link', () => axios.delete(`/api/documents/${shareObj.id}/public-link`, { withCredentials: true }).then(() => {
        setShareObj({...shareObj, token: null});
        mutateDocs();
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
  const filteredDocs = documents?.filter(d => activeTab === "owned" ? d.owner_id === myUserId : d.owner_id !== myUserId) || [];
  const filteredFolders = folders?.filter(f => activeTab === "owned" ? f.owner_id === myUserId : f.owner_id !== myUserId) || [];

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans">
      <nav className="bg-white border-b-4 border-slate-900 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-lg"><FileText size={20} /></div>
          <span className="font-black text-2xl tracking-tighter uppercase italic">Vault_Ops <span className="text-slate-400">DMS</span></span>
        </div>
        <div className="flex gap-4">
            <Dialog>
                <DialogTrigger asChild><Button variant="default" size="sm" className="font-black text-xs rounded-xl shadow-lg" onClick={() => setUpdateDocId(null)}><UploadCloud size={16} className="mr-2" /> UPLOAD</Button></DialogTrigger>
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
                        <TableHeader><TableRow className="bg-slate-900 hover:bg-slate-900"><TableHead className="pl-8 text-white font-black uppercase text-[10px] tracking-widest py-5">Name</TableHead><TableHead className="text-white font-black uppercase text-[10px] tracking-widest">Type / Size</TableHead><TableHead className="text-white font-black uppercase text-[10px] tracking-widest text-right pr-8">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {filteredFolders.map((f) => (
                                <TableRow key={f.id} className="border-b-2 border-slate-50 hover:bg-slate-50/80 transition-colors">
                                    <TableCell className="pl-8 py-5 cursor-pointer flex items-center gap-3" onClick={() => navigateTo(f.id, f.name)}>
                                        <div className="bg-blue-50 text-blue-600 p-2 rounded-lg border-2 border-blue-100"><FolderIcon size={18} className="fill-blue-100" /></div>
                                        <div><div className="font-black text-slate-900">{f.name}</div><div className="text-[9px] font-mono text-slate-400">DIR_{f.id.split('-')[0]}</div></div>
                                    </TableCell>
                                    <TableCell><Badge variant="outline" className="font-mono text-[9px] border-2">FOLDER</Badge></TableCell>
                                    <TableCell className="text-right pr-8" onClick={e => e.stopPropagation()}>
                                        <div className="flex justify-end gap-2">
                                            {(f.user_permission === 'owner' || f.user_permission === 'editor') && (
                                                <>
                                                    <Dialog>
                                                        <DialogTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-slate-600" onClick={() => {setRenameObj({id: f.id, name: f.name, type: 'Folder'}); setNewName(f.name);}}><Edit2 size={14}/></Button></DialogTrigger>
                                                        <DialogContent className="border-4 border-slate-900 rounded-[2rem]">
                                                            <DialogHeader><DialogTitle className="font-black uppercase italic">Rename Folder</DialogTitle></DialogHeader>
                                                            <Input value={newName} onChange={e => setNewName(e.target.value)} className="rounded-xl border-2 font-bold h-12" />
                                                            <DialogFooter><DialogClose asChild><Button onClick={handleRename} className="w-full font-black py-6 rounded-xl">Save</Button></DialogClose></DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>

                                                    {f.user_permission === 'owner' && (
                                                        <Dialog>
                                                            <DialogTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-indigo-600" onClick={() => setShareObj({id: f.id, type: 'Folder'})}><Share2 size={14}/></Button></DialogTrigger>
                                                            <DialogContent className="border-4 border-slate-900 rounded-[2rem]">
                                                                <DialogHeader><DialogTitle className="font-black uppercase italic">Share Folder</DialogTitle></DialogHeader>
                                                                <Tabs defaultValue="share">
                                                                    <TabsList className="w-full bg-slate-100 p-1 rounded-xl mb-4"><TabsTrigger value="share" className="w-1/2 rounded-lg font-black text-[10px]">SHARE</TabsTrigger><TabsTrigger value="access" className="w-1/2 rounded-lg font-black text-[10px]">ACCESS_LIST</TabsTrigger></TabsList>
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
                                                                </Tabs>
                                                            </DialogContent>
                                                        </Dialog>
                                                    )}
                                                    
                                                    {f.user_permission === 'owner' && (
                                                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-red-500" onClick={() => handleDeleteFolder(f.id)}><Trash2 size={14}/></Button>
                                                    )}
                                                </>
                                            )}
                                            <ChevronRight size={16} className="text-slate-300 ml-2" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredDocs.map((d) => (
                                <TableRow key={d.id} className="border-b-2 border-slate-50 hover:bg-slate-50/80 transition-colors">
                                    <TableCell className="pl-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-slate-100 text-slate-500 p-2 rounded-lg border-2 border-slate-200"><FileText size={18} /></div>
                                            <div><div className="font-black text-slate-900">{d.name}</div><div className="text-[9px] font-mono text-slate-400 flex items-center gap-2">DOC_{d.id.split('-')[0]} <Badge variant="outline" className="text-[8px] h-4">v{d.version}</Badge> {d.public_link_token && <LinkIcon size={10} className="text-green-500"/>}</div></div>
                                        </div>
                                    </TableCell>
                                    <TableCell><div className="flex flex-col gap-0.5"><Badge variant="secondary" className="w-max text-[8px] font-mono">{d.mime_type.split('/')[1]}</Badge><span className="text-[10px] font-bold text-slate-400">{formatBytes(d.size_bytes)}</span></div></TableCell>
                                    <TableCell className="text-right pr-8">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-blue-600" onClick={() => handleDownload(d)} title="Download"><DownloadCloud size={14}/></Button>
                                            
                                            {(d.user_permission === 'owner' || d.user_permission === 'editor') && (
                                                <>
                                                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-slate-400" onClick={() => handleCopy(d.id)} title="Copy"><Copy size={14}/></Button>

                                                    <Dialog>
                                                        <DialogTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-slate-600" onClick={() => {setRenameObj({id: d.id, name: d.name, type: 'Document'}); setNewName(d.name);}} title="Rename"><Edit2 size={14}/></Button></DialogTrigger>
                                                        <DialogContent className="border-4 border-slate-900 rounded-[2rem]">
                                                            <DialogHeader><DialogTitle className="font-black uppercase italic">Rename File</DialogTitle></DialogHeader>
                                                            <Input value={newName} onChange={e => setNewName(e.target.value)} className="rounded-xl border-2 font-bold h-12" />
                                                            <DialogFooter><DialogClose asChild><Button onClick={handleRename} className="w-full font-black py-6 rounded-xl">Save</Button></DialogClose></DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>

                                                    <Dialog>
                                                        <DialogTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-emerald-600" onClick={() => setMoveDoc(d)} title="Move"><MoveRight size={14}/></Button></DialogTrigger>
                                                        <DialogContent className="border-4 border-slate-900 rounded-[2rem]">
                                                            <DialogHeader><DialogTitle className="font-black uppercase italic">Move File</DialogTitle><DialogDescription>Enter target Folder ID (leave empty for Root)</DialogDescription></DialogHeader>
                                                            <Input value={targetFolderId} onChange={e => setTargetFolderId(e.target.value)} placeholder="Folder UUID" className="rounded-xl border-2 font-mono h-12 text-xs" />
                                                            <DialogFooter><DialogClose asChild><Button onClick={handleMove} className="w-full font-black py-6 rounded-xl">Move</Button></DialogClose></DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>

                                                    {d.user_permission === 'owner' && (
                                                        <Dialog>
                                                            <DialogTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-indigo-600" onClick={() => setShareObj({id: d.id, type: 'Document', token: d.public_link_token})} title="Share"><Share2 size={14}/></Button></DialogTrigger>
                                                            <DialogContent className="border-4 border-slate-900 rounded-[2rem]">
                                                                <Tabs defaultValue="share">
                                                                    <TabsList className="w-full bg-slate-100 p-1 rounded-xl mb-4"><TabsTrigger value="share" className="w-1/3 text-[9px] font-black">SHARE</TabsTrigger><TabsTrigger value="access" className="w-1/3 text-[9px] font-black">USERS</TabsTrigger><TabsTrigger value="public" className="w-1/3 text-[9px] font-black">PUBLIC</TabsTrigger></TabsList>
                                                                    <TabsContent value="share" className="space-y-4">
                                                                        <Input value={shareEmail} onChange={e => setShareEmail(e.target.value)} placeholder="Email" className="rounded-xl h-12 border-2" />
                                                                        <div className="flex gap-2"><Button variant={shareRelation === 'viewer' ? 'default' : 'outline'} className="flex-1 h-12 rounded-xl font-black" onClick={() => setShareRelation('viewer')}>VIEWER</Button><Button variant={shareRelation === 'editor' ? 'default' : 'outline'} className="flex-1 h-12 rounded-xl font-black" onClick={() => setShareRelation('editor')}>EDITOR</Button></div>
                                                                        <Button onClick={handleShare} className="w-full h-12 rounded-xl font-black bg-slate-900 text-white uppercase text-[10px] tracking-widest">Grant Access</Button>
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
                                                                    <TabsContent value="public" className="space-y-4">
                                                                        {shareObj?.token ? (
                                                                            <div className="p-4 bg-green-50 border-2 border-green-200 rounded-2xl flex flex-col gap-3">
                                                                                <div className="text-[10px] font-black text-green-700 uppercase">Active Public Signal</div>
                                                                                <div className="bg-white border p-3 rounded-xl font-mono text-[9px] break-all">{`${window.location.origin}/public/${shareObj.token}`}</div>
                                                                                <div className="flex gap-2"><Button size="sm" className="flex-1 bg-green-600 font-black h-10 text-[10px] rounded-xl text-white" onClick={() => {navigator.clipboard.writeText(`${window.location.origin}/public/${shareObj?.token}`); toast.success("Copied!");}}>COPY</Button><Button size="sm" variant="destructive" className="flex-1 font-black h-10 text-[10px] rounded-xl" onClick={handleRevokePublic}>REVOKE</Button></div>
                                                                            </div>
                                                                        ) : <Button onClick={handlePublicLink} className="w-full h-12 rounded-xl bg-slate-900 font-black text-white uppercase text-xs">Generate Public Signal</Button>}
                                                                    </TabsContent>
                                                                </Tabs>
                                                            </DialogContent>
                                                        </Dialog>
                                                    )}
                                                    
                                                    {d.user_permission === 'owner' && (
                                                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-red-500" onClick={() => handleDeleteDoc(d.id)} title="Delete"><Trash2 size={14}/></Button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
          </Tabs>
      </main>
    </div>
  );
}
