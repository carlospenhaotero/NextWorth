"use client";

import { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import { X, CheckCircle, Warning, Spinner } from "@phosphor-icons/react/dist/ssr";
import { upsertPosition, addToPosition, editPosition } from "@/actions/portfolio";

const ASSET_TYPES = [
  { value: "stock", label: "Stock" },
  { value: "etf", label: "ETF" },
  { value: "fund", label: "Fund" },
  { value: "crypto", label: "Crypto" },
  { value: "commodity", label: "Commodity" },
  { value: "bond", label: "Bond" },
  { value: "other", label: "Other" },
];

const CURRENCIES = ["USD", "EUR", "GBP", "CHF", "JPY", "CAD", "AUD", "CNY"];

export interface ListedAsset {
  symbol: string;
  name: string;
  assetType: string;
  exchange?: string | null;
  currency?: string;
}

export interface ExistingPosition {
  id: number;
  symbol: string;
  name: string;
  assetType: string;
  assetCurrency: string;
  quantity: number;
  avgBuyPrice: number | null;
  tae: number | null;
  faceValue: number | null;
  couponRate: number | null;
  couponFrequency: number | null;
  maturityDate: string | null;
}

export type AssetSelection =
  | { kind: "listed"; asset: ListedAsset }
  | { kind: "cash" }
  | { kind: "savings" }
  | { kind: "manual" }
  | { kind: "edit"; position: ExistingPosition };

interface AddAssetModalProps {
  open: boolean;
  onClose: () => void;
  selection: AssetSelection | null;
  baseCurrency: string;
  existingPositions?: { id: number; symbol: string; assetType: string }[];
  onSaved?: () => void;
}

interface QuoteState {
  status: "idle" | "loading" | "ok" | "error";
  price?: number;
  currency?: string;
}

const emptyForm = {
  symbol: "",
  name: "",
  assetType: "stock",
  currency: "USD",
  quantity: "",
  avgBuyPrice: "",
  tae: "",
  faceValue: "",
  couponRate: "",
  couponFrequency: "1",
  maturityDate: "",
};

export function AddAssetModal({
  open,
  onClose,
  selection,
  baseCurrency,
  existingPositions = [],
  onSaved,
}: AddAssetModalProps) {
  const [form, setForm] = useState({ ...emptyForm });
  const [quote, setQuote] = useState<QuoteState>({ status: "idle" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // When the user tries to add an asset they already hold, ask how to merge.
  const [dupPrompt, setDupPrompt] = useState<UpsertInput | null>(null);
  const [isPending, startTransition] = useTransition();

  const kind = selection?.kind;
  const isCash = kind === "cash";
  const isSavings = kind === "savings";
  const isManual = kind === "manual";
  const isListed = kind === "listed";
  const isEdit = kind === "edit";
  const isCashLike = isCash || isSavings;
  const isBond = form.assetType === "bond";
  const editPos = selection?.kind === "edit" ? selection.position : null;
  // Listed assets (catalog/search) and edited listed assets have a Yahoo price.
  const editingListed = editPos != null && !["cash", "savings", "other"].includes(editPos.assetType);
  const hasMarketPrice = isListed || editingListed;

  const fetchQuote = useCallback(async (symbol: string): Promise<QuoteState> => {
    const clean = symbol.trim().toUpperCase();
    if (!clean) return { status: "idle" };
    setQuote({ status: "loading" });
    try {
      const res = await fetch(`/api/market/quote/${encodeURIComponent(clean)}`);
      if (!res.ok) {
        const next: QuoteState = { status: "error" };
        setQuote(next);
        return next;
      }
      const data = await res.json();
      const next: QuoteState = { status: "ok", price: data.currentPrice, currency: data.currency };
      setQuote(next);
      return next;
    } catch {
      const next: QuoteState = { status: "error" };
      setQuote(next);
      return next;
    }
  }, []);

  // Reset whenever the modal opens with a new selection.
  useEffect(() => {
    if (!open || !selection) return;
    setError("");
    setSuccess("");
    setDupPrompt(null);
    setQuote({ status: "idle" });

    if (selection.kind === "listed") {
      const a = selection.asset;
      setForm({ ...emptyForm, symbol: a.symbol, name: a.name, assetType: a.assetType, currency: a.currency || baseCurrency });
      fetchQuote(a.symbol).then((qte) => {
        if (qte.status === "ok" && qte.currency) {
          setForm((prev) => ({ ...prev, currency: qte.currency || prev.currency }));
        }
      });
    } else if (selection.kind === "cash") {
      setForm({ ...emptyForm, symbol: "CASH", name: "Cash in bank", assetType: "cash", currency: baseCurrency });
    } else if (selection.kind === "savings") {
      setForm({ ...emptyForm, symbol: "SAVINGS", name: "Savings account", assetType: "savings", currency: baseCurrency });
    } else if (selection.kind === "manual") {
      setForm({ ...emptyForm, assetType: "other", currency: baseCurrency });
    } else {
      const p = selection.position;
      setForm({
        symbol: p.symbol,
        name: p.name,
        assetType: p.assetType,
        currency: p.assetCurrency,
        quantity: String(p.quantity),
        avgBuyPrice: p.avgBuyPrice != null ? String(p.avgBuyPrice) : "",
        tae: p.tae != null ? String(p.tae) : "",
        faceValue: p.faceValue != null ? String(p.faceValue) : "",
        couponRate: p.couponRate != null ? String(p.couponRate) : "",
        couponFrequency: p.couponFrequency != null ? String(p.couponFrequency) : "1",
        maturityDate: p.maturityDate ? p.maturityDate.slice(0, 10) : "",
      });
      if (p.assetType !== "cash" && p.assetType !== "savings" && p.assetType !== "other") {
        fetchQuote(p.symbol);
      }
    }
  }, [open, selection, baseCurrency, fetchQuote]);

  const investmentTotal = useMemo(() => {
    const price = isCashLike ? 1 : parseFloat(form.avgBuyPrice) || 0;
    return (parseFloat(form.quantity) || 0) * price;
  }, [form.quantity, form.avgBuyPrice, isCashLike]);

  const update = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const buildInput = useCallback((): UpsertInput => {
    const price = isCashLike ? 1 : form.avgBuyPrice.trim() === "" ? null : parseFloat(form.avgBuyPrice);
    return {
      symbol: form.symbol.toUpperCase(),
      name: form.name || form.symbol.toUpperCase(),
      assetType: form.assetType,
      currency: form.currency,
      quantity: parseFloat(form.quantity),
      avgBuyPrice: price,
      tae: isSavings && form.tae ? parseFloat(form.tae) : null,
      faceValue: isBond && form.faceValue ? parseFloat(form.faceValue) : null,
      couponRate: isBond && form.couponRate ? parseFloat(form.couponRate) : null,
      couponFrequency: isBond && form.couponFrequency ? parseInt(form.couponFrequency) : null,
      maturityDate: isBond && form.maturityDate ? form.maturityDate : null,
    };
  }, [form, isCashLike, isSavings, isBond]);

  const validate = (): string | null => {
    if (!form.symbol.trim()) return "Symbol is required";
    if (!form.quantity || parseFloat(form.quantity) <= 0) return "Enter a valid quantity";
    // Cost is optional for listed assets, required for manual (uncatalogued) ones.
    if (isManual && form.avgBuyPrice.trim() === "") return "Enter the value per unit";
    return null;
  };

  const runSave = (input: UpsertInput, mode: "replace" | "add") => {
    startTransition(async () => {
      try {
        if (mode === "add") await addToPosition(input);
        else await upsertPosition(input);
        finishOk();
      } catch {
        setError("Error adding asset");
      }
    });
  };

  const finishOk = () => {
    setSuccess("Saved");
    setTimeout(() => {
      setSuccess("");
      onSaved?.();
      onClose();
    }, 800);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const input = buildInput();

    if (editPos) {
      startTransition(async () => {
        try {
          await editPosition(editPos.id, {
            quantity: input.quantity,
            avgBuyPrice: input.avgBuyPrice,
            tae: input.tae,
            faceValue: input.faceValue,
            couponRate: input.couponRate,
            couponFrequency: input.couponFrequency,
            maturityDate: input.maturityDate,
          });
          finishOk();
        } catch {
          setError("Error saving changes");
        }
      });
      return;
    }

    // Detect an existing holding of the same asset.
    const dup = existingPositions.find(
      (p) => p.symbol.toUpperCase() === input.symbol && p.assetType === input.assetType
    );
    if (dup) {
      setDupPrompt(input);
      return;
    }

    runSave(input, "replace");
  };

  if (!open || !selection) return null;

  const listedAsset = selection.kind === "listed" ? selection.asset : null;

  const title = isCash
    ? "Add cash"
    : isSavings
    ? "Add savings"
    : isManual
    ? "Add manually"
    : editPos
    ? `Edit ${editPos.name}`
    : `Add ${listedAsset?.name ?? "asset"}`;

  const subtitle = listedAsset
    ? listedAsset.exchange
      ? `${listedAsset.symbol} · ${listedAsset.exchange}`
      : listedAsset.symbol
    : editPos
    ? editPos.symbol
    : isCashLike
    ? "Balance held in your account"
    : "An asset that is not publicly listed (real estate, private fund, ...)";

  const inputClass =
    "w-full px-3 py-2 bg-neutral-900/50 border border-neutral-700 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-primary disabled:opacity-50";
  const labelClass = "block mb-1 text-xs font-medium text-neutral-400";

  // Duplicate-resolution view.
  if (dupPrompt) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div className="relative glass-card w-full max-w-md mx-4">
          <button onClick={onClose} className="absolute top-4 right-4 text-neutral-400 hover:text-white">
            <X size={20} />
          </button>
          <h2 className="text-xl font-bold text-white mb-1 pr-8">You already hold {dupPrompt.symbol}</h2>
          <p className="text-sm text-neutral-400 mb-6">Choose how to apply this entry to your existing position.</p>

          {error && <div className="text-red-400 text-sm bg-red-500/10 py-2 px-3 rounded-lg mb-4">{error}</div>}
          {success && <div className="text-green-400 text-sm bg-green-500/10 py-2 px-3 rounded-lg mb-4">{success}</div>}

          <div className="space-y-3">
            <button
              onClick={() => runSave(dupPrompt, "add")}
              disabled={isPending}
              className="w-full text-left glass-card !p-4 hover:!bg-surface-light disabled:opacity-50"
            >
              <p className="font-medium text-white text-sm">Add to position</p>
              <p className="text-xs text-neutral-400">Sums the quantity and recalculates the average buy price.</p>
            </button>
            <button
              onClick={() => runSave(dupPrompt, "replace")}
              disabled={isPending}
              className="w-full text-left glass-card !p-4 hover:!bg-surface-light disabled:opacity-50"
            >
              <p className="font-medium text-white text-sm">Replace position</p>
              <p className="text-xs text-neutral-400">Overwrites the existing quantity and price with these values.</p>
            </button>
          </div>

          <button
            onClick={() => setDupPrompt(null)}
            disabled={isPending}
            className="mt-4 w-full py-2.5 bg-neutral-800 text-neutral-300 rounded-xl hover:bg-neutral-700 transition-colors text-sm"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative glass-card w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-neutral-400 hover:text-white">
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-white mb-1 pr-8">{title}</h2>
        <p className="text-sm text-neutral-400 mb-6">{subtitle}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-red-400 text-sm bg-red-500/10 py-2 px-3 rounded-lg">{error}</div>}
          {success && <div className="text-green-400 text-sm bg-green-500/10 py-2 px-3 rounded-lg">{success}</div>}

          {/* Manual (uncatalogued): symbol + name + type */}
          {isManual && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Symbol / ref</label>
                  <input type="text" value={form.symbol} onChange={(e) => update("symbol", e.target.value)} required
                    placeholder="e.g. FLAT-MAD" autoFocus className={`${inputClass} uppercase`} />
                </div>
                <div>
                  <label className={labelClass}>Name</label>
                  <input type="text" value={form.name} onChange={(e) => update("name", e.target.value)}
                    placeholder="Asset name" className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Type</label>
                <select value={form.assetType} onChange={(e) => update("assetType", e.target.value)} className={inputClass}>
                  {ASSET_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Live price reference for listed assets */}
          {hasMarketPrice && quote.status !== "idle" && (
            <div className="text-sm flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-neutral-800/50">
              <div className="flex items-center gap-2 min-w-0">
                {quote.status === "loading" && (
                  <>
                    <Spinner size={16} className="text-neutral-400 animate-spin shrink-0" />
                    <span className="text-neutral-400">Fetching price...</span>
                  </>
                )}
                {quote.status === "ok" && quote.price != null && (
                  <>
                    <CheckCircle size={16} className="text-green-400 shrink-0" />
                    <span className="text-neutral-300 truncate">
                      Current price:{" "}
                      <span className="font-medium text-white">
                        {quote.currency} {quote.price.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                      </span>
                    </span>
                  </>
                )}
                {quote.status === "error" && (
                  <>
                    <Warning size={16} className="text-amber-400 shrink-0" />
                    <span className="text-amber-400">Price unavailable right now</span>
                  </>
                )}
              </div>
              {quote.status === "ok" && quote.price != null && (
                <button type="button" onClick={() => update("avgBuyPrice", String(quote.price))}
                  className="text-xs text-primary hover:underline shrink-0">
                  Use as buy price
                </button>
              )}
            </div>
          )}

          {/* Quantity + cost */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{isCashLike ? "Balance" : "Quantity"}</label>
              <input type="number" step="any" value={form.quantity} onChange={(e) => update("quantity", e.target.value)}
                required placeholder="0.00" autoFocus={!isManual} className={inputClass} />
            </div>
            {!isCashLike && (
              <div>
                <label className={labelClass}>
                  {isManual ? "Value per unit" : "Buy price"} ({form.currency})
                  {!isManual && <span className="text-neutral-600"> · optional</span>}
                </label>
                <input type="number" step="any" value={form.avgBuyPrice} onChange={(e) => update("avgBuyPrice", e.target.value)}
                  placeholder="0.00" className={inputClass} />
              </div>
            )}
          </div>

          {/* Currency: editable for manual / cash / savings */}
          {(isCashLike || isManual) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Currency</label>
                <select value={form.currency} onChange={(e) => update("currency", e.target.value)} className={inputClass}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {isSavings && (
                <div>
                  <label className={labelClass}>Annual interest (TAE %)</label>
                  <input type="number" step="0.01" value={form.tae} onChange={(e) => update("tae", e.target.value)}
                    placeholder="e.g. 3.50" className={inputClass} />
                </div>
              )}
            </div>
          )}

          {/* Savings TAE when editing */}
          {editPos?.assetType === "savings" && (
            <div>
              <label className={labelClass}>Annual interest (TAE %)</label>
              <input type="number" step="0.01" value={form.tae} onChange={(e) => update("tae", e.target.value)}
                placeholder="e.g. 3.50" className={inputClass} />
            </div>
          )}

          {/* Bond details */}
          {isBond && (
            <div className="space-y-4 pt-4 border-t border-neutral-800">
              <p className="text-sm text-neutral-400">Bond details</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Face value (per unit)</label>
                  <input type="number" step="any" value={form.faceValue} onChange={(e) => update("faceValue", e.target.value)}
                    placeholder="1000.00" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Maturity date</label>
                  <input type="date" value={form.maturityDate} onChange={(e) => update("maturityDate", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Coupon rate (%)</label>
                  <input type="number" step="0.01" value={form.couponRate} onChange={(e) => update("couponRate", e.target.value)}
                    placeholder="5.00" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Coupon frequency</label>
                  <select value={form.couponFrequency} onChange={(e) => update("couponFrequency", e.target.value)} className={inputClass}>
                    <option value="1">Annual</option>
                    <option value="2">Semi-annual</option>
                    <option value="4">Quarterly</option>
                    <option value="12">Monthly</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Investment summary */}
          {!isCashLike && investmentTotal > 0 && (
            <div className="flex justify-between items-center py-3 px-4 bg-neutral-800/50 rounded-xl">
              <span className="text-sm text-neutral-400">{isManual ? "Total value" : "Total invested"}</span>
              <span className="font-bold text-white">
                {form.currency} {investmentTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 bg-neutral-800 text-neutral-300 rounded-xl hover:bg-neutral-700 transition-colors text-sm">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-2.5 bg-primary text-neutral-900 font-bold rounded-xl shadow-lg shadow-white/20 hover:bg-white disabled:opacity-50 text-sm">
              {isPending ? "Saving..." : isEdit ? "Save changes" : "Add to portfolio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface UpsertInput {
  symbol: string;
  name: string;
  assetType: string;
  currency: string;
  quantity: number;
  avgBuyPrice: number | null;
  tae: number | null;
  faceValue: number | null;
  couponRate: number | null;
  couponFrequency: number | null;
  maturityDate: string | null;
}
