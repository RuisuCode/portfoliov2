import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  FolderKanban,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { NavLink, Outlet, Link, useLocation } from "react-router";
import { toast } from "sonner";
import { supabase } from "../../../utils/supabase";
import { fetchAuthSession } from "../../lib/authSession";
import { AUTH_SESSION_KEY } from "../../query/authKeys";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-[#5a189a]/25 text-white border-r-2 border-[#6f2dbd] -mr-px"
      : "text-white/55 hover:bg-white/6 hover:text-white/90",
  ].join(" ");

export function AdminLayout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: session } = useQuery({
    queryKey: AUTH_SESSION_KEY,
    queryFn: fetchAuthSession,
    staleTime: Infinity,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: AUTH_SESSION_KEY });
      toast.success("Sesión cerrada");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const email = session?.user?.email ?? "";
  const displayName =
    (session?.user?.user_metadata?.full_name as string | undefined) ||
    (email ? email.split("@")[0] : "Admin");

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="h-screen overflow-hidden bg-[#111111] text-white flex font-sans">
      {menuOpen ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <aside
        className={[
          "fixed md:static inset-y-0 left-0 z-40 w-64 shrink-0",
          "flex h-screen flex-col border-r border-white/8 bg-[#0f0f11]",
          "transition-transform duration-200 ease-out md:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="p-4 md:p-6 border-b border-white/6 flex items-center justify-between gap-2">
          <p className="text-lg font-semibold tracking-tight text-white">
            Portfolio Admin
          </p>
          <button
            type="button"
            className="md:hidden p-2 rounded-lg text-white/70 hover:bg-white/10"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 flex items-center gap-3 border-b border-white/6">
          <div className="h-10 w-10 rounded-full bg-linear-to-br from-[#5a189a] to-[#6f2dbd] flex items-center justify-center shrink-0">
            <UserRound className="h-5 w-5 text-white/90" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-white truncate">
              {displayName}
            </p>
            <p className="text-[11px] text-white/45 truncate">
              {email || "Sesión activa"}
            </p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <NavLink to="/admin" end className={navLinkClass}>
            <LayoutDashboard className="h-[18px] w-[18px] shrink-0 opacity-80" />
            Home
          </NavLink>
          <NavLink to="/admin/habilities" className={navLinkClass}>
            <Sparkles className="h-[18px] w-[18px] shrink-0 opacity-80" />
            Habilities
          </NavLink>
          <NavLink to="/admin/projects" className={navLinkClass}>
            <FolderKanban className="h-[18px] w-[18px] shrink-0 opacity-80" />
            Proyects
          </NavLink>
        </nav>

        <div className="p-4 mt-auto border-t border-white/6">
          <Link
            to="/"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5a189a] py-2.5 text-sm font-medium text-white hover:bg-[#6f2dbd] transition-colors"
          >
            <Home className="h-4 w-4" />
            Ver sitio en vivo
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex min-h-0 min-w-0 flex-col">
        <header className="h-14 shrink-0 border-b border-white/8 bg-[#111111] flex items-center gap-3 px-4 md:px-6">
          <button
            type="button"
            className="md:hidden p-2 rounded-lg border border-white/10 text-white/80 hover:bg-white/6"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="relative flex-1 max-w-md min-w-0 hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
            <input
              type="search"
              placeholder="Búsqueda rápida…"
              readOnly
              className="w-full rounded-lg border border-white/10 bg-[#0f0f11] py-2 pl-9 pr-3 text-sm text-white/80 placeholder:text-white/35 outline-none focus:border-[#5a189a]/50"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <button
              type="button"
              className="p-2 rounded-lg border border-white/10 text-white/70 hover:bg-white/6"
              aria-label="Perfil"
            >
              <UserRound className="h-5 w-5" />
            </button>
            <button
              type="button"
              disabled={logoutMutation.isPending}
              onClick={() => logoutMutation.mutate()}
              className="p-2 rounded-lg border border-white/10 text-white/70 hover:bg-white/6 disabled:opacity-50"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
