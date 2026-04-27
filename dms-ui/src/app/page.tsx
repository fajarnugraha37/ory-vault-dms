"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ory } from "@/lib/ory";
import { Session } from "@ory/client";
import { AxiosError } from "axios";
import { Navbar } from "@/components/layout/Navbar";
import { VaultHeader, VaultCard, VaultButton, VaultBadge } from "@/components/shared/VaultPrimitives";
import { 
  User, 
  Files, 
  Settings, 
  Trash2, 
  ShieldCheck, 
  Database,
  ArrowRight,
  LogOut,
  Zap
} from "lucide-react";
import Link from "next/link";

export default function HomeHubPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    ory
      .toSession()
      .then(({ data }) => {
        setSession(data);
        setLoading(false);
      })
      .catch((err: AxiosError) => {
        if (err.response?.status === 401 || !err.response) {
          router.push("/auth/login");
          return;
        }
        setLoading(false);
      });
  }, [router]);

  const onLogout = () => {
    ory.createBrowserLogoutFlow().then(({ data }) => {
      window.location.href = data.logout_url;
    });
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="font-black text-[10px] text-slate-400 uppercase tracking-widest italic">Syncing_Identity_Nodes...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900">
      <Navbar />

      <main className="p-8 max-w-6xl mx-auto mt-10 space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <VaultHeader 
                title="System Hub" 
                subtitle={`Welcome back, ${session?.identity?.traits.first_name || 'Operator'}. Identity node verified.`} 
            />
            <div className="flex gap-4">
                <VaultButton variant="outline" className="h-12 border-red-200 text-red-500 hover:bg-red-50" onClick={onLogout}>
                    <LogOut size={16} className="mr-2" /> TERMINATE_SESSION
                </VaultButton>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Identity Profile */}
            <div className="lg:col-span-4">
                <VaultCard variant="blue" className="p-8 space-y-6 sticky top-28">
                    <div className="w-20 h-20 bg-slate-900 text-white rounded-3xl flex items-center justify-center border-4 border-slate-900 shadow-[6px_6px_0px_0px_rgba(59,130,246,1)]">
                        <User size={40} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Identity_Subject</p>
                        <h3 className="font-black text-xl tracking-tight truncate">{session?.identity?.traits.email}</h3>
                        <div className="flex gap-2 mt-3">
                            <VaultBadge className="bg-blue-50 border-blue-200 text-blue-600">Active</VaultBadge>
                            <VaultBadge className="bg-slate-900 text-white border-slate-900">v1.2</VaultBadge>
                        </div>
                    </div>
                    <div className="space-y-4 pt-6 border-t-2 border-slate-100">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase">System_Access</span>
                            <span className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">GRANTED_FULL</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Division</span>
                            <span className="text-[10px] font-bold text-slate-900 uppercase tracking-tighter">{session?.identity?.traits.division || "EXTERNAL"}</span>
                        </div>
                    </div>
                    <VaultButton variant="outline" className="w-full h-12" asChild>
                        <Link href="/auth/settings">MANAGE_IDENTITY</Link>
                    </VaultButton>
                </VaultCard>
            </div>

            {/* Quick Actions Grid */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link href="/dashboard/documents" className="group">
                    <VaultCard className="p-8 h-full hover:shadow-[16px_16px_0px_0px_rgba(59,130,246,1)] group-hover:-translate-y-2 transition-all">
                        <div className="bg-blue-100 text-blue-600 p-3 rounded-2xl w-fit mb-6 border-2 border-blue-200">
                            <Files size={28} />
                        </div>
                        <h4 className="font-black text-2xl tracking-tighter italic uppercase mb-2">Vault_Explorer</h4>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-tight leading-relaxed mb-8">
                            Access encrypted storage, manage folders, and generate cryptographic signals for document sharing.
                        </p>
                        <div className="flex items-center text-blue-600 font-black text-xs uppercase tracking-widest gap-2">
                            Enter_Vault <ArrowRight size={16} />
                        </div>
                    </VaultCard>
                </Link>

                <Link href="/dashboard/apps" className="group">
                    <VaultCard variant="indigo" className="p-8 h-full hover:shadow-[16px_16px_0px_0px_rgba(79,70,229,1)] group-hover:-translate-y-2 transition-all">
                        <div className="bg-indigo-100 text-indigo-600 p-3 rounded-2xl w-fit mb-6 border-2 border-indigo-200">
                            <Zap size={28} />
                        </div>
                        <h4 className="font-black text-2xl tracking-tighter italic uppercase mb-2">App_Forge</h4>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-tight leading-relaxed mb-8">
                            Register third-party applications and manage OAuth2 delegation keys for machine-to-machine access.
                        </p>
                        <div className="flex items-center text-indigo-600 font-black text-xs uppercase tracking-widest gap-2">
                            Manage_Integrations <ArrowRight size={16} />
                        </div>
                    </VaultCard>
                </Link>

                <Link href="/dashboard/trash" className="group">
                    <VaultCard variant="destructive" className="p-8 h-full hover:shadow-[16px_16px_0px_0px_rgba(239,68,68,1)] group-hover:-translate-y-2 transition-all">
                        <div className="bg-red-100 text-red-600 p-3 rounded-2xl w-fit mb-6 border-2 border-red-200">
                            <Trash2 size={28} />
                        </div>
                        <h4 className="font-black text-2xl tracking-tighter italic uppercase mb-2">Recycle_Bin</h4>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-tight leading-relaxed mb-8">
                            Review recently deleted items and restore them back to the vault before permanent synchronization.
                        </p>
                        <div className="flex items-center text-red-600 font-black text-xs uppercase tracking-widest gap-2">
                            Recovery_Node <ArrowRight size={16} />
                        </div>
                    </VaultCard>
                </Link>

                <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white space-y-6 shadow-xl border-4 border-slate-900">
                    <div className="flex items-center gap-3">
                        <ShieldCheck size={24} className="text-blue-400" />
                        <span className="font-black uppercase italic tracking-widest">Security_Audit</span>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700">
                            <span className="text-[9px] font-black uppercase text-slate-400">Core_Engine</span>
                            <span className="text-[9px] font-bold text-blue-400">ORY_STACK_1.2</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-800 p-3 rounded-xl border border-slate-700">
                            <span className="text-[9px] font-black uppercase text-slate-400">Node_Status</span>
                            <span className="text-[9px] font-bold text-green-400">ENCRYPTED_UP</span>
                        </div>
                    </div>
                    <VaultButton className="w-full bg-blue-600 hover:bg-blue-500 border-0 h-12 text-[10px]">
                        DOWNLOAD_SECURITY_REPORT
                    </VaultButton>
                </div>
            </div>
        </div>
      </main>

      <footer className="mt-20 border-t-4 border-slate-900 p-10 text-center bg-white">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-left">
                  <p className="text-lg font-black italic tracking-tighter uppercase leading-none">OryVault_Production</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Zero_Trust_Protocol_Standard</p>
              </div>
              <div className="flex gap-8 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  <span className="hover:text-slate-900 cursor-pointer">Security</span>
                  <span className="hover:text-slate-900 cursor-pointer">Protocol</span>
                  <span className="hover:text-slate-900 cursor-pointer">Manual</span>
              </div>
          </div>
      </footer>
    </div>
  );
}
