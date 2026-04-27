"use client";

import React from "react";
import { UiNode, UiText } from "@ory/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VaultButton } from "@/components/shared/VaultPrimitives";
import { AlertCircle } from "lucide-react";

interface AuthFormProps {
  nodes: UiNode[];
  messages?: UiText[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  isLoading?: boolean;
}

export const AuthForm = ({ nodes, messages, values, onChange, onSubmit, submitLabel, isLoading }: AuthFormProps) => {
  // Automatically sync hidden fields (like csrf_token) to values state
  React.useEffect(() => {
    nodes.forEach(node => {
      if (node.type === "input") {
        const attr = node.attributes as any;
        if (attr.type === "hidden" && attr.value && !values[attr.name]) {
          onChange(attr.name, attr.value);
        }
      }
    });
  }, [nodes]);

  return (
    <div className="space-y-6">
      {/* Global Flow Messages (e.g. Invalid Credentials) */}
      {messages?.map((msg, i) => (
        <div key={i} className="p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
           <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
           <p className="text-red-600 text-[10px] font-black uppercase tracking-tight leading-relaxed">
             {msg.text}
           </p>
        </div>
      ))}

      <form onSubmit={onSubmit} className="space-y-6">
        {nodes.map((node, index) => {
          if (node.type !== "input") return null;
          
          const attributes = node.attributes as any;
          const name = attributes.name;

          if (attributes.type === "submit") {
            return (
              <VaultButton
                key={index}
                type="submit"
                name={name}
                value={attributes.value}
                disabled={isLoading}
                className="w-full py-8 text-sm bg-slate-900 text-white shadow-xl hover:bg-slate-800 mt-2"
              >
                {isLoading ? "PROCESSING..." : submitLabel.toUpperCase()}
              </VaultButton>
            );
          }

          if (attributes.type === "hidden") {
            return <input key={index} type="hidden" name={name} value={attributes.value} />;
          }

          return (
            <div key={index} className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                {node.meta.label?.text || name}
              </Label>
              <Input
                type={attributes.type}
                name={name}
                value={values[name] || attributes.value || ""}
                onChange={(e) => onChange(name, e.target.value)}
                className="rounded-xl border-2 font-bold h-14 focus:ring-slate-900 bg-slate-50 focus:bg-white transition-colors"
                required={attributes.required}
              />
              {node.messages.map((msg, i) => (
                <p key={i} className="text-red-500 text-[9px] font-black uppercase tracking-tighter mt-1 ml-1">
                  {msg.text}
                </p>
              ))}
            </div>
          );
        })}
      </form>
    </div>
  );
};
