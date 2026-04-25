"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ory } from "@/lib/ory";
import { SettingsFlow, UpdateSettingsFlowBody } from "@ory/client";
import { AxiosError } from "axios";

function SettingsForm() {
  const [flow, setFlow] = useState<SettingsFlow | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const flowId = searchParams.get("flow");

  useEffect(() => {
    if (!flowId) {
      ory.createBrowserSettingsFlow()
        .then(({ data }) => setFlow(data))
        .catch(handleError);
      return;
    }

    ory.getSettingsFlow({ id: flowId })
      .then(({ data }) => setFlow(data))
      .catch(handleError);
  }, [flowId]);

  const handleError = (err: AxiosError) => {
    if (err.response?.status === 401) {
      router.push("/auth/login?message=Please login to access settings.");
      return;
    }
    if (err.response?.status === 410) {
      ory.createBrowserSettingsFlow().then(({ data }) => setFlow(data));
      return;
    }
    console.error(err);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!flow) return;

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    const submitter = (e.nativeEvent as any).submitter;

    const body: UpdateSettingsFlowBody = {
      csrf_token: data.csrf_token as string,
      method: submitter.value,
    } as any;

    if (body.method === "password") {
        (body as any).password = data.password;
    } else if (body.method === "profile") {
        (body as any).traits = {
            email: data["traits.email"],
            first_name: data["traits.first_name"],
            last_name: data["traits.last_name"],
            division: data["traits.division"],
        };
    }

    try {
      await ory.updateSettingsFlow({
        flow: flow.id,
        updateSettingsFlowBody: body,
      });
      setMessage("Settings updated successfully!");
      ory.createBrowserSettingsFlow().then(({ data }) => setFlow(data));
    } catch (err: any) {
      if (err.response?.status === 400) {
        setFlow(err.response.data);
        return;
      }
      handleError(err);
    }
  };

  if (!flow) return <div className="text-center p-8 text-slate-500">Initializing settings flow...</div>;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="text-center">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Account Settings
          </h2>
          <p className="mt-2 text-sm text-slate-600 font-medium">
            Personalize your profile and secure your account
          </p>
        </header>

        {message && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 text-green-800 text-sm font-medium rounded-r-lg shadow-sm">
            {message}
          </div>
        )}

        <div className="space-y-6">
          {["profile", "password"].map((group) => {
            const nodes = flow.ui.nodes.filter((n) => n.group === group || n.group === "default");
            if (nodes.length <= 1) return null;

            return (
              <div key={group} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-xl font-bold text-slate-900 mb-6 capitalize flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                  {group} Details
                </h3>
                <form onSubmit={onSubmit} className="space-y-5">
                  {nodes.map((node, i) => {
                    const attr = node.attributes as any;
                    if (node.type === "input") {
                      if (attr.type === "hidden") {
                        return <input key={i} type="hidden" name={attr.name} value={attr.value} />;
                      }
                      if (attr.type === "submit") {
                        return (
                          <div key={i} className="pt-4">
                            <button
                              name={attr.name}
                              value={attr.value}
                              type="submit"
                              className="w-full sm:w-auto bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95"
                            >
                              Save {group} Changes
                            </button>
                          </div>
                        );
                      }
                      return (
                        <div key={i}>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                            {node.meta.label?.text || attr.name}
                          </label>
                          <input
                            name={attr.name}
                            type={attr.type}
                            defaultValue={attr.value}
                            required={attr.required}
                            className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white transition-all outline-none text-slate-900 font-medium"
                            placeholder={`Enter ${node.meta.label?.text?.toLowerCase() || attr.name}`}
                          />
                          {node.messages.map((m, mi) => (
                            <p key={mi} className={`mt-2 text-xs font-semibold ${m.type === "error" ? "text-red-500" : "text-slate-400"}`}>
                              {m.text}
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })}
                </form>
              </div>
            );
          })}
        </div>

        <div className="text-center pt-4">
          <a href="/" className="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest flex items-center justify-center gap-2">
            &larr; Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="text-center p-8 text-slate-400 font-medium">Loading settings...</div>}>
      <SettingsForm />
    </Suspense>
  );
}
