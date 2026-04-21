import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../utils/supabase";
import { AUTH_SESSION_KEY } from "../query/authKeys";

/** Mantiene el cache de sesión alineado con Supabase (login, logout, refresh). */
export function AuthQuerySync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void queryClient.invalidateQueries({ queryKey: AUTH_SESSION_KEY });
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  return null;
}
