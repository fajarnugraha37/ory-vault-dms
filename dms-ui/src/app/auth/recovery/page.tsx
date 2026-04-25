"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ory } from "@/lib/ory";
import { RecoveryFlow, UpdateRecoveryFlowBody } from "@ory/client";
import { AxiosError } from "axios";

function RecoveryForm() {
  const [flow, setFlow] = useState<RecoveryFlow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const searchParams = useSearchParams();
  const flowId = searchParams.get("flow");

  useEffect(() => {
    if (!flowId) {
      ory.createBrowserRecoveryFlow()
        .then(({ data }) => setFlow(data))
        .catch(handleError);
      return;
    }

    ory.getRecoveryFlow({ id: flowId })
      .then(({ data }) => {
        console.log("RECOVERY_FLOW_DEBUG:", data);
        setFlow(data);
      })
      .catch(handleError);
  }, [flowId]);

  const handleError = (err: AxiosError) => {
    if (err.response?.status === 410 || err.response?.status === 403) {
      ory.createBrowserRecoveryFlow().then(({ data }) => setFlow(data));
      return;
    }
    setError("Failed to load recovery flow. Please try again.");
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!flow) return;

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    // Ambil button yang diklik untuk menentukan method
    const submitter = (e.nativeEvent as any).submitter;
    const method = submitter?.value || "link";

    const body: UpdateRecoveryFlowBody = {
        csrf_token: data.csrf_token as string,
        method: method,
        email: data.email as string,
    } as any;

    // Jika method adalah code, tambahkan field code
    if (method === "code") {
        (body as any).code = data.code;
    }

    try {
      await ory.updateRecoveryFlow({
        flow: flow.id,
        updateRecoveryFlowBody: body,
      });
      
      // Jika berhasil sampai sini tanpa error, berarti email terkirim
      setIsSubmitted(true);
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 400) {
        // Validation error (e.g. email not found or malformed)
        setFlow(err.response.data);
        return;
      }
      handleError(err);
    }
  };

  if (!flow) return <div className="text-center p-8 text-slate-500">Initializing...</div>;

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-xl border border-slate-100 text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h2>
          <p className="text-slate-600 mb-8 text-sm">
            If an account exists for that email, we've sent instructions to recover your password.
          </p>
          <a href="/auth/login" className="text-blue-600 font-bold hover:underline">
            Return to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
        <header className="text-center">
          <h2 className="text-3xl font-extrabold text-slate-900">Forgot Password?</h2>
          <p className="mt-2 text-sm text-slate-500">Enter your email and we'll send you a recovery link.</p>
        </header>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 text-red-700 text-xs font-medium rounded shadow-sm">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={onSubmit}>
          <div className="space-y-4">
            {flow.ui.nodes.map((node, index) => {
              const attr = node.attributes as any;
              if (node.type === "input") {
                if (attr.type === "hidden") {
                  return <input key={index} type="hidden" name={attr.name} value={attr.value} />;
                }
                
                if (attr.type === "submit") {
                  return (
                    <button
                      key={index}
                      name={attr.name}
                      value={attr.value}
                      type="submit"
                      className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 transition-all active:scale-95"
                    >
                      {node.meta.label?.text || "Send Link"}
                    </button>
                  );
                }

                return (
                  <div key={index}>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                      {node.meta.label?.text || attr.name}
                    </label>
                    <input
                      name={attr.name}
                      type={attr.type}
                      defaultValue={attr.value}
                      required={attr.required}
                      className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-slate-200 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 sm:text-sm transition-all"
                      placeholder={`e.g. john@example.com`}
                    />
                    {node.messages.map((m, i) => (
                      <p key={i} className={`mt-2 text-xs font-semibold ${m.type === "error" ? "text-red-500" : "text-slate-400"}`}>
                        {m.text}
                      </p>
                    ))}
                  </div>
                );
              }
              return null;
            })}
          </div>
        </form>

        <div className="text-center mt-6">
          <a href="/auth/login" className="text-sm font-bold text-blue-600 hover:text-blue-500 transition-colors">
            &larr; Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}

export default function RecoveryPage() {
  return (
    <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
      <RecoveryForm />
    </Suspense>
  );
}
