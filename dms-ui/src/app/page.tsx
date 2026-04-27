"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Shield, 
  ArrowRight, 
  Lock, 
  Terminal, 
  Layers, 
  Zap,
  CheckCircle2,
  Server
} from "lucide-react";
import { VaultCard, VaultButton } from "@/components/shared/VaultPrimitives";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-32 pb-24 text-center space-y-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-3 px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-full text-xs font-mono text-accent-bright uppercase tracking-widest"
        >
          <Zap size={14} className="animate-pulse" />
          System_Status: Operational
        </motion.div>

        <div className="space-y-6 max-w-4xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-semibold tracking-tight text-gradient leading-[1.1]"
          >
            Secure_Digital <br /> Infrastructure
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-foreground-muted max-w-2xl mx-auto leading-relaxed"
          >
            Decentralized document management with zero-trust protocols, 
            cryptographic identity verification, and multi-tenant isolation.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/auth/login">
            <VaultButton className="h-14 px-10 text-lg rounded-xl">
              Initialize_Access <ArrowRight size={20} className="ml-2" />
            </VaultButton>
          </Link>
          <Link href="/auth/registration">
            <VaultButton variant="secondary" className="h-14 px-10 text-lg rounded-xl">
              Register_Node
            </VaultButton>
          </Link>
        </motion.div>
      </section>

      {/* Feature Grid (Bento Style) */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <VaultCard className="md:col-span-2 p-10 space-y-4 h-[400px] flex flex-col justify-end">
            <div className="p-3 bg-accent/10 rounded-xl border border-accent/20 w-fit mb-4">
              <Shield className="text-accent" size={24} />
            </div>
            <h3 className="text-3xl font-semibold text-white">Identity_Assurance</h3>
            <p className="text-foreground-muted max-w-md">
              Powered by Ory Kratos. Full life-cycle management including MFA, 
              account recovery, and session auditing across all subdomains.
            </p>
          </VaultCard>

          <VaultCard className="p-10 space-y-4 h-[400px] flex flex-col justify-end bg-gradient-to-tr from-accent/5 to-transparent">
            <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 w-fit mb-4">
              <Lock className="text-indigo-400" size={24} />
            </div>
            <h3 className="text-3xl font-semibold text-white">Zero_Trust</h3>
            <p className="text-foreground-muted">
              Every request is verified via Oathkeeper at the edge.
            </p>
          </VaultCard>

          <VaultCard className="p-10 space-y-4 h-[400px] flex flex-col justify-end">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 w-fit mb-4">
              <Layers size={24} className="text-blue-400" />
            </div>
            <h3 className="text-3xl font-semibold text-white">Zanzibar_AuthZ</h3>
            <p className="text-foreground-muted">
              Granular permissions powered by Google's Zanzibar model via Ory Keto.
            </p>
          </VaultCard>

          <VaultCard className="md:col-span-2 p-10 space-y-4 h-[400px] flex flex-col justify-end">
             <div className="flex items-center gap-6 mb-4 opacity-50 grayscale hover:opacity-100 transition-all">
                <Server size={32} />
                <Terminal size={32} />
                <Layers size={32} />
             </div>
            <h3 className="text-3xl font-semibold text-white">Enterprise_API</h3>
            <p className="text-foreground-muted max-w-lg">
              Automate your workflows with our robust OAuth2/OIDC compliant API gateway. 
              Register machine-to-machine clients in seconds.
            </p>
          </VaultCard>
        </div>
      </section>

      {/* Technical Footer */}
      <footer className="border-t border-white/[0.06] py-20 bg-background-deep/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-white/[0.05] rounded-lg">
                <Shield size={16} className="text-foreground-muted" />
             </div>
             <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground-subtle">
                Vault_System_v0.2.0-Alpha
             </span>
          </div>
          
          <div className="flex gap-10">
             {['Documentation', 'Security', 'GitHub', 'API_Reference'].map(item => (
                <span key={item} className="text-[10px] font-mono uppercase tracking-widest text-foreground-muted hover:text-accent transition-colors cursor-pointer">
                    {item}
                </span>
             ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
