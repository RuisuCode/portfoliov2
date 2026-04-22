import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { list_table_content } from "./shared/constants/content_table_list";
import { supabase } from "../utils/supabase";
import { ArrowUpRight, BookOpenText, BookText, Moon, Sun } from "lucide-react";
import { ProjectCarousel } from "./components/ProjectCarousel";
import { ProjectCarouselMobile } from "./components/ProjectCarouselMobile";
import ContactForm from "./components/ContactForm";
import profile from "../public/assets/foto_perfil_2.jpg";

import { useModalStore } from "./store/useModalStore";

type TechnologyLevel = "low" | "mid" | "high" | "very_high";
type CategoryType =
  | "cloud"
  | "database"
  | "frontend"
  | "languages"
  | "frameworks"
  | "devops/ci-cd";

type Technology = {
  id: number;
  name: string;
  icon_url: string | null;
  level: TechnologyLevel;
  experience_start_date: string;
  category: CategoryType;
};

const categoryLabels: Record<CategoryType, string> = {
  cloud: "Cloud Computing",
  database: "Database",
  frontend: "Frontend",
  languages: "Lenguajes",
  frameworks: "Frameworks",
  "devops/ci-cd": "DevOps / CI-CD",
};

const categoryDescriptions: Record<CategoryType, string> = {
  languages:
    "Base de todo stack: lenguajes claros y mantenibles que impulsan tanto la capa de cliente como la lógica de servidor.",
  frameworks:
    "Marcos y librerías que aceleran la construcción de interfaces y APIs, respaldando aplicaciones modernas y reactivas.",
  cloud:
    "Servicios en la nube diseñados para desplegar, escalar y asegurar aplicaciones en producción a nivel global.",
  "devops/ci-cd":
    "Pipelines, automatización y despliegue continuo para garantizar entregas rápidas y confiables en cada ciclo.",
  database:
    "Modelado y almacenamiento de datos organizado, optimizado para consultas, consistencia y rendimiento del backend.",
  frontend:
    "Experiencia de usuario refinada con interfaces accesibles, fluidas y alineadas con el estilo visual del producto.",
};

const levelLabels: Record<TechnologyLevel, string> = {
  low: "Bajo",
  mid: "Intermedio",
  high: "Avanzado",
  very_high: "Experto",
};

const levelBarStyles: Record<
  TechnologyLevel,
  { width: string; color: string }
> = {
  low: { width: "28%", color: "bg-[#8b5cf6]" },
  mid: { width: "55%", color: "bg-[#c084fc]" },
  high: { width: "78%", color: "bg-[#d8b4fe]" },
  very_high: { width: "100%", color: "bg-[#e9d5ff]" },
};

const categoryOrder: CategoryType[] = [
  "languages",
  "frameworks",
  "cloud",
  "devops/ci-cd",
  "database",
  "frontend",
];

const formatExperience = (startDate: string) => {
  const start = new Date(startDate);
  const diff = Date.now() - start.getTime();
  const months = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24 * 30)));

  if (months < 12) {
    return `${months} mes${months === 1 ? "" : "es"}`;
  }

  const years = Math.floor(months / 12);
  const remainder = months % 12;
  return remainder === 0
    ? `${years} año${years === 1 ? "" : "s"}`
    : `${years} año${years === 1 ? "" : "s"} ${remainder} mes${remainder === 1 ? "" : "es"}`;
};

async function fetchTechnologies() {
  const { data, error } = await supabase
    .from("technologies")
    .select("id, name, icon_url, level, experience_start_date, category")
    .order("experience_start_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Technology[];
}

const useActiveSection = (sectionIds: string[]) => {
  const [activeId, setActiveId] = useState(sectionIds[0] ?? "");
  const lastActiveRef = useRef(activeId);
  const stateRef = useRef<
    Record<
      string,
      { ratio: number; isIntersecting: boolean; top: number; height: number }
    >
  >({});

  useEffect(() => {
    lastActiveRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    // Reset internal cache when ids change
    stateRef.current = {};
    sectionIds.forEach((id) => {
      stateRef.current[id] = {
        ratio: 0,
        isIntersecting: false,
        top: Number.POSITIVE_INFINITY,
        height: 0,
      };
    });
  }, [sectionIds.join("|")]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).id;
          if (!id) continue;
          stateRef.current[id] = {
            ratio: entry.intersectionRatio,
            isIntersecting: entry.isIntersecting,
            top: entry.boundingClientRect.top,
            height: entry.boundingClientRect.height,
          };
        }

        const viewportCenterY = window.innerHeight / 2;
        const candidates = Object.entries(stateRef.current)
          .filter(([, v]) => v.isIntersecting)
          .map(([id, v]) => {
            const centerY = v.top + v.height / 2;
            const distToCenter = Math.abs(centerY - viewportCenterY);
            return { id, ...v, distToCenter };
          });

        if (candidates.length === 0) return;

        candidates.sort((a, b) => {
          // Primary: more visible
          if (b.ratio !== a.ratio) return b.ratio - a.ratio;
          // Secondary: closer to center of viewport
          if (a.distToCenter !== b.distToCenter)
            return a.distToCenter - b.distToCenter;
          // Tertiary: stable order by DOM-ish top
          return a.top - b.top;
        });

        const bestId = candidates[0]!.id;
        if (bestId && bestId !== lastActiveRef.current) setActiveId(bestId);
      },
      {
        // Prioriza el "centro" del viewport para dar más precisión al volver hacia arriba.
        rootMargin: "-40% 0px -55% 0px",
        threshold: [0, 0.05, 0.1, 0.2, 0.35, 0.5],
      },
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sectionIds.join("|")]);

  return activeId;
};

