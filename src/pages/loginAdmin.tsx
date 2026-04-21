import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { toast } from "sonner";
import { supabase } from "../../utils/supabase";
import { fetchAuthSession } from "../lib/authSession";
import { AUTH_SESSION_KEY } from "../query/authKeys";

export default function LoginAdmin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const sessionQuery = useQuery({
    queryKey: AUTH_SESSION_KEY,
    queryFn: fetchAuthSession,
    staleTime: Infinity,
  });

  const loginMutation = useMutation({
    mutationFn: async (creds: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword(creds);
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: AUTH_SESSION_KEY });
      toast.success("Sesión iniciada");
      navigate("/admin", { replace: true });
    },
    onError: (err: Error) => {
      toast.error(err.message || "No se pudo iniciar sesión");
    },
  });

  if (sessionQuery.isPending) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0f0f11]">
        <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (sessionQuery.data) {
    return <Navigate to="/admin" replace />;
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !password) {
      toast.error("Completa email y contraseña");
      return;
    }
    loginMutation.mutate({ email: trimmed, password });
  };

  return (
    <div className="min-h-screen bg-[#111111] text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
          <p className="text-sm text-white/55">Inicia sesión para gestionar el portfolio</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-xl"
        >
          <label className="block space-y-1.5 text-sm">
            <span className="text-white/70">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0f0f11] px-3 py-2 text-white placeholder:text-white/30 outline-none focus:border-purple-500/50"
              placeholder="admin@ejemplo.com"
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="text-white/70">Contraseña</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#0f0f11] px-3 py-2 text-white placeholder:text-white/30 outline-none focus:border-purple-500/50"
            />
          </label>
          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full rounded-lg bg-[#5a189a] py-2.5 text-sm font-medium text-white hover:bg-[#6f2dbd] disabled:opacity-50 transition-colors"
          >
            {loginMutation.isPending ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm text-white/45">
          <Link to="/" className="underline hover:text-white/70">
            Volver al sitio
          </Link>
        </p>
      </div>
    </div>
  );
}
