import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProjectCard } from "./ProjectCard";
import { fetchProjects } from "../services/projectService";
import type { Project } from "../types/project";

export const ProjectCarouselMobile: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  // Cargar proyectos desde Supabase
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await fetchProjects();
        setProjects(data);
      } catch (error) {
        console.error("Error loading projects:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, []);

  // Auto-cambio cada 10 segundos con barra de progreso
  useEffect(() => {
    if (isPaused || projects.length <= 1 || isLoading) return;

    let startTime = Date.now();
    const duration = 10000; // 10 segundos

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = (elapsed % duration) / duration;
      
      setProgress(newProgress);
      
      if (elapsed >= duration) {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % projects.length);
        startTime = Date.now();
        setProgress(0);
      }
    }, 50); // Actualizar cada 50ms para animación suave

    return () => clearInterval(interval);
  }, [isPaused, projects.length, isLoading]);

  // Resetear progreso cuando cambia el proyecto
  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  const goToNextProject = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % projects.length);
  }, [projects.length]);

  const goToPreviousProject = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + projects.length) % projects.length);
  }, [projects.length]);

  const goToProject = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Pausar el auto-cambio cuando el usuario interactúa
  const handleUserInteraction = () => {
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 30000); // Reanudar después de 30 segundos
  };

  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-4xl">
          <div className="h-64 bg-[var(--bg)]/40 rounded-3xl border border-[var(--text)]/10" />
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text)]/60 mb-4">No hay proyectos disponibles</p>
          <p className="text-[var(--text)]/40 text-sm">Los proyectos aparecerán aquí una vez que se agreguen a la base de datos</p>
        </div>
      </div>
    );
  }

  const currentProject = projects[currentIndex];
  const nextProject = projects.length > 1 ? projects[(currentIndex + 1) % projects.length] : null;
  const previousProject = projects.length > 1 ? projects[(currentIndex - 1 + projects.length) % projects.length] : null;

  return (
    <div 
      className="relative w-full h-full flex flex-col items-center justify-center py-8"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Contenedor principal del carrusel mobile */}
      <div className="relative w-full max-w-md mx-auto">
        {/* Vista previa sutil del proyecto anterior */}
        {previousProject && (
          <motion.div
            initial={{ opacity: 0, x: -30, scale: 0.95 }}
            animate={{ opacity: 0.15, x: -15, scale: 0.95 }}
            exit={{ opacity: 0, x: 30, scale: 0.95 }}
            transition={{ 
              duration: 0.4,
              ease: [0.4, 0, 0.2, 1]
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-1/4 h-32 rounded-2xl overflow-hidden z-0"
          >
            <img
              src={previousProject?.cover_img}
              alt={previousProject?.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?q=80&w=800&auto=format&fit=crop";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/80 to-transparent" />
          </motion.div>
        )}

        {/* Vista previa sutil del siguiente proyecto */}
        {nextProject && (
          <motion.div
            initial={{ opacity: 0, x: 30, scale: 0.95 }}
            animate={{ opacity: 0.15, x: 15, scale: 0.95 }}
            exit={{ opacity: 0, x: -30, scale: 0.95 }}
            transition={{ 
              duration: 0.4,
              ease: [0.4, 0, 0.2, 1]
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-1/4 h-32 rounded-2xl overflow-hidden z-0"
          >
            <img
              src={nextProject?.cover_img}
              alt={nextProject?.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?q=80&w=800&auto=format&fit=crop";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/80 to-transparent" />
          </motion.div>
        )}

        {/* Tarjeta de proyecto actual */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, scale: 0.9 }}
            transition={{ 
              duration: 0.4,
              ease: [0.4, 0, 0.2, 1],
              scale: { type: "spring", stiffness: 400, damping: 25 }
            }}
            className="w-full flex justify-center z-10"
          >
            <ProjectCard project={currentProject} isActive={true} />
          </motion.div>
        </AnimatePresence>

        {/* Barra de progreso y navegación simplificada */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[var(--bg)]/80 backdrop-blur-xl border border-[var(--text)]/20 rounded-full px-4 py-2 z-20">
          {/* Botón Previous */}
          <motion.button
            onClick={() => {
              goToPreviousProject();
              handleUserInteraction();
            }}
            className="text-[var(--text)]/60 hover:text-[var(--text)] transition-colors duration-200"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Proyecto anterior"
          >
            <ChevronLeft size={14} />
          </motion.button>

          {/* Barra de progreso */}
          <div className="flex items-center gap-2">
            <div className="w-24 h-1 bg-[var(--text)]/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[var(--primary)] rounded-full"
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.05, ease: "linear" }}
              />
            </div>
            <span className="text-[var(--text)]/60 text-xs font-medium min-w-8">
              {Math.ceil((1 - progress) * 10)}s
            </span>
          </div>

          {/* Botón Next */}
          <motion.button
            onClick={() => {
              goToNextProject();
              handleUserInteraction();
            }}
            className="text-[var(--text)]/60 hover:text-[var(--text)] transition-colors duration-200"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Siguiente proyecto"
          >
            <ChevronRight size={14} />
          </motion.button>
        </div>

        {/* Indicadores de página (más pequeños y sutiles) */}
        <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-1">
          {projects.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => {
                goToProject(index);
                handleUserInteraction();
              }}
              className={`w-1 h-1 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? "bg-[var(--text)]/60 w-3" 
                  : "bg-[var(--text)]/15 hover:bg-[var(--text)]/30"
              }`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.8 }}
              aria-label={`Ir al proyecto ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
