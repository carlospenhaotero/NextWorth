"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { MagnifyingGlass, Plus, Bank, Wallet, PencilSimple, Spinner } from "@phosphor-icons/react/dist/ssr";
import { getAllAssets, type CatalogAsset } from "@/lib/assets-catalog";
import { AddAssetModal, type AssetSelection, type ListedAsset } from "@/components/shared/add-asset-modal";
import { AssetLogo } from "@/components/shared/asset-logo";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Badge } from "@/components/ui/badge";

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

  const card = (asset: ListedAsset & { displaySymbol?: string }, key: string) => (
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
        <Badge className="ml-1 shrink-0 capitalize">{asset.assetType}</Badge>
      </div>
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
          searching ? <Spinner size={18} className="animate-spin text-neutral-500" /> : undefined
        }
      />

      {hasQuery ? (
        /* Remote search results */
        <>
          {!searching && (
            <p className="text-sm text-neutral-500">
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
              <div className="text-center py-10 text-neutral-500 space-y-3">
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
              >
                {t(`categories.${value}`)}
              </Pill>
            ))}
          </div>
          <p className="text-xs text-neutral-500 uppercase tracking-wider">{t("popularAssets")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {suggested.map((a: CatalogAsset & { assetType: string }, i) =>
              card({ symbol: a.symbol, name: a.name, assetType: a.assetType, exchange: a.exchange, currency: a.currency, displaySymbol: a.displaySymbol }, `${a.symbol}-${i}`)
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
