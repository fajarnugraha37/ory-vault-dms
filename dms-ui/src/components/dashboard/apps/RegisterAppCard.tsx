"use client";

import React, { useState } from "react";
import { 
  VaultCard, 
  VaultButton, 
  VaultBadge 
} from "@/components/shared/VaultPrimitives";
import { 
  Plus, 
  ShieldCheck, 
  Copy, 
  Terminal, 
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function RegisterAppCard({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdClient, setCreatedClient] = useState<any>(null);

  const handleRegister = async () => {
    if (!name) return;
    setLoading(true);
    try {
      const { data } = await api.post("/api/oauth2/clients", { client_name: name });
      setCreatedClient(data);
      toast.success("Identity Module Registered");
      onCreated();
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (createdClient) {
    return (
      <VaultCard spotlight={true} className="p-8 space-y-6 bg-accent/[0.03] border-accent/20">
        <div className="flex items-center gap-3 text-accent">
          <ShieldCheck size={24} />
          <h3 className="font-semibold text-lg tracking-tight">Credentials_Generated</h3>
        </div>
        
        <p className="text-sm text-foreground-muted leading-relaxed">
            Your third-party identity module has been successfully provisioned. 
            Store these secrets securely; they will not be displayed again.
        </p>

        <div className="space-y-4">
            <div className="space-y-2">
                <Label className="text-[10px] uppercase font-mono text-foreground-subtle">Client_ID</Label>
                <code className="block p-3 bg-black/40 border border-white/[0.06] rounded-xl text-xs font-mono text-foreground/80">{createdClient.client_id}</code>
            </div>
            <div className="space-y-2">
                <Label className="text-[10px] uppercase font-mono text-foreground-subtle">Client_Secret</Label>
                <code className="block p-3 bg-black/40 border border-white/[0.06] rounded-xl text-xs font-mono text-accent-bright">{createdClient.client_secret}</code>
            </div>
        </div>

        <VaultButton variant="secondary" className="w-full" onClick={() => setCreatedClient(null)}>
            ACKNOWLEDGE_AND_CLOSE
        </VaultButton>
      </VaultCard>
    );
  }

  return (
    <VaultCard spotlight={true} className="p-8 space-y-6">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold text-white tracking-tight">Register_Application</h3>
        <p className="text-sm text-foreground-muted">Provision a new OAuth2 client for secure M2M communication.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="app-name" className="text-[10px] uppercase font-mono text-foreground-subtle ml-1">Application_Name</Label>
          <Input
            id="app-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Internal_Automation_Service"
            className="bg-white/[0.03] border-white/[0.06] focus:border-accent h-12"
          />
        </div>

        <VaultButton 
            className="w-full h-12 group"
            onClick={handleRegister} 
            isLoading={loading}
            disabled={!name}
        >
            INITIALIZE_PROVISIONING <ChevronRight size={16} className="ml-2 group-hover:translate-x-0.5 transition-transform" />
        </VaultButton>
      </div>

      <div className="pt-4 flex items-center gap-2 text-[10px] font-mono text-foreground-subtle">
          <Terminal size={12} />
          Scope: nodes.read nodes.write nodes.share
      </div>
    </VaultCard>
  );
}
