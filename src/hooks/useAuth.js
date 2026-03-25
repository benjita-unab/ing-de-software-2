// src/hooks/useAuth.js
// ─────────────────────────────────────────────────────────────────────────────
// Hook de autenticación con Supabase Auth.
// Maneja sesión, perfil del operador, login y logout.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useAuth() {
  const [session, setSession] = useState(null);
  const [operator, setOperator] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchOperator(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Escuchar cambios de sesión (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchOperator(session.user.id);
      } else {
        setOperator(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchOperator(userId) {
    const { data, error } = await supabase
      .from("operators")
      .select("*")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setOperator(data);
    } else {
      // Si no existe perfil en operators, usar datos básicos de auth
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        setOperator({
          id: userData.user.id,
          full_name: userData.user.user_metadata?.full_name
            || userData.user.email?.split("@")[0]
            || "Operador",
          branch: "",
          role: "operator",
        });
      }
    }
    setLoading(false);
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { session, operator, loading, signIn, signOut };
}
