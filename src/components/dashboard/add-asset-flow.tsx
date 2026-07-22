"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MagnifyingGlass, Plus, Bank, Wallet, PencilSimple, Spinner, Sparkle, X } from "@phosphor-icons/react/dist/ssr";
import { getAllAssets, type CatalogAsset } from "@/lib/assets-catalog";
import { AssetTypeIcon, assetTypeChipClasses } from "@/lib/asset-type-icons";
import { AddAssetModal, type AssetSelection, type ListedAsset } from "@/components/shared/add-asset-modal";
import { AssetLogo } from "@/components/shared/asset-logo";
import { VarPill } from "@/components/shared/var-pill";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AssetVariation } from "@/lib/variation";
import type { AssetSuggestionsResult } from "@/lib/diversification";

const CATEGORY_VALUES = ["all", "stock", "etf", "crypto", "commodity"] as const;

interface AddAssetFlowProps {
  baseCurrency: string;
  existingPositions: { id: number; symbol: string; assetType: string }[];
}

export function AddAssetFlow({ baseCurrency, existingPositions }: AddAssetFlowProps) {
  const router = useRouter();
  const t = useTranslations("addAsset.flow");
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [results, setResults] = useState<ListedAsset[]>([]);
  const [searching, setSearching] = useState(false);
  const [selection, setSelection] = useState<AssetSelection | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [variations, setVariations] = useState<Record<string, AssetVariation | null>>({});
  const [suggestions, setSuggestions] = useState<AssetSuggestionsResult | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState(false);

  const catalog = useMemo(() => getAllAssets(), []);
  const hasQuery = searchQuery.trim().length >= 2;

  // Remote search against Yahoo (debounced).
  useEffect(() => {
    if (!hasQuery) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(searchQuery.trim())}`, { signal: ctrl.signal });
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        if (!ctrl.signal.aborted) {
          setResults([]);
          toast.error(t("toast.searchFailed"));
        }
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [searchQuery, hasQuery, t]);

  // Suggested catalog assets when there is no query.
  const suggested = useMemo(() => {
    if (category === "all") return catalog;
    return catalog.filter((a) => a.assetType === category);
  }, [catalog, category]);

  // Load today/7d variation for the visible catalog symbols in one batch call.
  // Symbols already fetched (value or null) are skipped, so switching tabs only
  // fetches the newly-shown ones.
  const suggestedSymbols = useMemo(() => suggested.map((a) => a.symbol), [suggested]);
  useEffect(() => {
    if (hasQuery) return;
    const missing = suggestedSymbols.filter((s) => !(s in variations));
    if (missing.length === 0) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/market/quotes?symbols=${encodeURIComponent(missing.join(","))}`, {
          signal: ctrl.signal,
        });
        const data = await res.json();
        const next: Record<string, AssetVariation | null> = {};
        for (const s of missing) next[s] = null; // Mark attempted so we don't refetch.
        for (const q of data.quotes ?? []) {
          next[q.symbol] = { price: q.price, todayPct: q.todayPct, weekPct: q.weekPct };
        }
        setVariations((prev) => ({ ...prev, ...next }));
      } catch {
        // Network/abort: leave symbols unmarked so a later view can retry.
      }
    })();
    return () => ctrl.abort();
  }, [hasQuery, suggestedSymbols, variations]);

  const openWith = useCallback((sel: AssetSelection) => {
    setSelection(sel);
    setModalOpen(true);
  }, []);

  const handleSaved = useCallback(() => {
    toast.success(t("toast.added"), {
      action: { label: t("toast.addedAction"), onClick: () => router.push("/overview") },
    });
    router.refresh();
  }, [router, t]);

  const loadSuggestions = useCallback(async () => {
    setSuggestLoading(true);
    setSuggestError(false);
    try {
      const res = await fetch("/api/assets/suggestions");
      if (!res.ok) throw new Error("request failed");
      const data: AssetSuggestionsResult = await res.json();
      setSuggestions(data);
      // Make sure the suggested cards can show variation even from a filtered tab.
      const symbols = data.picks.map((p) => p.symbol);
      if (symbols.length > 0) {
        try {
          const vRes = await fetch(`/api/market/quotes?symbols=${encodeURIComponent(symbols.join(","))}`);
          const vData = await vRes.json();
          const next: Record<string, AssetVariation | null> = {};
          for (const s of symbols) next[s] = null;
          for (const q of vData.quotes ?? []) {
            next[q.symbol] = { price: q.price, todayPct: q.todayPct, weekPct: q.weekPct };
          }
          setVariations((prev) => ({ ...prev, ...next }));
        } catch {
          // Variation is optional; the suggestion still renders.
        }
      }
    } catch {
      setSuggestError(true);
    } finally {
      setSuggestLoading(false);
    }
  }, []);

  const card = (
    asset: ListedAsset & { displaySymbol?: string },
    key: string,
    showVariation = false
  ) => (
    <div key={key} className="glass-card group !p-4 flex flex-col">
      <div className="flex items-start gap-3 mb-3">
        <AssetLogo
          symbol={asset.symbol}
          assetType={asset.assetType}
          name={asset.name}
          fallbackLabel={(asset.displaySymbol || asset.symbol).substring(0, 3)}
          className="h-9 w-9 shrink-0 rounded-lg"
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white text-sm truncate">{asset.displaySymbol || asset.symbol}</p>
          <p className="text-xs text-neutral-400 truncate">{asset.name}</p>
        </div>
        <Badge className={cn("ml-1 inline-flex shrink-0 items-center gap-1 capitalize", assetTypeChipClasses(asset.assetType))}>
          <AssetTypeIcon type={asset.assetType} />
          {asset.assetType}
        </Badge>
      </div>
      {showVariation && (
        <div className="mb-3 flex items-center gap-4 text-xs">
          <VarPill
            label={t("variation.today")}
            pct={variations[asset.symbol]?.todayPct}
            loading={!(asset.symbol in variations)}
          />
          <VarPill
            label={t("variation.week")}
            pct={variations[asset.symbol]?.weekPct}
            loading={!(asset.symbol in variations)}
          />
        </div>
      )}
      {asset.exchange && <p className="text-xs text-neutral-600 mb-3 truncate">{asset.exchange}</p>}
      <button
        onClick={() => openWith({ kind: "listed", asset })}
        className="mt-auto flex items-center justify-center gap-1 py-2 bg-neutral-800 text-neutral-300 rounded-lg text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
      >
        <Plus size={14} />
        {t("addToPortfolio")}
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button onClick={() => openWith({ kind: "cash" })} className="glass-card !p-4 flex items-center gap-3 text-left hover:!bg-surface-light">
          <Wallet size={22} className="text-neutral-300 shrink-0" />
          <div><p className="font-medium text-white text-sm">{t("quickActions.cashTitle")}</p><p className="text-xs text-neutral-400">{t("quickActions.cashDesc")}</p></div>
        </button>
        <button onClick={() => openWith({ kind: "savings" })} className="glass-card !p-4 flex items-center gap-3 text-left hover:!bg-surface-light">
          <Bank size={22} className="text-neutral-300 shrink-0" />
          <div><p className="font-medium text-white text-sm">{t("quickActions.savingsTitle")}</p><p className="text-xs text-neutral-400">{t("quickActions.savingsDesc")}</p></div>
        </button>
        <button onClick={() => openWith({ kind: "manual" })} className="glass-card !p-4 flex items-center gap-3 text-left hover:!bg-surface-light">
          <PencilSimple size={22} className="text-neutral-300 shrink-0" />
          <div><p className="font-medium text-white text-sm">{t("quickActions.manualTitle")}</p><p className="text-xs text-neutral-400">{t("quickActions.manualDesc")}</p></div>
        </button>
      </div>

      {/* Search */}
      <Input
        type="text"
        placeholder={t("searchPlaceholder")}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        autoFocus
        icon={<MagnifyingGlass size={18} />}
        trailing={
          searching ? <Spinner size={18} className="animate-spin text-muted" /> : undefined
        }
      />

      {hasQuery ? (
        /* Remote search results */
        <>
          {!searching && (
            <p className="text-sm text-muted">
              {results.length > 0
                ? t("found", { count: results.length, query: searchQuery.trim() })
                : t("noResults", { query: searchQuery.trim() })}
            </p>
          )}
          {results.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {results.map((a, i) => card(a, `${a.symbol}-${i}`))}
            </div>
          ) : (
            !searching && (
              <div className="text-center py-10 text-muted space-y-3">
                <p>{t("cantFind")}</p>
                <button onClick={() => openWith({ kind: "manual" })} className="text-sm text-accent-hover hover:underline">
                  {t("addManuallyInstead")}
                </button>
              </div>
            )
          )}
        </>
      ) : (
        /* Suggested catalog */
        <>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_VALUES.map((value) => (
              <Pill
                key={value}
                size="md"
                active={category === value}
                onClick={() => setCategory(value)}
                className="inline-flex items-center gap-1.5"
              >
                {value !== "all" && <AssetTypeIcon type={value} />}
                {t(`categories.${value}`)}
              </Pill>
            ))}
          </div>
          {(suggestLoading || suggestError || suggestions) && (
            <div className="glass-card space-y-4 border border-accent/30 !bg-accent-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkle size={18} weight="fill" className="text-accent-hover" />
                  <h3 className="text-sm font-semibold text-white">{t("suggest.title")}</h3>
                </div>
                <button
                  onClick={() => { setSuggestions(null); setSuggestError(false); }}
                  aria-label={t("suggest.dismiss")}
                  className="text-neutral-500 transition-colors hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
              {suggestLoading ? (
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Spinner size={14} className="animate-spin" />
                  {t("suggest.loading")}
                </p>
              ) : suggestError ? (
                <p className="text-sm text-danger">{t("suggest.error")}</p>
              ) : suggestions ? (
                <>
                  <p className="text-sm leading-relaxed text-neutral-300">{suggestions.explanation}</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {suggestions.picks.map((a, i) =>
                      card(
                        { symbol: a.symbol, name: a.name, assetType: a.assetType, exchange: a.exchange, currency: a.currency, displaySymbol: a.displaySymbol },
                        `sug-${a.symbol}-${i}`,
                        true
                      )
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <p className="text-xs text-muted">{t("suggest.disclaimer")}</p>
                    {suggestions.source === "ai" && (
                      <span className="shrink-0 text-xs text-accent-hover">{t("suggest.aiTag")}</span>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted uppercase tracking-wider">{t("popularAssets")}</p>
            <button
              onClick={loadSuggestions}
              disabled={suggestLoading}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-accent/40 bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent-hover transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60 outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
            >
              {suggestLoading ? <Spinner size={14} className="animate-spin" /> : <Sparkle size={14} weight="fill" />}
              {t("suggest.button")}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {suggested.map((a: CatalogAsset & { assetType: string }, i) =>
              card({ symbol: a.symbol, name: a.name, assetType: a.assetType, exchange: a.exchange, currency: a.currency, displaySymbol: a.displaySymbol }, `${a.symbol}-${i}`, true)
            )}
          </div>
        </>
      )}

      <AddAssetModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelection(null); }}
        selection={selection}
        baseCurrency={baseCurrency}
        existingPositions={existingPositions}
        onSaved={handleSaved}
      />
    </div>
  );
}
