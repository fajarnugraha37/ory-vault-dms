"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { ory } from "@/lib/ory";
import { RegistrationFlow, UpdateRegistrationFlowBody } from "@ory/client";
import { AxiosError } from "axios";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthForm } from "@/components/auth/AuthForm";
import Link from "next/link";
import { toast } from "sonner";

function RegistrationContent() {
  const [flow, setFlow] = useState<RegistrationFlow | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: me } = useSWR('/api/me', fetcher);

  useEffect(() => {
    if (me) {
      router.push('/dashboard/documents');
    }
  }, [me, router]);

  useEffect(() => {
    ory
      .createBrowserRegistrationFlow()
      .then(({ data }) => setFlow(data))
      .catch((err) => setError("Registration infrastructure offline"));
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flow) return;
    setLoading(true);

    ory
      .updateRegistrationFlow({
        flow: flow.id,
        updateRegistrationFlowBody: {
          method: "password",
          ...values,
        } as UpdateRegistrationFlowBody,
      })
      .then(() => {
        toast.success("Identity registered successfully");
        router.push("/auth/login");
      })
      .catch((err: AxiosError) => {
        setLoading(false);
        if (err.response?.status === 400) {
          setFlow(err.response.data as RegistrationFlow);
          return;
        }
        setError("Registration criteria not met");
      });
  };

  if (!flow) return <div className="flex justify-center items-center min-h-screen font-black text-slate-300 animate-pulse italic uppercase tracking-widest text-xs">Provisioning_Identity_Node...</div>;

  return (
    <AuthLayout title="New Identity" subtitle="System Enrollment Required for Access">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 text-red-600 text-[10px] font-black uppercase rounded-xl flex items-center gap-2">
          {error}
        </div>
      )}

      <AuthForm 
        nodes={flow.ui.nodes} 
        messages={flow.ui.messages}
        values={values} 
        onChange={(name, val) => setValues({...values, [name]: val})}
        onSubmit={onSubmit}
        submitLabel="Register Identity"
        isLoading={loading}
      />

      <div className="mt-10 border-t-2 border-slate-100 pt-6">
        <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
            Existing_Identity_Found?
        </p>
        <Link href="/auth/login" className="block text-center p-4 border-2 border-slate-900 rounded-xl font-black text-[10px] hover:bg-slate-900 hover:text-white transition-all uppercase tracking-widest">
            Execute_Login_Protocol
        </Link>
      </div>
    </AuthLayout>
  );
}

export default function RegistrationPage() {
  return (
    <Suspense fallback={<div>Loading_Registration_Node...</div>}>
      <RegistrationContent />
    </Suspense>
  );
}
