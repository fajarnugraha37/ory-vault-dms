"use client";

import React, { useRef } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface VaultCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glass" | "accent";
  spotlight?: boolean;
}

export function VaultCard({ 
  children, 
  className, 
  variant = "default",
  spotlight = true 
}: VaultCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!spotlight || !cardRef.current) return;
    const { left, top } = cardRef.current.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;
    cardRef.current.style.setProperty("--x", `${x}px`);
    cardRef.current.style.setProperty("--y", `${y}px`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={onMouseMove}
      className={cn(
        "group relative rounded-2xl border border-white/[0.06] bg-white/[0.03] transition-colors duration-300",
        "shadow-linear-card overflow-hidden",
        variant === "glass" && "backdrop-blur-xl bg-white/[0.05]",
        variant === "accent" && "border-accent/20 bg-accent/[0.02]",
        className
      )}
    >
      {/* Ultra-High Performance Spotlight (CSS Only) */}
      {spotlight && (
        <div 
            className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-300 opacity-0 group-hover:opacity-100"
            style={{
                background: `radial-gradient(400px circle at var(--x, 0) var(--y, 0), rgba(94, 106, 210, 0.1), transparent 80%)`
            }}
        />
      )}
      
      {/* Top Edge Highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="relative z-10 p-6">
        {children}
      </div>
    </div>
  );
}

interface VaultButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export function VaultButton({
  children,
  className,
  variant = "primary",
  size = "md",
  isLoading,
  ...props
}: VaultButtonProps) {
  const variants = {
    primary: "bg-accent text-white shadow-[0_0_20px_rgba(94,106,210,0.2),inset_0_1px_0_0_rgba(255,255,255,0.2)] hover:bg-accent-bright",
    secondary: "bg-white/[0.05] text-foreground border border-white/[0.06] hover:bg-white/[0.08]",
    ghost: "bg-transparent text-foreground-muted hover:bg-white/[0.05] hover:text-foreground",
    destructive: "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-4 text-base font-semibold",
    icon: "p-2.5",
  };

  return (
    <button
      className={cn(
        "relative rounded-lg font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {variant === "primary" && (
        <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shine_1.5s_ease-in-out_infinite]" />
      )}
      
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : children}
    </button>
  );
}

export function VaultHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="space-y-2 mb-10 text-left">
      <motion.h1 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="text-4xl md:text-5xl font-semibold tracking-tight text-gradient"
      >
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-foreground-muted max-w-2xl font-normal leading-relaxed"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}

export function VaultBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn(
      "px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium tracking-wider uppercase border border-accent/30 bg-accent/5 text-accent-bright",
      className
    )}>
      {children}
    </span>
  );
}
