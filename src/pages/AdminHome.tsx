import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  FolderKanban,
  MoreVertical,
  Rocket,
  Star,
} from "lucide-react";
import { Link } from "react-router";
import { supabase } from "../../utils/supabase";

const projectStatusLabels: Record<string, string> = {
  in_development: "En desarrollo",
  finished: "Finalizado",
  maintenance: "Mantenimiento",
  planning: "En planificación",
};

const categoryLabels: Record<string, string> = {
  cloud: "Cloud",
  database: "Database",
  frontend: "Frontend",
  languages: "Languages",
  frameworks: "Frameworks",
  "devops/ci-cd": "DevOps / CI-CD",
};

const levelLabels: Record<string, string> = {
  low: "Bajo",
  mid: "Medio",
  high: "Alto",
  very_high: "Muy alto",
};

type ProjectStatus = "in_development" | "finished" | "maintenance" | "planning";

type Project = {
  id: number;
  name: string;
  status: ProjectStatus;
  company_name: string | null;
  launch_date: string | null;
  priority_order: number | null;
  firstTechnology: string | null;
  firstTechnologyIcon: string | null;
};

type Technology = {
  id: number;
  name: string;
  icon_url: string | null;
  level: string | null;
  category: string | null;
  experience_start_date?: string;
};

const PROJECTS_QUERY_KEY = ["admin", "home", "projects"] as const;
const TECHNOLOGIES_QUERY_KEY = ["admin", "home", "technologies"] as const;

type ProjectWithTech = {
  id: number;
  name: string;
  status: ProjectStatus;
  company_name: string | null;
  launch_date: string | null;
  priority_order: number | null;
  project_technologies?: Array<{
    technologies?: { name?: string; icon_url?: string };
  }>;
};

async function fetchAdminProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(
      `id, name, company_name, status, launch_date, priority_order,
      project_technologies(technology_id, technologies(name, icon_url))`,
    )
    .order("id", { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(error.message);
  }

  const projects = (data ?? []) as ProjectWithTech[];

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    status: project.status,
    company_name: project.company_name,
    launch_date: project.launch_date,
    priority_order: project.priority_order,
    firstTechnology:
      project.project_technologies?.[0]?.technologies?.name ?? null,
    firstTechnologyIcon:
      project.project_technologies?.[0]?.technologies?.icon_url ?? null,
  }));
}

