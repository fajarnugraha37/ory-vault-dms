"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Shield, 
  Folder, 
  Settings, 
  LogOut, 
  User, 
  LayoutDashboard, 
  Lock,
  Layers,
  Terminal
} from "lucide-react";
import useSWR from "swr";
import { fetcher, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: me } = useSWR("/api/me", fetcher);

  const navItems = [
    { label: "Vault", href: "/dashboard/documents", icon: Folder },
    { label: "Apps", href: "/dashboard/apps", icon: Layers },
    { label: "Trash", href: "/dashboard/trash", icon: Terminal },
  ];

  if (me?.roles?.includes("admin")) {
    navItems.push({ label: "Identity", href: "/dashboard/admin/users", icon: Shield });
  }

  const handleLogout = async () => {
    try {
      const { data } = await api.get("/auth/logout/browser");
      window.location.href = data.logout_url;
    } catch (e) {
      window.location.href = "/auth/login";
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-background-base/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-2 bg-accent/10 rounded-xl border border-accent/20 group-hover:border-accent/40 transition-colors">
              <Shield className="text-accent" size={20} />
            </div>
            <span className="font-semibold tracking-tight text-white/90 group-hover:text-white transition-colors">
              ORY_VAULT
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative px-4 py-2 text-sm font-medium transition-colors rounded-lg",
                    isActive 
                      ? "text-white bg-white/[0.05]" 
                      : "text-foreground-muted hover:text-foreground hover:bg-white/[0.03]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <item.icon size={16} className={cn(isActive ? "text-accent" : "text-foreground-muted")} />
                    {item.label}
                  </div>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 bg-white/[0.05] rounded-lg -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-full">
            <div className="w-5 h-5 bg-gradient-to-tr from-accent to-indigo-400 rounded-full" />
            <span className="text-xs font-medium text-foreground-muted">
              {me?.email?.split('@')[0] || "SUBJECT_00"}
            </span>
          </div>
          
          <button
            onClick={handleLogout}
            className="p-2 text-foreground-muted hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
            title="Terminate Session"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
}
