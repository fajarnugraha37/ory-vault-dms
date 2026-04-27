"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import useSWR, { KeyedMutator } from "swr";
import { fetcher, api } from "@/lib/api";
import { toast } from "sonner";

interface Node {
  id: string;
  name: string;
  type: 'folder' | 'file';
  parent_id: string | null;
  owner_id: string;
  user_permission?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  mime_type?: string;
  size_bytes?: number;
  version?: number;
  public_link_token?: string | null;
  is_deleted: boolean;
}

interface VaultContextType {
  // State
  nodes: Node[] | undefined;
  isLoading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentFolder: string | null;
  folderHistory: { id: string | null; name: string }[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  pageSize: number;
  offset: number;
  me: any;

  // Setters
  setSortBy: (field: string) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setPageSize: (size: number) => void;
  setOffset: (offset: number) => void;
  
  // Actions
  navigateTo: (id: string | null, name: string, isBack?: boolean) => void;
  mutateNodes: KeyedMutator<Node[]>;
  handleAction: (name: string, fn: () => Promise<any>) => Promise<void>;
  toggleSort: (field: any) => void;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider = ({ children }: { children: ReactNode }) => {
  const [activeTab, setActiveTab] = useState("owned");
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "Root" }]);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState(20);
  const [offset, setOffset] = useState(0);

  const { data: me } = useSWR('/api/me', fetcher);
  
  // Detect if we are in Trash page
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isTrashPage = pathname.includes('/dashboard/trash');

  // Dynamic URL construction
  const nodesUrl = `/api/nodes?limit=${pageSize}&offset=${offset}&sort_by=${sortBy}&sort_order=${sortOrder}${currentFolder ? `&parent_id=${currentFolder}` : ''}${isTrashPage ? '&show_deleted=true' : ''}`;
  const { data: nodes, mutate: mutateNodes, isLoading } = useSWR<Node[]>(nodesUrl, fetcher);

  useEffect(() => {
    setOffset(0);
    mutateNodes();
  }, [currentFolder, activeTab, sortBy, sortOrder, pageSize]);

  const navigateTo = (id: string | null, name: string, isBack = false) => {
    setCurrentFolder(id);
    if (isBack) {
      const idx = folderHistory.findIndex(h => h.id === id);
      setFolderHistory(idx !== -1 ? folderHistory.slice(0, idx + 1) : [{ id: null, name: "Root" }]);
    } else {
      setFolderHistory([...folderHistory, { id, name }]);
    }
  };

  const handleAction = async (name: string, fn: () => Promise<any>) => {
    try {
      await fn();
      toast.success(`${name} successful`);
      mutateNodes();
    } catch (err: any) {
      toast.error(err.response?.data?.error || `Failed: ${name}`);
    }
  };

  const toggleSort = (field: any) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <VaultContext.Provider value={{
      nodes, isLoading, activeTab, setActiveTab, currentFolder, folderHistory,
      sortBy, sortOrder, pageSize, offset, me,
      setSortBy, setSortOrder, setPageSize, setOffset,
      navigateTo, mutateNodes, handleAction, toggleSort
    }}>
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (context === undefined) throw new Error("useVault must be used within a VaultProvider");
  return context;
};
