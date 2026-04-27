"use client";

import React from "react";
import { motion } from "framer-motion";
import { Shield, Lock } from "lucide-react";
import { VaultCard } from "@/components/shared/VaultPrimitives";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
      {/* Decorative Brand Element */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-12 flex flex-col items-center"
      >
        <div className="p-4 bg-accent/10 rounded-2xl border border-accent/20 mb-4 shadow-[0_0_40px_rgba(94,106,210,0.2)]">
          <Shield className="text-accent" size={32} />
        </div>
        <h2 className="text-xs font-mono font-black tracking-[0.4em] uppercase text-white/40">
          Ory_Vault_Infrastructure
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px]"
      >
        <VaultCard spotlight={true} className="p-0 border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl">
          <div className="p-8 space-y-6">
            <div className="space-y-1 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-foreground-muted">
                  {subtitle}
                </p>
              )}
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="py-2">
                {children}
            </div>
          </div>
        </VaultCard>

        {/* Footer Technical Note */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex items-center justify-center gap-2 text-[10px] font-mono text-white/20 uppercase tracking-widest"
        >
          <Lock size={10} />
          End_to_End_Encrypted_Link
        </motion.div>
      </motion.div>
    </div>
  );
}
