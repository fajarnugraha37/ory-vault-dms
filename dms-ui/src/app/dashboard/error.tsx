"use client";

import React, { useEffect } from "react";
import { VaultCard, VaultButton, VaultHeader } from "@/components/shared/VaultPrimitives";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("DASHBOARD_CRITICAL_FAILURE:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans text-slate-900">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
            <div className="bg-red-500 text-white p-5 rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
                <AlertTriangle size={40} />
            </div>
            <VaultHeader title="Sync Failure" subtitle="A critical interruption occurred in the vault stream" />
        </div>

        <VaultCard variant="destructive" className="p-8 border-4 text-center space-y-6">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 p-4 rounded-xl border-2 border-red-100">
                {error.message || "Unknown cryptographic error"}
            </p>
            <VaultButton onClick={reset} className="w-full py-8 text-xs bg-slate-900">
                <RefreshCcw size={16} className="mr-2" /> RE-ESTABLISH_CONNECTION
            </VaultButton>
        </VaultCard>
      </div>
    </div>
  );
}
