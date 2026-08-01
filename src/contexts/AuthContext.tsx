import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "vendor" | "customer";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null, session: null, roles: [], loading: true,
  signOut: async () => {}, refreshRoles: async () => {},
});

const logAuthEvent = async (userId: string, email: string | null | undefined, action: "signed_in" | "signed_out") => {
  await supabase.from("admin_activity_log" as any).insert({
    actor_id: userId,
    actor_email: email ?? null,
    action,
    target_type: "auth",
  });
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const lastUserRef = useRef<{ id: string; email: string | null | undefined; roles: AppRole[] } | null>(null);

  const loadRoles = async (uid: string): Promise<AppRole[]> => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    const r = (data?.map((row) => row.role) ?? []) as AppRole[];
    setRoles(r);
    return r;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);

      if (s?.user) {
        const uid = s.user.id;
        const email = s.user.email;
        setTimeout(async () => {
          const r = await loadRoles(uid);
          lastUserRef.current = { id: uid, email, roles: r };
          if (event === "SIGNED_IN" && (r.includes("vendor") || r.includes("admin"))) {
            logAuthEvent(uid, email, "signed_in");
          }
        }, 0);
      } else {
        if (event === "SIGNED_OUT" && lastUserRef.current) {
          const prev = lastUserRef.current;
          if (prev.roles.includes("vendor") || prev.roles.includes("admin")) {
            logAuthEvent(prev.id, prev.email, "signed_out");
          }
        }
        lastUserRef.current = null;
        setRoles([]);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const r = await loadRoles(s.user.id);
        lastUserRef.current = { id: s.user.id, email: s.user.email, roles: r };
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  const refreshRoles = async () => {
    if (user) {
      const r = await loadRoles(user.id);
      lastUserRef.current = { id: user.id, email: user.email, roles: r };
    }
  };

  return (
    <Ctx.Provider value={{ user, session, roles, loading, signOut, refreshRoles }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
