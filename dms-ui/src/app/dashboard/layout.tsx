"use client";

import { VaultProvider } from "@/context/VaultContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <VaultProvider>
      {children}
    </VaultProvider>
  );
}
