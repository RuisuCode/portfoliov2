import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { list_table_content } from "./shared/constants/content_table_list";
import { supabase } from "../utils/supabase";
import { ArrowUpRight, BookOpenText, BookText, Moon, Sun } from "lucide-react";
import { ProjectCarousel } from "./components/ProjectCarousel";
import { ProjectCarouselMobile } from "./components/ProjectCarouselMobile";

import { useModalStore } from "./store/useModalStore";
import { toast } from "sonner";

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
  const [isEyeCareMode, setIsEyeCareMode] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const { isModalOpen } = useModalStore();
  const [showEmailPicker, setShowEmailPicker] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    subject: "",
    message: "",
  });

  const handleSendMessage = () => {
    if (!contactForm.name || !contactForm.message) {
      toast.error("Por favor completa tu nombre y el mensaje.");
      return;
    }
    setShowEmailPicker(!showEmailPicker);
  };

  const openEmailProvider = (provider: "gmail" | "outlook" | "native") => {
    const email = "theboss7lol@gmail.com";
    const subject = encodeURIComponent(
      contactForm.subject || "Consulta desde Portfolio",
    );
    const body = encodeURIComponent(
      `Hola,\n\nSoy ${contactForm.name}.\n\n${contactForm.message}`,
    );

    const links = {
      gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`,
      outlook: `https://outlook.office.com/mail/deeplink/compose?to=${email}&subject=${subject}&body=${body}`,
      native: `mailto:${email}?subject=${subject}&body=${body}`,
    };

    // if (provider === "copy") {
    //   navigator.clipboard.writeText(email);
    //   alert("Email copiado al portapapeles");
    // } else {
    //   window.open(links[provider], "_blank");
    // }
    window.open(links[provider], "_blank");
    setShowEmailPicker(false);
  };

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
      className={[
        "relative min-h-screen flex flex-col items-center justify-center overflow-hidden font-sans",
        "selection:bg-[#240046] selection:text-white",
        isDarkMode ? "bg-[#111111] text-white" : "bg-[#fafafa] text-[#0f0f0f]",
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
          background:
            "radial-gradient(circle, #240046 0%, rgba(17,17,17,0) 60%)",
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
          <div className="backdrop-blur-xl bg-[#111111]/60 border border-white/10 rounded-full px-4 py-2 text-[11px] tracking-[0.22em] uppercase font-bold text-[#e0c4ff]">
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
                    className={`text-[10px] tracking-[0.2em] capitalize ${item === activeSection ? "text-[#e0c4ff]" : "text-transparent group-hover:text-white/40 transition-colors duration-300"} font-bold`}
                  >
                    {item}
                  </span>
                  <div
                    className={`w-2 h-2 rounded-full ${item === activeSection ? "bg-[#e0c4ff] w-3 h-3 shadow-[0_0_12px_rgba(224,196,255,0.8)]" : "bg-white/20 group-hover:bg-white/40 transition-colors duration-300 mr-[2px]"}`}
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
              Hi, I am <span className="text-[#e0c4ff] ">Luis Campos</span>
            </h1>
          </div>

          {/* Glassmorphism Card */}
          <AnimatePresence mode="popLayout">
            {!isBioExpanded && (
              <motion.div
                layoutId="bio-card"
                className="group bg-[#111111]/40 backdrop-blur-xl rounded-3xl border border-white/10 p-8 md:p-16 text-center shadow-[0_0_18px_rgba(0,0,0,0.16)] relative overflow-hidden transition-all duration-300"
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
                  <div className="absolute top-0 left-0 right-0 h-1px bg-linear-to-r from-transparent via-white/10 to-transparent" />

                  <p className="text-xs tracking-[0.3em] text-white/40 uppercase mb-8">
                    Carta de presentación
                  </p>

                  <p className="text-lg md:text-2xl text-white/70 leading-relaxed font-light max-w-3xl mx-auto mb-16">
                    Desarrollador con experiencia tanto{" "}
                    <strong className="text-white font-medium">
                      académica como laboral
                    </strong>
                    . Un profesional proactivo con facilidad de comunicación en
                    español e inglés técnico, habituado a trabajar en equipos
                    grandes y pequeños, con lógica excelente para adaptarse a
                    nuevos desarrollos, paciente y dedicado.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 relative">
                    <div className="absolute top-0 bottom-0 left-1/2 w-1px bg-white/5 hidden md:block" />
                    <div>
                      <p className="text-xs tracking-[0.2em] text-white/40 uppercase mb-3">
                        Ubicación
                      </p>
                      <p className="text-white/90 font-medium">
                        Venezuela, VE / Remote GMT-4
                      </p>
                    </div>
                    <div>
                      <p className="text-xs tracking-[0.2em] text-white/40 uppercase mb-3">
                        Enfoque
                      </p>
                      <p className="text-white/90 font-medium">
                        Full Stack Developer & AI Cloud Engineer
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-center gap-6">
                    <button
                      onClick={() => setIsBioExpanded(true)}
                      className=" text-[#111111]  bg-[#e0c4ff] px-8 py-4 rounded-xl text-xs font-bold tracking-widest uppercase hover:bg-white/90 hover:scale-105 active:scale-95 transition-all duration-300"
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
            <div className="h-20 w-[1px] bg-linear-to-b from-white/20 to-transparent" />
            <div className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-[#e0c4ff]">
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
            <div className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-white/40">
              Biografía
            </div>
            <div className="h-20 w-[1px] bg-linear-to-t from-white/20 to-transparent" />
          </div>

          <div className="text-center mb-20 md:mb-32">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Formación{" "}
              <span className="relative inline-block">
                Académica
                <div className="absolute -bottom-3 left-0 right-0 h-[3px] bg-[#e0c4ff]/40 rounded-full" />
              </span>{" "}
              y Cursos
            </h2>
          </div>

          <div className="relative max-w-4xl mx-auto mb-32 px-4 md:px-0">
            {/* The Timeline Vertical Line */}
            <div className="absolute left-[39px] md:left-1/2 top-4 bottom-4 w-px bg-white/10 md:-translate-x-1/2" />

            {[
              {
                year: "2018 — 2021",
                title: "Licenciatura en Ciencias de la Comunicación",
                institution: "Universidad Nacional Autónoma de México",
                detail: "ESPECIALIDAD EN PERIODISMO DIGITAL",
                align: "left",
                primary: true,
              },
              {
                year: "OCTUBRE 2022",
                title: "Diseño de Interfaces Avanzado",
                institution: "Interaction Design Foundation (IxDF)",
                align: "right",
              },
              {
                year: "MARZO 2022",
                title: "Arquitectura de Información",
                institution: "Coursera & University of Michigan",
                align: "left",
              },
              {
                year: "2013 — 2016",
                title: "Bachillerato",
                institution: "Colegio Nacional de Educación Profesional",
                align: "right",
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
                    <p className="text-[10px] tracking-[0.2em] text-[#e0c4ff]/70 uppercase mb-3 font-semibold transition-colors duration-300 group-hover:text-[#e0c4ff]">
                      {item.year}
                    </p>
                    <h3 className="text-xl md:text-2xl font-bold mb-2 leading-snug transition-colors duration-300 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                      {item.title}
                    </h3>
                    <p className="text-white/60 font-light text-sm md:text-base transition-colors duration-300 group-hover:text-white/80">
                      {item.institution}
                    </p>
                    {item.detail && (
                      <p className="text-[9px] tracking-[0.2em] text-white/30 uppercase mt-4 block md:inline-block transition-colors duration-300 group-hover:text-[#e0c4ff]/50">
                        {item.detail}
                      </p>
                    )}
                  </div>

                  {/* Center Dot */}
                  <div className="absolute left-[32px] md:left-1/2 top-1 md:top-1/2 md:-translate-y-1/2 w-4 h-8 md:-translate-x-1/2 flex items-center justify-center z-10 bg-transparent">
                    <div
                      className={`w-3 h-3 rounded-full transition-all duration-500 ease-out group-hover:scale-[2.5] group-hover:shadow-[0_0_24px_rgba(224,196,255,0.8)] group-hover:bg-[#e0c4ff] ${
                        item.primary
                          ? "bg-[#e0c4ff] shadow-[0_0_16px_rgba(224,196,255,0.6)]"
                          : "bg-[#e0c4ff]/40"
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
            <div className="bg-[#111111]/40 backdrop-blur-xl rounded-[2rem] border border-white/5 p-8 md:p-12 relative overflow-hidden group hover:border-white/10 transition-all duration-300 shadow-2xl">
              <p className="text-[10px] tracking-[0.2em] text-[#e0c4ff]/80 uppercase mb-4 font-bold">
                FILOSOFÍA
              </p>
              <h4 className="text-2xl md:text-3xl font-bold mb-6">
                Aprendizaje Perpetuo
              </h4>
              <p className="text-white/60 font-light text-sm md:text-base leading-relaxed max-w-sm">
                Cada curso y título representa un nodo en una red de
                conocimiento en constante expansión, centrada en la intersección
                de la tecnología y la humanidad.
              </p>
              <div className="absolute -bottom-10 -right-10 opacity-[0.03] text-white rotate-[-15deg] group-hover:scale-110 transition-transform duration-500">
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
            </div>

            {/* Ubicacion Card */}
            <div className="rounded-[2rem] border border-white/5 relative overflow-hidden group min-h-[300px] flex items-end p-8 md:p-12 shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1497215842964-222b430dc094?q=80&w=800&auto=format&fit=crop"
                alt="Workspace desk"
                className="absolute inset-0 w-full h-full object-cover grayscale opacity-20 group-hover:scale-105 group-hover:opacity-30 transition-all duration-700 mix-blend-luminosity"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/70 to-transparent" />

              <div className="relative z-10 w-full">
                <p className="text-[10px] tracking-[0.2em] text-[#e0c4ff]/80 uppercase mb-3 font-bold">
                  UBICACIÓN
                </p>
                <h4 className="text-2xl md:text-3xl font-bold text-white">
                  Maturín, VE
                </h4>
              </div>
            </div>
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
            <div className="h-20 w-[1px] bg-linear-to-b from-white/20 to-transparent" />
            <div className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-[#e0c4ff]">
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
            <div className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-white/40">
              Formación
            </div>
            <div className="h-20 w-[1px] bg-linear-to-t from-white/20 to-transparent" />
          </div>

          <div className="text-center mb-16 md:mb-24">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Habilidades
            </h2>
          </div>

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
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      duration: 0.6,
                      delay: index * 0.15,
                      type: "spring",
                      stiffness: 100,
                      damping: 20,
                    }}
                    className="relative rounded-4xl border border-white/10 bg-[#111111]/40 p-8 shadow-2xl overflow-hidden"
                  >
                    <h3 className="text-2xl font-bold mb-2 text-white">
                      {categoryLabels[category]}
                    </h3>
                    <p className="text-sm leading-6 text-white/60 mb-6">
                      {categoryDescriptions[category]}
                    </p>

                    <div className="space-y-4">
                      {technologiesByCategory[category].map(
                        (technology, techIndex) => (
                          <motion.div
                            key={technology.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
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
                            className="rounded-3xl border border-white/10 bg-white/5 p-4"
                          >
                            <div className="flex items-center gap-3 min-w-0 mb-3">
                              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white/10">
                                {technology.icon_url ? (
                                  <img
                                    src={technology.icon_url}
                                    alt={technology.name}
                                    className="h-full w-full object-contain"
                                  />
                                ) : (
                                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                                    N/A
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">
                                  {technology.name}
                                </p>
                                <p className="text-[11px] text-white/50">
                                  {formatExperience(
                                    technology.experience_start_date,
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <span className="rounded-full bg-[#e0c4ff]/15 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#e0c4ff]">
                                {levelLabels[technology.level]}
                              </span>
                              <div className="w-full sm:w-2/3 h-2 rounded-full bg-white/10 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{
                                    width:
                                      levelBarStyles[technology.level].width,
                                  }}
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
            <div className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-white/40">
              Habilidades
            </div>
            <div className="h-20 w-[1px] bg-linear-to-t from-white/20 to-transparent" />
          </div>

          <div className="text-center mb-16 md:mb-24">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Proyectos
            </h2>
            <p className="text-white/60 mt-4 max-w-2xl mx-auto">
              Explora mi trabajo más reciente y descubre cómo he aplicado
              diferentes tecnologías para crear soluciones innovadoras
            </p>
          </div>

          <div className="block md:hidden">
            <ProjectCarouselMobile />
          </div>
          <div className="hidden md:block">
            <ProjectCarousel />
          </div>
        </div>
        <div className="h-[40vh]" />

        <div
          id="contacto"
          className="w-full relative scroll-mt-32 pb-20 container mx-auto px-6 md:px-0 lg:px-0"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
            {/* Columna Izquierda: Filosofía y Resumen */}
            <div className="lg:col-span-5 space-y-12">
              <div className="space-y-6">
                <p className="text-[#e0c4ff] text-xs uppercase tracking-[0.4em] font-bold">
                  Philosophy
                </p>
                <h2 className="text-6xl md:text-8xl font-bold text-white leading-[1.05] tracking-tight">
                  Crafting Digital <br />
                  <span className="text-white/30 italic">Solitude.</span>
                </h2>
              </div>

              <div className="space-y-8 max-w-lg">
                <p className="text-white/60 text-lg leading-relaxed font-light">
                  En un mundo saturado de ruido digital, me dedico a curar
                  interfaces que respiran. Mi enfoque fusiona una estética
                  vanguardista con una precisión técnica absoluta, creando
                  experiencias que se sienten tan íntimas y refinadas como una
                  galería de arte privada.
                </p>
                <div className="pt-4 border-l border-white/10 pl-8">
                  <p className="text-white/40 italic font-light text-md leading-relaxed">
                    "El gran diseño no es lo que se ve a primera vista, sino
                    cómo respira el espacio infinito que existe entre cada
                    elemento."
                  </p>
                </div>
              </div>

              <motion.div
                className="relative group rounded-3xl overflow-hidden border border-white/10 aspect-video shadow-2xl bg-white/5"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.6 }}
              >
                <img
                  src="https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=800&auto=format&fit=crop"
                  alt="Minimalist Architecture"
                  className="w-full h-full object-cover grayscale opacity-40 group-hover:opacity-80 group-hover:grayscale-0 transition-all duration-1000"
                />
                <div className="absolute inset-0 bg-linear-to-t from-[#111111] via-transparent to-transparent opacity-60" />
              </motion.div>
            </div>

            {/* Columna Derecha: Formulario y Enlaces */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="bg-[#111111]/40 backdrop-blur-3xl border border-white/10 rounded-3xl p-8 md:p-16 space-y-12 shadow-[0_0_100px_rgba(36,0,70,0.2)]">
                <div className="space-y-4">
                  <h3 className="text-4xl font-bold text-white tracking-tight">
                    Initiate Dialogue
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-[#e0c4ff] animate-pulse shadow-[0_0_10px_rgba(224,196,255,1)]" />
                    <p className="text-white/30 text-[10px] uppercase tracking-[0.2em] font-bold">
                      Available for select commissions 2024
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 ml-2">
                      Identidad
                    </label>
                    <input
                      type="text"
                      placeholder="Tu nombre"
                      value={contactForm.name}
                      onChange={(e) =>
                        setContactForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:outline-hidden focus:border-[#e0c4ff]/50 focus:bg-white/10 transition-all duration-300"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 ml-2">
                      Asunto
                    </label>
                    <input
                      type="text"
                      placeholder="Asunto"
                      value={contactForm.subject}
                      onChange={(e) =>
                        setContactForm((prev) => ({
                          ...prev,
                          subject: e.target.value,
                        }))
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:outline-hidden focus:border-[#e0c4ff]/50 focus:bg-white/10 transition-all duration-300"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-3">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 ml-2">
                      Mensaje
                    </label>
                    <textarea
                      rows={5}
                      placeholder="Describe tu propuesta..."
                      value={contactForm.message}
                      onChange={(e) =>
                        setContactForm((prev) => ({
                          ...prev,
                          message: e.target.value,
                        }))
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-3xl px-6 py-5 text-white placeholder:text-white/20 focus:outline-hidden focus:border-[#e0c4ff]/50 focus:bg-white/10 transition-all duration-300 resize-none"
                    />
                  </div>
                </div>

                <div className="relative w-full md:w-auto">
                  <motion.button
                    onClick={handleSendMessage}
                    className="group relative w-full md:w-auto px-12 py-5 bg-[#240046] hover:bg-[#2d0058] text-white rounded-2xl flex items-center justify-center gap-4 transition-all duration-500 overflow-hidden"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="absolute inset-0 bg-linear-to-r from-[#e0c4ff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative z-10 font-bold tracking-widest uppercase text-xs">
                      Send Message
                    </span>
                    <ArrowUpRight
                      size={18}
                      className="relative z-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                    />
                  </motion.button>

                  <AnimatePresence>
                    {showEmailPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full mb-4 left-0 w-full md:w-64 bg-[#111111]/90 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-2xl z-50 overflow-hidden"
                      >
                        <div className="text-[9px] uppercase tracking-widest font-bold text-white/30 px-3 py-2 border-b border-white/5">
                          Escoge tu servicio
                        </div>
                        <button
                          onClick={() => openEmailProvider("gmail")}
                          className="flex items-center gap-3 w-full px-4 py-3 text-left text-xs font-medium text-white/70 hover:bg-white/5 hover:text-white transition-all rounded-lg"
                        >
                          <span className="w-2 h-2 rounded-full bg-red-500" />{" "}
                          Gmail
                        </button>
                        <button
                          onClick={() => openEmailProvider("outlook")}
                          className="flex items-center gap-3 w-full px-4 py-3 text-left text-xs font-medium text-white/70 hover:bg-white/5 hover:text-white transition-all rounded-lg"
                        >
                          <span className="w-2 h-2 rounded-full bg-blue-500" />{" "}
                          Outlook
                        </button>
                        <button
                          onClick={() => openEmailProvider("native")}
                          className="flex items-center gap-3 w-full px-4 py-3 text-left text-xs font-medium text-white/70 hover:bg-white/5 hover:text-white transition-all rounded-lg"
                        >
                          <span className="w-2 h-2 rounded-full bg-[#e0c4ff]" />{" "}
                          Aplicación por defecto
                        </button>
                        {/* <div className="h-px bg-white/5 my-1" /> */}
                        {/* <button onClick={() => openEmailProvider("copy")} className="flex items-center gap-3 w-full px-4 py-3 text-left text-xs font-medium text-white/70 hover:bg-white/5 hover:text-white transition-all rounded-lg">
                            <span className="w-2 h-2 rounded-full bg-white/20" /> Copiar mi Email
                          </button> */}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="grid grid-cols-1  sm:grid-cols-3 gap-12 mt-20 px-8">
                <div className="space-y-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#e0c4ff]">
                    Coordinates
                  </p>
                  <div className="text-white/50 text-sm space-y-1">
                    <p>Maturín, Venezuela</p>
                    <p>GMT -4</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#e0c4ff]">
                    Networks
                  </p>
                  <div className="flex flex-col gap-2 text-white/50 text-sm">
                    <a
                      href="https://www.linkedin.com/in/luis-campos-13034b200"
                      target="_blank"
                      className="hover:text-white transition-colors"
                    >
                      LinkedIn
                    </a>
                    <a
                      href="https://github.com/RuisuCode"
                      target="_blank"
                      className="hover:text-white transition-colors"
                    >
                      GitHub
                    </a>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#e0c4ff]">
                    Direct
                  </p>
                  <a
                    href="mailto:theboss7lol@gmail.com"
                    className="text-white/50 text-sm hover:text-white transition-all wrap-break-words"
                  >
                    theboss7lol@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="w-full border-t border-white/5 py-12 px-6 md:px-0 flex flex-col md:flex-row justify-between items-center gap-8 mt-20">
          <p className="text-white/20 text-[10px] uppercase tracking-widest font-medium text-center md:text-left">
            © {new Date().getFullYear()} Luis Campos · Built with Atmospheric
            Depth
          </p>
          <div className="flex gap-10 text-white/20 text-[10px] uppercase tracking-widest font-bold">
            <a href="#" className="hover:text-[#e0c4ff] transition-colors">
              Archives
            </a>
            <a href="#" className="hover:text-[#e0c4ff] transition-colors">
              Colophon
            </a>
            <a href="#" className="hover:text-[#e0c4ff] transition-colors">
              Legal
            </a>
          </div>
        </footer>
        {/* <div className="h-[40vh]" /> */}
      </motion.div>

      {/* Expanded Bio Overlay */}
      <AnimatePresence>
        {isBioExpanded && (
          <motion.div
            layoutId="bio-card"
            className={[
              "fixed top-4 bottom-4 left-4 right-4 md:top-8 md:bottom-8 md:inset-x-12 lg:inset-x-28 z-50 rounded-[2rem]",
              "flex flex-col justify-center p-6 md:p-12 lg:p-16 overflow-hidden",
              "backdrop-blur-3xl shadow-2xl border",
              isDarkMode
                ? "bg-[#111111]/40 text-white border-white/10"
                : "bg-white/40 text-[#0f0f0f] border-black/10",
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
              <div className="w-1.5 h-1.5 rounded-full bg-[#e0c4ff] shadow-[0_0_8px_rgba(224,196,255,0.6)]" />
            </motion.button>

            <div className="relative w-full h-full max-w-5xl mx-auto flex flex-col lg:flex-row gap-8 lg:gap-16 items-center lg:items-start justify-center">
              {/* Left side */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex-1 relative md:pl-12 lg:pl-16 w-full mt-4 lg:mt-0 flex flex-col justify-center"
              >
                <div className="absolute left-0 top-0 bottom-0 hidden md:flex items-center">
                  <span className="transform -rotate-90 origin-center text-[10px] tracking-[0.3em] uppercase opacity-30 font-bold whitespace-nowrap -ml-28">
                    BIOGRAPHY
                  </span>
                </div>

                <h2 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-light leading-[1.1] mb-6 lg:mb-10 text-center lg:text-left">
                  Crafting <br className="hidden lg:block" />
                  <span className="italic text-[#e0c4ff]">Atmosphere</span>{" "}
                  <span className="lg:hidden"></span>
                  <br className="hidden lg:block" />
                  through digital <br className="hidden lg:block" />
                  craft.
                </h2>

                <div className="space-y-3 lg:space-y-6 text-sm lg:text-lg opacity-70 font-light max-w-2xl text-center lg:text-left mx-auto lg:mx-0">
                  <p>
                    Luis Campos is a multidisciplinary designer and engineer
                    focused on the intersection of minimalist aesthetics and
                    functional complexity. With extensive experience navigating
                    the nebulous space between brand identity and high-end
                    digital interfaces.
                  </p>
                  <p className="hidden md:block">
                    Believing that the best design isn't just seen but felt,
                    Luis employs a philosophy of &quot;intentional
                    subtraction.&quot; Every pixel, transition, and typographic
                    choice is measured against its necessity.
                  </p>
                  <p>
                    Currently based in Venezuela, he collaborates with
                    forward-thinking studios to build the next generation of the
                    editorial web.
                  </p>
                </div>

                <div className="mt-8 lg:mt-12 flex justify-center lg:justify-start">
                  <button
                    onClick={() => {
                      setIsBioExpanded(false);
                      setTimeout(() => {
                        document
                          .getElementById("proyectos")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }, 500);
                    }}
                    className="text-[10px] tracking-[0.3em] uppercase font-bold flex items-center gap-4 hover:text-[#e0c4ff] transition-colors"
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
                className="w-full max-w-[200px] lg:max-w-[320px] flex flex-col items-center lg:items-start shrink-0"
              >
                <div className="w-full aspect-4/5 bg-white/5 rounded-2xl overflow-hidden mb-8 relative border border-white/5 shadow-2xl">
                  <img
                    src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&auto=format&fit=crop"
                    alt="Profile"
                    className="object-cover w-full h-full grayscale opacity-80 mix-blend-luminosity"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-[#111111]/40 to-transparent" />
                </div>

                <div className="w-full space-y-8 px-2">
                  <div className="text-center lg:text-left">
                    <p className="text-[10px] tracking-[0.2em] uppercase opacity-40 mb-2 font-bold">
                      Location
                    </p>
                    <p className="text-sm font-medium text-white/90">Venezuela, VE / GMT-4</p>
                  </div>

                  <div className="text-center lg:text-left">
                    <p className="text-[10px] tracking-[0.2em] uppercase opacity-40 mb-2 font-bold">
                      Focus
                    </p>
                    <p className="text-sm font-medium text-white/90">Full Stack & AI Cloud Engineer</p>
                  </div>

                  <div className="text-center lg:text-left">
                    <p className="text-[10px] tracking-[0.2em] uppercase opacity-40 mb-3 font-bold">
                      Networks
                    </p>
                    <div className="flex flex-col gap-2">
                      <a 
                        href="https://www.linkedin.com/in/luis-campos-13034b200" 
                        target="_blank" 
                        className="text-xs font-semibold text-[#e0c4ff] hover:text-white transition-colors flex items-center justify-center lg:justify-start gap-2"
                      >
                        LinkedIn <ArrowUpRight size={12} />
                      </a>
                      <a 
                        href="https://github.com/RuisuCode" 
                        target="_blank" 
                        className="text-xs font-semibold text-[#e0c4ff] hover:text-white transition-colors flex items-center justify-center lg:justify-start gap-2"
                      >
                        GitHub <ArrowUpRight size={12} />
                      </a>
                    </div>
                  </div>

                  <div className="text-center lg:text-left pt-4 border-t border-white/5">
                    <p className="text-[10px] tracking-[0.2em] uppercase opacity-40 mb-2 font-bold">
                      Status
                    </p>
                    <div className="flex items-center justify-center lg:justify-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                      <p className="text-xs font-medium text-white/60 italic">Available for select projects</p>
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
