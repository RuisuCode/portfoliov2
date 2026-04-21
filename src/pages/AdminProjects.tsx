import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderKanban, Plus, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "../../utils/supabase";

type ProjectStatus = "in_development" | "finished" | "maintenance" | "planning";

type Project = {
  id: number;
  name: string;
  cover_img: string | null;
  description: string | null;
  bucket_folder: string | null;
  status: ProjectStatus;
  company_name: string | null;
  priority_order: number | null;
};

type Technology = {
  id: number;
  name: string;
  icon_url: string | null;
  level: string | null;
  category: string | null;
};

type LinkInput = {
  label: string;
  url: string;
};

type NewProjectInput = {
  name: string;
  description: string;
  company_name: string;
  status: ProjectStatus;
  launch_date: string | null;
  priority_order: number;
  coverFile: File;
  projectImages: File[];
  technologyIds: number[];
  links: LinkInput[];
};

type DeleteProjectInput = {
  id: number;
  cover_img: string | null;
  bucket_folder: string | null;
};

type UpdateProjectStatusInput = {
  id: number;
  status: ProjectStatus;
};

const PROJECTS_QUERY_KEY = ["admin", "projects"];
const TECHNOLOGIES_QUERY_KEY = ["admin", "technologies"];
const COVER_IMAGES_BUCKET = "cover_image";

const projectStatusLabel: Record<ProjectStatus, string> = {
  in_development: "En desarrollo",
  finished: "Finalizado",
  maintenance: "Mantenimiento",
  planning: "En planificación",
};

const sanitizeForBucketName = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);

const isAlreadyExistsError = (message: string) =>
  message.toLowerCase().includes("already exists");

async function fetchProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, name, cover_img, description, bucket_folder, status, company_name, priority_order",
    )
    .order("priority_order", { ascending: true, nullsFirst: false })
    .order("id", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Project[];
}

async function ensureBucketExists(bucketName: string, isPublic: boolean) {
  const { error } = await supabase.storage.createBucket(bucketName, {
    public: isPublic,
  });
  if (error && !isAlreadyExistsError(error.message)) {
    throw new Error(error.message);
  }
}

async function fetchTechnologies() {
  const { data, error } = await supabase
    .from("technologies")
    .select("id, name, icon_url, level, category")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Technology[];
}

async function createProject(payload: NewProjectInput) {
  const baseBucketName = sanitizeForBucketName(payload.name);
  const projectBucketName = `${baseBucketName || "project"}_images`;
  const uniqueId = crypto.randomUUID();
  const safeFileName = payload.coverFile.name.replace(/\s+/g, "_");
  const coverPath = `utils/cover_image/${uniqueId}-${safeFileName}`;

  await ensureBucketExists(COVER_IMAGES_BUCKET, true);
  await ensureBucketExists(projectBucketName, true);

  const { error: uploadCoverError } = await supabase.storage
    .from(COVER_IMAGES_BUCKET)
    .upload(coverPath, payload.coverFile, {
      cacheControl: "3600",
      upsert: false,
      contentType: payload.coverFile.type,
    });

  if (uploadCoverError) {
    throw new Error(uploadCoverError.message);
  }

  if (payload.projectImages.length > 0) {
    const uploadProjectImages = payload.projectImages.map((imageFile) => {
      const imagePath = `${crypto.randomUUID()}-${imageFile.name.replace(/\s+/g, "_")}`;
      return supabase.storage
        .from(projectBucketName)
        .upload(imagePath, imageFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: imageFile.type,
        });
    });

    const imageUploadResults = await Promise.all(uploadProjectImages);
    const firstImageError = imageUploadResults.find((result) => result.error);
    if (firstImageError?.error) {
      throw new Error(firstImageError.error.message);
    }
  }

  const {
    data: { publicUrl: coverPublicUrl },
  } = supabase.storage.from(COVER_IMAGES_BUCKET).getPublicUrl(coverPath);

  const { data: insertedProjects, error: insertError } = await supabase
    .from("projects")
    .insert({
      name: payload.name,
      description: payload.description,
      company_name: payload.company_name,
      status: payload.status,
      launch_date: payload.launch_date,
      priority_order: payload.priority_order,
      cover_img: coverPublicUrl,
      bucket_folder: projectBucketName,
    })
    .select("id");

  if (insertError) {
    throw new Error(insertError.message);
  }

  const projectId = insertedProjects?.[0]?.id;
  if (!projectId) {
    throw new Error("No se pudo obtener el id del proyecto creado");
  }

  if (payload.technologyIds.length > 0) {
    const { error: projectTechnologyError } = await supabase
      .from("project_technologies")
      .insert(
        payload.technologyIds.map((technologyId) => ({
          project_id: projectId,
          technology_id: technologyId,
        })),
      );

    if (projectTechnologyError) {
      throw new Error(projectTechnologyError.message);
    }
  }

  const projectLinks = payload.links
    .map((link) => ({
      label: link.label,
      url: link.url,
    }))
    .filter((link) => link.label && link.url);

  if (projectLinks.length > 0) {
    const { error: linksError } = await supabase.from("links").insert(
      projectLinks.map((link) => ({
        project_id: projectId,
        label: link.label,
        url: link.url,
      })),
    );

    if (linksError) {
      throw new Error(linksError.message);
    }
  }
}

