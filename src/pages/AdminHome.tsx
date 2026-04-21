import { BarChart3, MoreVertical, Rocket, Star } from "lucide-react";
import { Link } from "react-router";

const statCards = [
  {
    label: "Proyectos en vivo",
    value: "24",
    icon: Rocket,
    badge: "+12%",
  },
  {
    label: "Visitas al perfil",
    value: "12.8k",
    icon: BarChart3,
    badge: "+5.2k",
  },
  {
    label: "Habilidades",
    value: "42",
    icon: Star,
    badge: "Expert",
  },
] as const;

const recentProjects = [
  {
    name: "Neon identity",
    slug: "portfolio/neon",
    thumb: "from-violet-600/40 to-fuchsia-600/30",
    category: "Identidad visual",
    status: "published" as const,
    updated: "Hace 2 h",
  },
  {
    name: "Product dashboard",
    slug: "portfolio/dashboard",
    thumb: "from-[#5a189a]/50 to-indigo-600/30",
    category: "Product design",
    status: "draft" as const,
    updated: "12 oct 2023",
  },
  {
    name: "Motion reel",
    slug: "portfolio/motion",
    thumb: "from-emerald-600/35 to-teal-600/25",
    category: "Motion",
    status: "published" as const,
    updated: "Hace 1 d",
  },
] as const;

export default function AdminHome() {
  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">
            Resumen
          </h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-[#6f2dbd]/90">
            Estado del sistema: óptimo
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-white/15 bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 hover:bg-white/[0.05] transition-colors"
          >
            Exportar datos
          </button>
          <Link
            to="/admin/projects"
            className="rounded-lg bg-[#c4b5fd] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#111111] hover:bg-[#ddd6fe] transition-colors"
          >
            + Nuevo proyecto
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="relative rounded-xl border border-white/[0.08] bg-[#141414] p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-lg bg-[#5a189a]/20 p-2.5 text-[#c4b5fd]">
                <card.icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <span className="rounded-md bg-[#5a189a]/35 px-2 py-0.5 text-[11px] font-semibold text-[#e9d5ff]">
                {card.badge}
              </span>
            </div>
            <p className="mt-4 text-2xl font-semibold tabular-nums text-white">
              {card.value}
            </p>
            <p className="mt-1 text-sm text-white/50">{card.label}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-white/[0.08] bg-[#141414] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">Proyectos recientes</h2>
          <Link
            to="/admin/projects"
            className="text-xs font-medium text-[#c4b5fd] hover:text-[#ddd6fe]"
          >
            Ver todos
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/40">
                <th className="px-5 py-3 font-medium">Proyecto</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Categoría</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Actualizado</th>
                <th className="px-5 py-3 font-medium w-10" />
              </tr>
            </thead>
            <tbody>
              {recentProjects.map((row) => (
                <tr
                  key={row.slug}
                  className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-lg bg-gradient-to-br shrink-0 ${row.thumb}`}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{row.name}</p>
                        <p className="text-xs text-white/40 truncate">{row.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-white/55 hidden md:table-cell">
                    {row.category}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={[
                        "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase",
                        row.status === "published"
                          ? "bg-[#5a189a]/35 text-[#e9d5ff]"
                          : "bg-white/10 text-white/60",
                      ].join(" ")}
                    >
                      {row.status === "published" ? "Publicado" : "Borrador"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-white/45 hidden md:table-cell">
                    {row.updated}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      className="p-1.5 rounded-md text-white/40 hover:bg-white/[0.08] hover:text-white/70"
                      aria-label="Más acciones"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
