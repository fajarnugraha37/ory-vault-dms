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
  Copy
} from "lucide-react";

const fetcher = (url: string) => axios.get(url, { withCredentials: true }).then(res => res.data);

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  owner_id: string;
  created_at: string;
}

interface Document {
  id: string;
  name: string;
  folder_id: string | null;
  owner_id: string;
  mime_type: string;
  size_bytes: number;
  version: number;
  public_link_token: string | null;
  created_at: string;
  updated_at: string;
}

interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  size_bytes: number;
  created_at: string;
}

export default function DocumentExplorerPage() {
  const [page, setPage] = useState(0);
  const limit = 100;
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<{id: string | null, name: string}[]>([{id: null, name: "Root"}]);
  
  const { data: me } = useSWR('/api/me', fetcher);
  
  const docUrl = currentFolder ? `/api/documents?limit=${limit}&offset=${page * limit}&folder_id=${currentFolder}` : `/api/documents?limit=${limit}&offset=${page * limit}`;
  const { data: documents, mutate: mutateDocs } = useSWR<Document[]>(docUrl, fetcher);
  
  const folderUrl = currentFolder ? `/api/folders?limit=${limit}&offset=${page * limit}&parent_id=${currentFolder}` : `/api/folders?limit=${limit}&offset=${page * limit}`;
  const { data: folders, mutate: mutateFolders } = useSWR<Folder[]>(folderUrl, fetcher);

  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [updateDocId, setUpdateDocId] = useState<string | null>(null);

  const [newFolderName, setNewFolderName] = useState("");

  const [shareDoc, setShareDoc] = useState<Document | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRelation, setShareRelation] = useState("viewer");
  const [versionDoc, setVersionDoc] = useState<Document | null>(null);
  const { data: versions } = useSWR<DocumentVersion[]>(versionDoc ? `/api/documents/${versionDoc.id}/versions` : null, fetcher);

  const [renameDoc, setRenameDoc] = useState<Document | null>(null);
  const [renameFolder, setRenameFolder] = useState<Folder | null>(null);
  const [newName, setNewName] = useState("");

  const [moveDoc, setMoveDoc] = useState<Document | null>(null);
  const [targetFolderId, setTargetFolderId] = useState("");

  const [activeTab, setActiveTab] = useState("owned");

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || file.size));
          setUploadProgress(percentCompleted);
        }
      });
      toast.success(`File ${updateDocId ? 'updated' : 'uploaded'} successfully`);
      setFile(null);
      setUpdateDocId(null);
      mutateDocs();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to upload file");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await axios.post("/api/folders", {
        name: newFolderName,
        parent_id: currentFolder
      }, { withCredentials: true });
      toast.success("Folder created");
      setNewFolderName("");
      mutateFolders();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create folder");
    }
  };

  const handleRename = async () => {
    if (!newName.trim()) return;
    try {
      if (renameDoc) {
        await axios.put(`/api/documents/${renameDoc.id}/rename`, { name: newName }, { withCredentials: true });
        mutateDocs();
      } else if (renameFolder) {
        await axios.put(`/api/folders/${renameFolder.id}/rename`, { name: newName }, { withCredentials: true });
        mutateFolders();
      }
      toast.success("Renamed successfully");
      setRenameDoc(null);
      setRenameFolder(null);
      setNewName("");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Access Denied");
    }
  };

  const handleMove = async () => {
    if (!moveDoc) return;
    try {
      const payload: any = { folder_id: targetFolderId.trim() === "" ? null : targetFolderId };
      await axios.put(`/api/documents/${moveDoc.id}/move`, payload, { withCredentials: true });
      toast.success("Document moved successfully");
      setMoveDoc(null);
      setTargetFolderId("");
      mutateDocs();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to move document");
    }
  };

  const handleCopy = async (id: string) => {
    try {
      await axios.post(`/api/documents/${id}/copy`, {}, { withCredentials: true });
      toast.success("Document copied successfully");
      mutateDocs();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to copy document");
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const res = await axios.get(`/api/documents/${doc.id}/download`, {
        withCredentials: true,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.name);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success("Download started");
    } catch (err: any) {
      toast.error("Access Denied: You do not have permission to view this file.");
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    try {
      await axios.delete(`/api/documents/${id}`, { withCredentials: true });
      toast.success("Document deleted");
      mutateDocs();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Access Denied");
    }
  };

  const handleDeleteFolder = async (id: string) => {
    if (!confirm("Delete this folder? All contents will be destroyed.")) return;
    try {
      await axios.delete(`/api/folders/${id}`, { withCredentials: true });
      toast.success("Folder deleted");
      mutateFolders();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Access Denied");
    }
  };

  const handleShare = async () => {
    if (!shareDoc || !shareEmail) return;
    try {
      await axios.post(`/api/documents/${shareDoc.id}/share`, {
        email: shareEmail,
        relation: shareRelation
      }, { withCredentials: true });
      toast.success("Document shared successfully");
      setShareDoc(null);
      setShareEmail("");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to share: User not found or insufficient access.");
    }
  };

  const handleRevokeShare = async (docId: string) => {
    const targetUserId = prompt("Enter the exact UUID of the user to revoke:");
    if (!targetUserId) return;
    try {
      await axios.delete(`/api/documents/${docId}/share/${targetUserId}`, {
        data: { relation: "viewer" }, // Quick hack, in real app need dropdown
        withCredentials: true 
      });
      toast.success("Access revoked");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to revoke share.");
    }
  };

  const handleGeneratePublicLink = async (docId: string) => {
    try {
      const res = await axios.post(`/api/documents/${docId}/public-link`, {}, { withCredentials: true });
      const link = `${window.location.origin}/public/${res.data.public_link_token}`;
      navigator.clipboard.writeText(link);
      toast.success("Public link generated and copied to clipboard!");
      mutateDocs();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to generate link");
    }
  };

  const handleShareFolder = async (folderId: string) => {
    if (!shareEmail) return;
    try {
      await axios.post(`/api/folders/${folderId}/share`, {
        email: shareEmail,
        relation: shareRelation
      }, { withCredentials: true });
      toast.success("Folder shared successfully");
      setShareEmail("");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to share folder");
    }
  };

  const handleRevokeShareFolder = async (folderId: string) => {
    const targetUserId = prompt("Enter the exact UUID of the user to revoke:");
    if (!targetUserId) return;
    try {
      await axios.delete(`/api/folders/${folderId}/share/${targetUserId}`, {
        data: { relation: "viewer" },
        withCredentials: true 
      });
      toast.success("Folder access revoked");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to revoke folder share");
    }
  };

  const openFolder = (folder: Folder) => {
    setCurrentFolder(folder.id);
    setFolderHistory([...folderHistory, { id: folder.id, name: folder.name }]);
  };

  const goUpFolder = () => {
    if (folderHistory.length <= 1) return;
    const newHistory = [...folderHistory];
    newHistory.pop();
    const prev = newHistory[newHistory.length - 1];
    setCurrentFolder(prev.id);
    setFolderHistory(newHistory);
  };

  const navigateToFolder = (index: number) => {
    const target = folderHistory[index];
    setCurrentFolder(target.id);
    setFolderHistory(folderHistory.slice(0, index + 1));
  };

  const myUserId = me?.user_id;
  const displayDocs = activeTab === "owned" 
    ? documents?.filter(d => d.owner_id === myUserId) || []
    : documents?.filter(d => d.owner_id !== myUserId) || [];
  
  const displayFolders = activeTab === "owned" 
    ? folders?.filter(f => f.owner_id === myUserId) || []
    : folders?.filter(f => f.owner_id !== myUserId) || [];

  return (
    <div className="bg-slate-50 min-h-screen pb-20 font-sans">
      <nav className="bg-white border-b-4 border-slate-900 px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-lg"><FileText size={20} /></div>
          <span className="font-black text-2xl tracking-tighter uppercase italic">Vault_Ops <span className="text-slate-400">DMS</span></span>
        </div>
        <div className="flex gap-4">
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="default" size="sm" className="font-black text-xs rounded-xl shadow-lg active:translate-y-1" onClick={() => setUpdateDocId(null)}>
                        <UploadCloud size={16} className="mr-2" /> UPLOAD_FILE
                    </Button>
                </DialogTrigger>
                <DialogContent className="border-4 border-slate-900 rounded-[2rem] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase italic">Secure File Upload</DialogTitle>
                        <DialogDescription className="py-2 font-bold text-slate-500">Max size: 50MB. Uploading to: {folderHistory[folderHistory.length-1].name}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border-2 rounded-xl h-14 cursor-pointer" />
                        
                        {isUploading && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black">
                                    <span>UPLOADING...</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <Progress value={uploadProgress} className="h-2" />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={handleUpload} disabled={!file || isUploading} className="w-full font-black uppercase tracking-widest py-6 rounded-xl">Execute Upload</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" asChild className="border-2 font-black text-xs rounded-xl"><a href="/">Dashboard Hub</a></Button>
        </div>
      </nav>

      <main className="p-8 max-w-[1200px] mx-auto space-y-8 mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-slate-200/50 p-1 rounded-2xl mb-6">
                <TabsTrigger value="owned" className="rounded-xl px-8 font-black text-xs tracking-widest">MY_VAULT</TabsTrigger>
                <TabsTrigger value="shared" className="rounded-xl px-8 font-black text-xs tracking-widest">SHARED_WITH_ME</TabsTrigger>
            </TabsList>

            <Card className="border-4 border-slate-900 rounded-[2.5rem] shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] overflow-hidden bg-white">
                <CardHeader className="bg-slate-50 border-b-2 border-slate-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="flex items-center gap-2 font-black text-xl tracking-tight uppercase">
                                <Database size={20} className="text-blue-600" />
                                {activeTab === "owned" ? "My Workspace" : "Shared Workspace"}
                            </CardTitle>
                            <CardDescription className="font-bold text-slate-500 mt-1">Zero-Trust restricted file access. Permissions validated by Ory Keto.</CardDescription>
                        </div>
                        {activeTab === "owned" && (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="font-black text-[10px] border-2 rounded-xl shadow-sm">
                                        <FolderPlus size={14} className="mr-2" /> NEW_FOLDER
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="border-4 border-slate-900 rounded-[2rem] sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle className="font-black uppercase italic">Create Folder</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="e.g., Financial Reports 2026" className="rounded-xl border-2 font-bold h-12" />
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild><Button onClick={handleCreateFolder} className="w-full font-black uppercase tracking-widest py-6 rounded-xl">Create</Button></DialogClose>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-4 text-[11px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 p-2 rounded-xl">
                        {folderHistory.length > 1 && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 mr-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50" onClick={goUpFolder}>
                                <ArrowLeft size={14} />
                            </Button>
                        )}
                        {folderHistory.map((fh, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className={`cursor-pointer transition-colors ${i === folderHistory.length - 1 ? 'text-blue-600 underline' : 'hover:text-slate-900'}`} onClick={() => navigateToFolder(i)}>
                                    {fh.name}
                                </span>
                                {i < folderHistory.length - 1 && <ChevronRight size={12} />}
                            </div>
                        ))}
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {!documents || !folders ? (
                        <div className="p-20 text-center font-mono text-slate-400 text-xs animate-pulse">FETCHING_DATA...</div>
                    ) : displayDocs.length === 0 && displayFolders.length === 0 ? (
                        <div className="p-20 text-center flex flex-col items-center">
                            <File size={48} className="text-slate-200 mb-4" />
                            <p className="font-bold text-slate-400">Workspace is empty.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader><TableRow className="bg-slate-900 hover:bg-slate-900"><TableHead className="pl-8 text-white font-black uppercase text-[10px] tracking-widest py-5">File / Folder Name</TableHead><TableHead className="text-white font-black uppercase text-[10px] tracking-widest">Details</TableHead><TableHead className="text-white font-black uppercase text-[10px] tracking-widest text-right pr-8">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {displayFolders.map((folder) => (
                                    <TableRow key={folder.id} className="border-b-2 border-slate-50 hover:bg-slate-50/80 transition-colors cursor-pointer" onClick={() => openFolder(folder)}>
                                        <TableCell className="pl-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-blue-50 text-blue-600 p-2 rounded-lg border-2 border-blue-100 shadow-sm"><FolderIcon size={18} className="fill-blue-100" /></div>
                                                <div>
                                                    <div className="font-black text-slate-900 text-base truncate max-w-[400px]">{folder.name}</div>
                                                    <div className="text-[9px] font-mono text-slate-400 mt-1 flex items-center gap-1">DIR_{folder.id.split('-')[0]}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono text-[9px] bg-white border-2">FOLDER</Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-8" onClick={(e) => e.stopPropagation()}>
                                            {activeTab === "owned" && (
                                                <div className="flex justify-end gap-2">
                                                    <Dialog>
                                                        <DialogTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-slate-600 hover:bg-slate-50" onClick={() => {setRenameFolder(folder); setNewName(folder.name);}}><Edit2 size={14}/></Button></DialogTrigger>
                                                        <DialogContent className="border-4 border-slate-900 rounded-[2rem]">
                                                            <DialogHeader><DialogTitle className="font-black uppercase italic">Rename Folder</DialogTitle></DialogHeader>
                                                            <Input value={newName} onChange={e => setNewName(e.target.value)} className="rounded-xl border-2 font-bold h-12" />
                                                            <DialogFooter><DialogClose asChild><Button onClick={handleRename} className="w-full font-black py-6 rounded-xl">Save</Button></DialogClose></DialogFooter>
                                                        </DialogContent>
                                                    </Dialog>
                                                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-red-500 hover:bg-red-50" onClick={() => handleDeleteFolder(folder.id)}><Trash2 size={14} /></Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {displayDocs.map((doc) => (
                                    <TableRow key={doc.id} className="border-b-2 border-slate-50 hover:bg-slate-50/80 transition-colors">
                                        <TableCell className="pl-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-slate-100 text-slate-500 p-2 rounded-lg border-2 border-slate-200"><FileText size={18} /></div>
                                                <div>
                                                    <div className="font-black text-slate-900 text-base truncate max-w-[400px]">{doc.name}</div>
                                                    <div className="text-[9px] font-mono text-slate-400 mt-1 flex items-center gap-1">
                                                        <Shield size={10} /> DOC_{doc.id.split('-')[0]} 
                                                        <span className="ml-2 font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">v{doc.version}</span>
                                                        {doc.public_link_token && <span className="ml-1 text-green-500 flex items-center gap-0.5" title="Public Link Active"><LinkIcon size={10}/></span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 items-start">
                                                <Badge variant="secondary" className="font-mono text-[9px]">{doc.mime_type.split('/')[1] || 'binary'}</Badge>
                                                <span className="text-[10px] font-bold text-slate-500">{formatBytes(doc.size_bytes)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-blue-600 hover:bg-blue-50" onClick={() => handleDownload(doc)} title="Download">
                                                    <DownloadCloud size={14} />
                                                </Button>
                                                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-slate-600 hover:bg-slate-50" onClick={() => handleCopy(doc.id)} title="Make a Copy">
                                                    <Copy size={14} />
                                                </Button>
                                                
                                                {activeTab === "owned" && (
                                                    <>
                                                        <Dialog>
                                                            <DialogTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-slate-600 hover:bg-slate-50" onClick={() => {setRenameDoc(doc); setNewName(doc.name);}} title="Rename"><Edit2 size={14}/></Button></DialogTrigger>
                                                            <DialogContent className="border-4 border-slate-900 rounded-[2rem]">
                                                                <DialogHeader><DialogTitle className="font-black uppercase italic">Rename File</DialogTitle></DialogHeader>
                                                                <Input value={newName} onChange={e => setNewName(e.target.value)} className="rounded-xl border-2 font-bold h-12" />
                                                                <DialogFooter><DialogClose asChild><Button onClick={handleRename} className="w-full font-black py-6 rounded-xl">Save</Button></DialogClose></DialogFooter>
                                                            </DialogContent>
                                                        </Dialog>

                                                        <Dialog>
                                                            <DialogTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-emerald-600 hover:bg-emerald-50" onClick={() => setMoveDoc(doc)} title="Move"><MoveRight size={14}/></Button></DialogTrigger>
                                                            <DialogContent className="border-4 border-slate-900 rounded-[2rem]">
                                                                <DialogHeader><DialogTitle className="font-black uppercase italic">Move File</DialogTitle><DialogDescription>Enter target Folder ID (leave empty for Root)</DialogDescription></DialogHeader>
                                                                <Input value={targetFolderId} onChange={e => setTargetFolderId(e.target.value)} placeholder="Folder UUID" className="rounded-xl border-2 font-mono h-12 text-xs" />
                                                                <DialogFooter><DialogClose asChild><Button onClick={handleMove} className="w-full font-black py-6 rounded-xl">Move</Button></DialogClose></DialogFooter>
                                                            </DialogContent>
                                                        </Dialog>
                                                        
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-indigo-600 hover:bg-indigo-50" onClick={() => setShareDoc(doc)} title="Share">
                                                                    <Share2 size={14} />
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="border-4 border-slate-900 rounded-[2rem]">
                                                                <Tabs defaultValue="internal" className="w-full">
                                                                    <TabsList className="grid w-full grid-cols-3 p-1 bg-slate-100 rounded-xl h-10 mb-4">
                                                                        <TabsTrigger value="internal" className="font-black text-[10px] rounded-lg uppercase tracking-widest">Share</TabsTrigger>
                                                                        <TabsTrigger value="revoke" className="font-black text-[10px] rounded-lg uppercase tracking-widest text-red-600">Revoke</TabsTrigger>
                                                                        <TabsTrigger value="public" className="font-black text-[10px] rounded-lg uppercase tracking-widest">Public Link</TabsTrigger>
                                                                    </TabsList>
                                                                    <TabsContent value="internal" className="space-y-4">
                                                                        <DialogHeader><DialogTitle className="font-black uppercase italic tracking-widest">Share Document</DialogTitle><DialogDescription className="font-bold py-2">Grant access via email.</DialogDescription></DialogHeader>
                                                                        <div className="space-y-4">
                                                                            <div className="space-y-2">
                                                                                <Label className="text-[10px] font-black uppercase ml-1">Target User Email</Label>
                                                                                <Input value={shareEmail} onChange={e => setShareEmail(e.target.value)} placeholder="e.g. staff@ory-vault.test" className="font-bold text-xs border-2 rounded-xl h-12" />
                                                                            </div>
                                                                            <div className="space-y-2">
                                                                                <Label className="text-[10px] font-black uppercase ml-1">Access Level</Label>
                                                                                <div className="flex gap-2">
                                                                                    <Button variant={shareRelation === 'viewer' ? 'default' : 'outline'} className={`flex-1 rounded-xl font-black h-12 ${shareRelation === 'viewer' ? 'shadow-md bg-indigo-600 text-white' : 'border-2 text-slate-500'}`} onClick={() => setShareRelation('viewer')}>VIEWER</Button>
                                                                                    <Button variant={shareRelation === 'editor' ? 'default' : 'outline'} className={`flex-1 rounded-xl font-black h-12 ${shareRelation === 'editor' ? 'shadow-md bg-indigo-600 text-white' : 'border-2 text-slate-500'}`} onClick={() => setShareRelation('editor')}>EDITOR</Button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <DialogFooter className="mt-4"><DialogClose asChild><Button variant="outline" className="rounded-xl font-black h-12 px-8">CANCEL</Button></DialogClose><Button onClick={handleShare} disabled={!shareEmail} className="rounded-xl font-black h-12 bg-slate-900 px-8 text-white">GRANT_ACCESS</Button></DialogFooter>
                                                                    </TabsContent>
                                                                    <TabsContent value="revoke" className="space-y-4">
                                                                        <DialogHeader><DialogTitle className="font-black uppercase italic tracking-widest text-red-600">Revoke Access</DialogTitle><DialogDescription className="font-bold py-2">Remove permissions from a specific user.</DialogDescription></DialogHeader>
                                                                        <div className="p-4 bg-red-50 border-2 border-red-100 rounded-xl text-center">
                                                                            <UserX size={32} className="mx-auto text-red-500 mb-2"/>
                                                                            <p className="text-xs font-bold text-red-700">Warning: This instantly removes their capability to view/edit.</p>
                                                                        </div>
                                                                        <Button variant="destructive" onClick={() => handleRevokeShare(doc.id)} className="w-full h-12 rounded-xl font-black uppercase tracking-widest">Revoke User Access</Button>
                                                                    </TabsContent>
                                                                    <TabsContent value="public" className="space-y-4">
                                                                        <DialogHeader><DialogTitle className="font-black uppercase italic tracking-widest">Generate Public Link</DialogTitle><DialogDescription className="font-bold py-2">Create an anonymous, view-only download link.</DialogDescription></DialogHeader>
                                                                        {doc.public_link_token ? (
                                                                            <div className="p-4 bg-green-50 border-2 border-green-200 rounded-2xl flex flex-col gap-3">
                                                                                <div className="text-[10px] font-black text-green-700 uppercase tracking-widest">Active Public Link</div>
                                                                                <div className="bg-white border p-3 rounded-xl font-mono text-[9px] break-all text-slate-600 selection:bg-green-200">
                                                                                    {`${window.location.origin}/public/${doc.public_link_token}`}
                                                                                </div>
                                                                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl h-10" onClick={() => {navigator.clipboard.writeText(`${window.location.origin}/public/${doc.public_link_token}`); toast.success("Copied!");}}>COPY_LINK</Button>
                                                                            </div>
                                                                        ) : (
                                                                            <Button onClick={() => handleGeneratePublicLink(doc.id)} className="w-full bg-slate-900 text-white font-black h-12 rounded-xl uppercase tracking-widest">GENERATE_LINK</Button>
                                                                        )}
                                                                    </TabsContent>
                                                                </Tabs>
                                                            </DialogContent>
                                                        </Dialog>

                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-amber-500 hover:bg-amber-50" onClick={() => setVersionDoc(doc)} title="History/Update">
                                                                    <History size={14} />
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="border-4 border-slate-900 rounded-[2rem] sm:max-w-lg">
                                                                <DialogHeader><DialogTitle className="font-black uppercase italic tracking-widest flex items-center gap-2"><History size={18}/> Document History</DialogTitle><DialogDescription className="font-bold py-2">View past versions or upload a new one.</DialogDescription></DialogHeader>
                                                                
                                                                <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 mb-4 flex flex-col gap-3">
                                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600">Upload New Version</Label>
                                                                    <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border-2 rounded-xl h-12 cursor-pointer bg-white" />
                                                                    <DialogClose asChild><Button onClick={() => { setUpdateDocId(doc.id); handleUpload(); }} disabled={!file || isUploading} className="w-full text-white font-black uppercase tracking-widest rounded-xl bg-slate-900 shadow-lg h-12">Commit New Version</Button></DialogClose>
                                                                </div>

                                                                <ScrollArea className="h-48 border-2 border-slate-100 rounded-2xl p-2 bg-white">
                                                                    <div className="space-y-2 p-2">
                                                                        <div className="flex justify-between items-center p-3 bg-blue-50 border-2 border-blue-100 rounded-xl">
                                                                            <div className="flex flex-col gap-1">
                                                                                <span className="font-black text-[10px] text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 inline-block w-max">v{doc.version} (CURRENT)</span>
                                                                                <span className="text-[9px] font-mono text-slate-500">{new Date(doc.updated_at).toLocaleString()}</span>
                                                                            </div>
                                                                            <span className="text-[10px] font-bold text-slate-500">{formatBytes(doc.size_bytes)}</span>
                                                                        </div>
                                                                        
                                                                        {versions?.map(v => (
                                                                            <div key={v.id} className="flex justify-between items-center p-3 border-2 border-slate-100 rounded-xl hover:border-slate-300 transition-colors">
                                                                                <div className="flex flex-col gap-1">
                                                                                    <span className="font-black text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block w-max">v{v.version_number}</span>
                                                                                    <span className="text-[9px] font-mono text-slate-400">{new Date(v.created_at).toLocaleString()}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-4">
                                                                                    <span className="text-[10px] font-bold text-slate-400">{formatBytes(v.size_bytes)}</span>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                        {!versions?.length && <div className="text-center text-[10px] font-bold text-slate-300 italic py-4">NO_PREVIOUS_VERSIONS</div>}
                                                                    </div>
                                                                </ScrollArea>
                                                            </DialogContent>
                                                        </Dialog>

                                                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => handleDeleteDoc(doc.id)} title="Delete">
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
          </Tabs>
      </main>
    </div>
  );
}