async function clearAndDeleteBucket(bucketName: string) {
  console.log("clearAndDeleteBucket", bucketName);
  const { data: files, error: listError } = await supabase.storage
    .from(bucketName)
    .list("", {
      limit: 1000,
    });
  if (listError) {
    console.log("listError", listError);
    throw new Error(listError.message);
  }

  const filePaths =
    files
      ?.filter((entry) => entry.id !== null)
      .map((entry) => entry.name)
      .filter(Boolean) ?? [];

  if (filePaths.length > 0) {
    const { error: removeError } = await supabase.storage
      .from(bucketName)
      .remove(filePaths);
    if (removeError) {
      throw new Error(removeError.message);
    }
  }

  const { error: deleteBucketError } =
    await supabase.storage.deleteBucket(bucketName);
  if (deleteBucketError) {
    console.log("deleteBucketError", deleteBucketError);
    throw new Error(deleteBucketError.message);
  }
}

function getCoverImagePathFromUrl(coverUrl: string) {
  const marker = `/object/public/${COVER_IMAGES_BUCKET}/`;
  const markerIndex = coverUrl.indexOf(marker);
  if (markerIndex === -1) return null;
  return decodeURIComponent(coverUrl.slice(markerIndex + marker.length));
}

async function deleteProject(payload: DeleteProjectInput) {
  if (payload.cover_img) {
    const coverPath = getCoverImagePathFromUrl(payload.cover_img);
    if (coverPath) {
      const { error: removeCoverError } = await supabase.storage
        .from(COVER_IMAGES_BUCKET)
        .remove([coverPath]);
      if (removeCoverError) {
        throw new Error(removeCoverError.message);
      }
    }
  }

  if (payload.bucket_folder) {
    await clearAndDeleteBucket(payload.bucket_folder);
  }

  const { error: deleteProjectError } = await supabase
    .from("projects")
    .delete()
    .eq("id", payload.id);
  if (deleteProjectError) {
    throw new Error(deleteProjectError.message);
  }
}

async function updateProjectStatus(payload: UpdateProjectStatusInput) {
  const { error } = await supabase
    .from("projects")
    .update({ status: payload.status })
    .eq("id", payload.id);
  if (error) {
    throw new Error(error.message);
  }
}

