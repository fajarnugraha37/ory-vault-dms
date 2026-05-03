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
  Terminal,
  Menu
} from "lucide-react";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { ory } from "@/lib/ory";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: me, isLoading } = useSWR("/api/me", fetcher);

  const navItems = [
    { label: "Vault", href: "/dashboard/documents", icon: Folder },
    { label: "Apps", href: "/dashboard/apps", icon: Layers },
    { label: "Trash", href: "/dashboard/trash", icon: Terminal },
  ];

  if (isLoading) {
    navItems.push({ label: "Loading", href: "#", icon: Shield, loading: true } as any);
  } else if (me?.roles?.includes("admin")) {
    navItems.push({ label: "Identity", href: "/dashboard/admin/users", icon: Shield });
  }

  const handleLogout = async () => {
    try {
      const { data } = await ory.createBrowserLogoutFlow();
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
            {navItems.map((item: any) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "relative px-4 py-2 text-sm font-medium transition-colors rounded-lg",
                    isActive 
                      ? "text-white bg-white/[0.05]" 
                      : "text-foreground-muted hover:text-foreground hover:bg-white/[0.03]",
                    item.loading && "pointer-events-none opacity-50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {item.loading ? (
                      <div className="w-4 h-4 rounded-full bg-white/20 animate-pulse" />
                    ) : (
                      <item.icon size={16} className={cn(isActive ? "text-accent" : "text-foreground-muted")} />
                    )}
                    {item.loading ? (
                      <div className="w-12 h-4 rounded bg-white/20 animate-pulse" />
                    ) : (
                      item.label
                    )}
                  </div>
                  {isActive && !item.loading && (
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-full hover:bg-white/[0.06] transition-colors">
                <div className="w-5 h-5 bg-gradient-to-tr from-accent to-indigo-400 rounded-full" />
                <span className="text-xs font-medium text-foreground-muted">
                  {me?.traits?.email || me?.email?.split('@')[0] || "SUBJECT_00"}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-background-elevated border-white/[0.08] p-2 backdrop-blur-3xl">
              <div className="px-3 py-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-tr from-accent to-indigo-400 rounded-xl" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {me?.traits?.name?.first} {me?.traits?.name?.last}
                    </div>
                    <div className="text-[10px] font-mono text-foreground-muted truncate uppercase tracking-tighter">
                      {me?.traits?.email || me?.email}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="p-2 bg-white/[0.03] border border-white/[0.06] rounded-lg">
                    <div className="text-[8px] uppercase font-mono text-foreground-subtle mb-0.5">Division</div>
                    <div className="text-[10px] font-medium text-accent truncate uppercase">{me?.traits?.division || "N/A"}</div>
                  </div>
                  <div className="p-2 bg-white/[0.03] border border-white/[0.06] rounded-lg">
                    <div className="text-[8px] uppercase font-mono text-foreground-subtle mb-0.5">Role</div>
                    <div className="text-[10px] font-medium text-white truncate uppercase">{me?.roles?.[0] || "User"}</div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-white/[0.06] my-2" />
              
              <DropdownMenuItem onClick={handleLogout} className="h-11 rounded-lg text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer">
                <LogOut size={14} className="mr-2" />
                <span className="text-xs font-medium uppercase tracking-widest">Terminate_Session</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 text-foreground-muted hover:text-foreground transition-colors rounded-lg hover:bg-white/[0.03]">
                  <Menu size={20} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {navItems.map((item: any) => (
                  <DropdownMenuItem key={item.label} asChild>
                    <Link href={item.href} className="flex items-center w-full cursor-pointer">
                      <item.icon size={14} className="mr-2 text-foreground-muted" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
