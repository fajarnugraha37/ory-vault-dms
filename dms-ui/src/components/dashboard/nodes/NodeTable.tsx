"use client";

import React from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  FileText, 
  DownloadCloud,
  Trash2,
  Folder as FolderIcon,
  Link as LinkIcon,
  Fingerprint,
  Database
} from "lucide-react";
import { VaultButton, VaultBadge } from "@/components/shared/VaultPrimitives";
import { useVault } from "@/context/VaultContext";
import { toast } from "sonner";
import { api } from "@/lib/api";

// Dialogs
import { RenameDialog } from "@/components/dashboard/dialogs/NodeActions";
import { MoveDialog } from "@/components/dashboard/dialogs/MoveDialog";
import { ShareDialog } from "@/components/dashboard/dialogs/ShareDialog";
import { UploadDialog } from "@/components/dashboard/dialogs/UploadDialog";

const formatBytes = (bytes?: number) => {
  if (!bytes || bytes === 0) return '-';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const NodeTable = () => {
  const { 
    nodes, sortBy, toggleSort, navigateTo, activeTab, me, handleAction,
    pageSize, setPageSize, offset, setOffset
  } = useVault();

  const myUserId = me?.user_id;
  const filteredNodes = nodes?.filter(n => activeTab === "owned" ? n.owner_id === myUserId : n.owner_id !== myUserId) || [];

  const handleDownload = async (node: any) => {
    try {
      const res = await api.get(`/api/documents/${node.id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', node.name);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) { toast.error("Download failed"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item? This will also affect all nested items.")) return;
    await handleAction('Deletion', () => api.delete(`/api/nodes/${id}`));
  };

  return (
    <div className="bg-white">
        <Table>
            <TableHeader>
                <TableRow className="bg-slate-900 hover:bg-slate-900 border-0">
                    <TableHead className="pl-8 text-white font-black uppercase text-[10px] tracking-widest py-6 cursor-pointer hover:bg-slate-800" onClick={() => toggleSort('name')}>Name {sortBy === 'name' ? '•' : ''}</TableHead>
                    <TableHead className="text-white font-black uppercase text-[10px] tracking-widest py-6 cursor-pointer hover:bg-slate-800" onClick={() => toggleSort('type')}>Type {sortBy === 'type' ? '•' : ''}</TableHead>
                    <TableHead className="text-white font-black uppercase text-[10px] tracking-widest py-6 cursor-pointer hover:bg-slate-800" onClick={() => toggleSort('size')}>Size {sortBy === 'size' ? '•' : ''}</TableHead>
                    <TableHead className="text-white font-black uppercase text-[10px] tracking-widest py-6 cursor-pointer hover:bg-slate-800" onClick={() => toggleSort('date')}>Created {sortBy === 'date' ? '•' : ''}</TableHead>
                    <TableHead className="text-white font-black uppercase text-[10px] tracking-widest py-6 text-right pr-8">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredNodes.map((item) => (
                    <TableRow key={item.id} className="border-b-2 border-slate-50 hover:bg-slate-50/80 transition-colors group">
                        <TableCell className="pl-8 py-5 cursor-pointer flex items-center gap-4" onClick={() => item.type === 'folder' && navigateTo(item.id, item.name)}>
                            <div className={`${item.type === 'folder' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-100 text-slate-500 border-slate-200'} p-2.5 rounded-xl border-2 transition-transform group-hover:scale-110`}>
                                {item.type === 'folder' ? <FolderIcon size={18} className="fill-blue-100" /> : <FileText size={18} />}
                            </div>
                            <div>
                                <div className="font-black text-slate-900 text-sm tracking-tight">{item.name}</div>
                                <div className="text-[9px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                                    {item.type === 'folder' ? `DIR_${item.id.substring(0,8)}` : `DOC_${item.id.substring(0,8)}`}
                                    {item.type === 'file' && item.version && item.version > 1 && <VaultBadge className="text-[8px] h-4 bg-slate-50">v{item.version}</VaultBadge>}
                                    {item.type === 'file' && item.public_link_token && <LinkIcon size={10} className="text-emerald-500"/>}
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>
                            <VaultBadge className={item.type === 'folder' ? "border-blue-200 text-blue-600" : "border-slate-200 text-slate-500"}>
                                {item.type === 'folder' ? 'folder' : (item.mime_type?.split('/')[1] || 'file')}
                            </VaultBadge>
                        </TableCell>
                        <TableCell><span className="text-[10px] font-bold text-slate-400">{formatBytes(item.size_bytes)}</span></TableCell>
                        <TableCell><span className="text-[10px] font-bold text-slate-500">{new Date(item.created_at).toLocaleDateString()}</span></TableCell>
                        <TableCell className="text-right pr-8" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <VaultButton variant="outline" size="icon" className="h-8 w-8 text-slate-400" onClick={() => {navigator.clipboard.writeText(item.id); toast.success("ID Copied");}} title="Copy ID"><Fingerprint size={14}/></VaultButton>

                                {item.type === 'file' && <VaultButton variant="outline" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handleDownload(item)} title="Download"><DownloadCloud size={14}/></VaultButton>}
                                {(item.user_permission === 'owner' || item.user_permission === 'editor') && (
                                    <>
                                        <RenameDialog item={item} />
                                        {item.user_permission === 'owner' && <MoveDialog item={item} />}
                                        {item.user_permission === 'owner' && <ShareDialog item={item} />}
                                        {item.type === 'file' && <UploadDialog nodeId={item.id} />}
                                        {item.user_permission === 'owner' && (
                                            <VaultButton variant="outline" size="icon" className="h-8 w-8 text-red-500 border-2" onClick={() => handleDelete(item.id)} title="Delete"><Trash2 size={14}/></VaultButton>
                                        )}
                                    </>
                                )}

                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>

        {/* Footer Pagination */}
        <div className="bg-slate-50/50 border-t-2 border-slate-100 p-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Page_Size:</span>
                <div className="flex gap-1">
                    {[20, 50, 100].map(sz => (
                        <VaultButton key={sz} variant={pageSize === sz ? "default" : "outline"} className="h-8 w-12 text-[10px]" onClick={() => {setPageSize(sz); setOffset(0);}}>{sz}</VaultButton>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <VaultButton variant="outline" className="text-[10px] px-6 h-10" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - pageSize))}>PREV</VaultButton>
                <div className="bg-white border-2 border-slate-200 px-5 h-10 flex items-center rounded-xl font-black text-[10px] tracking-widest text-slate-600 italic shadow-sm">PAGE_{Math.floor(offset / pageSize) + 1}</div>
                <VaultButton variant="outline" className="text-[10px] px-6 h-10" disabled={(nodes?.length || 0) < pageSize} onClick={() => setOffset(offset + pageSize)}>NEXT</VaultButton>
            </div>
        </div>
    </div>
  );
};
