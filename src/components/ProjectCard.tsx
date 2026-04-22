import React from "react";
import { motion } from "motion/react";
import { Circle } from "lucide-react";
import { ProjectModal } from "./ProjectModal";
import type { Project, ProjectStatus } from "../types/project";
import { useModalStore } from "../store/useModalStore";

interface ProjectCardProps {
  project: Project;
  isActive?: boolean;
}

const statusLabels: Record<ProjectStatus, string> = {
  in_development: "En Desarrollo",
  finished: "Finalizado",
  maintenance: "Mantenimiento",
  planning: "Planificación",
};

const statusColors: Record<ProjectStatus, string> = {
  in_development: "blue-400",
  finished: "green-400",
  maintenance: "yellow-400",
  planning: "purple-400",
};
const statusColorsFill: Record<ProjectStatus, string> = {
  in_development: "#3b82f6",
  finished: "#10b981",
  maintenance: "#f59e0b",
  planning: "#8b5cf6",
};

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, isActive = false }) => {
  const { isModalOpen, setIsModalOpen } = useModalStore();

  return (
    <>
      <motion.div
        className={`relative w-full max-w-4xl mx-auto h-[500px] rounded-3xl overflow-hidden shadow-2xl border border-[var(--text)]/10 bg-[var(--bg)]/40 backdrop-blur-xl ${
          isActive ? "ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--bg)]" : ""
        }`}
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ 
          opacity: isActive ? 1 : 0.7, 
          scale: isActive ? 1 : 0.95,
          y: 0,
          zIndex: isActive ? 10 : 1
        }}
        transition={{ 
          duration: 0.6, 
          ease: "easeOut",
          scale: { type: "spring", stiffness: 300, damping: 30 }
        }}
        whileHover={{ 
          scale: isActive ? 1.02 : 1,
          borderColor: "rgba(124, 77, 255, 0.3)",
          transition: { duration: 0.3 },
          cursor: "pointer"
        }}
        onClick={() => setIsModalOpen(true)}
      >
      {/* Imagen de portada */}
      <div className="absolute inset-0">
        <img
          src={project.cover_img}
          alt={project.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?q=80&w=800&auto=format&fit=crop";
          }}
        />
        {/* Overlay gradiente */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/60 to-transparent" />
      </div>

      {/* Contenido */}
      <div className="relative h-full">
        {/* Contenido inferior */}
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
          <div className="flex items-end justify-between w-full">
            {/* Izquierda: Título y estado */}
            <div className="flex flex-col">
              <h3 className="text-4xl md:text-5xl font-bold text-[var(--text)] leading-tight mb-3">
                {project.name}
              </h3>
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full `}><Circle fill={statusColorsFill[project.status]}  size={8} color="none" /></span>
                <span className={`text-xs font-medium text-${statusColors[project.status]}`}>
                  {statusLabels[project.status]}
                </span>
                <span className="text-[var(--text)]/50 text-xs">·</span>
                <span className="text-[var(--text)]/60 text-xs">
                  {project.launch_date ? new Date(project.launch_date).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  }) : 'Fecha por definir'}
                </span>
              </div>
            </div>

            {/* Derecha: Tecnologías y texto de clic */}
            <div className="flex flex-col items-end">
              <div className="flex flex-wrap justify-end gap-2 mb-3">
                {project.technologies?.slice(0, 4).map((tech) => (
                  <div
                    key={tech.id}
                    className="w-10 h-10 rounded-xl bg-[var(--text)]/10 backdrop-blur-sm border border-[var(--text)]/20 flex items-center justify-center overflow-hidden group hover:bg-[var(--text)]/20 transition-colors duration-200"
                    title={tech.name}
                  >
                    {tech.icon_url ? (
                      <img
                        src={tech.icon_url}
                        alt={tech.name}
                        className="w-6 h-6 object-contain filter brightness-100 group-hover:brightness-110 transition-all duration-200"
                      />
                    ) : (
                      <span className="text-[8px] uppercase tracking-widest text-[var(--text)]/50 font-bold">
                        {tech.name.slice(0, 2)}
                      </span>
                    )}
                  </div>
                ))}
                {project.technologies && project.technologies.length > 4 && (
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/20 backdrop-blur-sm border border-[var(--primary)]/30 flex items-center justify-center">
                    <span className="text-xs text-[var(--primary)] font-bold">
                      +{project.technologies.length - 4}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-[var(--text)]/70 text-sm">
                Click para más detalles
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
      <ProjectModal 
        project={project} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};
