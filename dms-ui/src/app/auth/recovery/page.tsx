"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ory } from "@/lib/ory";
import { RecoveryFlow, UpdateRecoveryFlowBody } from "@ory/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthForm } from "@/components/auth/AuthForm";
import { VaultButton } from "@/components/shared/VaultPrimitives";
import { ShieldCheck, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

function RecoveryContent() {
  const [flow, setFlow] = useState<RecoveryFlow | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();
  const flowId = searchParams.get("flow");

  useEffect(() => {
    if (flowId) {
      ory.getRecoveryFlow({ id: flowId }).then(({ data }) => setFlow(data));
    } else {
      ory.createBrowserRecoveryFlow().then(({ data }) => setFlow(data));
    }
  }, [flowId]);

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
        // If the flow continues (e.g. asking for code), stay on page.
        // If flow is finished/message shows success, we show success UI.
        if (data.ui.messages?.find(m => m.id === 1060001)) {
            setSuccess(true);
        }
      })
      .catch((err) => {
        setLoading(false);
        if (err.response?.status === 400) {
          setFlow(err.response.data as RecoveryFlow);
        } else {
            toast.error("Recovery request failed");
        }
      });
  };

  if (!flow) return <div className="flex justify-center items-center min-h-screen font-black text-slate-300 animate-pulse italic uppercase tracking-widest text-xs">Initializing_Recovery_Node...</div>;

  if (success) {
    return (
        <AuthLayout title="Link Dispatched" subtitle="Recovery Protocol Initialized">
            <div className="flex flex-col items-center text-center space-y-6">
                <div className="bg-emerald-100 text-emerald-600 p-6 rounded-full border-4 border-emerald-500 animate-in zoom-in duration-500">
                    <Mail size={48} />
                </div>
                <p className="text-sm font-bold text-slate-600 leading-relaxed uppercase tracking-tight">
                    An encrypted recovery link has been sent to your registered identity. Please check your inbox to proceed.
                </p>
                <VaultButton variant="outline" className="w-full py-8" asChild>
                    <Link href="/auth/login"><ArrowLeft size={16} className="mr-2" /> ABORT_PROTOCOL</Link>
                </VaultButton>
            </div>
        </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Identity Recovery" subtitle="Emergency Restoration Protocol">
      <AuthForm 
        nodes={flow.ui.nodes} 
        messages={flow.ui.messages}
        values={values} 
        onChange={(name, val) => setValues({...values, [name]: val})}
        onSubmit={onSubmit}
        submitLabel="Request Recovery Link"
        isLoading={loading}
      />
      <div className="mt-8 text-center pt-6 border-t-2 border-slate-50 flex flex-col gap-4">
        <Link href="/auth/login" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 flex items-center justify-center gap-2">
            <ArrowLeft size={12}/> Abort_Recovery_Protocol
        </Link>
        <p className="text-[9px] font-bold text-slate-300 uppercase">
          Enter your registered email to receive a secure recovery code.
        </p>
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
