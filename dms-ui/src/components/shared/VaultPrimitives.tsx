import React from "react";
import { cn } from "@/lib/utils";
import { Button, ButtonProps } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// --- VaultCard ---
interface VaultCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "blue" | "indigo" | "emerald" | "slate" | "destructive";
}

export const VaultCard = ({ className, variant = "slate", children, ...props }: VaultCardProps) => {
  const shadowColors = {
    blue: "shadow-[12px_12px_0px_0px_rgba(59,130,246,1)]",
    indigo: "shadow-[12px_12px_0px_0px_rgba(79,70,229,1)]",
    emerald: "shadow-[12px_12px_0px_0px_rgba(16,185,129,1)]",
    slate: "shadow-[12px_12px_0px_0px_rgba(15,23,42,1)]",
    destructive: "shadow-[12px_12px_0px_0px_rgba(239,68,68,1)]",
  };

  return (
    <Card 
      className={cn(
        "border-4 border-slate-900 rounded-[2.5rem] bg-white transition-all",
        shadowColors[variant],
        className
      )} 
      {...props}
    >
      {children}
    </Card>
  );
};

// --- VaultButton ---
interface VaultButtonProps extends ButtonProps {
  neon?: boolean;
}

export const VaultButton = React.forwardRef<HTMLButtonElement, VaultButtonProps>(
  ({ className, variant, size, neon, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          "font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 border-2 border-transparent",
          variant === "outline" && "border-slate-900 border-2 hover:bg-slate-900 hover:text-white",
          variant === "default" && "shadow-lg bg-slate-900 text-white",
          className
        )}
        {...props}
      />
    );
  }
);
VaultButton.displayName = "VaultButton";

// --- VaultBadge ---
export const VaultBadge = ({ className, ...props }: React.ComponentProps<typeof Badge>) => (
  <Badge 
    className={cn("font-mono text-[9px] border-2 uppercase px-2 py-0.5 rounded-lg", className)} 
    variant="outline" 
    {...props} 
  />
);

// --- VaultSectionHeader ---
export const VaultHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <header className="space-y-1 mb-8">
    <h1 className="text-4xl md:text-5xl font-black tracking-tighter italic uppercase text-slate-900">
      {title.replace(" ", "_")}
    </h1>
    {subtitle && <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px] ml-1">{subtitle}</p>}
  </header>
);
