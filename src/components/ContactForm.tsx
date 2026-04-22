import { memo, useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

const email = "theboss7lol@gmail.com";

type ContactFormData = {
  name: string;
  subject: string;
  message: string;
};

function ContactForm() {
  const [contactForm, setContactForm] = useState<ContactFormData>({
    name: "",
    subject: "",
    message: "",
  });
  const [showEmailPicker, setShowEmailPicker] = useState(false);

  const handleSendMessage = useCallback(() => {
    if (!contactForm.name || !contactForm.message) {
      toast.error("Por favor completa tu nombre y el mensaje.");
      return;
    }
    setShowEmailPicker((current) => !current);
  }, [contactForm]);

  const openEmailProvider = useCallback(
    (provider: "gmail" | "outlook" | "native") => {
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

      window.open(links[provider], "_blank");
      setShowEmailPicker(false);
    },
    [contactForm],
  );

  return (
    <div className="bg-[var(--bg)]/40 backdrop-blur-3xl border border-[var(--text)]/10 rounded-3xl p-8 md:p-16 space-y-12 shadow-[0_0_100px_rgba(36,0,70,0.2)]">
      <div className="space-y-4">
        <h3 className="text-4xl font-bold text-[var(--text)] tracking-tight">
          Iniciar Conversación
        </h3>
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse shadow-[0_0_10px_var(--primary)]" />
          <p className="text-[var(--text)]/30 text-[10px] uppercase tracking-[0.2em] font-bold">
            Disponible para proyectos
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text)]/30 ml-2">
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
            className="w-full bg-[var(--text)]/5 border border-[var(--text)]/10 rounded-2xl px-6 py-4 text-[var(--text)] placeholder:text-[var(--text)]/20 focus:outline-hidden focus:border-[var(--primary)]/50 focus:bg-[var(--text)]/10 transition-all duration-300"
          />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text)]/30 ml-2">
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
            className="w-full bg-[var(--text)]/5 border border-[var(--text)]/10 rounded-2xl px-6 py-4 text-[var(--text)] placeholder:text-[var(--text)]/20 focus:outline-hidden focus:border-[var(--primary)]/50 focus:bg-[var(--text)]/10 transition-all duration-300"
          />
        </div>
        <div className="col-span-1 md:col-span-2 space-y-3">
          <label className="text-[10px] uppercase tracking-widest font-bold text-[var(--text)]/30 ml-2">
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
            className="w-full bg-[var(--text)]/5 border border-[var(--text)]/10 rounded-3xl px-6 py-5 text-[var(--text)] placeholder:text-[var(--text)]/20 focus:outline-hidden focus:border-[var(--primary)]/50 focus:bg-[var(--text)]/10 transition-all duration-300 resize-none"
          />
        </div>
      </div>

      <div className="relative w-full md:w-auto">
        <motion.button
          onClick={handleSendMessage}
          className="group relative w-full md:w-auto px-12 py-5 bg-[var(--secondary)] hover:opacity-90 text-white rounded-2xl flex items-center justify-center gap-4 transition-all duration-500 overflow-hidden"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="absolute inset-0 bg-linear-to-r from-[#e0c4ff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="relative z-10 font-bold tracking-widest uppercase text-xs">
            Enviar Mensaje
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
              <div className="text-[9px] uppercase tracking-widest font-bold text-[var(--text)]/30 px-3 py-2 border-b border-[var(--text)]/5">
                Escoge tu servicio
              </div>
              <button
                onClick={() => openEmailProvider("gmail")}
                className="flex items-center gap-3 w-full px-4 py-3 text-left text-xs font-medium text-[var(--text)]/70 hover:bg-[var(--text)]/5 hover:text-[var(--text)] transition-all rounded-lg"
              >
                <span className="w-2 h-2 rounded-full bg-red-500" /> Gmail
              </button>
              <button
                onClick={() => openEmailProvider("outlook")}
                className="flex items-center gap-3 w-full px-4 py-3 text-left text-xs font-medium text-[var(--text)]/70 hover:bg-[var(--text)]/5 hover:text-[var(--text)] transition-all rounded-lg"
              >
                <span className="w-2 h-2 rounded-full bg-blue-500" /> Outlook
              </button>
              <button
                onClick={() => openEmailProvider("native")}
                className="flex items-center gap-3 w-full px-4 py-3 text-left text-xs font-medium text-[var(--text)]/70 hover:bg-[var(--text)]/5 hover:text-[var(--text)] transition-all rounded-lg"
              >
                <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />{" "}
                Aplicación por defecto
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}

export default memo(ContactForm);
