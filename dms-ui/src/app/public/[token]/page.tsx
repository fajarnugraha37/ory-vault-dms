"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { VaultCard, VaultButton, VaultHeader } from "@/components/shared/VaultPrimitives";
import { File, DownloadCloud, AlertCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api, API_BASE_URL } from "@/lib/api";

const formatBytes = (bytes?: number) => {
  if (!bytes || bytes === 0) return '-';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function PublicDocumentPage() {
  const params = useParams();
  const token = params.token as string;
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [metadata, setMetadata] = useState<{name: string, size_bytes: number} | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const res = await api.get(`/api/public/documents/${token}/metadata`);
        setMetadata(res.data);
      } catch (err: any) {
        if (err.response?.status === 403) setError("SECURITY_RESTRICTION: Access denied.");
        else if (err.response?.status === 404) setError("SIGNAL_NOT_FOUND: Invalid or expired link.");
        else setError("SYSTEM_ERROR: Verification failed.");
      } finally {
        setVerifying(false);
      }
    };
    if (token) verifyToken();
  }, [token]);

  const handleDownload = async () => {
    setLoading(true);
    try {
      // Use native fetch for blob handling to easily get headers, 
      // but still use absolute URL from API utility
      const response = await fetch(`${API_BASE_URL}/api/public/documents/${token}`);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      const disposition = response.headers.get("Content-Disposition");
      let filename = metadata?.name || "download";
      if (disposition && disposition.indexOf("attachment") !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) { 
          filename = matches[1].replace(/['"]/g, "");
        }
      }
      
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success("Download started");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-slate-900 text-white p-4 rounded-3xl border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(59,130,246,1)] animate-bounce mb-8">
            <ShieldCheck size={40} />
        </div>
        <p className="font-black text-[11px] text-slate-400 uppercase tracking-[0.5em] italic">Establishing_Secure_Link...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
            <div className="bg-blue-600 text-white p-5 rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] border-4 border-slate-900">
                <File size={40} />
            </div>
            <VaultHeader title="Public Signal" subtitle="One-Way Cryptographic Access Node" />
        </div>

        <VaultCard variant="blue" className="p-8 border-4">
          {error ? (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-red-600 flex flex-col items-center space-y-3">
              <AlertCircle size={32} />
              <p className="font-black uppercase text-[10px] text-center tracking-tight leading-relaxed">{error}</p>
              <VaultButton variant="outline" className="w-full mt-4 text-[10px]" onClick={() => window.location.reload()}>RETRY_PROTOCOL</VaultButton>
            </div>
          ) : (
            <div className="space-y-8 text-center">
              <div className="space-y-4">
                <div className="p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-left shadow-inner">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <ShieldCheck size={10} className="text-blue-600"/> Resource_Identity
                    </p>
                    <p className="font-black text-slate-900 truncate text-lg tracking-tight">{metadata?.name}</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase">Size: {formatBytes(metadata?.size_bytes)}</p>
                </div>
              </div>

              <VaultButton onClick={handleDownload} disabled={loading} className="w-full py-10 text-xs bg-slate-900 hover:bg-blue-600">
                <DownloadCloud size={20} className="mr-3" /> {loading ? "SYNCHRONIZING..." : "EXECUTE_DOWNLOAD"}
              </VaultButton>
            </div>
          )}
        </VaultCard>

        <footer className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
                Ory_Vault_Public_Service_v1.2 // Secure_Handshake
            </p>
        </footer>
      </div>
    </div>
  );
}
