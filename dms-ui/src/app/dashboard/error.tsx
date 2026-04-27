"use client";

import React, { useEffect } from "react";
import { VaultCard, VaultButton, VaultHeader } from "@/components/shared/VaultPrimitives";
import { AlertCircle, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-4 bg-red-500/10 rounded-2xl border border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.1)]"
        >
            <AlertCircle className="text-red-500" size={32} />
        </motion.div>

        <VaultHeader 
            title="System_Fault" 
            subtitle="An unexpected anomaly has been detected in the vault infrastructure."
        />

        <VaultCard className="w-full max-w-md p-8 text-center space-y-6 bg-red-500/[0.02] border-red-500/20">
            <p className="text-xs font-mono text-red-400 uppercase tracking-widest bg-red-500/5 py-2 px-4 rounded-lg">
                ERROR_DIGEST: {error.digest || "CRYPTO_FAILURE"}
            </p>
            
            <p className="text-sm text-foreground-muted leading-relaxed">
                {error.message || "An infrastructure error occurred. Please try to re-initialize the session."}
            </p>

            <VaultButton variant="secondary" className="w-full" onClick={() => reset()}>
                <RotateCcw size={16} className="mr-2" /> RE_INITIALIZE_NODE
            </VaultButton>
        </VaultCard>
    </div>
  );
}
