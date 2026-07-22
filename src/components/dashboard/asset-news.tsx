"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Newspaper, Sparkle, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { localeToIntl } from "@/i18n/locale";
import { Skeleton } from "@/components/ui/skeleton";
import type { AssetNewsResult } from "@/server/asset-news";

interface AssetNewsPanelProps {
  symbol: string;
}

function formatDate(iso: string | null, intlLocale: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(intlLocale, { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Recent news for the asset, with an optional AI overview. Descriptive and
 * informational, never a recommendation. Self-hides (renders nothing) when the
 * asset is not owned or Yahoo returns no headlines.
 */
export function AssetNewsPanel({ symbol }: AssetNewsPanelProps) {
  const t = useTranslations("assetDetail.news");
  const locale = useLocale();
  const intlLocale = localeToIntl(locale);
  const [news, setNews] = useState<AssetNewsResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/assets/${encodeURIComponent(symbol)}/news?locale=${locale}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setNews(data);
      })
      .catch(() => {
        if (!cancelled) setNews(null);
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
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!news || news.items.length === 0) return null;

  return (
    <section className="glass-card">
      <div className="flex items-center gap-2">
        <Newspaper size={18} weight="bold" className="text-neutral-300" />
        <h2 className="text-lg font-semibold text-white">{t("title")}</h2>
      </div>

      {news.summary && (
        <div className="mt-3 rounded-xl border border-accent/30 bg-accent-soft p-4">
          <p className="text-sm leading-relaxed text-neutral-200">{news.summary}</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-accent">
            <Sparkle size={12} weight="fill" />
            {t("aiTag")}
          </div>
        </div>
      )}

      <ul className="mt-4 space-y-1">
        {news.items.map((item) => {
          const meta = [item.publisher, formatDate(item.publishedAt, intlLocale)]
            .filter(Boolean)
            .join(" · ");
          return (
            <li key={item.link}>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group -mx-3 flex items-start gap-2 rounded-lg px-3 py-2.5 outline-none transition-colors hover:bg-neutral-800/50 focus-visible:ring-2 focus-visible:ring-accent-ring"
              >
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm text-neutral-200 group-hover:text-white">
                    {item.title}
                  </p>
                  {meta && <p className="mt-0.5 text-xs text-muted">{meta}</p>}
                </div>
                <ArrowSquareOut
                  size={14}
                  className="mt-0.5 shrink-0 text-neutral-500 group-hover:text-neutral-300"
                />
              </a>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs text-muted">{t("disclaimer")}</p>
    </section>
  );
}