export default function Portfolio() {
  const activeSection = useActiveSection(list_table_content);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showActiveToast, setShowActiveToast] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [isEyeCareMode, setIsEyeCareMode] = useState(false);

  // Theme Colors based on user request
  const primaryColor = isDarkMode ? "#e0c4ff" : "#7C4DFF";
  const secondaryColor = isDarkMode ? "#240046" : "#7C4DFF";
  const tertiaryColor = "#FFAB91"; // Requested tertiary
  const bgColor = isDarkMode ? "#111111" : "#E0E0E0";
  const textColor = isDarkMode ? "#ffffff" : "#0f0f0f";
  const { isModalOpen } = useModalStore();

  const {
    data: technologies = [],
    isLoading: technologiesLoading,
    isError: technologiesError,
    error: technologiesErrorObject,
  } = useQuery({
    queryKey: ["technologies"],
    queryFn: fetchTechnologies,
  });

  const technologiesByCategory = useMemo(() => {
    const grouped: Record<CategoryType, Technology[]> = categoryOrder.reduce(
      (acc, category) => {
        acc[category] = [];
        return acc;
      },
      {} as Record<CategoryType, Technology[]>,
    );

    technologies.forEach((technology) => {
      grouped[technology.category].push(technology);
    });

    Object.values(grouped).forEach((items) =>
      items.sort(
        (a, b) =>
          new Date(a.experience_start_date).getTime() -
          new Date(b.experience_start_date).getTime(),
      ),
    );

    return grouped;
  }, [technologies]);

  const activeCategories = categoryOrder.filter(
    (category) => technologiesByCategory[category]?.length > 0,
  );

  useEffect(() => {
    if (isBioExpanded || isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isBioExpanded, isModalOpen]);

  useEffect(() => {
    const update = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      setScrollProgress(window.scrollY / max);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    const timeoutShow = window.setTimeout(() => setShowActiveToast(true), 0);
    const timeoutHide = window.setTimeout(
      () => setShowActiveToast(false),
      1000,
    );

    return () => {
      window.clearTimeout(timeoutShow);
      window.clearTimeout(timeoutHide);
    };
    // setShowActiveToast(true);
    // const t = window.setTimeout(() => setShowActiveToast(false), 1000);
    // return () => window.clearTimeout(t);
  }, [activeSection]);

  return (
    <div
      style={
        {
          "--primary": primaryColor,
          "--secondary": secondaryColor,
          "--tertiary": tertiaryColor,
          "--bg": bgColor,
          "--text": textColor,
        } as React.CSSProperties
      }
      className={[
        "relative min-h-screen flex flex-col items-center justify-center overflow-hidden font-sans transition-colors duration-500",
        isDarkMode
          ? "selection:bg-[#240046] selection:text-white"
          : "selection:bg-[#448AFF] selection:text-white",
        "bg-[var(--bg)] text-[var(--text)]",
      ].join(" ")}
    >
      {/* Animated Background Gradient */}
      <motion.div
        className="fixed top-1/2 left-1/2 rounded-full pointer-events-none z-0"
        style={{
          width: "120vw",
          height: "120vw",
          minWidth: "800px",
          minHeight: "800px",
          background: `radial-gradient(circle, var(--secondary) 0%, ${isDarkMode ? "rgba(17,17,17,0)" : "rgba(224,224,224,0)"} 60%)`,
          filter: "blur(100px)",
        }}
        animate={{
          x: ["-50%", "-50%", "-50%"],
          y: ["-50%", "calc(-50% + 80px)", "-50%"],
          scale: [1, 1.3, 1],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 60,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />

      {/* Eye-care overlay (no layout/position side effects like CSS filter) */}
      <motion.div
        className="fixed inset-0 z-5 pointer-events-none"
        initial={false}
        animate={{ opacity: isEyeCareMode ? 1 : 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div
          className={[
            "absolute inset-0",
            // Warm tint + slight soften, works both in dark/light
            isDarkMode ? "bg-[#ffb703]/10" : "bg-[#ffb703]/12",
          ].join(" ")}
        />
        <div className="absolute inset-0 bg-black/5" />
      </motion.div>

      {/* Top-right actions */}
      <div className="fixed top-4 right-4 z-[60] flex items-center gap-2">
        <motion.button
          type="button"
          aria-label={
            isDarkMode ? "Cambiar a modo día" : "Cambiar a modo noche"
          }
          onClick={() => setIsDarkMode((v) => !v)}
          className={[
            "inline-flex h-10 w-11 items-center justify-center",
            "rounded-lg border backdrop-blur-xl",
            "transition-colors duration-300",
            isDarkMode
              ? "border-white/10 bg-[#111111]/40 text-white/80 hover:bg-white/10 hover:text-white"
              : "border-black/10 bg-white/60 text-black/70 hover:bg-black/5 hover:text-black",
          ].join(" ")}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 700, damping: 40 }}
        >
          <motion.span
            key={isDarkMode ? "moon" : "sun"}
            initial={{ opacity: 0, rotate: -20, scale: 0.9 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
          </motion.span>
        </motion.button>

        <motion.button
          type="button"
          aria-label={
            isEyeCareMode
              ? "Desactivar protector de vista"
              : "Activar protector de vista"
          }
          onClick={() => setIsEyeCareMode((v) => !v)}
          className={[
            "inline-flex h-10 w-11 items-center justify-center",
            "rounded-lg border backdrop-blur-xl",
            "transition-colors duration-300",
            isDarkMode
              ? "border-white/10 bg-[#111111]/40 text-white/80 hover:bg-white/10 hover:text-white"
              : "border-black/10 bg-white/60 text-black/70 hover:bg-black/5 hover:text-black",
          ].join(" ")}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 700, damping: 40 }}
        >
          <motion.span
            key={isEyeCareMode ? "eyeoff" : "eye"}
            initial={{ opacity: 0, rotate: -10, scale: 0.92 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {isEyeCareMode ? (
              <BookOpenText size={18} />
            ) : (
              <BookText size={18} />
            )}
          </motion.span>
        </motion.button>
      </div>

      {/* Mobile Progress + Active section toast */}
      <div className="fixed top-0 left-0 right-0 z-50 md:hidden">
        <div className="relative h-[2px] bg-white/10">
          <motion.div
            className="absolute left-0 top-0 h-full bg-[#e0c4ff]"
            animate={{ width: `${Math.round(scrollProgress * 100)}%` }}
            transition={{ type: "tween", duration: 0.15 }}
          />
        </div>

        <motion.div
          className="pointer-events-none flex justify-center pt-3"
          initial={false}
          animate={{
            opacity: showActiveToast ? 1 : 0,
            y: showActiveToast ? 0 : -8,
          }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <div className="backdrop-blur-xl bg-[var(--bg)]/60 border border-[var(--text)]/10 rounded-full px-4 py-2 text-[11px] tracking-[0.22em] uppercase font-bold text-[var(--primary)]">
            {activeSection}
          </div>
        </motion.div>
      </div>

      {/* Navigation Sidebar */}
      <AnimatePresence>
        {!isBioExpanded && !isModalOpen && (
          <motion.div
            initial={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed right-6 md:right-12 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-6 items-end z-50"
          >
            {list_table_content.map((item) => {
              return (
                <motion.div
                  key={item}
                  onClick={() => {
                    document.getElementById(item)?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                  className="flex items-center gap-4 group cursor-pointer select-none"
                  animate={{ marginRight: item === activeSection ? 24 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                >
                  <span
                    className={`text-[10px] tracking-[0.2em] capitalize ${item === activeSection ? "text-[var(--primary)]" : "text-transparent group-hover:text-[var(--text)]/40 transition-colors duration-300"} font-bold`}
                  >
                    {item}
                  </span>
                  <div
                    className={`w-2 h-2 rounded-full ${item === activeSection ? "bg-[var(--primary)] w-3 h-3 shadow-[0_0_12px_var(--primary)]" : "bg-[var(--text)]/20 group-hover:bg-[var(--text)]/40 transition-colors duration-300 mr-[2px]"}`}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Container */}
      <motion.div
        className="relative z-10 w-full max-w-5xl px-6 pt-28 md:py-20 pb-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        <div id="biografia" className="w-full relative scroll-mt-32">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Hola, soy{" "}
              <span className="text-[var(--primary)] ">Luis Campos</span>
            </h1>
          </div>

          {/* Glassmorphism Card */}
          <AnimatePresence mode="popLayout">
            {!isBioExpanded && (
              <motion.div
                layoutId="bio-card"
                className="group bg-[var(--bg)]/40 backdrop-blur-xl rounded-3xl border border-[var(--text)]/10 p-8 md:p-16 text-center shadow-[0_0_18px_rgba(0,0,0,0.16)] relative overflow-hidden transition-all duration-300"
                whileHover={{ borderColor: "rgba(255,255,255,0.22)" }}
                transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="relative w-full h-full"
                >
                  {/* Subtle inner highlight */}
                  <div className="absolute top-0 left-0 right-0 h-1px bg-linear-to-r from-transparent via-[var(--text)]/10 to-transparent" />

                  <p className="text-xs tracking-[0.3em] text-[var(--text)]/40 uppercase mb-8">
                    Carta de presentación
                  </p>

                  <p className="text-lg md:text-2xl text-[var(--text)]/70 leading-relaxed font-light max-w-3xl mx-auto mb-16">
                    Desarrollador con experiencia tanto{" "}
                    <strong className="text-[var(--text)] font-medium">
                      académica como laboral
                    </strong>
                    . Un profesional proactivo con facilidad de comunicación en
                    español e inglés técnico, habituado a trabajar en equipos
                    grandes y pequeños, con lógica excelente para adaptarse a
                    nuevos desarrollos, paciente y dedicado.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 relative">
                    <div className="absolute top-0 bottom-0 left-1/2 w-1px bg-[var(--text)]/5 hidden md:block" />
                    <div>
                      <p className="text-xs tracking-[0.2em] text-[var(--text)]/40 uppercase mb-3">
                        Ubicación
                      </p>
                      <p className="text-[var(--text)]/90 font-medium">
                        Venezuela, VE / Remote GMT-4
                      </p>
                    </div>
                    <div>
                      <p className="text-xs tracking-[0.2em] text-[var(--text)]/40 uppercase mb-3">
                        Enfoque
                      </p>
                      <p className="text-[var(--text)]/90 font-medium">
                        Full Stack Developer & AI Cloud Engineer
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-center gap-6">
                    <button
                      onClick={() => setIsBioExpanded(true)}
                      className=" text-[var(--bg)] bg-[var(--primary)] px-8 py-4 rounded-xl text-xs font-bold tracking-widest uppercase hover:opacity-90 hover:scale-105 active:scale-95 transition-all duration-300"
                    >
                      Leer Biografía
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Indicator: Next Section */}
          <div
            className="mt-20 flex flex-col items-center gap-4 cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
            onClick={() =>
              document
                .getElementById("formacion")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          >
            <div className="h-20 w-[1px] bg-linear-to-b from-[var(--text)]/20 to-transparent" />
            <div className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-[var(--primary)]">
              Formación
            </div>
          </div>
        </div>

        <div className="h-40" />

        <div id="formacion" className="w-full relative scroll-mt-32 pb-20">
          {/* Indicator: Previous Section */}
          <div
            className="mb-20 flex flex-col items-center gap-4 cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
            onClick={() =>
              document
                .getElementById("biografia")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          >
            <div className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-[var(--text)]/40">
              Biografía
            </div>
            <div className="h-20 w-[1px] bg-linear-to-t from-white/20 to-transparent" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center mb-20 md:mb-32"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Formación{" "}
              <span className="relative inline-block">
                Académica
                <div className="absolute -bottom-3 left-0 right-0 h-[3px] bg-[var(--primary)]/40 rounded-full" />
              </span>{" "}
              y Cursos
            </h2>
          </motion.div>

          <div className="relative max-w-4xl mx-auto mb-32 px-4 md:px-0">
            {/* The Timeline Vertical Line */}
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              style={{ originY: 0 }}
              className="absolute left-[39px] md:left-1/2 top-4 bottom-4 w-px bg-[var(--text)]/10 md:-translate-x-1/2"
            />

            {[
              {
                year: "2013 — 2018",
                title: "Bachiller en ciencias",
                institution: "U.E.C.A Dr Braulio Perez Marcio, Maturín",
                // detail: "ESPECIALIDAD EN PERIODISMO DIGITAL",
                align: "left",
                primary: true,
              },
              {
                year: "2018 — 2019",
                title: "Ingeniería en Sistemas",
                institution: "Instituto Universitario Politecnico Santiago Mariño",
                align: "right",
              },
              {
                year: "Noviembre 2021",
                title: "Diploma Ingles A1 — A2",
                institution: "Liceo Ildefonso Nuñez Mares, Maturín",
                align: "left",
              },
              {
                year: "Febrero 2022",
                title: "Diploma Ingles B1",
                institution: "Liceo Ildefonso Nuñez Mares, Maturín",
                align: "right",
              },
              {
                year: "Noviembre 2022",
                title: "Diploma Introduccion a PHP",
                institution: "Infocentro Colegio Uruguay, Maturín",
                align: "left",
              },
              {
                year: "2022 — 2025",
                title: "Tecnico Superior Universitario en Informatica",
                institution: "Universidad Bolivariana De Venezuela, Maturín",
                detail: "Finalizado",
                align: "right",
              },
              {
                year: "2025 — Presente",
                title: "Licenciatura en Informatica",
                institution: "Universidad Bolivariana De Venezuela, Maturín",
                detail: "En curso",
                align: "left",
              },
            ].map((item, idx) => {
              const isLeft = item.align === "left";
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className={`relative group flex flex-col md:flex-row items-start md:items-center justify-between w-full mb-16 md:mb-0 md:h-48 cursor-default ${isLeft ? "md:flex-row-reverse" : ""}`}
                >
                  {/* Content Box */}
                  <div
                    className={`w-full md:w-[45%] pl-24 md:pl-0 transition-all duration-500 ease-out group-hover:scale-[1.03] ${isLeft ? "md:text-right md:pr-16 md:group-hover:-translate-x-2" : "md:text-left md:pl-16 md:group-hover:translate-x-2"}`}
                  >
                    <p className="text-[10px] tracking-[0.2em] text-[var(--primary)] uppercase mb-3 font-semibold transition-colors duration-300">
                      {item.year}
                    </p>
                    <h3 className="text-xl md:text-2xl font-bold mb-2 leading-snug transition-colors duration-300 group-hover:text-[var(--text)]">
                      {item.title}
                    </h3>
                    <p className="text-[var(--text)]/60 font-light text-sm md:text-base transition-colors duration-300 group-hover:text-[var(--text)]/80">
                      {item.institution}
                    </p>
                    {item.detail && (
                      <p className="text-[9px] tracking-[0.2em] text-[var(--text)]/30 uppercase mt-4 block md:inline-block transition-colors duration-300 group-hover:text-[var(--primary)]/50">
                        {item.detail}
                      </p>
                    )}
                  </div>

                  {/* Center Dot */}
                  <div className="absolute left-[32px] md:left-1/2 top-1 md:top-1/2 md:-translate-y-1/2 w-4 h-8 md:-translate-x-1/2 flex items-center justify-center z-10 bg-transparent">
                    <div
                      className={`w-3 h-3 rounded-full transition-all duration-500 ease-out group-hover:scale-[2.5] group-hover:shadow-[0_0_24px_var(--primary)] group-hover:bg-[var(--primary)] ${
                        item.primary
                          ? "bg-[var(--primary)] shadow-[0_0_16px_var(--primary)]"
                          : "bg-[var(--primary)]/40"
                      }`}
                    />
                  </div>

                  {/* Empty Spacer */}
                  <div className="hidden md:block w-[45%]" />
                </motion.div>
              );
            })}
          </div>

          {/* Cards at the bottom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto px-4 md:px-0">
            {/* Filosofia Card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-[var(--bg)]/40 backdrop-blur-xl rounded-[2rem] border border-[var(--text)]/5 p-8 md:p-12 relative overflow-hidden group hover:border-[var(--text)]/10 transition-all duration-300 shadow-2xl"
            >
              <p className="text-[10px] tracking-[0.2em] text-[var(--primary)] uppercase mb-4 font-bold">
                FILOSOFÍA
              </p>
              <h4 className="text-2xl md:text-3xl font-bold mb-6">
                Aprendizaje Perpetuo
              </h4>
              <p className="text-[var(--text)]/60 font-light text-sm md:text-base leading-relaxed max-w-sm">
                Cada curso y título representa un nodo en una red de
                conocimiento en constante expansión, centrada en la intersección
                de la tecnología y la humanidad.
              </p>
              <div className="absolute -bottom-10 -right-10 opacity-[0.03] text-[var(--text)] rotate-[-15deg] group-hover:scale-110 transition-transform duration-500">
                <svg
                  width="200"
                  height="200"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c3 3 9 3 12 0v-5" />
                </svg>
              </div>
            </motion.div>

            {/* Ubicacion Card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="rounded-[2rem] border border-white/5 relative overflow-hidden group min-h-[300px] flex items-end p-8 md:p-12 shadow-2xl"
            >
              <img
                src="https://images.unsplash.com/photo-1497215842964-222b430dc094?q=80&w=800&auto=format&fit=crop"
                alt="Workspace desk"
                className="absolute inset-0 w-full h-full object-cover grayscale opacity-20 group-hover:scale-105 group-hover:opacity-30 transition-all duration-700 mix-blend-luminosity"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/70 to-transparent" />

              <div className="relative z-10 w-full">
                <p className="text-[10px] tracking-[0.2em] text-[var(--primary)] uppercase mb-3 font-bold">
                  UBICACIÓN
                </p>
                <h4 className="text-2xl md:text-3xl font-bold text-[var(--text)]">
                  Maturín, VE
                </h4>
              </div>
            </motion.div>
          </div>
          {/* Indicator: Next Section */}
          <div
            className="mt-20 flex flex-col items-center gap-4 cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
            onClick={() =>
              document
                .getElementById("habilidades")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          >
            <div className="h-20 w-[1px] bg-linear-to-b from-[var(--text)]/20 to-transparent" />
            <div className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-[var(--primary)]">
              Habilidades
            </div>
          </div>
        </div>

        <div className="h-40" />

        <div id="habilidades" className="w-full relative scroll-mt-32 pb-20">
          {/* Indicator: Previous Section */}
          <div
            className="mb-20 flex flex-col items-center gap-4 cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
            onClick={() =>
              document
                .getElementById("formacion")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          >
            <div className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-[var(--text)]/40">
              Formación
            </div>
            <div className="h-20 w-[1px] bg-linear-to-t from-[var(--text)]/20 to-transparent" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16 md:mb-24"
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Habilidades
            </h2>
          </motion.div>

          {technologiesLoading ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-56 rounded-[2rem] border border-white/10 bg-[#111111]/30 animate-pulse"
                />
              ))}
            </div>
          ) : technologiesError ? (
            <div className="rounded-[2rem] border border-red-500/20 bg-[#111111]/40 p-8 text-center text-sm text-red-200">
              No se pudieron cargar las tecnologías. Intenta nuevamente más
              tarde.
              {technologiesErrorObject instanceof Error && (
                <div className="mt-3 text-xs text-red-400">
                  {technologiesErrorObject.message}
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {activeCategories.length === 0 ? (
                <div className="rounded-4xl border border-white/10 bg-[#111111]/40 p-8 text-center">
                  <p className="text-sm text-white/70">
                    Aún no hay tecnologías cargadas en Supabase.
                  </p>
                </div>
              ) : (
                activeCategories.map((category, index) => (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{
                      duration: 0.6,
                      delay: index * 0.15,
                      type: "spring",
                      stiffness: 100,
                      damping: 20,
                    }}
                    className="relative rounded-4xl border border-[var(--text)]/10 bg-[var(--bg)]/40 p-8 shadow-2xl overflow-hidden"
                  >
                    <h3 className="text-2xl font-bold mb-2 text-[var(--text)]">
                      {categoryLabels[category]}
                    </h3>
                    <p className="text-sm leading-6 text-[var(--text)]/60 mb-6">
                      {categoryDescriptions[category]}
                    </p>

                    <div className="space-y-4">
                      {technologiesByCategory[category].map(
                        (technology, techIndex) => (
                          <motion.div
                            key={technology.id}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{
                              duration: 0.4,
                              delay: techIndex * 0.08,
                            }}
                            whileHover={{
                              scale: 1.02,
                              borderColor: "rgba(224, 196, 255, 0.3)",
                              backgroundColor: "rgba(255, 255, 255, 0.08)",
                              transition: { duration: 0.2 },
                            }}
                            whileTap={{ scale: 0.98 }}
                            className="rounded-3xl border border-[var(--text)]/10 bg-[var(--text)]/5 p-4"
                          >
                            <div className="flex items-center gap-3 min-w-0 mb-3">
                              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[var(--text)]/10">
                                {technology.icon_url ? (
                                  <img
                                    src={technology.icon_url}
                                    alt={technology.name}
                                    className="h-full w-full object-contain"
                                  />
                                ) : (
                                  <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text)]/50">
                                    N/A
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[var(--text)]">
                                  {technology.name}
                                </p>
                                <p className="text-[11px] text-[var(--text)]/50">
                                  {formatExperience(
                                    technology.experience_start_date,
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <span className="rounded-full bg-[var(--primary)]/15 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--primary)]">
                                {levelLabels[technology.level]}
                              </span>
                              <div className="w-full sm:w-2/3 h-2 rounded-full bg-[var(--text)]/10 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  whileInView={{
                                    width:
                                      levelBarStyles[technology.level].width,
                                  }}
                                  viewport={{ once: true }}
                                  transition={{
                                    duration: 1,
                                    delay: 0.5 + techIndex * 0.1,
                                    ease: "easeOut",
                                  }}
                                  whileHover={{
                                    scale: 1.05,
                                    transition: { duration: 0.2 },
                                  }}
                                  className={`${levelBarStyles[technology.level].color} h-full rounded-full`}
                                />
                              </div>
                            </div>
                          </motion.div>
                        ),
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </div>

        <div id="proyectos" className="w-full relative scroll-mt-32 pb-20">
          {/* Indicator: Previous Section */}
          <div
            className="mb-20 flex flex-col items-center gap-4 cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
            onClick={() =>
              document
                .getElementById("habilidades")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          >
            <div className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-[var(--text)]/40">
              Habilidades
            </div>
            <div className="h-20 w-[1px] bg-linear-to-t from-[var(--text)]/20 to-transparent" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16 md:mb-24"
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Proyectos
            </h2>
            <p className="text-[var(--text)]/60 mt-4 max-w-2xl mx-auto">
              Explora mi trabajo más reciente y descubre cómo he aplicado
              diferentes tecnologías para crear soluciones innovadoras
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="block md:hidden"
          >
            <ProjectCarouselMobile />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="hidden md:block"
          >
            <ProjectCarousel />
          </motion.div>
        </div>
        <div className="h-[40vh]" />

        <div
          id="contacto"
          className="w-full relative scroll-mt-32 pb-20 container mx-auto px-6 md:px-0 lg:px-0"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
            {/* Columna Izquierda: Filosofía y Resumen */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="lg:col-span-5 space-y-12"
            >
              <div className="space-y-6">
                <p className="text-[var(--primary)] text-xs uppercase tracking-[0.4em] font-bold">
                  Filosofía
                </p>
                <h2 className="text-5xl md:text-6xl font-bold text-[var(--text)] leading-[1.05] tracking-tight">
                  Crafting <br />
                  <span className="text-[var(--text)]/30 italic">
                    Performance.
                  </span>
                  <br />
                  through refined code
                </h2>
              </div>

              <div className="space-y-8 max-w-lg">
                <p className="text-[var(--text)]/60 text-lg leading-relaxed font-light">
                  Entiendo el desarrollo como un equilibrio perfecto entre
                  potencia y sutileza. No se trata solo de construir funciones,
                  sino de esculpir algoritmos eficientes que garanticen una
                  velocidad asombrosa y una fluidez impecable en cada píxel,
                  elevando el código a una forma de arte técnico.
                </p>
                <div className="pt-4 border-l border-[var(--text)]/10 pl-8">
                  <p className="text-[var(--text)]/40 italic font-light text-md leading-relaxed">
                    "La verdadera optimización no es solo reducir milisegundos,
                    sino crear una armonía invisible donde la elegancia del
                    código impulsa una experiencia excepcional."
                  </p>
                </div>
              </div>

              <motion.div
                className="relative group rounded-3xl overflow-hidden border border-[var(--text)]/10 aspect-video shadow-2xl bg-[var(--text)]/5"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.6 }}
              >
                <img
                  src="https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=800&auto=format&fit=crop"
                  alt="Minimalist Architecture"
                  className="w-full h-full object-cover grayscale opacity-40 group-hover:opacity-80 group-hover:grayscale-0 transition-all duration-1000"
                />
                <div className="absolute inset-0 bg-linear-to-t from-[var(--bg)] via-transparent to-transparent opacity-60" />
              </motion.div>
            </motion.div>

            {/* Columna Derecha: Formulario y Enlaces */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              className="lg:col-span-7 flex flex-col"
            >
              <ContactForm />

              <div className="grid grid-cols-1  sm:grid-cols-3 gap-12 mt-20 px-8">
                <div className="space-y-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-[var(--primary)]">
                    Coordenadas
                  </p>
                  <div className="text-[var(--text)]/50 text-sm space-y-1">
                    <p>Maturín, Venezuela</p>
                    <p>GMT -4</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-[var(--primary)]">
                    Redes
                  </p>
                  <div className="flex flex-col gap-2 text-[var(--text)]/50 text-sm">
                    <a
                      href="https://www.linkedin.com/in/luis-campos-13034b200"
                      target="_blank"
                      className="hover:text-[var(--text)] transition-colors"
                    >
                      LinkedIn
                    </a>
                    <a
                      href="https://github.com/RuisuCode"
                      target="_blank"
                      className="hover:text-[var(--text)] transition-colors"
                    >
                      GitHub
                    </a>
                  </div>
                </div>
                <div className="flex flex-col gap-2 ">
                  <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-[var(--primary)]">
                    Directo
                  </p>
                  <a
                    href="mailto:theboss7lol@gmail.com"
                    className="text-[var(--text)]/50 text-sm hover:text-[var(--text)] transition-all wrap-break-words"
                  >
                    theboss7lol@gmail.com
                  </a>
                  <a
                    href="/documents/CV%202.5%20Luis%20Alejandro%20Campos.pdf"
                    download
                      className="text-[var(--text)]/50 text-sm hover:text-[var(--text)] transition-all wrap-break-words"
                  >
                    Descargar mi CV
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <footer className="w-full border-t border-[var(--text)]/5 py-12 px-6 md:px-0 flex flex-col md:flex-row justify-between items-center gap-8 mt-20">
          <p className="text-[var(--text)]/20 text-[10px] uppercase tracking-widest font-medium text-center md:text-left">
            © {new Date().getFullYear()} Luis Campos · Diseñado y desarrollado por mí mismo
          </p>
    
        </footer>
      </motion.div>

      {/* Expanded Bio Overlay */}
      <AnimatePresence>
        {isBioExpanded && (
          <motion.div
            layoutId="bio-card"
            className={[
              "fixed top-4 bottom-4 left-4 right-4 md:top-8 md:bottom-8 md:inset-x-12 lg:inset-x-28 z-50 rounded-3xl",
              "flex flex-col lg:justify-center p-6 md:p-12 lg:p-16 overflow-auto ",
              "backdrop-blur-3xl shadow-2xl border",
              isDarkMode
                ? "bg-[#111111]/40 text-white border-white/10"
                : "bg-[var(--bg)] text-[var(--text)] border-[var(--text)]/10",
            ].join(" ")}
          >
            {/* Top-left BACK action */}
            <motion.button
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => setIsBioExpanded(false)}
              className={[
                "absolute top-6 left-6 md:top-8 md:left-8 z-10",
                "inline-flex h-10 px-4 items-center justify-center gap-2",
                "rounded-lg border backdrop-blur-xl",
                "transition-colors duration-300",
                isDarkMode
                  ? "border-white/10 bg-[#111111]/40 text-white/80 hover:bg-white/10 hover:text-white"
                  : "border-black/10 bg-white/60 text-black/70 hover:bg-black/5 hover:text-black",
              ].join(" ")}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96 }}
            >
              <span className="text-[10px] tracking-[0.2em] font-bold uppercase whitespace-nowrap">
                BACK
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]" />
            </motion.button>

            <div className="relative w-full md:h-full h-fit  max-w-5xl mx-auto flex flex-col-reverse lg:flex-row gap-8 lg:gap-16 items-center lg:items-start lg:justify-center pt-20 lg:pt-0">
              {/* Left side */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex-1 relative md:pl-12 lg:pl-16 w-full mt-4 lg:mt-0 flex flex-col lg:justify-center"
              >
                <div className="absolute left-0 top-0 bottom-0 hidden md:flex items-center">
                  <span className="transform -rotate-90 origin-center text-[10px] tracking-[0.3em] uppercase opacity-30 font-bold whitespace-nowrap -ml-28">
                    BIOGRAPHY
                  </span>
                </div>

                <h2 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-light leading-[1.1] mb-4 lg:mb-6 text-center lg:text-left">
                  Crafting <br className="hidden lg:block" />
                  <span className="italic text-[var(--primary)]">
                    Performance
                  </span>{" "}
                  <span className="lg:hidden"></span>
                  <br className="hidden lg:block" />
                  through refined <br className="hidden lg:block" />
                  code.
                </h2>

                <div className="space-y-3 lg:space-y-6 text-sm lg:text-lg opacity-70 font-light max-w-2xl text-center lg:text-left mx-auto lg:mx-0">
                  <p>
                    Soy un <strong>Desarrollador Full Stack</strong>
                    (T.S.U. en Informática) con una sólida trayectoria que
                    combina la rigurosidad académica con la ejecución práctica
                    en entornos de desarrollo profesional, tanto presenciales
                    como remotos. Me especializo en el ecosistema moderno de
                    JavaScript y TypeScript, con un dominio avanzado de
                    <strong>React</strong> y <strong>Next.js</strong> para el
                    frontend, y<strong> Node.js (Express, AdonisJS) </strong>
                    para la arquitectura de servidores.
                  </p>
                  <p className="hidden md:block">
                    Mi enfoque principal es la creación de{" "}
                    <strong>productos digitales</strong>
                    que no solo sean funcionalmente robustos, sino también
                    altamente escalables y centrados en la experiencia del
                    usuario. Experto en la construcción de interfaces modernas y
                    dinámicas utilizando <strong>Tailwind CSS</strong>,{" "}
                    <strong>Radix UI</strong> y <strong>Framer Motion</strong>
                    para garantizar animaciones fluidas y diseños totalmente
                    responsivos.
                  </p>
                  <p>
                    <strong>Actualmente</strong>, me encuentro expandiendo
                    activamente mi aprendizaje en nuevas tecnologías del mercado
                    y afinando mis competencias en otros idiomas. Esto me
                    permite mantenerme a la vanguardia de las demandas globales
                    y colaborar eficazmente en{" "}
                    <strong>equipos internacionales</strong> de alto
                    rendimiento.
                  </p>
                </div>

                <div className="my-8 lg:mt-12 flex justify-center lg:justify-start">
                  <button
                    onClick={() => {
                      setIsBioExpanded(false);
                      setTimeout(() => {
                        document
                          .getElementById("proyectos")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }, 500);
                    }}
                    className="text-[10px] tracking-[0.3em] uppercase font-bold flex items-center gap-4 hover:text-[var(--primary)] transition-colors"
                  >
                    DISCOVER PROJECTS
                    <span className="h-px w-12 bg-current" />
                  </button>
                </div>
              </motion.div>

              {/* Right side */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="w-full max-w-[280px] lg:max-w-[320px] flex flex-col items-center lg:items-start shrink-0 mt-4 lg:mt-0"
              >
                <div className="w-full aspect-4/5 bg-[var(--text)]/5 rounded-2xl overflow-hidden mb-8 relative border border-[var(--text)]/5 shadow-2xl">
                  <img
                    src={profile}
                    alt="Profile"
                    className="object-cover w-full h-full grayscale opacity-80 mix-blend-luminosity"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-[var(--bg)]/40 to-transparent" />
                </div>

                <div className="w-full space-y-8 px-2">
                  <div className="text-center lg:text-left">
                    <p className="text-[10px] tracking-[0.2em] uppercase opacity-40 mb-2 font-bold">
                      Location
                    </p>
                    <p className="text-sm font-medium text-[var(--text)]/90">
                      Venezuela, VE / GMT-4
                    </p>
                  </div>

                  <div className="text-center lg:text-left">
                    <p className="text-[10px] tracking-[0.2em] uppercase opacity-40 mb-2 font-bold">
                      Focus
                    </p>
                    <p className="text-sm font-medium text-[var(--text)]/90">
                      Full Stack & AI Cloud Engineer
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center lg:text-left">
                      <p className="text-[10px] tracking-[0.2em] uppercase opacity-40 mb-3 font-bold">
                        Networks
                      </p>
                      <div className="flex flex-col gap-2">
                        <a
                          href="https://www.linkedin.com/in/luis-campos-13034b200"
                          target="_blank"
                          className="text-xs font-semibold text-[var(--primary)] hover:text-[var(--text)] transition-colors flex items-center justify-center lg:justify-start gap-2"
                        >
                          LinkedIn <ArrowUpRight size={12} />
                        </a>
                        <a
                          href="https://github.com/RuisuCode"
                          target="_blank"
                          className="text-xs font-semibold text-[var(--primary)] hover:text-[var(--text)] transition-colors flex items-center justify-center lg:justify-start gap-2"
                        >
                          GitHub <ArrowUpRight size={12} />
                        </a>
                      </div>
                    </div>

                    <div className="text-center lg:text-left">
                      <p className="text-[10px] tracking-[0.2em] uppercase opacity-40 mb-3 font-bold">
                        Languages
                      </p>
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-semibold text-[var(--text)]/90">
                          Español{" "}
                          <span className="text-[10px] opacity-40 font-normal">
                            (Nativo)
                          </span>
                        </p>
                        <p className="text-xs font-semibold text-[var(--text)]/90">
                          Inglés{" "}
                          <span className="text-[10px] opacity-40 font-normal">
                            (B1)
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center lg:text-left pt-4 border-t border-[var(--text)]/5">
                    <p className="text-[10px] tracking-[0.2em] uppercase opacity-40 mb-2 font-bold">
                      Status
                    </p>
                    <div className="flex items-center justify-center lg:justify-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                      <p className="text-xs font-medium text-[var(--text)]/60 italic">
                        Disponible
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
