"use client";

import { useId, useRef, useState, type KeyboardEvent, type FocusEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Info } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import type { GlossaryTermId } from "@/lib/glossary";

interface GlossaryTermProps {
  termId: GlossaryTermId;
  children: ReactNode;
  className?: string;
}

/**
 * Envuelve una etiqueta (children) con un icono "info" que, al pasar el
 * ratón o al recibir foco por teclado, muestra un popover con la definición
 * del término en lenguaje sencillo. Pensado para usuarios retail principiantes.
 *
 * Accesibilidad:
 * - El trigger es un <button> real, enfocable con Tab, con aria-label descriptivo.
 * - El popover tiene role="tooltip" y está enlazado con aria-describedby.
 * - Se muestra en hover y en focus, se oculta con Escape y al perder el foco
 *   fuera del conjunto trigger+popover.
 */
export function GlossaryTerm({ termId, children, className }: GlossaryTermProps) {
  const t = useTranslations("glossary");
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);

  const term = t(`${termId}.term`);
  const definition = t(`${termId}.definition`);

  const close = () => setOpen(false);

  const handleKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  const handleBlur = (e: FocusEvent<HTMLSpanElement>) => {
    // Solo cerrar si el foco sale por completo del wrapper (trigger + popover).
    if (!wrapperRef.current?.contains(e.relatedTarget as Node | null)) {
      close();
    }
  };

  return (
    <span
      ref={wrapperRef}
      className={cn("relative inline-flex items-center gap-1", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={close}
      onFocus={() => setOpen(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      {children}
      <button
        type="button"
        aria-label={t("ariaLabel", { term })}
        aria-describedby={tooltipId}
        className="inline-flex items-center justify-center rounded-full text-neutral-500 hover:text-neutral-300 outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
      >
        <Info size={13} weight="bold" />
      </button>
      <span
        role="tooltip"
        id={tooltipId}
        className={cn(
          "pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-56 max-w-[calc(100vw-2rem)] rounded-lg border border-neutral-700 bg-neutral-800 p-2.5 text-xs text-neutral-200 shadow-lg transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        hidden={!open}
      >
        <span className="block font-semibold text-white mb-0.5">{term}</span>
        {definition}
      </span>
    </span>
  );
}
