"use client"

import React from "react"
import useSWR from "swr"
import { fetcher, api } from "@/lib/api"
import { Navbar } from "@/components/layout/Navbar"
import { VaultHeader, VaultBadge } from "@/components/shared/VaultPrimitives"
import { AppCard } from "@/components/dashboard/apps/AppCard"
import { RegisterAppCard } from "@/components/dashboard/apps/RegisterAppCard"
import { Globe, Database } from "lucide-react"
import { toast } from "sonner"

interface OAuth2Client {
  id: string;
  client_id: string;
  client_name?: string;
  created_at: string;
  redirect_uris?: string[];
}

export default function AppsManagementPage() {
  const { data: clients, mutate, isLoading } = useSWR<OAuth2Client[]>('/api/oauth2/clients', fetcher);

  const handleDelete = async (clientId: string) => {
    if (!confirm("Are you sure you want to delete this application? Access tokens will be revoked.")) return;
    
    try {
      await api.delete(`/api/oauth2/clients/${clientId}`);
      mutate();
      toast.success("Application removed");
    } catch (err) {
      toast.error("Deletion failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900">
      <Navbar />

      <main className="p-8 max-w-5xl mx-auto space-y-10 mt-4">
        <VaultHeader 
            title="Manage Applications" 
            subtitle="Register and manage third-party integrations with OryVault" 
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Registration Sidebar */}
          <div className="lg:col-span-5">
            <RegisterAppCard onSuccess={() => mutate()} />
          </div>

          {/* List Section */}
          <div className="lg:col-span-7 space-y-8">
            <div className="flex items-center gap-2">
                <Globe size={20} className="text-slate-400" />
                <h2 className="font-black text-slate-900 uppercase tracking-tight text-xl italic text-[14px]">Active_Integrations</h2>
                <VaultBadge className="bg-slate-900 text-white border-slate-900 ml-2">{clients?.length || 0}</VaultBadge>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {clients?.map((client) => (
                    <AppCard key={client.client_id} client={client} onDelete={handleDelete} />
                ))}

                {!clients?.length && !isLoading && (
                    <div className="text-center py-20 bg-slate-100/50 rounded-[2.5rem] border-4 border-dashed border-slate-200">
                        <Database size={40} className="mx-auto text-slate-200 mb-4" />
                        <p className="font-black text-slate-300 uppercase tracking-widest text-[10px]">No applications registered</p>
                    </div>
                )}
                
                {isLoading && <div className="text-center py-10 font-black text-slate-400 animate-pulse uppercase italic text-xs tracking-widest">Loading_Registry...</div>}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
