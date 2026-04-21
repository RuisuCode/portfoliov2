import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Sparkles, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "../../utils/supabase";

type TechnologyLevel = "low" | "mid" | "high" | "very_high";
type CategoryType = "cloud" | "database" | "frontend" | "languages" | "frameworks" | "devops/ci-cd";

type Technology = {
  id: number;
  name: string;
  icon_url: string | null;
  level: TechnologyLevel;
  experience_start_date: string;
  category: CategoryType;
};

type NewTechnologyInput = {
  name: string;
  icon_url: string | null;
  level: TechnologyLevel;
  experience_start_date: string;
  category: CategoryType;
};

const TECHNOLOGIES_QUERY_KEY = ["admin", "technologies"];

const levelLabels: Record<TechnologyLevel, string> = {
  low: "Bajo",
  mid: "Medio",
  high: "Alto",
  very_high: "Muy alto",
};

const categoryLabels: Record<CategoryType, string> = {
  cloud: "Cloud",
  database: "Database",
  frontend: "Frontend",
  languages: "Languages",
  frameworks: "Frameworks",
  "devops/ci-cd": "DevOps/CI/CD",
};

async function fetchTechnologies() {
  const { data, error } = await supabase
    .from("technologies")
    .select("id, name, icon_url, level, experience_start_date, category")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Technology[];
}

async function createTechnology(payload: NewTechnologyInput) {
  const { error } = await supabase.from("technologies").insert(payload);
  if (error) {
    throw new Error(error.message);
  }
}

async function deleteTechnology(technologyId: number) {
  const { error } = await supabase.from("technologies").delete().eq("id", technologyId);
  if (error) {
    throw new Error(error.message);
  }
}

