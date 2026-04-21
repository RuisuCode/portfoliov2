import { supabase } from "../../utils/supabase";

export async function fetchAuthSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}
