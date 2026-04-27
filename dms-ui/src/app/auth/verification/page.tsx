"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ory } from "@/lib/ory";
import { VerificationFlow, UpdateVerificationFlowBody } from "@ory/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthForm } from "@/components/auth/AuthForm";
import Link from "next/link";
import { toast } from "sonner";

function VerificationContent() {
  const [flow, setFlow] = useState<VerificationFlow | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const flowId = searchParams.get("flow");

  useEffect(() => {
    if (flowId) {
      ory.getVerificationFlow({ id: flowId }).then(({ data }) => setFlow(data));
    } else {
      ory.createBrowserVerificationFlow().then(({ data }) => setFlow(data));
    }
  }, [flowId]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flow) return;
    setLoading(true);

    ory
      .updateVerificationFlow({
        flow: flow.id,
        updateVerificationFlowBody: {
          method: "code",
          ...values,
        } as UpdateVerificationFlowBody,
      })
      .then(() => {
        toast.success("Identity verified successfully");
      })
      .catch((err) => {
        setLoading(false);
        if (err.response?.status === 400) {
          setFlow(err.response.data as VerificationFlow);
        }
      });
  };

  if (!flow) return null;

  return (
    <AuthLayout title="Verification" subtitle="Email Identity Confirmation">
      <AuthForm 
        nodes={flow.ui.nodes} 
        messages={flow.ui.messages}
        values={values} 
        onChange={(name, val) => setValues({...values, [name]: val})}
        onSubmit={onSubmit}
        submitLabel="Verify Identity"
        isLoading={loading}
      />
      <div className="mt-8 text-center">
        <Link href="/auth/login" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900">
            Back_To_Access_Gate
        </Link>
      </div>
    </AuthLayout>
  );
}

export default function VerificationPage() {
  return (
    <Suspense fallback={<div>Loading_Verification_Node...</div>}>
      <VerificationContent />
    </Suspense>
  );
}