export default function AdminHabilities() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [technologyToDelete, setTechnologyToDelete] = useState<Technology | null>(null);
  const [name, setName] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [level, setLevel] = useState<TechnologyLevel>("mid");
  const [experienceStartDate, setExperienceStartDate] = useState("");
  const [category, setCategory] = useState<CategoryType>("frontend");

  const {
    data: technologies = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: TECHNOLOGIES_QUERY_KEY,
    queryFn: fetchTechnologies,
  });

  const createTechnologyMutation = useMutation({
    mutationFn: createTechnology,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TECHNOLOGIES_QUERY_KEY });
      toast.success("Tecnologia agregada correctamente");
      setIsModalOpen(false);
      setName("");
      setIconUrl("");
      setLevel("mid");
      setExperienceStartDate("");
      setCategory("frontend");
    },
    onError: (err: Error) => {
      toast.error(err.message || "No se pudo crear la tecnologia");
    },
  });

  const deleteTechnologyMutation = useMutation({
    mutationFn: deleteTechnology,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TECHNOLOGIES_QUERY_KEY });
      toast.success("Tecnologia eliminada correctamente");
      setTechnologyToDelete(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "No se pudo eliminar la tecnologia");
    },
  });

  const handleCreateTechnology = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim() || !experienceStartDate) {
      toast.error("Nombre y fecha de inicio son requeridos");
      return;
    }

    createTechnologyMutation.mutate({
      name: name.trim(),
      icon_url: iconUrl.trim() || null,
      level,
      experience_start_date: experienceStartDate,
      category,
    });
  };

  const handleDeleteTechnology = () => {
    if (!technologyToDelete) return;
    deleteTechnologyMutation.mutate(technologyToDelete.id);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[#5a189a]/20 p-2.5 text-[#c4b5fd]">
            <Sparkles className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Habilities</h1>
            <p className="text-sm text-white/50">
              Gestiona las habilidades que aparecen en tu portfolio.
            </p>
          </div>
        </div>

        <motion.button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#5a189a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6f2dbd]"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 600, damping: 35 }}
        >
          <Plus className="h-4 w-4" />
          Agregar tecnologia
        </motion.button>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-white/8 bg-[#141414]/80 p-10 text-center text-sm text-white/60">
          Cargando tecnologias...
        </div>
      ) : null}

      {isError ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          Ocurrio un error al cargar tecnologias: {(error as Error)?.message}
        </div>
      ) : null}

      {!isLoading && !isError ? (
        <div className="overflow-hidden rounded-xl border border-white/8 bg-[#141414]/80">
          {technologies.length === 0 ? (
            <div className="p-10 text-center text-sm text-white/45">
              Aun no hay tecnologias registradas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-white/8 bg-white/5 text-xs uppercase tracking-wide text-white/55">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Nivel</th>
                    <th className="px-4 py-3">Experiencia desde</th>
                    <th className="px-4 py-3">Icono</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {technologies.map((technology) => (
                    <tr key={technology.id} className="border-b border-white/6 text-white/85">
                      <td className="px-4 py-3 font-medium">{technology.name}</td>
                      <td className="px-4 py-3 text-white/65">{categoryLabels[technology.category]}</td>
                      <td className="px-4 py-3 text-white/65">{levelLabels[technology.level]}</td>
                      <td className="px-4 py-3 text-white/65">{technology.experience_start_date}</td>
                      <td className="px-4 py-3 text-white/65">
                        {technology.icon_url ? (
                          <a
                            href={technology.icon_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#c4b5fd] hover:text-[#e9d5ff] underline-offset-4 hover:underline"
                          >
                            Ver icono
                          </a>
                        ) : (
                          "Sin icono"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setTechnologyToDelete(technology)}
                          disabled={deleteTechnologyMutation.isPending}
                          className="inline-flex items-center gap-1.5 rounded-md border border-red-400/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      <AnimatePresence>
        {isModalOpen ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <motion.div
              className="w-full max-w-xl rounded-xl border border-white/10 bg-[#0f0f11] shadow-xl"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 460, damping: 34 }}
            >
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <h2 className="text-lg font-semibold text-white">Nueva tecnologia</h2>
              <button
                type="button"
                aria-label="Cerrar modal"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTechnology} className="space-y-4 px-5 py-5">
              <div className="space-y-1.5">
                <label htmlFor="technology-name" className="text-sm text-white/80">
                  Nombre
                </label>
                <input
                  id="technology-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-lg border border-white/12 bg-[#141414] px-3 py-2 text-sm text-white outline-none focus:border-[#5a189a]/60"
                  placeholder="Ej: React"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="technology-icon" className="text-sm text-white/80">
                  URL del icono (opcional)
                </label>
                <input
                  id="technology-icon"
                  type="url"
                  value={iconUrl}
                  onChange={(event) => setIconUrl(event.target.value)}
                  className="w-full rounded-lg border border-white/12 bg-[#141414] px-3 py-2 text-sm text-white outline-none focus:border-[#5a189a]/60"
                  placeholder="https://..."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="technology-level" className="text-sm text-white/80">
                    Nivel
                  </label>
                  <select
                    id="technology-level"
                    value={level}
                    onChange={(event) => setLevel(event.target.value as TechnologyLevel)}
                    className="w-full rounded-lg border border-white/12 bg-[#141414] px-3 py-2 text-sm text-white outline-none focus:border-[#5a189a]/60"
                  >
                    <option value="low">Bajo</option>
                    <option value="mid">Medio</option>
                    <option value="high">Alto</option>
                    <option value="very_high">Muy alto</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="technology-category" className="text-sm text-white/80">
                    Categoria
                  </label>
                  <select
                    id="technology-category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value as CategoryType)}
                    className="w-full rounded-lg border border-white/12 bg-[#141414] px-3 py-2 text-sm text-white outline-none focus:border-[#5a189a]/60"
                  >
                    <option value="cloud">Cloud</option>
                    <option value="database">Database</option>
                    <option value="frontend">Frontend</option>
                    <option value="languages">Languages</option>
                    <option value="frameworks">Frameworks</option>
                    <option value="devops">DevOps</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="technology-start-date" className="text-sm text-white/80">
                  Fecha de inicio de experiencia
                </label>
                <input
                  id="technology-start-date"
                  type="date"
                  value={experienceStartDate}
                  onChange={(event) => setExperienceStartDate(event.target.value)}
                  className="w-full rounded-lg border border-white/12 bg-[#141414] px-3 py-2 text-sm text-white outline-none focus:border-[#5a189a]/60"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-white/8 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/75 transition-colors hover:bg-white/8"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createTechnologyMutation.isPending}
                  className="rounded-lg bg-[#5a189a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6f2dbd] disabled:opacity-50"
                >
                  {createTechnologyMutation.isPending ? "Guardando..." : "Guardar tecnologia"}
                </button>
              </div>
            </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {technologyToDelete ? (
          <motion.div
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/65 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <motion.div
              className="w-full max-w-md rounded-xl border border-red-400/30 bg-[#0f0f11] shadow-xl"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 460, damping: 34 }}
            >
              <div className="border-b border-red-400/20 px-5 py-4">
                <h2 className="text-lg font-semibold text-white">Eliminar tecnologia</h2>
              </div>

              <div className="space-y-2 px-5 py-4 text-sm text-white/75">
                <p>
                  Esta accion no se puede deshacer. Vas a eliminar la tecnologia{" "}
                  <span className="font-semibold text-white">{technologyToDelete.name}</span>.
                </p>
                <p className="text-white/50">Confirma si deseas continuar.</p>
              </div>

              <div className="flex justify-end gap-2 border-t border-white/8 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setTechnologyToDelete(null)}
                  disabled={deleteTechnologyMutation.isPending}
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/75 transition-colors hover:bg-white/8 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTechnology}
                  disabled={deleteTechnologyMutation.isPending}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-60"
                >
                  {deleteTechnologyMutation.isPending ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