export default function AdminProjects() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [coverPreview, setCoverPreview] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("in_development");
  const [priorityOrder, setPriorityOrder] = useState("1");
  const [launchDate, setLaunchDate] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [projectImages, setProjectImages] = useState<File[]>([]);
  const [technologyIds, setTechnologyIds] = useState<number[]>([]);
  const [links, setLinks] = useState<LinkInput[]>([
    { label: "instagram", url: "" },
    { label: "facebook", url: "" },
    { label: "github", url: "" },
    { label: "x", url: "" },
    { label: "gitlab", url: "" },
    { label: "tiktok", url: "" },
    { label: "deploy", url: "" },
  ]);

  const {
    data: projects = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: fetchProjects,
  });

  const {
    data: technologies = [],
    isLoading: isTechnologiesLoading,
    isError: isTechnologiesError,
    error: technologiesError,
  } = useQuery({
    queryKey: TECHNOLOGIES_QUERY_KEY,
    queryFn: fetchTechnologies,
  });

  const createProjectMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      toast.success("Proyecto creado correctamente");
      setIsModalOpen(false);
      setName("");
      setDescription("");
      setCompanyName("");
      setStatus("in_development");
      setLaunchDate("");
      setPriorityOrder("1");
      setCoverFile(null);
      setProjectImages([]);
      setTechnologyIds([]);
      setLinks([
        { label: "Red social", url: "" },
        { label: "Live Demo", url: "" },
      ]);
    },
    onError: (err: Error) => {
      toast.error(err.message || "No se pudo crear el proyecto");
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      toast.success("Proyecto eliminado correctamente");
      setProjectToDelete(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "No se pudo eliminar el proyecto");
    },
  });

  const updateProjectStatusMutation = useMutation({
    mutationFn: updateProjectStatus,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY });
      toast.success("Estado del proyecto actualizado");
    },
    onError: (err: Error) => {
      toast.error(err.message || "No se pudo actualizar el estado");
    },
  });

  const handleCreateProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      toast.error("El nombre del proyecto es requerido");
      return;
    }

    if (!coverFile) {
      toast.error("Debes seleccionar una imagen de portada");
      return;
    }

    const parsedPriority = Number(priorityOrder);
    if (!Number.isFinite(parsedPriority)) {
      toast.error("La prioridad debe ser un numero valido");
      return;
    }

    createProjectMutation.mutate({
      name: name.trim(),
      description: description.trim(),
      company_name: companyName.trim(),
      status,
      launch_date: launchDate || null,
      priority_order: parsedPriority,
      coverFile,
      projectImages,
      technologyIds,
      links: links.map((link) => ({
        label: link.label.trim(),
        url: link.url.trim(),
      })),
    });
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[#5a189a]/20 p-2.5 text-[#c4b5fd]">
            <FolderKanban className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Proyects
            </h1>
            <p className="text-sm text-white/50">
              Lista, crea y publica proyectos del portfolio.
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
          Agregar proyecto
        </motion.button>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-white/8 bg-[#141414]/80 p-10 text-center text-sm text-white/60">
          Cargando proyectos...
        </div>
      ) : null}

      {isError ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          Ocurrio un error al cargar proyectos: {(error as Error)?.message}
        </div>
      ) : null}

      {!isLoading && !isError ? (
        <div className="overflow-hidden rounded-xl border border-white/8 bg-[#141414]/80">
          {projects.length === 0 ? (
            <div className="p-10 text-center text-sm text-white/45">
              Aun no hay proyectos registrados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-white/8 bg-white/5 text-xs uppercase tracking-wide text-white/55">
                  <tr>
                    <th className="px-4 py-3">Proyecto</th>
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Prioridad</th>
                    <th className="px-4 py-3">Bucket</th>
                    <th className="px-4 py-3">Cover</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr
                      key={project.id}
                      className="border-b border-white/6 text-white/85"
                    >
                      <td className="px-4 py-3 font-medium">{project.name}</td>
                      <td className="px-4 py-3 text-white/65">
                        {project.company_name || "-"}
                      </td>
                      <td className="px-4 py-3 text-white/65">
                        <select
                          value={project.status}
                          disabled={updateProjectStatusMutation.isPending}
                          onChange={(event) => {
                            const nextStatus = event.target
                              .value as ProjectStatus;
                            if (nextStatus === project.status) return;
                            updateProjectStatusMutation.mutate({
                              id: project.id,
                              status: nextStatus,
                            });
                          }}
                          className="rounded-md border border-white/12 bg-[#1a1a1a] px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#5a189a]/60 disabled:opacity-60"
                        >
                          <option value="in_development">
                            {projectStatusLabel.in_development}
                          </option>
                          <option value="finished">
                            {projectStatusLabel.finished}
                          </option>
                          <option value="maintenance">
                            {projectStatusLabel.maintenance}
                          </option>
                          <option value="planning">
                            {projectStatusLabel.planning}
                          </option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-white/65">
                        {project.priority_order ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-white/65">
                        {project.bucket_folder || "-"}
                      </td>
                      <td className="px-4 py-3 text-white/65">
                        {project.cover_img ? (
                          <button
                            type="button"
                            onClick={() =>
                              setCoverPreview({
                                url: project.cover_img as string,
                                name: project.name,
                              })
                            }
                            className="text-[#c4b5fd] hover:text-[#e9d5ff] underline-offset-4 hover:underline"
                          >
                            Ver cover
                          </button>
                        ) : (
                          "Sin cover"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setProjectToDelete(project)}
                          disabled={deleteProjectMutation.isPending}
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
              className="w-full max-w-2xl max-h-[calc(100vh-5rem)] rounded-xl border border-white/10 bg-[#0f0f11] shadow-xl overflow-hidden"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 460, damping: 34 }}
            >
              <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
                <h2 className="text-lg font-semibold text-white">
                  Nuevo proyecto
                </h2>
                <button
                  type="button"
                  aria-label="Cerrar modal"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form
                onSubmit={handleCreateProject}
                className="space-y-4 px-5 py-5 overflow-y-auto pr-4 max-h-[calc(100vh-11rem)]"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="project-name"
                      className="text-sm text-white/80"
                    >
                      Nombre del proyecto
                    </label>
                    <input
                      id="project-name"
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="w-full rounded-lg border border-white/12 bg-[#141414] px-3 py-2 text-sm text-white outline-none focus:border-[#5a189a]/60"
                      placeholder="Ej: Ecommerce Dashboard"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="project-company"
                      className="text-sm text-white/80"
                    >
                      Empresa
                    </label>
                    <input
                      id="project-company"
                      type="text"
                      value={companyName}
                      onChange={(event) => setCompanyName(event.target.value)}
                      className="w-full rounded-lg border border-white/12 bg-[#141414] px-3 py-2 text-sm text-white outline-none focus:border-[#5a189a]/60"
                      placeholder="Ej: Mi startup"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="project-description"
                    className="text-sm text-white/80"
                  >
                    Descripcion
                  </label>
                  <textarea
                    id="project-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-white/12 bg-[#141414] px-3 py-2 text-sm text-white outline-none focus:border-[#5a189a]/60"
                    placeholder="Breve descripcion del proyecto"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-[1.3fr_0.95fr_0.65fr]">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="project-status"
                      className="text-sm text-white/80"
                    >
                      Estado
                    </label>
                    <select
                      id="project-status"
                      value={status}
                      onChange={(event) =>
                        setStatus(event.target.value as ProjectStatus)
                      }
                      className="w-full rounded-lg border border-white/12 bg-[#141414] px-3 py-2 text-sm text-white outline-none focus:border-[#5a189a]/60"
                    >
                      <option value="in_development">En desarrollo</option>
                      <option value="finished">Finalizado</option>
                      <option value="maintenance">Mantenimiento</option>
                      <option value="planning">En planificación</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="project-launch-date"
                      className="text-sm text-white/80"
                    >
                      Fecha estimada
                    </label>
                    <input
                      id="project-launch-date"
                      type="date"
                      value={launchDate}
                      onChange={(event) => setLaunchDate(event.target.value)}
                      className="w-full rounded-lg border border-white/12 bg-[#141414] px-3 py-2 text-sm text-white outline-none focus:border-[#5a189a]/60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="project-priority"
                      className="text-sm text-white/80"
                    >
                      Prioridad
                    </label>
                    <input
                      id="project-priority"
                      type="number"
                      min={0}
                      value={priorityOrder}
                      onChange={(event) => setPriorityOrder(event.target.value)}
                      className="w-full rounded-lg border border-white/12 bg-[#141414] px-3 py-2 text-sm text-white outline-none focus:border-[#5a189a]/60"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm text-white/80">Links</label>
                  <div className="space-y-2 rounded-xl border border-white/12 bg-[#141414] p-3 text-sm text-white w-full">
                    {links.map((link, index) => (
                      <div
                        key={index}
                        className="grid gap-2 sm:grid-cols-[1.1fr_1.6fr_auto]"
                      >
                        <input
                          type="text"
                          value={link.label}
                          onChange={(event) => {
                            const newLabel = event.target.value;
                            setLinks((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, label: newLabel }
                                  : item,
                              ),
                            );
                          }}
                          placeholder="Etiqueta"
                          className="min-w-0 rounded-lg border border-white/12 bg-[#0f0f11] px-3 py-2 text-sm text-white outline-none focus:border-[#5a189a]/60"
                        />
                        <input
                          type="url"
                          value={link.url}
                          onChange={(event) => {
                            const newUrl = event.target.value;
                            setLinks((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, url: newUrl }
                                  : item,
                              ),
                            );
                          }}
                          placeholder="URL"
                          className="min-w-0 rounded-lg border border-white/12 bg-[#0f0f11] px-3 py-2 text-sm text-white outline-none focus:border-[#5a189a]/60"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setLinks((current) =>
                              current.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            )
                          }
                          className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80 transition-colors hover:bg-white/10"
                        >
                          X
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setLinks((current) => [
                          ...current,
                          { label: "", url: "" },
                        ])
                      }
                      className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-[#5a189a] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6f2dbd]"
                    >
                      Añadir link
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-[0.12em] text-white/70">
                    Tecnologías
                  </label>
                  <div className="w-full rounded-xl border border-white/12 bg-[#141414] p-3 text-sm text-white">
                    {isTechnologiesLoading ? (
                      <p className="text-xs text-white/50">
                        Cargando tecnologías...
                      </p>
                    ) : isTechnologiesError ? (
                      <p className="text-xs text-red-300">
                        Error cargando tecnologías: {String(technologiesError)}
                      </p>
                    ) : technologies.length === 0 ? (
                      <p className="text-xs text-white/50">
                        No hay tecnologías registradas.
                      </p>
                    ) : (
                      <div className="max-h-32 overflow-y-auto pr-1">
                        <div className="grid gap-1 sm:grid-cols-3">
                          {technologies.map((technology) => (
                            <label
                              key={technology.id}
                              className="inline-flex min-w-0 items-center gap-2 rounded-full border border-white/12 bg-[#0f0f11] px-2 py-1.5 text-[11px] text-white transition hover:border-[#5a189a]/50"
                            >
                              <input
                                type="checkbox"
                                value={technology.id}
                                checked={technologyIds.includes(technology.id)}
                                onChange={(event) => {
                                  const techId = Number(event.target.value);
                                  setTechnologyIds((current) =>
                                    event.target.checked
                                      ? [...current, techId]
                                      : current.filter((id) => id !== techId),
                                  );
                                }}
                                className="h-4 w-4 rounded-full border border-white/20 bg-[#111827] accent-[#5a189a] focus:ring-[#5a189a]/50"
                              />
                              <span className="truncate">
                                {technology.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {technologyIds.length > 0 ? (
                    <p className="text-[11px] text-[#c4b5fd]">
                      {technologyIds.length} tecnología(s) seleccionada(s).
                    </p>
                  ) : (
                    <p className="text-[11px] text-white/50">
                      Selecciona las tecnologías usadas en este proyecto.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="project-cover-image"
                    className="text-sm text-white/80"
                  >
                    Cover image
                  </label>
                  <input
                    id="project-cover-image"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setCoverFile(file);
                    }}
                    className="w-full rounded-lg border border-white/12 bg-[#141414] px-3 py-2 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-[#5a189a]/70 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-[#6f2dbd]"
                  />
                  <p className="text-xs text-white/50">
                    Se subira al bucket `{COVER_IMAGES_BUCKET}` en
                    `utils/cover_image/ID_UNICO-nombre-archivo.ext` usando
                    crypto random.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="project-images"
                    className="text-sm text-white/80"
                  >
                    Imagenes del proyecto
                  </label>
                  <input
                    id="project-images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      setProjectImages(files);
                    }}
                    className="w-full rounded-lg border border-white/12 bg-[#141414] px-3 py-2 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-[#5a189a]/70 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-[#6f2dbd]"
                  />
                  <p className="text-xs text-white/50">
                    Estas imagenes se subiran al bucket del proyecto:{" "}
                    {name.trim()
                      ? `${sanitizeForBucketName(name)}_images`
                      : "[nombre_sanitizado]_images"}
                    .
                  </p>
                  {projectImages.length > 0 ? (
                    <p className="text-xs text-[#c4b5fd]">
                      {projectImages.length} imagen(es) seleccionada(s).
                    </p>
                  ) : null}
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
                    disabled={createProjectMutation.isPending}
                    className="rounded-lg bg-[#5a189a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6f2dbd] disabled:opacity-50"
                  >
                    {createProjectMutation.isPending
                      ? "Guardando..."
                      : "Guardar proyecto"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {coverPreview ? (
          <motion.div
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={() => setCoverPreview(null)}
          >
            <motion.div
              className="w-full max-w-5xl overflow-hidden rounded-xl border border-white/10 bg-[#0f0f11] shadow-xl"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 460, damping: 34 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
                <h2 className="text-lg font-semibold text-white">
                  {coverPreview.name} - Cover
                </h2>
                <button
                  type="button"
                  aria-label="Cerrar preview"
                  onClick={() => setCoverPreview(null)}
                  className="rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="bg-[#090909] p-3">
                <img
                  src={coverPreview.url}
                  alt={`Cover de ${coverPreview.name}`}
                  className="max-h-[75vh] w-full rounded-lg object-contain"
                />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {projectToDelete ? (
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
                <h2 className="text-lg font-semibold text-white">
                  Eliminar proyecto
                </h2>
              </div>

              <div className="space-y-2 px-5 py-4 text-sm text-white/75">
                <p>
                  Esta accion eliminara el proyecto{" "}
                  <span className="font-semibold text-white">
                    {projectToDelete.name}
                  </span>{" "}
                  y su bucket{" "}
                  <span className="font-semibold text-white">
                    {projectToDelete.bucket_folder || "-"}
                  </span>{" "}
                  (incluyendo cover e imagenes).
                </p>
                <p className="text-white/50">Confirma si deseas continuar.</p>
              </div>

              <div className="flex justify-end gap-2 border-t border-white/8 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setProjectToDelete(null)}
                  disabled={deleteProjectMutation.isPending}
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/75 transition-colors hover:bg-white/8 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    deleteProjectMutation.mutate({
                      id: projectToDelete.id,
                      cover_img: projectToDelete.cover_img,
                      bucket_folder: projectToDelete.bucket_folder,
                    })
                  }
                  disabled={deleteProjectMutation.isPending}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-60"
                >
                  {deleteProjectMutation.isPending
                    ? "Eliminando..."
                    : "Eliminar"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
