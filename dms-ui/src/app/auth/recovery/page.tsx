"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ory } from "@/lib/ory";
import { RecoveryFlow, UpdateRecoveryFlowBody } from "@ory/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthForm } from "@/components/auth/AuthForm";
import { VaultButton } from "@/components/shared/VaultPrimitives";
import { Mail, ArrowLeft, ShieldCheck, Key } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

function RecoveryContent() {
  const [flow, setFlow] = useState<RecoveryFlow | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const flowId = searchParams.get("flow");

  useEffect(() => {
    if (flowId) {
      ory.getRecoveryFlow({ id: flowId }).then(({ data }) => setFlow(data));
    } else {
      ory.createBrowserRecoveryFlow().then(({ data }) => {
          setFlow(data);
          router.replace(`/auth/recovery?flow=${data.id}`);
      });
    }
  }, [flowId, router]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flow) return;
    setLoading(true);

    ory
      .updateRecoveryFlow({
        flow: flow.id,
        updateRecoveryFlowBody: {
          method: "code",
          ...values,
        } as UpdateRecoveryFlowBody,
      })
      .then(({ data }) => {
        setFlow(data);
        setLoading(false);
        // Ory returns a success message when the recovery link/code is accepted
        if (data.ui.messages?.find(m => m.id === 1060001)) {
            setSuccess(true);
        }
      })
      .catch((err) => {
        setLoading(false);
        if (err.response?.status === 400) {
          setFlow(err.response.data as RecoveryFlow);
        } else {
          toast.error("Recovery protocol failed. Check infrastructure.");
        }
      });
  };

  if (!flow) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black text-slate-300 animate-pulse uppercase italic">Syncing_Recovery_Node...</div>;

  if (success) {
    return (
        <AuthLayout title="Identity Restored" subtitle="Security breach resolved. Please reset your credentials.">
            <div className="flex flex-col items-center text-center space-y-6">
                <div className="bg-emerald-100 text-emerald-600 p-6 rounded-full border-4 border-emerald-500">
                    <ShieldCheck size={48} />
                </div>
                <p className="text-sm font-bold text-slate-600 leading-relaxed uppercase tracking-tight">
                    Your identity has been verified. You are now being redirected to the settings portal to update your credentials.
                </p>
                <VaultButton className="w-full py-8" onClick={() => window.location.href = "/auth/settings"}>
                    GOTO_IDENTITY_SETTINGS
                </VaultButton>
            </div>
        </AuthLayout>
    );
  }

  // Check if we already sent the code (Ory state management)
  const isCodeSent = flow.ui.nodes.some(n => (n.attributes as any).name === "code");

  return (
    <AuthLayout 
        title={isCodeSent ? "Verify Code" : "Identity Recovery"} 
        subtitle={isCodeSent ? "Enter the secure code sent to your inbox" : "Initialize restoration protocol"}
    >
      <AuthForm 
        nodes={flow.ui.nodes} 
        messages={flow.ui.messages}
        values={values} 
        onChange={(name, val) => setValues({...values, [name]: val})}
        onSubmit={onSubmit}
        submitLabel={isCodeSent ? "Verify Recovery Code" : "Send Recovery Link"}
        isLoading={loading}
      />
      
      <div className="mt-8 pt-6 border-t-2 border-slate-50 flex flex-col gap-4">
        <Link href="/auth/login" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 flex items-center justify-center gap-2">
            <ArrowLeft size={12}/> Abort_Recovery_Protocol
        </Link>
        {!isCodeSent && (
            <p className="text-[9px] font-bold text-slate-300 uppercase text-center leading-relaxed">
                Provide your registered email. An encrypted signal will be dispatched to verify your ownership.
            </p>
        )}
      </div>
    </AuthLayout>
  );
}

export default function RecoveryPage() {
  return (
    <Suspense fallback={<div>Loading_Recovery_Flow...</div>}>
      <RecoveryContent />
    </Suspense>
  );
}
