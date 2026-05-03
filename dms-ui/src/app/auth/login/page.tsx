"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { ory } from "@/lib/ory";
import { api } from "@/lib/api";
import { LoginFlow, UpdateLoginFlowBody } from "@ory/client";
import { AxiosError } from "axios";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthForm } from "@/components/auth/AuthForm";
import Link from "next/link";

function LoginContent() {
  const [flow, setFlow] = useState<LoginFlow | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const flowId = searchParams.get("flow");
  const { data: me } = useSWR('/api/me', fetcher);

  useEffect(() => {
    if (me) {
      router.push('/dashboard/documents');
    }
  }, [me, router]);

  useEffect(() => {
    if (flowId) {
      ory.getLoginFlow({ id: flowId }).then(({ data }) => {
        setFlow(data);
        const initialValues: Record<string, any> = {};
        data.ui.nodes.forEach((node) => {
          if (node.type === "input") {
            const attrs = node.attributes as any;
            if (attrs.value && attrs.type !== "password") {
              initialValues[attrs.name] = attrs.value;
            }
          }
        });
        setValues((prev) => ({ ...initialValues, ...prev }));
      });
    } else {
      const returnTo = searchParams.get("return_to");
      const loginChallenge = searchParams.get("login_challenge");
      
      ory
        .createBrowserLoginFlow({
          refresh: true,
          returnTo: returnTo || undefined,
        })
        .then(({ data }) => {
          let nextUrl = `/auth/login?flow=${data.id}`;
          if (returnTo) nextUrl += `&return_to=${encodeURIComponent(returnTo)}`;
          if (loginChallenge) nextUrl += `&login_challenge=${encodeURIComponent(loginChallenge)}`;
          router.replace(nextUrl);
        })
        .catch((err: AxiosError) => {
          setError("Infrastructure connection failed");
        });
    }
  }, [flowId, router]); // Only track flowId and router

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flow) return;
    setLoading(true);

    ory
      .updateLoginFlow({
        flow: flow.id,
        updateLoginFlowBody: {
          method: "password",
          ...values,
        } as UpdateLoginFlowBody,
      })
      .then(async ({ data: loginResponse }) => {
        const loginChallenge = searchParams.get("login_challenge");
        
        if (loginChallenge) {
          try {
            const res = await api.post("/api/oauth2/login/accept", {
              challenge: loginChallenge,
              subject: loginResponse.session?.identity?.id
            });
            if (res.data.redirect_to) {
              window.location.href = res.data.redirect_to;
              return;
            }
          } catch (e) {
            setError("Authz bridge failure");
            setLoading(false);
            return;
          }
        }
        
        const returnTo = searchParams.get("return_to");
        window.location.href = returnTo || "/dashboard/documents";
      })
      .catch((err: AxiosError) => {
        setLoading(false);
        if (err.response?.status === 400) {
          setFlow(err.response.data as LoginFlow);
          return;
        }
        setError("Invalid identity credentials");
      });
  };

  if (!flow) return <div className="flex justify-center items-center min-h-screen font-black text-slate-300 animate-pulse italic uppercase tracking-widest text-xs">Synchronizing_Identity...</div>;

  return (
    <AuthLayout title="Access Control" subtitle="Identity Verification Protocol Required">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 text-red-600 text-[10px] font-black uppercase rounded-xl flex items-center gap-2 animate-bounce">
          <div className="bg-red-600 text-white p-1 rounded-sm">!</div> {error}
        </div>
      )}

      <AuthForm 
        nodes={flow.ui.nodes} 
        messages={flow.ui.messages}
        values={values} 
        onChange={(name, val) => setValues({...values, [name]: val})}
        onSubmit={onSubmit}
        submitLabel="Authorize Access"
        isLoading={loading}
      />

      <div className="mt-10 border-t-2 border-slate-100 pt-6 space-y-4">
        <Link href="/auth/recovery" className="block text-center text-[10px] font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest">
            Forgot_Identity_Password?
        </Link>
        <Link href="/auth/registration" className="block text-center p-4 border-2 border-slate-900 rounded-xl font-black text-[10px] hover:bg-slate-900 hover:text-white transition-all uppercase tracking-widest">
            Register_New_Identity
        </Link>
      </div>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen font-black text-slate-400 italic">Initializing_Login_Node...</div>}>
      <LoginContent />
    </Suspense>
  );
}
