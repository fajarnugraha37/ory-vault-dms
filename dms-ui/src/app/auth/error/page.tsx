"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ory } from "@/lib/ory";
import { FlowError } from "@ory/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";

function ErrorContent() {
  const [error, setError] = useState<FlowError | null>(null);
  const searchParams = useSearchParams();
  const errorId = searchParams.get("id");

  useEffect(() => {
    if (errorId) {
      ory.getFlowError({ id: errorId })
        .then(({ data }) => setError(data))
        .catch((err) => console.error("Failed to fetch error details:", err));
    }
  }, [errorId]);

  if (!error) return <div className="flex items-center justify-center min-h-screen font-mono text-xs">LOADING_ERROR_DETAILS...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-2 border-red-100 shadow-xl rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-red-50 pb-8 pt-10 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border-2 border-red-100">
            <AlertCircle className="text-red-500" size={32} />
          </div>
          <CardTitle className="text-2xl font-black text-red-900 tracking-tight uppercase">System_Error</CardTitle>
          <CardDescription className="text-red-600 font-bold text-xs uppercase tracking-widest mt-1">
            Flow Execution Interrupted
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 text-white font-mono text-xs space-y-4 shadow-inner">
            <div>
              <Label className="text-[10px] text-slate-500 font-black uppercase mb-1 block">Error_Code</Label>
              <div className="text-red-400 font-bold">{(error.error as any)?.code || "N/A"}</div>
            </div>
            <div>
              <Label className="text-[10px] text-slate-500 font-black uppercase mb-1 block">Status</Label>
              <div className="text-blue-400 font-bold">{(error.error as any)?.status || "N/A"}</div>
            </div>
            <div>
              <Label className="text-[10px] text-slate-500 font-black uppercase mb-1 block">Message</Label>
              <div className="leading-relaxed">{(error.error as any)?.message || "An unexpected error occurred during the identity flow."}</div>
            </div>
            {(error.error as any)?.reason && (
              <div>
                <Label className="text-[10px] text-slate-500 font-black uppercase mb-1 block">Reason</Label>
                <div className="italic text-slate-400">{(error.error as any).reason}</div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-6 rounded-xl text-xs uppercase tracking-widest" asChild>
              <a href="/auth/login">Return to Login</a>
            </Button>
            <Button variant="ghost" className="w-full text-slate-400 font-bold text-[10px] uppercase tracking-widest" asChild>
              <a href="/" className="flex items-center justify-center gap-2">
                <ArrowLeft size={12} /> Dashboard Home
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Simple Label component since we are using it
function Label({ children, className }: { children: React.ReactNode, className?: string }) {
    return <span className={className}>{children}</span>;
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen font-mono">BOOTING_ERROR_UI...</div>}>
      <ErrorContent />
    </Suspense>
  );
}
