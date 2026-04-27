"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ory } from "@/lib/ory";
import { SettingsFlow, UpdateSettingsFlowBody } from "@ory/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthForm } from "@/components/auth/AuthForm";
import { Navbar } from "@/components/layout/Navbar";
import { VaultButton } from "@/components/shared/VaultPrimitives";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

function SettingsContent() {
  const [flow, setFlow] = useState<SettingsFlow | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    ory
      .createBrowserSettingsFlow()
      .then(({ data }) => {
        setFlow(data);
        const initialValues: Record<string, any> = {};
        // Map current traits to form values
        data.ui.nodes.forEach((node) => {
          if (node.type === "input") {
            const attrs = node.attributes as any;
            if (attrs.value && attrs.type !== "password") {
              initialValues[attrs.name] = attrs.value;
            }
          }
        });
        setValues(initialValues);
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          router.push("/auth/login");
          return;
        }
        toast.error("Security infrastructure unreachable");
      });
  }, [router]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flow) return;
    setLoading(true);

    // Filter values to only send what's in the UI nodes to avoid Ory schema errors
    const flowValues: Record<string, any> = {};
    flow.ui.nodes.forEach(node => {
        if (node.type === 'input') {
            const name = (node.attributes as any).name;
            if (values[name] !== undefined) flowValues[name] = values[name];
        }
    });

    ory
      .updateSettingsFlow({
        flow: flow.id,
        updateSettingsFlowBody: {
          method: "password", // or 'profile' depending on the node
          ...flowValues,
        } as UpdateSettingsFlowBody,
      })
      .then(({ data }) => {
        setFlow(data);
        toast.success("Identity nodes synchronized successfully");
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        if (err.response?.status === 400) {
          setFlow(err.response.data as SettingsFlow);
          return;
        }
        toast.error("Protocol update failed");
      });
  };

  if (!flow) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black text-slate-300 animate-pulse uppercase italic">Syncing_Identity_Nodes...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />
      <div className="pt-10 pb-20">
        <AuthLayout title="Identity Setup" subtitle="Manage your security traits and access credentials">
            <AuthForm 
                nodes={flow.ui.nodes} 
                messages={flow.ui.messages}
                values={values} 
                onChange={(name, val) => setValues({...values, [name]: val})}
                onSubmit={onSubmit}
                submitLabel="Update Identity"
                isLoading={loading}
            />
            <div className="mt-8 pt-6 border-t-2 border-slate-50">
                <Link href="/dashboard/documents" className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">
                    <ArrowLeft size={12} /> Abort_Identity_Patch
                </Link>
            </div>
        </AuthLayout>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Initializing_Settings_Node...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
