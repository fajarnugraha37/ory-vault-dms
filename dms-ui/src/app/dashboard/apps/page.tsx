"use client";

import React from "react";
import useSWR from "swr";
import { fetcher, api } from "@/lib/api";
import { Navbar } from "@/components/layout/Navbar";
import { VaultHeader } from "@/components/shared/VaultPrimitives";
import { RegisterAppCard } from "@/components/dashboard/apps/RegisterAppCard";
import { AppCard } from "@/components/dashboard/apps/AppCard";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function AppsPage() {
  const { data: clients, mutate, isLoading } = useSWR("/api/oauth2/clients", fetcher);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/oauth2/clients/${id}`);
      toast.success("Application deregistered");
      mutate();
    } catch (e) {
      toast.error("Failed to revoke application credentials");
    }
  };

  return (
    <div className="pb-20">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 pt-12 space-y-12">
        <VaultHeader 
          title="Module_Registry" 
          subtitle="Provision and manage third-party service identifiers for cross-infrastructure automation."
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Registration Sidebar */}
          <div className="lg:col-span-5">
            <RegisterAppCard onCreated={() => mutate()} />
          </div>

          {/* List Section */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-mono font-black uppercase tracking-[0.3em] text-white/30">Active_Identifiers</h2>
                <div className="h-px flex-1 bg-white/[0.06] ml-6" />
            </div>

            <div className="grid grid-cols-1 gap-6">
              <AnimatePresence mode="popLayout">
                {clients?.map((client: any, index: number) => (
                    <motion.div
                        key={client.client_id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <AppCard client={client} onDelete={handleDelete} />
                    </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {!clients?.length && !isLoading && (
              <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
                <p className="text-xs font-mono text-foreground-muted uppercase tracking-widest">No_Registered_Modules</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
