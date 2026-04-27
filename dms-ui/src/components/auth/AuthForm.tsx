"use client";

import React, { useEffect } from "react";
import { UiNode } from "@ory/client";
import { VaultButton } from "@/components/shared/VaultPrimitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AuthFormProps {
  nodes: UiNode[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  isLoading?: boolean;
  messages?: any[];
}

export function AuthForm({ nodes, values, onChange, onSubmit, submitLabel, isLoading, messages }: AuthFormProps) {
  // CRITICAL: Auto-inject CSRF and other hidden values from Ory nodes
  useEffect(() => {
    nodes.forEach((node) => {
      if (node.type === "input") {
        const attrs = node.attributes as any;
        if (attrs.type === "hidden" && attrs.value && !values[attrs.name]) {
          onChange(attrs.name, attrs.value);
        }
      }
    });
  }, [nodes]);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {messages?.map((msg, i) => (
        <div key={i} className={cn(
          "p-3 rounded-lg text-xs font-medium border",
          msg.type === "error" ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-accent/10 border-accent/20 text-accent-bright"
        )}>
          {msg.text}
        </div>
      ))}

      {nodes.map((node, i) => {
        if (node.type !== "input") return null;
        const attrs = node.attributes as any;
        if (attrs.type === "hidden") return null;

        const nodeMessages = node.messages?.map(m => m.text).join(". ");

        return (
          <div key={i} className="space-y-1.5">
            <Label htmlFor={attrs.name} className="text-[10px] uppercase font-mono text-foreground-subtle ml-1">
              {node.meta?.label?.text || attrs.name}
            </Label>
            <Input
              id={attrs.name}
              name={attrs.name}
              type={attrs.type}
              value={values[attrs.name] || ""}
              onChange={(e) => onChange(attrs.name, e.target.value)}
              required={attrs.required}
              disabled={isLoading}
              placeholder={node.meta?.label?.text}
              className={cn(
                  "bg-white/[0.03] border-white/[0.06] h-12 transition-all focus:border-accent focus:ring-1 focus:ring-accent/50",
                  nodeMessages && "border-red-500/50"
              )}
            />
            {nodeMessages && (
              <p className="text-[10px] text-red-400 font-medium ml-1">{nodeMessages}</p>
            )}
          </div>
        );
      })}

      <VaultButton type="submit" className="w-full h-12 mt-4" isLoading={isLoading}>
        {submitLabel.toUpperCase()}
      </VaultButton>
    </form>
  );
}
