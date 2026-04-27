"use client";

import React from "react";
import { VaultCard, VaultHeader } from "@/components/shared/VaultPrimitives";
import { Database, Shield } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center text-center space-y-4">
            <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-[8px_8px_0px_0px_rgba(59,130,246,1)] border-4 border-slate-900">
                <Shield size={40} />
            </div>
            <VaultHeader title={title} subtitle={subtitle} />
        </div>

        <VaultCard variant="blue" className="p-10 border-4">
            {children}
        </VaultCard>

        <footer className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
                Secure_Vault_Protocol_v1.2 // Auth_Node
            </p>
        </footer>
      </div>
    </div>
  );
};
