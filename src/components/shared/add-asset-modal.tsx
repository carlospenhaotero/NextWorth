"use client";

import { useState, useEffect, useMemo, useCallback, useRef, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { X, CheckCircle, Warning, Spinner } from "@phosphor-icons/react/dist/ssr";
import { localeToIntl } from "@/i18n/locale";
import { upsertPosition, addToPosition, editPosition } from "@/actions/portfolio";
import { Button } from "@/components/ui/button";

const ASSET_TYPE_VALUES = ["stock", "etf", "fund", "crypto", "commodity", "bond", "other"] as const;

const CURRENCIES = ["USD", "EUR", "GBP", "CHF", "JPY", "CAD", "AUD", "CNY"];

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  const t = useTranslations("addAsset.modal");
  const intlLocale = localeToIntl(useLocale());
  const [form, setForm] = useState({ ...emptyForm });
  const [quote, setQuote] = useState<QuoteState>({ status: "idle" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // When the user tries to add an asset they already hold, ask how to merge.
  const [dupPrompt, setDupPrompt] = useState<UpsertInput | null>(null);
  const [isPending, startTransition] = useTransition();
  // Accessibility: dialog container (focus target + trap scope) and the element
  // that had focus before the modal opened, to restore it on close.
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

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
        if (qte.status === "ok") {
          setForm((prev) => ({
            ...prev,
            currency: qte.currency || prev.currency,
            // Default the buy price to the live quote so the user doesn't have to type it.
            avgBuyPrice:
              prev.avgBuyPrice.trim() === "" && qte.price != null
                ? String(qte.price)
                : prev.avgBuyPrice,
          }));
        }
      });
    } else if (selection.kind === "cash") {
      setForm({ ...emptyForm, symbol: "CASH", name: t("defaultName.cash"), assetType: "cash", currency: baseCurrency });
    } else if (selection.kind === "savings") {
      setForm({ ...emptyForm, symbol: "SAVINGS", name: t("defaultName.savings"), assetType: "savings", currency: baseCurrency });
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
  }, [open, selection, baseCurrency, fetchQuote, t]);

  // Close on Escape while the modal is open.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Remember the previously focused element and return focus to it on close.
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    return () => {
      previousFocusRef.current?.focus?.();
    };
  }, [open]);

  // Move focus into the dialog and trap Tab/Shift+Tab within it. Re-runs when the
  // view switches (form <-> duplicate prompt) so focus lands on the new content.
  useEffect(() => {
    if (!open) return;
    const container = dialogRef.current;
    if (!container) return;

    const focusables = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    );
    const firstField = focusables.find((el) =>
      ["input", "select", "textarea"].includes(el.tagName.toLowerCase())
    );
    (firstField ?? focusables[0] ?? container).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const node = dialogRef.current;
      if (!node) return;
      const items = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || active === node) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, dupPrompt]);

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
    if (!form.symbol.trim()) return t("validation.symbolRequired");
    if (!form.quantity || parseFloat(form.quantity) <= 0) return t("validation.validQuantity");
    // Cost is optional for listed assets, required for manual (uncatalogued) ones.
    if (isManual && form.avgBuyPrice.trim() === "") return t("validation.valuePerUnitRequired");
    return null;
  };

  const runSave = (input: UpsertInput, mode: "replace" | "add") => {
    startTransition(async () => {
      try {
        if (mode === "add") await addToPosition(input);
        else await upsertPosition(input);
        finishOk();
      } catch {
        setError(t("message.errorAdding"));
      }
    });
  };

  const finishOk = () => {
    setSuccess(t("message.saved"));
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
          setError(t("message.errorSaving"));
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
    ? t("title.addCash")
    : isSavings
    ? t("title.addSavings")
    : isManual
    ? t("title.addManually")
    : editPos
    ? t("title.edit", { name: editPos.name })
    : t("title.add", { name: listedAsset?.name ?? t("assetFallback") });

  const subtitle = listedAsset
    ? listedAsset.exchange
      ? `${listedAsset.symbol} · ${listedAsset.exchange}`
      : listedAsset.symbol
    : editPos
    ? editPos.symbol
    : isCashLike
    ? t("subtitle.cashLike")
    : t("subtitle.manual");

  const inputClass =
    "w-full px-3 py-2 bg-neutral-900/50 border border-neutral-700 rounded-xl text-neutral-100 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-ring disabled:opacity-50";
  const labelClass = "block mb-1 text-xs font-medium text-neutral-400";

  // Duplicate-resolution view.
  if (dupPrompt) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dup-prompt-title"
          tabIndex={-1}
          className="relative glass-card w-full max-w-md mx-4 focus:outline-none"
        >
          <button onClick={onClose} aria-label={t("button.close")} className="absolute top-4 right-4 text-neutral-400 hover:text-white">
            <X size={20} />
          </button>
          <h2 id="dup-prompt-title" className="text-xl font-bold text-white mb-1 pr-8">{t("dup.title", { symbol: dupPrompt.symbol })}</h2>
          <p className="text-sm text-neutral-400 mb-6">{t("dup.body")}</p>

          {error && <div className="text-danger text-sm bg-danger/10 py-2 px-3 rounded-lg mb-4">{error}</div>}
          {success && <div className="text-success text-sm bg-success/10 py-2 px-3 rounded-lg mb-4">{success}</div>}

          <div className="space-y-3">
            <button
              onClick={() => runSave(dupPrompt, "add")}
              disabled={isPending}
              className="w-full text-left glass-card !p-4 hover:!bg-surface-light disabled:opacity-50"
            >
              <p className="font-medium text-white text-sm">{t("dup.addTitle")}</p>
              <p className="text-xs text-neutral-400">{t("dup.addDesc")}</p>
            </button>
            <button
              onClick={() => runSave(dupPrompt, "replace")}
              disabled={isPending}
              className="w-full text-left glass-card !p-4 hover:!bg-surface-light disabled:opacity-50"
            >
              <p className="font-medium text-white text-sm">{t("dup.replaceTitle")}</p>
              <p className="text-xs text-neutral-400">{t("dup.replaceDesc")}</p>
            </button>
          </div>

          <button
            onClick={() => setDupPrompt(null)}
            disabled={isPending}
            className="mt-4 w-full py-2.5 bg-neutral-800 text-neutral-300 rounded-xl hover:bg-neutral-700 transition-colors text-sm"
          >
            {t("dup.back")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-asset-title"
        tabIndex={-1}
        className="relative glass-card w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto focus:outline-none"
      >
        <button onClick={onClose} aria-label={t("button.close")} className="absolute top-4 right-4 text-neutral-400 hover:text-white">
          <X size={20} />
        </button>

        <h2 id="add-asset-title" className="text-xl font-bold text-white mb-1 pr-8">{title}</h2>
        <p className="text-sm text-neutral-400 mb-6">{subtitle}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-danger text-sm bg-danger/10 py-2 px-3 rounded-lg">{error}</div>}
          {success && <div className="text-success text-sm bg-success/10 py-2 px-3 rounded-lg">{success}</div>}

          {/* Manual (uncatalogued): symbol + name + type */}
          {isManual && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="asset-symbol" className={labelClass}>{t("field.symbolRef")}</label>
                  <input id="asset-symbol" type="text" value={form.symbol} onChange={(e) => update("symbol", e.target.value)} required
                    placeholder={t("field.symbolRefPlaceholder")} autoFocus className={`${inputClass} uppercase`} />
                </div>
                <div>
                  <label htmlFor="asset-name" className={labelClass}>{t("field.name")}</label>
                  <input id="asset-name" type="text" value={form.name} onChange={(e) => update("name", e.target.value)}
                    placeholder={t("field.namePlaceholder")} className={inputClass} />
                </div>
              </div>
              <div>
                <label htmlFor="asset-type" className={labelClass}>{t("field.type")}</label>
                <select id="asset-type" value={form.assetType} onChange={(e) => update("assetType", e.target.value)} className={inputClass}>
                  {ASSET_TYPE_VALUES.map((value) => (
                    <option key={value} value={value}>{t(`assetType.${value}`)}</option>
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
                    <span className="text-neutral-400">{t("price.fetching")}</span>
                  </>
                )}
                {quote.status === "ok" && quote.price != null && (
                  <>
                    <CheckCircle size={16} className="text-green-400 shrink-0" />
                    <span className="text-neutral-300 truncate">
                      {t("price.current")}{" "}
                      <span className="font-medium text-white">
                        {quote.currency} {quote.price.toLocaleString(intlLocale, { maximumFractionDigits: 4 })}
                      </span>
                    </span>
                  </>
                )}
                {quote.status === "error" && (
                  <>
                    <Warning size={16} className="text-amber-400 shrink-0" />
                    <span className="text-amber-400">{t("price.unavailable")}</span>
                  </>
                )}
              </div>
              {quote.status === "ok" && quote.price != null && (
                <button type="button" onClick={() => update("avgBuyPrice", String(quote.price))}
                  className="text-xs text-accent-hover hover:underline shrink-0">
                  {t("price.useAsBuyPrice")}
                </button>
              )}
            </div>
          )}

          {/* Quantity + cost */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="asset-quantity" className={labelClass}>{isCashLike ? t("field.balance") : t("field.quantity")}</label>
              <input id="asset-quantity" type="number" step="any" min="0" value={form.quantity} onChange={(e) => update("quantity", e.target.value)}
                required placeholder={t("field.zeroPlaceholder")} autoFocus={!isManual} className={inputClass} />
            </div>
            {!isCashLike && (
              <div>
                <label htmlFor="asset-buy-price" className={labelClass}>
                  {isManual ? t("field.valuePerUnit") : t("field.buyPrice")} ({form.currency})
                  {!isManual && <span className="text-neutral-600"> · {t("field.optional")}</span>}
                </label>
                <input id="asset-buy-price" type="number" step="any" min="0" value={form.avgBuyPrice} onChange={(e) => update("avgBuyPrice", e.target.value)}
                  placeholder={t("field.zeroPlaceholder")} className={inputClass} />
              </div>
            )}
          </div>

          {/* Currency: editable for manual / cash / savings */}
          {(isCashLike || isManual) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="asset-currency" className={labelClass}>{t("field.currency")}</label>
                <select id="asset-currency" value={form.currency} onChange={(e) => update("currency", e.target.value)} className={inputClass}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {isSavings && (
                <div>
                  <label htmlFor="asset-tae" className={labelClass}>{t("field.tae")}</label>
                  <input id="asset-tae" type="number" step="0.01" value={form.tae} onChange={(e) => update("tae", e.target.value)}
                    placeholder={t("field.taePlaceholder")} className={inputClass} />
                </div>
              )}
            </div>
          )}

          {/* Savings TAE when editing */}
          {editPos?.assetType === "savings" && (
            <div>
              <label htmlFor="asset-edit-tae" className={labelClass}>{t("field.tae")}</label>
              <input id="asset-edit-tae" type="number" step="0.01" value={form.tae} onChange={(e) => update("tae", e.target.value)}
                placeholder={t("field.taePlaceholder")} className={inputClass} />
            </div>
          )}

          {/* Bond details */}
          {isBond && (
            <div className="space-y-4 pt-4 border-t border-neutral-800">
              <p className="text-sm text-neutral-400">{t("field.bondDetails")}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="asset-face-value" className={labelClass}>{t("field.faceValue")}</label>
                  <input id="asset-face-value" type="number" step="any" value={form.faceValue} onChange={(e) => update("faceValue", e.target.value)}
                    placeholder={t("field.faceValuePlaceholder")} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="asset-maturity-date" className={labelClass}>{t("field.maturityDate")}</label>
                  <input id="asset-maturity-date" type="date" value={form.maturityDate} onChange={(e) => update("maturityDate", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="asset-coupon-rate" className={labelClass}>{t("field.couponRate")}</label>
                  <input id="asset-coupon-rate" type="number" step="0.01" value={form.couponRate} onChange={(e) => update("couponRate", e.target.value)}
                    placeholder={t("field.couponRatePlaceholder")} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="asset-coupon-frequency" className={labelClass}>{t("field.couponFrequency")}</label>
                  <select id="asset-coupon-frequency" value={form.couponFrequency} onChange={(e) => update("couponFrequency", e.target.value)} className={inputClass}>
                    <option value="1">{t("couponFreq.annual")}</option>
                    <option value="2">{t("couponFreq.semiannual")}</option>
                    <option value="4">{t("couponFreq.quarterly")}</option>
                    <option value="12">{t("couponFreq.monthly")}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Investment summary */}
          {!isCashLike && investmentTotal > 0 && (
            <div className="flex justify-between items-center py-3 px-4 bg-neutral-800/50 rounded-xl">
              <span className="text-sm text-neutral-400">{isManual ? t("total.value") : t("total.invested")}</span>
              <span className="font-bold text-white">
                {form.currency} {investmentTotal.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="sticky bottom-0 -mx-6 -mb-6 flex gap-3 border-t border-border bg-neutral-900/90 px-6 py-4 backdrop-blur-md">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              {t("button.cancel")}
            </Button>
            <Button type="submit" loading={isPending} className="flex-1">
              {isPending ? t("button.saving") : isEdit ? t("button.saveChanges") : t("button.addToPortfolio")}
            </Button>
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
