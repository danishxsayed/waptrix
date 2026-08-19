"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface TenantData {
  id: string;
  name: string;
  email?: string;
  plan: string;
  messages_used: number;
  messages_limit: number;
  company: string;
  plan_expires_at?: string | null;
  trial_ends_at?: string | null;
}

type UserRole = 'owner' | 'admin' | 'agent';

interface TenantContextProps {
  tenant: TenantData | null;
  role: UserRole;
  userId: string | null;
  agentName: string | null;
  isStaff: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const TenantContext = createContext<TenantContextProps>({
  tenant: null,
  role: 'owner',
  userId: null,
  agentName: null,
  isStaff: false,
  loading: true,
  refresh: async () => {},
});

export const useTenant = () => useContext(TenantContext);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant]       = useState<TenantData | null>(null);
  const [role, setRole]           = useState<UserRole>('owner');
  const [userId, setUserId]       = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string | null>(null);
  const [isStaff, setIsStaff]     = useState(false);
  const [loading, setLoading]     = useState(true);

  const fetchTenantData = async (bust = false) => {
    try {
      const url = bust ? `/api/me?t=${Date.now()}` : '/api/me';
      const res = await fetch(url, bust ? { cache: 'no-store' } : undefined);
      if (!res.ok) return;
      const data = await res.json();
      if (data.tenant)    setTenant(data.tenant);
      if (data.role)      setRole(data.role);
      if (data.userId)    setUserId(data.userId);
      if (data.agentName) setAgentName(data.agentName);
      setIsStaff(!!data.isStaff);
    } catch (err) {
      console.error('Error fetching tenant data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantData();
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, role, userId, agentName, isStaff, loading, refresh: () => fetchTenantData(true) }}>
      {children}
    </TenantContext.Provider>
  );
}
