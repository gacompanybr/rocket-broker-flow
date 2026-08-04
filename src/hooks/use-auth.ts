import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "owner" | "broker";

type AuthState = {
  user: User | null;
  role: Role | null;
  brokerIds: string[];
  loading: boolean;
  isAdmin: boolean;
  /** Admin da agência ou dono da imobiliária: acesso a Configurações e Admin. */
  isStaff: boolean;
};

export const AuthContext = createContext<AuthState>({
  user: null,
  role: null,
  brokerIds: [],
  loading: true,
  isAdmin: false,
  isStaff: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useAuthState(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [brokerIds, setBrokerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadMeta = async (uid: string | undefined) => {
      if (!uid) {
        setRole(null);
        setBrokerIds([]);
        return;
      }
      const [{ data: roles }, { data: brokers }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("brokers").select("id").eq("profile_id", uid),
      ]);
      if (!active) return;
      const list = (roles ?? []).map((r) => r.role as Role);
      setRole(
        list.includes("admin")
          ? "admin"
          : list.includes("owner")
            ? "owner"
            : list.includes("broker")
              ? "broker"
              : null,
      );
      setBrokerIds((brokers ?? []).map((b) => b.id));
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      void loadMeta(session?.user?.id);
    });

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      await loadMeta(data.session?.user?.id);
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return useMemo(
    () => ({
      user,
      role,
      brokerIds,
      loading,
      isAdmin: role === "admin",
      isStaff: role === "admin" || role === "owner",
    }),
    [user, role, brokerIds, loading],
  );
}
