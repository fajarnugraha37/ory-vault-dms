"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { File, DownloadCloud, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function PublicDocumentPage() {
  const params = useParams();
  const token = params.token as string;
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [metadata, setMetadata] = useState<{name: string, size: number} | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyToken = async () => {
      try {
        const res = await fetch(`/api/public/documents/${token}/metadata`);
        if (!res.ok) {
           if (res.status === 403) throw new Error("SECURITY_RESTRICTION: Direct ID access is not permitted. You must use a secure Signal token.");
           if (res.status === 404) throw new Error("SIGNAL_NOT_FOUND: This link is invalid, revoked, or has expired.");
           throw new Error("SYSTEM_ERROR: Unable to verify security signal.");
        }
        const data = await res.json();
        setMetadata(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setVerifying(false);
      }
    };
    verifyToken();
  }, [token]);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/public/documents/${token}`);
      if (!response.ok) {
        if (response.status === 404) throw new Error("Link invalid or expired");
        throw new Error("Failed to download file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      // Get filename from Content-Disposition if possible, or fallback
      const disposition = response.headers.get("Content-Disposition");
      let filename = "downloaded_file";
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
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
         <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="font-black text-[10px] text-slate-400 uppercase tracking-widest italic">Securing Connection...</p>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <Card className="max-w-md w-full border-4 border-slate-900 rounded-[2rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden bg-white text-center">
        <CardHeader className="bg-slate-50 border-b-2 border-slate-100 pb-8 pt-10">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-blue-100 shadow-inner">
            <File size={40} />
          </div>
          <CardTitle className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Secure_File_Transfer</CardTitle>
          <CardDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-2">
            View-Only Access Portal
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          {error ? (
            <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-6 text-red-600 flex flex-col items-center">
              <AlertCircle size={32} className="mb-2" />
              <p className="font-black uppercase text-[10px] text-center leading-relaxed">{error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Document Signal</p>
                <p className="font-black text-slate-900 truncate">{metadata?.name}</p>
              </div>
              <Button onClick={handleDownload} disabled={loading} className="w-full bg-slate-900 hover:bg-blue-600 text-white font-black py-8 rounded-2xl text-sm uppercase tracking-[0.2em] transition-all active:translate-y-1 shadow-lg">
                <DownloadCloud size={20} className="mr-2" /> {loading ? "Downloading..." : "Download File"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
