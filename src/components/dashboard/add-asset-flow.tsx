"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, Plus, Bank, Wallet, PencilSimple, Spinner, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { getAllAssets, type CatalogAsset } from "@/lib/assets-catalog";
import { AddAssetModal, type AssetSelection, type ListedAsset } from "@/components/shared/add-asset-modal";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "stock", label: "Stocks" },
  { value: "etf", label: "ETFs" },
  { value: "crypto", label: "Crypto" },
  { value: "commodity", label: "Commodities" },
];

interface AddAssetFlowProps {
  baseCurrency: string;
  existingPositions: { id: number; symbol: string; assetType: string }[];
}

export function AddAssetFlow({ baseCurrency, existingPositions }: AddAssetFlowProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [results, setResults] = useState<ListedAsset[]>([]);
  const [searching, setSearching] = useState(false);
  const [selection, setSelection] = useState<AssetSelection | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        if (!ctrl.signal.aborted) setResults([]);
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [searchQuery, hasQuery]);

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
    setToast("Added to your portfolio");
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2500);
    router.refresh();
  }, [router]);

  const card = (asset: ListedAsset & { displaySymbol?: string }, key: string) => (
    <div key={key} className="glass-card !p-4 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white text-sm">{asset.displaySymbol || asset.symbol}</p>
          <p className="text-xs text-neutral-400 truncate">{asset.name}</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-500 ml-2 shrink-0">{asset.assetType}</span>
      </div>
      {asset.exchange && <p className="text-xs text-neutral-600 mb-3 truncate">{asset.exchange}</p>}
      <button
        onClick={() => openWith({ kind: "listed", asset })}
        className="mt-auto flex items-center justify-center gap-1 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors text-xs font-medium"
      >
        <Plus size={14} />
        Add to portfolio
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button onClick={() => openWith({ kind: "cash" })} className="glass-card !p-4 flex items-center gap-3 text-left hover:!bg-surface-light">
          <Wallet size={22} className="text-neutral-300 shrink-0" />
          <div><p className="font-medium text-white text-sm">Cash</p><p className="text-xs text-neutral-400">Bank balance</p></div>
        </button>
        <button onClick={() => openWith({ kind: "savings" })} className="glass-card !p-4 flex items-center gap-3 text-left hover:!bg-surface-light">
          <Bank size={22} className="text-neutral-300 shrink-0" />
          <div><p className="font-medium text-white text-sm">Savings</p><p className="text-xs text-neutral-400">Interest-earning</p></div>
        </button>
        <button onClick={() => openWith({ kind: "manual" })} className="glass-card !p-4 flex items-center gap-3 text-left hover:!bg-surface-light">
          <PencilSimple size={22} className="text-neutral-300 shrink-0" />
          <div><p className="font-medium text-white text-sm">Add manually</p><p className="text-xs text-neutral-400">Not publicly listed</p></div>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={20} />
        <input
          type="text"
          placeholder="Search any stock, ETF, fund (name or ISIN), crypto..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
          className="w-full pl-12 pr-4 py-3 bg-neutral-900/50 border border-neutral-700 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-primary"
        />
        {searching && <Spinner size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 animate-spin" />}
      </div>

      {hasQuery ? (
        /* Remote search results */
        <>
          {!searching && (
            <p className="text-sm text-neutral-500">
              {results.length > 0 ? (
                <>Found <span className="text-white font-medium">{results.length}</span> for &quot;{searchQuery.trim()}&quot;</>
              ) : (
                <>No results for &quot;{searchQuery.trim()}&quot;</>
              )}
            </p>
          )}
          {results.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {results.map((a, i) => card(a, `${a.symbol}-${i}`))}
            </div>
          ) : (
            !searching && (
              <div className="text-center py-10 text-neutral-500 space-y-3">
                <p>Can&apos;t find it? It may not be publicly listed.</p>
                <button onClick={() => openWith({ kind: "manual" })} className="text-sm text-primary hover:underline">
                  Add it manually instead
                </button>
              </div>
            )
          )}
        </>
      ) : (
        /* Suggested catalog */
        <>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button key={cat.value} onClick={() => setCategory(cat.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  category === cat.value ? "bg-primary text-neutral-900" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                }`}>
                {cat.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Popular assets</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {suggested.map((a: CatalogAsset & { assetType: string }, i) =>
              card({ symbol: a.symbol, name: a.name, assetType: a.assetType, exchange: a.exchange, currency: a.currency, displaySymbol: a.displaySymbol }, `${a.symbol}-${i}`)
            )}
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl shadow-xl">
          <CheckCircle size={18} className="text-green-400" />
          <span className="text-sm text-white">{toast}</span>
          <button onClick={() => router.push("/overview")} className="text-sm text-primary hover:underline ml-2">View</button>
        </div>
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
