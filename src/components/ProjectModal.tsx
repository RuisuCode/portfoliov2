import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import { supabase } from "../../utils/supabase";
import type { Project } from "../types/project";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import "yet-another-react-lightbox/styles.css";

interface ProjectModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  project,
  isOpen,
  onClose,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [projectImages, setProjectImages] = useState<string[]>([]);
  const [projectLinkDeploy, setProjectLinkDeploy] = useState<string | null>(
    null,
  );

  // Cargar imágenes del bucket de Supabase
  useEffect(() => {
    if (project.links.find((link) => link.label === "deploy")) {
      setProjectLinkDeploy(
        project.links.find((link) => link.label === "deploy").url,
      );
    }

    const loadProjectImages = async () => {
      try {
        if (project.bucket_folder) {
          const { data, error } = await supabase.storage
            .from(project.bucket_folder)
            .list();

          if (error) {
            console.error("Error loading project images:", error);
            setProjectImages([project.cover_img]);
            return;
          }

          if (data) {
            const imageUrls = data
              .filter(
                (file) =>
                  file.name.includes(".jpg") ||
                  file.name.includes(".png") ||
                  file.name.includes(".webp"),
              )
              .map((file) => {
                const { data } = supabase.storage
                  .from(project.bucket_folder)
                  .getPublicUrl(file.name);
                return data.publicUrl;
              });

            // Asegurar que las imágenes sean únicas y filtrar valores vacíos
            const allImages = Array.from(
              new Set([project.cover_img, ...imageUrls]),
            ).filter((img) => img && img.trim() !== "");
            setProjectImages(allImages);
          }
        } else {
          // Si no hay bucket_folder, mostrar solo la cover_image
          const defaultImages = project.cover_img ? [project.cover_img] : [];
          setProjectImages(defaultImages);
        }
      } catch (error) {
        console.error("Error loading project images:", error);
        // Si hay error, al menos mostrar la cover_image
        const fallbackImages = project.cover_img ? [project.cover_img] : [];
        setProjectImages(fallbackImages);
      }
    };

    if (isOpen) {
      loadProjectImages();
    }
  }, [isOpen, project.bucket_folder, project.cover_img]);

  const nextImage = () => {
    setDirection(1);
    setCurrentImageIndex((prev) => (prev + 1) % projectImages.length);
  };

  const previousImage = () => {
    setDirection(-1);
    setCurrentImageIndex(
      (prev) => (prev - 1 + projectImages.length) % projectImages.length,
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            key="modal-content"
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{
              duration: 0.4,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="relative bg-[#111111]/90 backdrop-blur-3xl border-none md:border md:border-white/10 rounded-none md:rounded-[2.5rem] max-w-8xl w-full h-full md:w-[85vw] md:h-[90vh] overflow-hidden shadow-[0_0_100px_rgba(36,0,70,0.3)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fondo gradiente difuminado */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#240046]/40 blur-[120px] rounded-full" />
              <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-[#240046]/30 blur-[100px] rounded-full" />
            </div>

            {/* Contenedor principal */}
            <div className="relative flex flex-col h-full z-10 px-2 py-2">
              {/* Header con botón de cierre */}
              <div className="absolute top-6 right-8 z-20">
                <motion.button
                  onClick={onClose}
                  className="w-12 h-12 rounded-full bg-[var(--text)]/5 backdrop-blur-xl border border-[var(--text)]/10 flex items-center justify-center text-[var(--text)]/50 hover:text-[var(--text)] hover:bg-[var(--text)]/10 transition-all duration-300"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={24} />
                </motion.button>
              </div>

              {/* Contenido */}
              <div className="flex-1 overflow-y-auto p-4 md:p-10">
                {/* Título grande */}
                <div className="flex flex-col w-full px-5">
                  <p className="text-[#e0c4ff] text-md tracking-widest font-semibold ">
                    {project.launch_date
                      ? new Date(project.launch_date).toLocaleDateString(
                          "es-ES",
                          {
                            year: "numeric",
                          },
                        )
                      : "Fecha por definir"}
                  </p>
                  <h1 className="text-4xl md:text-7xl font-bold text-[var(--text)] mb-4">
                    {project.name}
                  </h1>

                  {/* Nombre de la empresa */}
                  {project.company_name && (
                    <p className="text-[var(--text)]/60 text-lg mb-8">
                      Desarrollado para{" "}
                      <span className="text-[var(--primary)]">
                        {project.company_name}
                      </span>
                    </p>
                  )}
                </div>

                {/* Carrusel de imágenes */}
                <div className="relative mb-12 w-full md:max-w-2/5 z-0 mx-auto">
                  <div className="relative h-64 md:h-80 rounded-2xl bg-[#111111]/50">
                    {/* Vista previa de imagen anterior */}
                    {projectImages.length > 1 && (
                      <motion.div
                        onClick={previousImage}
                        className="hidden md:block absolute cursor-pointer -left-40 top-0 w-1/3 h-full z-1 overflow-hidden rounded-l-2xl group/prev"
                        whileHover={{ x: 10, scale: 1.02 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                        }}
                      >
                        <motion.img
                          src={
                            projectImages[
                              (currentImageIndex - 1 + projectImages.length) %
                                projectImages.length
                            ] || project.cover_img
                          }
                          alt="Imagen anterior"
                          className="w-full h-full object-cover scale-110 opacity-30 group-hover/prev:opacity-60 transition-opacity"
                          style={{ objectPosition: "left center" }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#111111] to-transparent" />
                      </motion.div>
                    )}

                    {/* Imagen actual */}
                    <AnimatePresence mode="popLayout" custom={direction}>
                      <motion.div
                        key={currentImageIndex}
                        custom={direction}
                        variants={{
                          enter: (direction: number) => ({
                            x: direction > 0 ? 200 : -200,
                            opacity: 0,
                            scale: 0.9,
                          }),
                          center: {
                            zIndex: 1,
                            x: 0,
                            opacity: 1,
                            scale: 1,
                          },
                          exit: (direction: number) => ({
                            zIndex: 0,
                            x: direction < 0 ? 200 : -200,
                            opacity: 0,
                            scale: 0.9,
                          }),
                        }}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                          x: { type: "spring", stiffness: 300, damping: 30 },
                          opacity: { duration: 0.2 },
                        }}
                        className="absolute inset-0 flex items-center justify-center rounded-2xl overflow-hidden"
                      >
                        {/* Fondo difuminado */}
                        <img
                          src={
                            projectImages[currentImageIndex] ||
                            project.cover_img
                          }
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-40 scale-110"
                        />

                        {/* Imagen principal */}
                        <img
                          src={
                            projectImages[currentImageIndex] ||
                            project.cover_img
                          }
                          alt={`${project.name} - Imagen ${currentImageIndex + 1}`}
                          className="relative z-10 w-full h-full object-contain cursor-zoom-in drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] active:scale-95 transition-transform"
                          onClick={() => setIsLightboxOpen(true)}
                        />
                      </motion.div>
                    </AnimatePresence>

                    {/* Vista previa de imagen siguiente */}
                    {projectImages.length > 1 && (
                      <motion.div
                        onClick={nextImage}
                        className="hidden md:block absolute cursor-pointer z-1 -right-60 top-0 w-2/5 h-full overflow-hidden rounded-r-2xl group/next"
                        whileHover={{ x: -10, scale: 1.02 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                        }}
                      >
                        <motion.img
                          src={
                            projectImages[
                              (currentImageIndex + 1) % projectImages.length
                            ] || project.cover_img
                          }
                          alt="Imagen siguiente"
                          className="w-full h-full object-cover scale-110 opacity-30 group-hover/next:opacity-60 transition-opacity"
                          style={{ objectPosition: "right center" }}
                        />
                        <div className="absolute inset-0 bg-linear-to-l from-[#111111] to-transparent" />
                      </motion.div>
                    )}

                    {/* Controles del carrusel de imágenes */}
                    {projectImages.length > 1 && (
                      <>
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 z-20">
                          {projectImages.map((_, index) => (
                            <motion.button
                              key={index}
                              onClick={() => {
                                setCurrentImageIndex(index);
                                // handleUserInteraction();
                              }}
                              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                                index === currentImageIndex
                                  ? "bg-[var(--primary)] w-6"
                                  : "bg-[var(--text)]/30 hover:bg-[var(--text)]/50"
                              }`}
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.8 }}
                              aria-label={`Ir al proyecto ${index + 1}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Tres columnas principales */}
                <div className="flex flex-col md:flex-row gap-12 mb-8">
                  {/* Columna 1: Tecnologías */}
                  <div className="w-full md:w-1/4">
                    <div className="border-l-3    border-[#e0c4ff] ">
                      <h3 className="text-md uppercase px-5 tracking-widest font-semibold text-[var(--text)]/70 mb-4">
                        Tecnologías
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {project.technologies?.map((tech, i) => (
                        <div
                          key={tech.id || i}
                          className="flex items-center gap-3 p-3 rounded-xl transition-colors duration-200"
                        >
                          <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center overflow-hidden">
                            {tech.icon_url ? (
                              <img
                                src={tech.icon_url}
                                alt={tech.name}
                                className="w-6 h-6 object-contain filter brightness-100"
                              />
                            ) : (
                              <span className="text-[8px] uppercase tracking-widest text-[var(--text)]/50 font-bold">
                                {tech.name.slice(0, 2)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium text-md">
                              {tech.name}
                            </p>
                            <p className="text-[var(--text)]/60 uppercase tracking-widest text-xs">
                              {tech.category}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Columna 2: Descripción */}
                  <div className="w-full md:w-1/2">
                    <div className="border-l-3   border-[#e0c4ff] ">
                      <h3 className="text-md uppercase px-5 tracking-widest font-semibold text-white/70 mb-4">
                        Descripción
                      </h3>
                    </div>
                    <div className="p-4 rounded-xl">
                      <p className="text-[var(--text)]/80 leading-relaxed text-left whitespace-pre-line">
                        {project.description
                          ?.split(". ")
                          .reduce((acc: string[], sentence, index) => {
                            const chunkIndex = Math.floor(index / 6);
                            if (!acc[chunkIndex]) acc[chunkIndex] = "";
                            acc[chunkIndex] +=
                              (acc[chunkIndex] ? " " : "") +
                              sentence +
                              (sentence.endsWith(".") ? "" : ".");
                            return acc;
                          }, [])
                          .join("\n\n")}
                      </p>
                    </div>
                  </div>

                  {/* Columna 3: Enlaces y redes sociales */}
                  <div className="w-full md:w-1/4 md:px-8">
                    <div className="border-l-3   border-[#e0c4ff] ">
                      <h3 className="text-md uppercase px-5 tracking-widest font-semibold text-[var(--text)]/70 mb-4">
                        Enlaces y Redes
                      </h3>
                    </div>
                    <div className="flex flex-col gap-5">
                      {projectLinkDeploy && (
                        <motion.a
                          href={projectLinkDeploy}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center justify-between w-full px-8 py-3 rounded-2xl bg-[#240046] hover:bg-[#2d0058] border border-white/5 hover:border-white/10 transition-all duration-500 shadow-[0_8px_30px_rgba(36,0,70,0.4)] hover:shadow-[0_8px_40px_rgba(224,196,255,0.2)]"
                          whileHover={{ y: -4 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <span className="text-white font-bold text-md tracking-wider group-hover:text-[#e0c4ff] transition-colors duration-300">
                            Ver Web Desplegada
                          </span>
                          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 group-hover:bg-[#e0c4ff]/20 transition-all duration-300 overflow-hidden">
                            <ArrowUpRight
                              size={22}
                              className="text-white/80 group-hover:text-[#e0c4ff] transition-all duration-500 transform group-hover:translate-x-1 group-hover:-translate-y-1"
                            />
                          </div>
                        </motion.a>
                      )}
                      <div className="flex flex-row flex-wrap gap-3">
                        {project.links
                          ?.filter((link) => link.label !== "deploy")
                          .map((link, i) => {
                            const iconMap: Record<string, string> = {
                              instagram:
                                "https://cdn.simpleicons.org/instagram/e0c4ff",
                              facebook:
                                "https://cdn.simpleicons.org/facebook/e0c4ff",
                              github:
                                "https://cdn.simpleicons.org/github/e0c4ff",
                              x: "https://cdn.simpleicons.org/x/e0c4ff",
                              gitlab:
                                "https://cdn.simpleicons.org/gitlab/e0c4ff",
                              tiktok:
                                "https://cdn.simpleicons.org/tiktok/e0c4ff",
                            };

                            const iconUrl =
                              iconMap[link.label.toLowerCase()] ||
                              "https://www.svgrepo.com/show/521639/external-link.svg";

                            return (
                              <motion.a
                                key={link.id || i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={link.label}
                                className="group flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-[#e0c4ff]/10 hover:border-[#e0c4ff]/30 transition-all duration-300 shadow-lg"
                                whileHover={{ y: -5 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <img
                                  src={iconUrl}
                                  alt={link.label}
                                  className="w-6 h-6 object-contain opacity-70 group-hover:opacity-100 transition-opacity"
                                />
                              </motion.a>
                            );
                          })}
                      </div>
                      {/* Project Status Widget */}
                      <div className="mt-0 p-6 rounded-2xl bg-black/40 backdrop-blur-md border border-white/5 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--text)]/30 mb-4">
                          Project Status
                        </p>

                        <div className="flex items-center gap-3">
                          {(() => {
                            const statusConfig = {
                              finished: {
                                label: "Finalizado",
                                color: "bg-[#10b981]",
                                glow: "shadow-[0_0_20px_rgba(16,185,129,0.4)]",
                              },
                              in_development: {
                                label: "En Desarrollo",
                                color: "bg-[#3b82f6]",
                                glow: "shadow-[0_0_20px_rgba(59,130,246,0.4)]",
                              },
                              maintenance: {
                                label: "Mantenimiento",
                                color: "bg-[#f59e0b]",
                                glow: "shadow-[0_0_20px_rgba(245,158,11,0.4)]",
                              },
                              planning: {
                                label: "Planificación",
                                color: "bg-[#a855f7]",
                                glow: "shadow-[0_0_20px_rgba(168,85,247,0.4)]",
                              },
                            };
                            const config =
                              statusConfig[
                                project.status as keyof typeof statusConfig
                              ] || statusConfig.planning;

                            return (
                              <>
                                <div
                                  className={`w-2.5 h-2.5 rounded-full ${config.color} ${config.glow} animate-pulse`}
                                />
                                <span className="text-xl font-semibold text-[var(--text)]/90 tracking-tight">
                                  {config.label}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      <Lightbox
        open={isLightboxOpen}
        close={() => setIsLightboxOpen(false)}
        index={currentImageIndex}
        plugins={[Fullscreen, Zoom]}
        zoom={{
          maxZoom: 3,
        }}
        slides={projectImages.map((src) => ({ src }))}
        carousel={{
          finite: projectImages.length <= 1,
        }}
        render={{
          iconPrev: () => <ChevronLeft size={32} />,
          iconNext: () => <ChevronRight size={32} />,
          iconClose: () => <X size={32} />,
        }}
      />
    </AnimatePresence>
  );
};
