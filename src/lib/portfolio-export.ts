import type { PortfolioData } from "@/queries/portfolio";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { localeToIntl } from "@/i18n/locale";

/**
 * Etiquetas ya traducidas (i18n resuelto en el componente cliente) usadas
 * tanto para las cabeceras del CSV como para el documento HTML del PDF.
 */
export interface PortfolioExportLabels {
  title: string;
  generatedAt: string;
  colSymbol: string;
  colName: string;
  colType: string;
  colQuantity: string;
  colAvgPrice: string;
  colCurrentPrice: string;
  colValue: string;
  colPl: string;
  colPlPct: string;
  colCurrency: string;
  totalLabel: string;
  /** Etiquetas localizadas por tipo de activo (stock, etf, ...) para la columna "Type". */
  typeLabels: Record<string, string>;
}

/** Convierte una fecha a "YYYY-MM-DD" para usar en nombres de fichero. */
function fileDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Escapa un valor para una celda CSV (RFC 4180): comillas, comas y saltos de línea. */
function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatQuantity(quantity: number, intlLocale: string): string {
  return new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 8 }).format(quantity);
}

function buildRows(portfolio: PortfolioData, intlLocale: string, labels: PortfolioExportLabels): string[][] {
  const { baseCurrency } = portfolio;
  return portfolio.positions.map((pos) => [
    pos.symbol,
    pos.name,
    labels.typeLabels[pos.assetType] ?? pos.assetType,
    formatQuantity(pos.quantity, intlLocale),
    formatCurrency(pos.avgBuyPrice, baseCurrency, intlLocale),
    formatCurrency(pos.currentPrice, baseCurrency, intlLocale),
    formatCurrency(pos.currentValue, baseCurrency, intlLocale),
    formatCurrency(pos.profitLoss, baseCurrency, intlLocale),
    formatPercent(pos.profitLossPct),
    pos.assetCurrency,
  ]);
}

function buildTotalsRow(portfolio: PortfolioData, intlLocale: string, labels: PortfolioExportLabels): string[] {
  const overallPct =
    portfolio.totalInvested !== 0 ? (portfolio.totalProfitLoss / portfolio.totalInvested) * 100 : null;
  return [
    "",
    labels.totalLabel,
    "",
    "",
    "",
    "",
    formatCurrency(portfolio.totalCurrentValue, portfolio.baseCurrency, intlLocale),
    formatCurrency(portfolio.totalProfitLoss, portfolio.baseCurrency, intlLocale),
    formatPercent(overallPct),
    portfolio.baseCurrency,
  ];
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exporta la cartera del usuario como CSV (separador coma, UTF-8 con BOM
 * para que Excel respete tildes/eñes) y dispara la descarga en el navegador.
 */
export function exportPortfolioCsv(
  portfolio: PortfolioData,
  locale: string,
  labels: PortfolioExportLabels
): void {
  const intlLocale = localeToIntl(locale);
  const header = [
    labels.colSymbol,
    labels.colName,
    labels.colType,
    labels.colQuantity,
    labels.colAvgPrice,
    labels.colCurrentPrice,
    labels.colValue,
    labels.colPl,
    labels.colPlPct,
    labels.colCurrency,
  ];

  const rows = [header, ...buildRows(portfolio, intlLocale, labels)];
  if (portfolio.positions.length > 0) {
    rows.push(buildTotalsRow(portfolio, intlLocale, labels));
  }

  const csvBody = rows.map((row) => row.map(csvField).join(",")).join("\r\n");
  const csvContent = `﻿${csvBody}`;

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `nextworth-portfolio-${fileDateStamp()}.csv`);
}

/** Escapa texto para insertarlo de forma segura dentro de HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Exporta la cartera del usuario como PDF sin dependencias externas: abre
 * una ventana nueva con un documento HTML autocontenido, listo para
 * imprimir, y lanza el diálogo de impresión del navegador (el usuario
 * elige "Guardar como PDF").
 */
export function exportPortfolioPdf(
  portfolio: PortfolioData,
  locale: string,
  labels: PortfolioExportLabels
): void {
  const intlLocale = localeToIntl(locale);
  const generatedAt = new Intl.DateTimeFormat(intlLocale, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  const headerCells = [
    labels.colSymbol,
    labels.colName,
    labels.colType,
    labels.colQuantity,
    labels.colAvgPrice,
    labels.colCurrentPrice,
    labels.colValue,
    labels.colPl,
    labels.colPlPct,
    labels.colCurrency,
  ]
    .map((label) => `<th>${escapeHtml(label)}</th>`)
    .join("");

  const bodyRows = buildRows(portfolio, intlLocale, labels)
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");

  const totalsRowHtml =
    portfolio.positions.length > 0
      ? `<tr class="total-row">${buildTotalsRow(portfolio, intlLocale, labels)
          .map((cell) => `<td>${escapeHtml(cell)}</td>`)
          .join("")}</tr>`
      : "";

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(labels.title)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    color: #111827;
    background: #ffffff;
    margin: 2rem;
  }
  h1 {
    font-size: 1.375rem;
    margin: 0 0 0.25rem;
  }
  .meta {
    color: #6b7280;
    font-size: 0.8rem;
    margin: 0 0 1.5rem;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
  }
  th, td {
    border: 1px solid #e5e7eb;
    padding: 0.5rem 0.65rem;
    text-align: right;
  }
  th:nth-child(1), td:nth-child(1),
  th:nth-child(2), td:nth-child(2),
  th:nth-child(3), td:nth-child(3) {
    text-align: left;
  }
  thead th {
    background: #f3f4f6;
    font-weight: 600;
  }
  tr.total-row td {
    font-weight: 700;
    background: #f9fafb;
  }
  @media print {
    body { margin: 0.5in; }
  }
</style>
</head>
<body>
  <h1>${escapeHtml(labels.title)}</h1>
  <p class="meta">${escapeHtml(labels.generatedAt)}: ${escapeHtml(generatedAt)}</p>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}${totalsRowHtml}</tbody>
  </table>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}
