"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { Trash, PencilSimple } from "@phosphor-icons/react/dist/ssr";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { AssetTypeIcon } from "@/lib/asset-type-icons";
import { localeToIntl } from "@/i18n/locale";
import { deletePosition } from "@/actions/portfolio";
import { AddAssetModal, type AssetSelection } from "@/components/shared/add-asset-modal";
import { AssetLogo } from "@/components/shared/asset-logo";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GlossaryTerm } from "@/components/ui/glossary-term";
import { StatCard } from "@/components/ui/stat-card";
import { Pill } from "@/components/ui/pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PortfolioData } from "@/queries/portfolio";

const ASSET_ICONS: Record<string, string> = {
  stock: "S", etf: "E", fund: "F", crypto: "C", commodity: "Co", bond: "B", cash: "$", savings: "Sa",
};

const FILTER_VALUES = [
  "all", "stock", "etf", "fund", "crypto", "commodity", "bond", "cash", "savings",
] as const;

function canShowPriceHistory(assetType: string) {
  return !["cash", "savings", "bond"].includes(assetType);
}

interface AssetListViewProps {
  portfolio: PortfolioData;
}

export function AssetListView({ portfolio }: AssetListViewProps) {
  const router = useRouter();
  const t = useTranslations("assetList");
  const intlLocale = localeToIntl(useLocale());
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [isPending, startTransition] = useTransition();
  const [editSelection, setEditSelection] = useState<AssetSelection | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: number; name: string } | null>(null);

  const handleEdit = (pos: (typeof portfolio.positions)[number]) => {
    setEditSelection({
      kind: "edit",
      position: {
        id: pos.id,
        symbol: pos.symbol,
        name: pos.name,
        assetType: pos.assetType,
        assetCurrency: pos.assetCurrency,
        quantity: pos.quantity,
        avgBuyPrice: pos.avgBuyPrice,
        tae: pos.tae,
        faceValue: pos.faceValue,
        couponRate: pos.couponRate,
        couponFrequency: pos.couponFrequency,
        maturityDate: pos.maturityDate ? new Date(pos.maturityDate).toISOString() : null,
      },
    });
  };

  const assetCounts = useMemo(() => {
    return portfolio.positions.reduce<Record<string, number>>((acc, pos) => {
      acc[pos.assetType] = (acc[pos.assetType] || 0) + 1;
      return acc;
    }, {});
  }, [portfolio.positions]);

  const visibleFilters = useMemo(() => {
    return FILTER_VALUES.filter(
      (value) => value === "all" || (assetCounts[value] ?? 0) > 0
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

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    startTransition(async () => {
      try {
        await deletePosition(id);
        toast.success(t("toast.deleted"));
      } catch {
        toast.error(t("toast.deleteError"));
      } finally {
        setPendingDelete(null);
      }
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
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={t("stat.totalAssets")} value={stats.total} />
        <StatCard
          label={t("stat.portfolioValue")}
          value={formatCurrency(stats.value, portfolio.baseCurrency, intlLocale)}
        />
        <StatCard
          label={t("stat.totalPL")}
          tone={stats.pl >= 0 ? "success" : "danger"}
          value={formatCurrency(stats.pl, portfolio.baseCurrency, intlLocale)}
          sub={
            <span className={stats.plPct >= 0 ? "text-success" : "text-danger"}>
              {formatPercent(stats.plPct)}
            </span>
          }
        />
        <StatCard
          label={t("stat.performance")}
          value={
            <>
              <span className="text-success">{stats.gainers}</span>
              <span className="text-neutral-500">{" / "}</span>
              <span className="text-danger">{stats.losers}</span>
            </>
          }
          sub={<span className="text-neutral-500">{t("stat.gainersLosers")}</span>}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <Input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-64"
        />
        <div className="flex flex-wrap gap-2">
          {visibleFilters.map((value) => (
            <Pill
              key={value}
              active={activeFilter === value}
              onClick={() => setActiveFilter(value)}
              className="inline-flex items-center gap-1.5"
            >
              {value !== "all" && <AssetTypeIcon type={value} />}
              {t(`filter.${value}`)}
              {value !== "all" && assetCounts[value] ? (
                <span className="ml-1 opacity-70">{assetCounts[value]}</span>
              ) : null}
            </Pill>
          ))}
        </div>
      </div>

      {/* Asset Cards */}
      {filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center gap-4 py-14 text-center">
          <p className="text-neutral-400">
            {searchTerm || activeFilter !== "all" ? t("empty.noMatch") : t("empty.none")}
          </p>
          {!searchTerm && activeFilter === "all" && (
            <Button onClick={() => router.push("/add-asset")}>{t("addAsset")}</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((pos) => {
            const navigable = canShowPriceHistory(pos.assetType);
            return (
            <div
              key={pos.id}
              onClick={() => handleNavigate(pos)}
              role={navigable ? "button" : undefined}
              tabIndex={navigable ? 0 : undefined}
              onKeyDown={
                navigable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleNavigate(pos);
                      }
                    }
                  : undefined
              }
              className={`glass-card relative group ${
                navigable
                  ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                  : "cursor-default opacity-75"
              }`}
            >
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(pos);
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                  aria-label={t("aria.edit", { name: pos.name || pos.symbol })}
                  className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                >
                  <PencilSimple size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPendingDelete({ id: pos.id, name: pos.name || pos.symbol });
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                  disabled={isPending}
                  aria-label={t("aria.delete", { name: pos.name || pos.symbol })}
                  className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-danger outline-none focus-visible:ring-2 focus-visible:ring-danger/40 disabled:opacity-50"
                >
                  <Trash size={16} />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <AssetLogo
                  symbol={pos.symbol}
                  assetType={pos.assetType}
                  name={pos.name}
                  fallbackLabel={ASSET_ICONS[pos.assetType] || "?"}
                  className="w-10 h-10 rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{pos.name || pos.symbol}</p>
                  <p className="text-xs text-neutral-500">{pos.symbol}</p>
                </div>
                <Badge className="inline-flex items-center gap-1">
                  <AssetTypeIcon type={pos.assetType} />
                  {t(`filter.${pos.assetType}`)}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div>
                  <p className="text-neutral-500 text-xs">{t("field.quantity")}</p>
                  <p className="text-white">{pos.quantity.toLocaleString(intlLocale, { maximumFractionDigits: 4 })}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-xs">{t("field.avgPrice")}</p>
                  <p className="text-white">
                    {pos.avgBuyPrice != null ? formatCurrency(pos.avgBuyPrice, portfolio.baseCurrency, intlLocale) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500 text-xs">{t("field.currentPrice")}</p>
                  <p className="text-white">{formatCurrency(pos.currentPrice, portfolio.baseCurrency, intlLocale)}</p>
                </div>
                <div>
                  <p className="text-neutral-500 text-xs">{t("field.currency")}</p>
                  <p className="text-white">{pos.assetCurrency}</p>
                </div>
              </div>

              {/* Savings / bond metrics */}
              {pos.assetType === "savings" && pos.projectedAnnualIncome != null && (
                <div className="grid grid-cols-2 gap-3 text-sm mb-4 pt-3 border-t border-neutral-800/50">
                  <div>
                    <p className="text-neutral-500 text-xs">
                      <GlossaryTerm termId="tae">{t("field.annualInterest")}</GlossaryTerm>
                    </p>
                    <p className="text-success">{formatCurrency(pos.projectedAnnualIncome, portfolio.baseCurrency, intlLocale)}</p>
                  </div>
                  <div>
                    <p className="text-neutral-500 text-xs">{t("field.valueIn1y")}</p>
                    <p className="text-white">{formatCurrency(pos.projectedValue1y, portfolio.baseCurrency, intlLocale)}</p>
                  </div>
                </div>
              )}
              {pos.assetType === "bond" && (pos.annualCouponIncome != null || pos.daysToMaturity != null) && (
                <div className="grid grid-cols-2 gap-3 text-sm mb-4 pt-3 border-t border-neutral-800/50">
                  {pos.annualCouponIncome != null && (
                    <div>
                      <p className="text-neutral-500 text-xs">
                        <GlossaryTerm termId="coupon">{t("field.couponPerYear")}</GlossaryTerm>
                      </p>
                      <p className="text-success">{formatCurrency(pos.annualCouponIncome, portfolio.baseCurrency, intlLocale)}</p>
                    </div>
                  )}
                  {pos.currentYield != null && (
                    <div>
                      <p className="text-neutral-500 text-xs">
                        <GlossaryTerm termId="bondYield">{t("field.currentYield")}</GlossaryTerm>
                      </p>
                      <p className="text-white">{pos.currentYield.toFixed(2)}%</p>
                    </div>
                  )}
                  {pos.daysToMaturity != null && (
                    <div>
                      <p className="text-neutral-500 text-xs">{t("field.toMaturity")}</p>
                      <p className="text-white">{t("field.days", { days: pos.daysToMaturity })}</p>
                    </div>
                  )}
                  {pos.redemptionValue != null && (
                    <div>
                      <p className="text-neutral-500 text-xs">{t("field.atMaturity")}</p>
                      <p className="text-white">{formatCurrency(pos.redemptionValue, portfolio.baseCurrency, intlLocale)}</p>
                    </div>
                  )}
                </div>
              )}
              {(pos.assetType === "stock" || pos.assetType === "etf") && pos.annualDividendIncome != null && (
                <div className="grid grid-cols-2 gap-3 text-sm mb-4 pt-3 border-t border-neutral-800/50">
                  <div>
                    <p className="text-neutral-500 text-xs">{t("field.annualDividend")}</p>
                    <p className="text-success">{formatCurrency(pos.annualDividendIncome, portfolio.baseCurrency, intlLocale)}</p>
                  </div>
                  {pos.dividendYield != null && (
                    <div>
                      <p className="text-neutral-500 text-xs">
                        <GlossaryTerm termId="dividendYield">{t("field.dividendYield")}</GlossaryTerm>
                      </p>
                      <p className="text-white">{pos.dividendYield.toFixed(2)}%</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-neutral-800/50">
                <div>
                  <p className="text-xs text-neutral-500">{t("field.value")}</p>
                  <p className="font-semibold text-white">
                    {formatCurrency(pos.currentValue, portfolio.baseCurrency, intlLocale)}
                  </p>
                </div>
                {pos.invested != null ? (
                  <div className="text-right">
                    <p className={`font-semibold ${(pos.profitLoss ?? 0) >= 0 ? "text-success" : "text-danger"}`}>
                      {formatCurrency(pos.profitLoss, portfolio.baseCurrency, intlLocale)}
                    </p>
                    <p className={`text-xs ${(pos.profitLossPct ?? 0) >= 0 ? "text-success" : "text-danger"}`}>
                      {formatPercent(pos.profitLossPct)}
                    </p>
                  </div>
                ) : (
                  <div className="text-right">
                    <p className="text-xs text-neutral-500">{t("field.noCostSet")}</p>
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {portfolio.positions.length > 0 && (
        <p className="text-xs text-neutral-500">{t("dataSource")}</p>
      )}

      <AddAssetModal
        open={editSelection != null}
        onClose={() => setEditSelection(null)}
        selection={editSelection}
        baseCurrency={portfolio.baseCurrency}
        onSaved={() => router.refresh()}
      />

      <ConfirmDialog
        open={pendingDelete != null}
        title={t("confirmDelete.title")}
        description={
          pendingDelete
            ? t("confirmDelete.description", { name: pendingDelete.name })
            : undefined
        }
        confirmLabel={t("confirmDelete.confirm")}
        destructive
        loading={isPending}
        onConfirm={confirmDelete}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
      />
    </div>
  );
}
