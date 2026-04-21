import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router";
import { fetchAuthSession } from "../lib/authSession";
import { AUTH_SESSION_KEY } from "../query/authKeys";

export function ProtectedRoute() {
  const { data: session, isPending } = useQuery({
    queryKey: AUTH_SESSION_KEY,
    queryFn: fetchAuthSession,
    staleTime: Infinity,
  });

  if (isPending) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#0f0f11]">
        <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return session ? <Outlet /> : <Navigate to="/admin/login" replace />;
}
