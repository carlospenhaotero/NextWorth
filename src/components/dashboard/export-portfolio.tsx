"use client";

import { useRef, useState, type FocusEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import { DownloadSimple, FileCsv, FilePdf } from "@phosphor-icons/react/dist/ssr";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PortfolioData } from "@/queries/portfolio";
import { exportPortfolioCsv, exportPortfolioPdf, type PortfolioExportLabels } from "@/lib/portfolio-export";

interface ExportPortfolioProps {
  portfolio: PortfolioData;
}

/**
 * Botón "Exportar" con un pequeño menú desplegable (CSV / PDF) para
 * descargar la cartera del usuario. Sin dependencias externas: el CSV se
 * genera con Blob + <a download>, el PDF se genera abriendo una ventana con
 * HTML autocontenido y lanzando el diálogo de impresión del navegador.
 */
export function ExportPortfolio({ portfolio }: ExportPortfolioProps) {
  const t = useTranslations("exportData");
  const tType = useTranslations("assetList.filter");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  if (portfolio.positions.length === 0) return null;

  // Etiquetas localizadas solo para los tipos presentes en la cartera, para
  // que la columna "Type" del CSV/PDF sea coherente con la UI (Stocks, Crypto...).
  const typeLabels = Object.fromEntries(
    [...new Set(portfolio.positions.map((pos) => pos.assetType))].map((type) => [type, tType(type)])
  );

  const labels: PortfolioExportLabels = {
    title: t("title"),
    generatedAt: t("generatedAt"),
    colSymbol: t("colSymbol"),
    colName: t("colName"),
    colType: t("colType"),
    colQuantity: t("colQuantity"),
    colAvgPrice: t("colAvgPrice"),
    colCurrentPrice: t("colCurrentPrice"),
    colValue: t("colValue"),
    colPl: t("colPl"),
    colPlPct: t("colPlPct"),
    colCurrency: t("colCurrency"),
    totalLabel: t("totalLabel"),
    typeLabels,
  };

  const close = () => setOpen(false);

  const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!wrapperRef.current?.contains(e.relatedTarget as Node | null)) {
      close();
    }
  };

  const handleCsv = () => {
    exportPortfolioCsv(portfolio, locale, labels);
    close();
  };

  const handlePdf = () => {
    exportPortfolioPdf(portfolio, locale, labels);
    close();
  };

  return (
    <div ref={wrapperRef} className="relative" onBlur={handleBlur}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={buttonClasses("secondary", "sm")}
      >
        <DownloadSimple size={16} weight="bold" />
        {t("button")}
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-800 shadow-lg"
          )}
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleCsv}
            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-neutral-200 hover:bg-neutral-700"
          >
            <FileCsv size={16} />
            {t("csv")}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handlePdf}
            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-neutral-200 hover:bg-neutral-700"
          >
            <FilePdf size={16} />
            {t("pdf")}
          </button>
        </div>
      )}
    </div>
  );
}
