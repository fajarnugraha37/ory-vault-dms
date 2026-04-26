"use client";

import { useState } from "react";
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
import { 
  FileText, 
  UploadCloud, 
  DownloadCloud,
  Trash2,
  Share2,
  Shield,
  File,
  Database
} from "lucide-react";

const fetcher = (url: string) => axios.get(url, { withCredentials: true }).then(res => res.data);

interface Document {
  id: string;
  name: string;
  owner_id: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export default function DocumentExplorerPage() {
  const [page, setPage] = useState(0);
  const limit = 10;
  
  const { data: documents, mutate } = useSWR<Document[]>(`/api/documents?limit=${limit}&offset=${page * limit}`, fetcher);

  // Upload State
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Share State
  const [shareDoc, setShareDoc] = useState<Document | null>(null);
  const [shareUserId, setShareUserId] = useState("");
  const [shareRelation, setShareRelation] = useState("viewer");

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

    try {
      await axios.post("/api/documents", formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || file.size));
          setUploadProgress(percentCompleted);
        }
      });
      toast.success("File uploaded successfully");
      setFile(null);
      mutate();
      // Close dialog handled via state if controlled, but here we just reset file
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to upload file");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const res = await axios.get(`/api/documents/${doc.id}/download`, {
        withCredentials: true,
        responseType: 'blob', // Important for file download
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
      toast.error(err.response?.data?.error || "Access Denied: You do not have permission to view this file.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    try {
      await axios.delete(`/api/documents/${id}`, { withCredentials: true });
      toast.success("Document deleted");
      mutate();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Access Denied: You do not have permission to delete this file.");
    }
  };

  const handleShare = async () => {
    if (!shareDoc || !shareUserId) return;
    try {
      await axios.post(`/api/documents/${shareDoc.id}/share`, {
        user_id: shareUserId,
        relation: shareRelation
      }, { withCredentials: true });
      toast.success("Document shared successfully");
      setShareDoc(null);
      setShareUserId("");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Access Denied: Only the owner can share this file.");
    }
  };

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
                    <Button variant="default" size="sm" className="font-black text-xs rounded-xl shadow-lg active:translate-y-1">
                        <UploadCloud size={16} className="mr-2" /> UPLOAD_FILE
                    </Button>
                </DialogTrigger>
                <DialogContent className="border-4 border-slate-900 rounded-[2rem] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase italic">Secure File Upload</DialogTitle>
                        <DialogDescription className="py-2 font-bold text-slate-500">Max size: 50MB. Files are encrypted at rest via MinIO.</DialogDescription>
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
          <Card className="border-4 border-slate-900 rounded-[2.5rem] shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] overflow-hidden bg-white">
              <CardHeader className="bg-slate-50 border-b-2 border-slate-100">
                  <CardTitle className="flex items-center gap-2 font-black text-xl tracking-tight uppercase">
                      <Database size={20} className="text-blue-600" />
                      Document Explorer
                  </CardTitle>
                  <CardDescription className="font-bold text-slate-500">Zero-Trust restricted file access. Permissions validated by Ory Keto.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                  {!documents ? (
                      <div className="p-20 text-center font-mono text-slate-400 text-xs animate-pulse">FETCHING_DOCUMENTS...</div>
                  ) : documents.length === 0 ? (
                      <div className="p-20 text-center flex flex-col items-center">
                          <File size={48} className="text-slate-200 mb-4" />
                          <p className="font-bold text-slate-400">Vault is empty.</p>
                      </div>
                  ) : (
                      <Table>
                          <TableHeader><TableRow className="bg-slate-900 hover:bg-slate-900"><TableHead className="pl-8 text-white font-black uppercase text-[10px] tracking-widest py-5">File Name</TableHead><TableHead className="text-white font-black uppercase text-[10px] tracking-widest">Type / Size</TableHead><TableHead className="text-white font-black uppercase text-[10px] tracking-widest text-right pr-8">Actions</TableHead></TableRow></TableHeader>
                          <TableBody>
                              {documents.map((doc) => (
                                  <TableRow key={doc.id} className="border-b-2 border-slate-50 hover:bg-slate-50/80 transition-colors">
                                      <TableCell className="pl-8 py-5">
                                          <div className="font-black text-slate-900 text-base truncate max-w-[400px]">{doc.name}</div>
                                          <div className="text-[9px] font-mono text-slate-400 mt-1 flex items-center gap-1">
                                              <Shield size={10} /> {doc.id.split('-')[0]}...
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
                                              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-blue-600 hover:bg-blue-50" onClick={() => handleDownload(doc)}>
                                                  <DownloadCloud size={14} />
                                              </Button>
                                              
                                              <Dialog>
                                                  <DialogTrigger asChild>
                                                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-indigo-600 hover:bg-indigo-50" onClick={() => setShareDoc(doc)}>
                                                          <Share2 size={14} />
                                                      </Button>
                                                  </DialogTrigger>
                                                  <DialogContent className="border-4 border-slate-900 rounded-[2rem]">
                                                      <DialogHeader><DialogTitle className="font-black uppercase italic tracking-widest">Share Document</DialogTitle><DialogDescription className="font-bold py-2">Grant access to another identity via Ory Keto.</DialogDescription></DialogHeader>
                                                      <div className="space-y-4">
                                                          <div className="space-y-2">
                                                              <Label className="text-[10px] font-black uppercase">Target User ID (UUID)</Label>
                                                              <Input value={shareUserId} onChange={e => setShareUserId(e.target.value)} placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000" className="font-mono text-xs border-2 rounded-xl" />
                                                          </div>
                                                          <div className="space-y-2">
                                                              <Label className="text-[10px] font-black uppercase">Access Level</Label>
                                                              <div className="flex gap-2">
                                                                  <Button variant={shareRelation === 'viewer' ? 'default' : 'outline'} className={`flex-1 rounded-xl font-black ${shareRelation === 'viewer' ? 'shadow-md' : 'border-2'}`} onClick={() => setShareRelation('viewer')}>VIEWER</Button>
                                                                  <Button variant={shareRelation === 'editor' ? 'default' : 'outline'} className={`flex-1 rounded-xl font-black ${shareRelation === 'editor' ? 'shadow-md' : 'border-2'}`} onClick={() => setShareRelation('editor')}>EDITOR</Button>
                                                              </div>
                                                          </div>
                                                      </div>
                                                      <DialogFooter className="mt-4"><DialogClose asChild><Button variant="outline" className="rounded-xl font-black">CANCEL</Button></DialogClose><Button onClick={handleShare} disabled={!shareUserId} className="rounded-xl font-black">GRANT_ACCESS</Button></DialogFooter>
                                                  </DialogContent>
                                              </Dialog>

                                              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-2 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(doc.id)}>
                                                  <Trash2 size={14} />
                                              </Button>
                                          </div>
                                      </TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  )}
              </CardContent>
              {documents && documents.length > 0 && (
                <div className="bg-slate-50 p-4 border-t-2 border-slate-100 flex justify-center items-center gap-4">
                    <Button variant="outline" size="sm" className="border-2 rounded-xl font-black" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>PREV</Button>
                    <span className="text-[10px] font-mono font-bold text-slate-500 tracking-widest">PAGE_{page + 1}</span>
                    <Button variant="outline" size="sm" className="border-2 rounded-xl font-black" onClick={() => setPage(page + 1)} disabled={documents.length < limit}>NEXT</Button>
                </div>
              )}
          </Card>
      </main>
    </div>
  );
}
