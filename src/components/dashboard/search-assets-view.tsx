"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react/dist/ssr";
import { getAllAssets, type CatalogAsset } from "@/lib/assets-catalog";
import { AddAssetModal } from "@/components/shared/add-asset-modal";

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "stock", label: "Stocks" },
  { value: "crypto", label: "Crypto" },
  { value: "etf", label: "ETFs" },
  { value: "commodity", label: "Commodities" },
  { value: "bond", label: "Bonds" },
];

interface SearchAssetsViewProps {
  baseCurrency: string;
}

export function SearchAssetsView({ baseCurrency }: SearchAssetsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<(CatalogAsset & { assetType: string }) | null>(null);

  const allAssets = useMemo(() => getAllAssets(), []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filtered = useMemo(() => {
    let result = allAssets;
    if (selectedCategory !== "all") {
      result = result.filter((a) => a.assetType === selectedCategory);
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((a) =>
        a.symbol.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        (a.displaySymbol && a.displaySymbol.toLowerCase().includes(q))
      );
    }
    return result;
  }, [allAssets, selectedCategory, debouncedSearch]);

  const handleAddClick = useCallback((asset: CatalogAsset & { assetType: string }) => {
    setSelectedAsset(asset);
    setModalOpen(true);
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white mb-2">Search Assets</h1>
        <p className="text-neutral-400">Browse and add stocks, crypto, ETFs, commodities, and bonds</p>
      </header>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={20} />
        <input
          type="text"
          placeholder="Search by symbol or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-neutral-900/50 border border-neutral-700 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-primary"
        />
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              selectedCategory === cat.value
                ? "bg-primary text-neutral-900"
                : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results Info */}
      <p className="text-sm text-neutral-500">
        Showing <span className="text-white font-medium">{filtered.length}</span>{" "}
        {filtered.length === 1 ? "asset" : "assets"}
        {debouncedSearch && ` matching "${debouncedSearch}"`}
      </p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((asset, i) => (
            <div key={`${asset.symbol}-${i}`} className="glass-card !p-4 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white text-sm">
                    {asset.displaySymbol || asset.symbol}
                  </p>
                  <p className="text-xs text-neutral-400 truncate">{asset.name}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-500 ml-2 shrink-0">
                  {asset.assetType}
                </span>
              </div>
              {asset.exchange && (
                <p className="text-xs text-neutral-600 mb-3">{asset.exchange}</p>
              )}
              <button
                onClick={() => handleAddClick(asset)}
                className="mt-auto flex items-center justify-center gap-1 py-2 bg-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-700 transition-colors text-xs font-medium"
              >
                <Plus size={14} />
                Add to Portfolio
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-neutral-500">
          No assets found{debouncedSearch ? ` for "${debouncedSearch}"` : ""}
        </div>
      )}

      {/* Modal */}
      <AddAssetModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedAsset(null); }}
        asset={selectedAsset}
        baseCurrency={baseCurrency}
      />
    </div>
  );
}
