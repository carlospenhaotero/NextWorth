"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash } from "@phosphor-icons/react/dist/ssr";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { deletePosition } from "@/actions/portfolio";
import type { PortfolioData } from "@/queries/portfolio";

const ASSET_ICONS: Record<string, string> = {
  stock: "S", etf: "E", crypto: "C", commodity: "Co", bond: "B", cash: "$", savings: "Sa",
};

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "stock", label: "Stocks" },
  { value: "etf", label: "ETFs" },
  { value: "crypto", label: "Crypto" },
  { value: "commodity", label: "Commodities" },
  { value: "bond", label: "Bonds" },
  { value: "cash", label: "Cash" },
  { value: "savings", label: "Savings" },
];

function canShowPriceHistory(assetType: string) {
  return !["cash", "savings", "bond"].includes(assetType);
}

interface AssetListViewProps {
  portfolio: PortfolioData;
}

export function AssetListView({ portfolio }: AssetListViewProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [isPending, startTransition] = useTransition();

  const assetCounts = useMemo(() => {
    return portfolio.positions.reduce<Record<string, number>>((acc, pos) => {
      acc[pos.assetType] = (acc[pos.assetType] || 0) + 1;
      return acc;
    }, {});
  }, [portfolio.positions]);

  const visibleFilters = useMemo(() => {
    return FILTER_OPTIONS.filter(
      (f) => f.value === "all" || (assetCounts[f.value] ?? 0) > 0
    );
  }, [assetCounts]);

  const filtered = useMemo(() => {
    return portfolio.positions.filter((pos) => {
      const matchesSearch =
        pos.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pos.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter =
        activeFilter === "all" || pos.assetType === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [portfolio.positions, searchTerm, activeFilter]);

  const handleNavigate = (pos: (typeof portfolio.positions)[number]) => {
    if (!canShowPriceHistory(pos.assetType)) return;
    router.push(`/assets/${encodeURIComponent(pos.symbol)}`);
  };

  const handleDelete = (id: number, symbol: string) => {
    if (!confirm(`Are you sure you want to delete ${symbol}?`)) return;
    startTransition(async () => {
      await deletePosition(id);
    });
  };

  const stats = useMemo(() => {
    const gainers = portfolio.positions.filter((p) => (p.profitLoss ?? 0) > 0).length;
    const losers = portfolio.positions.filter((p) => (p.profitLoss ?? 0) < 0).length;
    return {
      total: portfolio.positions.length,
      value: portfolio.totalCurrentValue,
      pl: portfolio.totalProfitLoss,
      plPct: portfolio.totalInvested > 0 ? (portfolio.totalProfitLoss / portfolio.totalInvested) * 100 : 0,
      gainers,
      losers,
    };
  }, [portfolio]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white mb-2">My Assets</h1>
        <p className="text-neutral-400">Track and manage your portfolio holdings</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card !p-4">
          <p className="text-xs text-neutral-500">Total Assets</p>
          <p className="text-lg font-bold text-white">{stats.total}</p>
        </div>
        <div className="glass-card !p-4">
          <p className="text-xs text-neutral-500">Portfolio Value</p>
          <p className="text-lg font-bold text-white">
            {formatCurrency(stats.value, portfolio.baseCurrency)}
          </p>
        </div>
        <div className="glass-card !p-4">
          <p className="text-xs text-neutral-500">Total P/L</p>
          <p className={`text-lg font-bold ${stats.pl >= 0 ? "text-green-400" : "text-red-400"}`}>
            {formatCurrency(stats.pl, portfolio.baseCurrency)}
          </p>
          <p className={`text-xs ${stats.plPct >= 0 ? "text-green-500" : "text-red-500"}`}>
            {formatPercent(stats.plPct)}
          </p>
        </div>
        <div className="glass-card !p-4">
          <p className="text-xs text-neutral-500">Performance</p>
          <p className="text-lg font-bold text-white">
            <span className="text-green-400">{stats.gainers}</span>
            {" / "}
            <span className="text-red-400">{stats.losers}</span>
          </p>
          <p className="text-xs text-neutral-500">gainers / losers</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <input
          type="text"
          placeholder="Search assets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 bg-neutral-900/50 border border-neutral-700 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-primary w-full md:w-64"
        />
        <div className="flex flex-wrap gap-2">
          {visibleFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeFilter === f.value
                  ? "bg-primary text-neutral-900"
                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
              }`}
            >
              {f.label}
              {f.value !== "all" && assetCounts[f.value] ? (
                <span className="ml-1 opacity-70">{assetCounts[f.value]}</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Asset Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-neutral-500 text-lg">
            {searchTerm || activeFilter !== "all" ? "No assets match your filters" : "No assets yet"}
          </p>
          {!searchTerm && activeFilter === "all" && (
            <button
              onClick={() => router.push("/add-asset")}
              className="mt-4 px-6 py-2 bg-primary text-neutral-900 font-bold rounded-xl"
            >
              + Add Asset
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((pos) => (
            <div
              key={pos.id}
              onClick={() => handleNavigate(pos)}
              className={`glass-card relative group ${
                canShowPriceHistory(pos.assetType)
                  ? "cursor-pointer hover:!bg-surface-light"
                  : "opacity-75"
              }`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(pos.id, pos.symbol);
                }}
                disabled={isPending}
                className="absolute top-3 right-3 text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash size={16} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-sm font-bold text-neutral-300">
                  {ASSET_ICONS[pos.assetType] || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{pos.name || pos.symbol}</p>
                  <p className="text-xs text-neutral-500">{pos.symbol}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                  {pos.assetType}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div>
                  <p className="text-neutral-500 text-xs">Quantity</p>
                  <p className="text-white">{pos.quantity.toLocaleString("en-US", { maximumFractionDigits: 4 })}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-xs">Avg Price</p>
                  <p className="text-white">{formatCurrency(pos.avgBuyPrice, portfolio.baseCurrency)}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-xs">Current Price</p>
                  <p className="text-white">{formatCurrency(pos.currentPrice, portfolio.baseCurrency)}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-xs">Currency</p>
                  <p className="text-white">{pos.assetCurrency}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-neutral-800/50">
                <div>
                  <p className="text-xs text-neutral-500">Value</p>
                  <p className="font-semibold text-white">
                    {formatCurrency(pos.currentValue, portfolio.baseCurrency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${(pos.profitLoss ?? 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {formatCurrency(pos.profitLoss, portfolio.baseCurrency)}
                  </p>
                  <p className={`text-xs ${(pos.profitLossPct ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {formatPercent(pos.profitLossPct)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
