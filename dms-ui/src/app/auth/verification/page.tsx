"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ory } from "@/lib/ory";
import { VerificationFlow, UpdateVerificationFlowBody } from "@ory/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MailCheck, AlertCircle, ArrowRight } from "lucide-react";

function VerificationContent() {
  const [flow, setFlow] = useState<VerificationFlow | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const flowId = searchParams.get("flow");

  useEffect(() => {
    if (!flowId) {
      ory.createBrowserVerificationFlow()
        .then(({ data }) => setFlow(data))
        .catch(handleError);
      return;
    }

    ory.getVerificationFlow({ id: flowId })
      .then(({ data }) => setFlow(data))
      .catch(handleError);
  }, [flowId]);

  const handleError = (err: any) => {
    if (err.response?.status === 410 || err.response?.status === 403) {
      ory.createBrowserVerificationFlow().then(({ data }) => setFlow(data));
      return;
    }
    toast.error("Failed to load verification flow");
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!flow) return;

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    const submitter = (e.nativeEvent as any).submitter;

    const body: UpdateVerificationFlowBody = {
      csrf_token: data.csrf_token as string,
      method: submitter.value || "link",
      email: data.email as string,
    } as any;

    if (body.method === "code") {
        (body as any).code = data.code;
    }

    try {
      await ory.updateVerificationFlow({
        flow: flow.id,
        updateVerificationFlowBody: body,
      });
      toast.success("Identity verified successfully!");
      router.push("/auth/login?message=Email verified. You can now login.");
    } catch (err: any) {
      if (err.response?.status === 400) {
        setFlow(err.response.data);
        return;
      }
      handleError(err);
    }
  };

  if (!flow) return <div className="flex items-center justify-center min-h-screen font-mono text-xs">INIT_VERIFICATION_FLOW...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-2 border-slate-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-white border-b-2 border-slate-100 pb-8 pt-10 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-blue-100">
            <MailCheck size={32} />
          </div>
          <CardTitle className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Verify_Identity</CardTitle>
          <CardDescription className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
            Confirm your email address
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={onSubmit} className="space-y-6">
            {flow.ui.nodes.map((node, i) => {
              const attr = node.attributes as any;
              if (node.type === "input") {
                if (attr.type === "hidden") {
                  return <input key={i} type="hidden" name={attr.name} value={attr.value} />;
                }
                if (attr.type === "submit") {
                  return (
                    <Button key={i} name={attr.name} value={attr.value} type="submit" className="w-full bg-slate-900 hover:bg-blue-600 text-white font-black py-7 rounded-2xl text-sm uppercase tracking-[0.2em] transition-all active:translate-y-1 shadow-lg">
                      {node.meta.label?.text || "Verify"} <ArrowRight size={16} className="ml-2"/>
                    </Button>
                  );
                }
                return (
                  <div key={i} className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      {node.meta.label?.text || attr.name}
                    </Label>
                    <Input 
                      name={attr.name} 
                      type={attr.type} 
                      defaultValue={attr.value} 
                      required={attr.required}
                      className="rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white h-12 font-bold"
                    />
                    {node.messages.map((m, mi) => (
                      <p key={mi} className={`text-[10px] font-bold ${m.type === "error" ? "text-red-500" : "text-blue-500"}`}>{m.text}</p>
                    ))}
                  </div>
                );
              }
              return null;
            })}
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
             <a href="/auth/login" className="text-[10px] font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">
               Back to Login
             </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerificationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen font-mono">BOOTING_VERIFICATION_UI...</div>}>
      <VerificationContent />
    </Suspense>
  );
}