async function fetchAdminTechnologies() {
  const { data, error } = await supabase
    .from("technologies")
    .select("id, name, icon_url, level, category, experience_start_date")
    .order("id", { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Technology[];
}

export default function AdminHome() {
  const {
    data: projects = [],
    isLoading: projectsLoading,
    isError: projectsError,
    error: projectsErrorObject,
  } = useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: fetchAdminProjects,
  });

  const {
    data: technologies = [],
    isLoading: techLoading,
    isError: techError,
    error: techErrorObject,
  } = useQuery({
    queryKey: TECHNOLOGIES_QUERY_KEY,
    queryFn: fetchAdminTechnologies,
  });

  const stats = useMemo(() => {
    const finishedCount = projects.filter(
      (project) => project.status === "finished",
    ).length;
    const activeCount = projects.filter(
      (project) =>
        project.status === "in_development" ||
        project.status === "planning" ||
        project.status === "maintenance",
    ).length;

    return [
      {
        label: "Proyectos registrados",
        value: projects.length.toString(),
        icon: FolderKanban,
        badge: `${finishedCount} finalizados`,
      },
      {
        label: "Proyectos activos",
        value: activeCount.toString(),
        icon: Rocket,
        badge: "En progreso",
      },
      {
        label: "Tecnologías",
        value: technologies.length.toString(),
        icon: Star,
        badge: "Recientes",
      },
      {
        label: "Proyectos con prioridad",
        value: projects
          .filter((project) => project.priority_order !== null)
          .length.toString(),
        icon: BarChart3,
        badge: "Ordenados",
      },
    ];
  }, [projects, technologies.length]);

  const recentProjects = useMemo(
    () =>
      [...projects]
        .sort(
          (a, b) =>
            (b.priority_order ?? 0) - (a.priority_order ?? 0) || b.id - a.id,
        )
        .slice(0, 5),
    [projects],
  );

  const recentTechnologies = useMemo(
    () => [...technologies].slice(0, 5),
    [technologies],
  );

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">
            Resumen del Portfolio
          </h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-[#6f2dbd]/90">
            Visión general de proyectos y tecnología cargados en Supabase
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
       
          <Link
            to="/admin/projects"
            className="rounded-lg bg-[#c4b5fd] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#111111] hover:bg-[#ddd6fe] transition-colors"
          >
            + Nuevo proyecto
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {stats.map((card) => (
          <div
            key={card.label}
            className="relative rounded-xl border border-white/8 bg-[#141414] p-5 shadow-sm"
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

      <section className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
        <div className="flex flex-col gap-4 px-5 py-4 border-b border-white/6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Proyectos recientes
            </h2>
            <p className="text-xs text-white/50">
              Los proyectos más relevantes y con mayor prioridad.
            </p>
          </div>
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
              <tr className="border-b border-white/6 text-[11px] uppercase tracking-wider text-white/40">
                <th className="px-5 py-3 font-medium">Proyecto</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">
                  Empresa
                </th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">
                  Lanzamiento
                </th>
                <th className="px-5 py-3 font-medium w-10" />
              </tr>
            </thead>
            <tbody>
              {projectsLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-white/50"
                  >
                    Cargando proyectos...
                  </td>
                </tr>
              ) : projectsError ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-red-300"
                  >
                    Error cargando proyectos:{" "}
                    {(projectsErrorObject as Error)?.message}
                  </td>
                </tr>
              ) : recentProjects.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-white/50"
                  >
                    No hay proyectos registrados aún.
                  </td>
                </tr>
              ) : (
                recentProjects.map((project) => (
                  <tr
                    key={project.id}
                    className="border-b border-white/4 last:border-0 hover:bg-white/2"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg overflow-hidden bg-[#ffff]/20 p-2 flex items-center justify-center">
                          {project.firstTechnologyIcon ? (
                            <img
                              src={project.firstTechnologyIcon}
                              alt={project.firstTechnology ?? "Tecnología"}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <div className="h-4 w-4 rounded-md bg-[#5a189a]/50" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">
                            {project.name}
                          </p>
                          <p className="text-xs text-white/40 truncate">
                            {project.firstTechnology
                              ? `Tecnología: ${project.firstTechnology}`
                              : project.priority_order
                                ? `Prioridad ${project.priority_order}`
                                : "Sin tecnología"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-white/55 hidden md:table-cell">
                      {project.company_name || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={[
                          "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase",
                          project.status === "finished"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : project.status === "in_development"
                              ? "bg-yellow-500/15 text-yellow-300"
                              : project.status === "maintenance"
                                ? "bg-sky-500/15 text-sky-300"
                                : "bg-white/10 text-white/60",
                        ].join(" ")}
                      >
                        {projectStatusLabels[project.status] ?? project.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-white/55 hidden md:table-cell">
                      {project.launch_date || "No definida"}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        className="p-1.5 rounded-md text-white/40 hover:bg-white/8 hover:text-white/70"
                        aria-label="Más acciones"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-white/8 bg-[#141414] overflow-hidden">
        <div className="flex flex-col gap-4 px-5 py-4 border-b border-white/6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Tecnologías recientes
            </h2>
            <p className="text-xs text-white/50">
              Últimas tecnologías agregadas a la base de datos.
            </p>
          </div>
          <Link
            to="/admin/habilities"
            className="text-xs font-medium text-[#c4b5fd] hover:text-[#ddd6fe]"
          >
            Ver todo
          </Link>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {techLoading ? (
            <div className="col-span-full rounded-2xl border border-white/8 bg-[#111111]/60 p-8 text-center text-white/50">
              Cargando tecnologías...
            </div>
          ) : techError ? (
            <div className="col-span-full rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center text-red-200">
              Error cargando tecnologías: {(techErrorObject as Error)?.message}
            </div>
          ) : recentTechnologies.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-white/8 bg-[#111111]/60 p-8 text-center text-white/50">
              No hay tecnologías registradas aún.
            </div>
          ) : (
            recentTechnologies.map((technology) => (
              <div
                key={technology.id}
                className="rounded-3xl border border-white/8 bg-[#111111]/70 p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/40">
                      Tecnología
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-white">
                      {technology.name}
                    </h3>
                  </div>
                  <div className="rounded-2xl bg-[#5a189a]/10 px-3 py-1 text-[11px] font-semibold uppercase text-[#c4b5fd]">
                    {technology.level ? levelLabels[technology.level] : "—"}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/50">
                  <span className="rounded-full border border-white/10 px-2 py-1">
                    {technology.category
                      ? categoryLabels[technology.category]
                      : "Sin categoría"}
                  </span>
                  {technology.icon_url ? (
                    <a
                      href={technology.icon_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-white/5 px-2 py-1 text-white/70 hover:bg-white/10"
                    >
                      Icono
                    </a>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
