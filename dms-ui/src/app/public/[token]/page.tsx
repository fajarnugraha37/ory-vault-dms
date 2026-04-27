"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { VaultCard, VaultButton, VaultHeader } from "@/components/shared/VaultPrimitives";
import { File, Download, ShieldCheck, AlertCircle, Clock, Lock } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { motion } from "framer-motion";

export default function PublicNodePage() {
  const { token } = useParams();
  const [node, setNode] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/public-api/nodes/${token}`)
      .then(res => setNode(res.data))
      .catch(err => setError(err.response?.data?.error || "Link expired or invalid"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleDownload = async () => {
    try {
        const response = await api.get(`/public-api/nodes/${token}/download`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', node.name);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (e) {
        setError("Download failed");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-mono text-[10px] text-accent animate-pulse uppercase tracking-[0.5em]">Establishing_Secure_Link...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-12 flex flex-col items-center"
        >
            <div className="p-4 bg-accent/10 rounded-2xl border border-accent/20 mb-4 shadow-[0_0_40px_rgba(94,106,210,0.2)]">
                <ShieldCheck className="text-accent" size={32} />
            </div>
            <h2 className="text-xs font-mono font-black tracking-[0.4em] uppercase text-white/40">
                Verified_Public_Signal
            </h2>
        </motion.div>

        <VaultCard spotlight={true} className="w-full max-w-md p-0 border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl overflow-hidden">
          {error ? (
            <div className="p-10 text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                    <AlertCircle size={32} className="text-red-500" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white uppercase tracking-tight">Signal_Lost</h3>
                    <p className="text-sm text-foreground-muted leading-relaxed">{error}</p>
                </div>
            </div>
          ) : (
            <div className="p-10 space-y-8">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-white/[0.03] rounded-2xl border border-white/10">
                        <File size={32} className="text-foreground-muted" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-white truncate text-lg tracking-tight">{node.name}</span>
                        <span className="text-xs font-mono text-foreground-subtle uppercase tracking-widest mt-1">
                            {formatBytes(node.size_bytes || 0)} • {node.mime_type?.split('/')[1]?.toUpperCase()}
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl text-[10px] text-foreground-muted uppercase tracking-widest">
                        <Clock size={14} />
                        Available until manually revoked
                    </div>
                    <VaultButton onClick={handleDownload} className="w-full h-14 text-base font-semibold group">
                        DOWNLOAD_PAYLOAD <Download size={18} className="ml-2 group-hover:translate-y-0.5 transition-transform" />
                    </VaultButton>
                </div>
            </div>
          )}
        </VaultCard>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex items-center justify-center gap-2 text-[10px] font-mono text-white/10 uppercase tracking-widest"
        >
          <Lock size={10} />
          End_to_End_Encrypted_Link
        </motion.div>
    </div>
  );
}
