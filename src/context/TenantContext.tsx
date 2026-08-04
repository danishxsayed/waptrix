"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface TenantData {
  id: string;
  name: string;
  plan: string;
  messages_used: number;
  messages_limit: number;
  company: string;
}

type UserRole = 'owner' | 'admin' | 'agent';

interface TenantContextProps {
  tenant: TenantData | null;
  role: UserRole;
  isStaff: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const TenantContext = createContext<TenantContextProps>({
  tenant: null,
  role: 'owner',
  isStaff: false,
  loading: true,
  refresh: async () => {},
});

export const useTenant = () => useContext(TenantContext);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant]   = useState<TenantData | null>(null);
  const [role, setRole]       = useState<UserRole>('owner');
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTenantData = async () => {
    try {
      const res = await fetch('/api/me');
      if (!res.ok) return;
      const data = await res.json();
      if (data.tenant) setTenant(data.tenant);
      if (data.role)   setRole(data.role);
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
    <TenantContext.Provider value={{ tenant, role, isStaff, loading, refresh: fetchTenantData }}>
      {children}
    </TenantContext.Provider>
  );
}
