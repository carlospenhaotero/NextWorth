"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { TrendUp, Pulse, Gauge } from "@phosphor-icons/react/dist/ssr";
import { GlossaryTerm } from "@/components/ui/glossary-term";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AssetSignal } from "@/server/asset-signal";

interface AssetSignalPanelProps {
  symbol: string;
}

type Tone = "success" | "danger" | "neutral" | "warn";

const MOMENTUM_TONE: Record<AssetSignal["momentum"]["band"], Tone> = {
  strongUp: "success",
  up: "success",
  flat: "neutral",
  down: "danger",
  strongDown: "danger",
};

const VOLATILITY_TONE: Record<AssetSignal["volatility"]["band"], Tone> = {
  low: "success",
  medium: "neutral",
  high: "warn",
};

const RISK_TONE: Record<AssetSignal["risk"]["class"], Tone> = {
  low: "success",
  medium: "neutral",
  high: "warn",
};

const TONE_CLASS: Record<Tone, string> = {
  success: "text-success",
  danger: "text-danger",
  warn: "text-amber-400",
  neutral: "text-neutral-300",
};

function formatPct(value: number | null): string {
  if (value == null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

/**
 * Panel de señal educativa por activo: momentum, volatilidad y clase de riesgo,
 * más el encaje con el perfil de riesgo de la cartera. Descriptivo, nunca
 * recomienda operar. Se auto-descarta (no renderiza) si el activo no tiene serie
 * de mercado o no hay historia suficiente.
 */
export function AssetSignalPanel({ symbol }: AssetSignalPanelProps) {
  const t = useTranslations("assetSignal");
  const locale = useLocale();
  const [signal, setSignal] = useState<AssetSignal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/assets/${encodeURIComponent(symbol)}/signal?locale=${locale}`)
      .then((res) => (res.ok ? res.json() : { signal: null }))
      .then((data) => {
        if (!cancelled) setSignal(data.signal ?? null);
      })
      .catch(() => {
        if (!cancelled) setSignal(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, locale]);

  if (loading) {
    return (
      <div className="glass-card">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!signal) return null;

  const cards = [
    {
      icon: TrendUp,
      term: "momentum" as const,
      label: t("momentum.label"),
      value: t(`momentum.band.${signal.momentum.band}`),
      tone: MOMENTUM_TONE[signal.momentum.band],
      detail: `3m ${formatPct(signal.momentum.r3m)} · 6m ${formatPct(
        signal.momentum.r6m
      )} · 12m ${formatPct(signal.momentum.r12m)}`,
    },
    {
      icon: Pulse,
      term: "volatility" as const,
      label: t("volatility.label"),
      value: t(`volatility.band.${signal.volatility.band}`),
      tone: VOLATILITY_TONE[signal.volatility.band],
      detail: t("volatility.annualized", {
        pct: signal.volatility.annualizedPct.toFixed(1),
      }),
    },
    {
      icon: Gauge,
      term: null,
      label: t("risk.label"),
      value: t(`risk.class.${signal.risk.class}`),
      tone: RISK_TONE[signal.risk.class],
      detail: t(`assetType.${signal.assetType}`),
    },
  ];

  return (
    <section className="glass-card">
      <h2 className="text-lg font-semibold text-white">{t("title")}</h2>
      <p className="mt-1 text-sm text-neutral-400">{t("desc")}</p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map(({ icon: Icon, term, label, value, tone, detail }) => (
          <div
            key={label}
            className="rounded-xl border border-neutral-800/60 bg-neutral-900/40 p-4"
          >
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <Icon size={15} weight="bold" />
              {term ? (
                <GlossaryTerm termId={term}>{label}</GlossaryTerm>
              ) : (
                <span>{label}</span>
              )}
            </div>
            <p className={cn("mt-2 text-base font-semibold", TONE_CLASS[tone])}>
              {value}
            </p>
            <p className="mt-1 text-xs text-neutral-500 tabular-nums">{detail}</p>
          </div>
        ))}
      </div>

      {signal.fit && (
        <p className="mt-4 text-sm text-neutral-300">
          {t(`fit.${signal.fit.verdict}`, {
            band: t(`riskBand.${signal.fit.portfolioBand}`),
          })}
        </p>
      )}

      <p className="mt-4 text-xs text-neutral-500">{t("disclaimer")}</p>
    </section>
  );
}
