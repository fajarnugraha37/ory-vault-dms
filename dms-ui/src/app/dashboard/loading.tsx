import React from "react";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-16 h-16 border-8 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-6" />
      <p className="font-black text-xs text-slate-400 uppercase tracking-[0.5em] italic animate-pulse">
        Initializing_Vault_Node...
      </p>
    </div>
  );
}
