"use client";

import React from "react";
import {
  FileText,
  Settings,
  ArrowLeft,
  Trash2,
  Shield,
  LogOut,
  LayoutGrid,
} from "lucide-react";
import { VaultButton } from "@/components/shared/VaultPrimitives";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ory } from "@/lib/ory";
import useSWR from "swr";
import { fetcher } from "@/lib/api";

interface NavbarProps {
  actions?: React.ReactNode;
}

export const Navbar = ({ actions }: NavbarProps) => {
  const pathname = usePathname();
  const { data: me } = useSWR("/api/me", fetcher);

  const getModuleInfo = () => {
    if (pathname.includes("/dashboard/apps"))
      return {
        title: "App_Forge",
        color: "text-indigo-600",
        icon: <Settings size={20} />,
      };
    if (pathname.includes("/dashboard/admin"))
      return {
        title: "Admin_Control",
        color: "text-slate-600",
        icon: <Shield size={20} />,
      };
    if (pathname.includes("/dashboard/trash"))
      return {
        title: "Recycle_Bin",
        color: "text-red-600",
        icon: <Trash2 size={20} />,
      };
    if (pathname === "/")
      return {
        title: "System_Hub",
        color: "text-blue-600",
        icon: <LayoutGrid size={20} />,
      };
    return {
      title: "Vault_Ops",
      color: "text-blue-600",
      icon: <FileText size={20} />,
    };
  };

  const onLogout = async () => {
    try {
      const { data } = await ory.createBrowserLogoutFlow();
      window.location.href = data.logout_url;
    } catch (e) {
      // Fallback if session already gone
      window.location.href = "/auth/login";
    }
  };

  const module = getModuleInfo();
  const isAdmin = me?.roles?.includes("admin");

  return (
    <nav className="bg-white border-b-4 border-slate-900 px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
      <Link href="/" className="flex items-center gap-3 group">
        <div className="bg-slate-900 text-white p-2 rounded-lg group-hover:scale-110 transition-transform">
          {module.icon}
        </div>
        <span className="font-black text-2xl tracking-tighter uppercase italic">
          {module.title} <span className="text-slate-300">DMS</span>
        </span>
      </Link>

      <div className="flex gap-4 items-center">
        {actions}

        {/* Home Link */}
        {pathname !== "/" && (
          <VaultButton
            variant="outline"
            size="sm"
            asChild
            className="text-[10px]"
          >
            <Link href="/">
              <LayoutGrid size={14} className="mr-2" /> HUB
            </Link>
          </VaultButton>
        )}

        {/* Admin Link - Conditional */}
        {isAdmin && !pathname.includes("/dashboard/admin") && (
          <VaultButton
            variant="outline"
            size="sm"
            asChild
            className="text-[10px] border-red-200 text-red-600 hover:bg-red-50"
          >
            <Link href="/dashboard/admin/users">
              <Shield size={14} className="mr-2" /> ADMIN
            </Link>
          </VaultButton>
        )}

        {/* Apps Link */}
        {!pathname.includes("/dashboard/apps") && (
          <VaultButton
            variant="outline"
            size="sm"
            asChild
            className="text-[10px]"
          >
            <Link href="/dashboard/apps">
              <Settings size={14} className="mr-2" /> APPS
            </Link>
          </VaultButton>
        )}

        {/* Back to Vault shortcut */}
        {pathname !== "/dashboard/documents" && pathname !== "/" && (
          <VaultButton
            variant="outline"
            size="sm"
            asChild
            className="text-[10px]"
          >
            <Link href="/dashboard/documents">
              <ArrowLeft size={14} className="mr-2" /> VAULT
            </Link>
          </VaultButton>
        )}

        <VaultButton
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-red-50 hover:text-red-600"
          onClick={onLogout}
        >
          <LogOut size={18} />
        </VaultButton>
      </div>
    </nav>
  );
};
