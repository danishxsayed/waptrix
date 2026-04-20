"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface TenantData {
  id: string;
  name: string;
  plan: string;
  messages_used: number;
  messages_limit: number;
  company: string;
}

interface TenantContextProps {
  tenant: TenantData | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const TenantContext = createContext<TenantContextProps>({
  tenant: null,
  loading: true,
  refresh: async () => {},
});

export const useTenant = () => useContext(TenantContext);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTenantData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from("tenants")
          .select("id, name, plan, messages_used, messages_limit, company")
          .eq("id", user.id)
          .single();

        if (data && !error) {
          setTenant(data);
        }
      }
    } catch (err) {
      console.error("Error fetching tenant data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenantData();
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, loading, refresh: fetchTenantData }}>
      {children}
    </TenantContext.Provider>
  );
}
