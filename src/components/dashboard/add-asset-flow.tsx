"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertPosition } from "@/actions/portfolio";
import { getAllAssets, getAssetsByType, type CatalogAsset } from "@/lib/assets-catalog";

const ASSET_TYPES = [
  { value: "stock", label: "Stock", description: "Stocks & Equities" },
  { value: "etf", label: "ETF", description: "Exchange Traded Funds" },
  { value: "crypto", label: "Crypto", description: "Digital Assets" },
  { value: "commodity", label: "Commodity", description: "Physical Assets" },
  { value: "bond", label: "Bond", description: "Debt Securities" },
];

const QUICK_ACTIONS = [
  { value: "cash", label: "Cash", description: "Bank balance", preset: { symbol: "CASH", name: "Cash in bank", avgBuyPrice: "1" } },
  { value: "savings", label: "Savings", description: "Interest-earning", preset: { symbol: "SAVINGS", name: "Savings account", avgBuyPrice: "1" } },
];

interface AddAssetFlowProps {
  baseCurrency: string;
}

export function AddAssetFlow({ baseCurrency }: AddAssetFlowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [selectedAssetType, setSelectedAssetType] = useState<string | null>(null);
  const [manualEntry, setManualEntry] = useState(false);

  const [globalSearch, setGlobalSearch] = useState("");
  const [searchResults, setSearchResults] = useState<(CatalogAsset & { assetType: string })[]>([]);
  const [categoryAssets, setCategoryAssets] = useState<CatalogAsset[]>([]);
  const [categorySearch, setCategorySearch] = useState("");

  const [formData, setFormData] = useState({
    symbol: "", name: "", assetType: "stock", currency: baseCurrency,
    quantity: "", avgBuyPrice: "", tae: "", faceValue: "", couponRate: "",
    couponFrequency: "1", maturityDate: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const allAssets = useMemo(() => getAllAssets(), []);

  useEffect(() => {
    if (globalSearch.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(() => {
      const q = globalSearch.toLowerCase();
      setSearchResults(allAssets.filter((a) =>
        a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) ||
        (a.displaySymbol && a.displaySymbol.toLowerCase().includes(q))
      ).slice(0, 15));
    }, 300);
    return () => clearTimeout(timer);
  }, [globalSearch, allAssets]);

  const filteredCategory = useMemo(() => {
    if (!categorySearch) return categoryAssets;
    const q = categorySearch.toLowerCase();
    return categoryAssets.filter((a) =>
      a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
    );
  }, [categoryAssets, categorySearch]);

  const investmentTotal = useMemo(() => {
    return (parseFloat(formData.quantity) || 0) * (parseFloat(formData.avgBuyPrice) || 0);
  }, [formData.quantity, formData.avgBuyPrice]);

  const selectAsset = (asset: CatalogAsset & { assetType?: string }, assetType: string) => {
    setFormData((prev) => ({
      ...prev, symbol: asset.symbol, name: asset.name, assetType,
      currency: asset.currency || baseCurrency, quantity: "", avgBuyPrice: "",
    }));
    setGlobalSearch("");
    setStep(3);
  };

  const handleCategorySelect = (type: string) => {
    setSelectedAssetType(type);
    setCategoryAssets(getAssetsByType(type));
    setCategorySearch("");
    setFormData((prev) => ({ ...prev, assetType: type, currency: type === "crypto" ? "USD" : baseCurrency }));
    setStep(2);
  };

  const handleQuickAction = (action: (typeof QUICK_ACTIONS)[number]) => {
    setSelectedAssetType(action.value);
    setFormData((prev) => ({
      ...prev, ...action.preset, assetType: action.value, currency: baseCurrency, quantity: "",
    }));
    setManualEntry(true);
    setStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!formData.symbol || !formData.quantity || !formData.avgBuyPrice) {
      setError("Please complete all required fields"); return;
    }
    startTransition(async () => {
      try {
        await upsertPosition({
          symbol: formData.symbol.toUpperCase(),
          name: formData.name || formData.symbol.toUpperCase(),
          assetType: formData.assetType,
          currency: formData.currency,
          quantity: parseFloat(formData.quantity),
          avgBuyPrice: parseFloat(formData.avgBuyPrice),
          tae: formData.assetType === "savings" && formData.tae ? parseFloat(formData.tae) : null,
          faceValue: formData.assetType === "bond" && formData.faceValue ? parseFloat(formData.faceValue) : null,
          couponRate: formData.assetType === "bond" && formData.couponRate ? parseFloat(formData.couponRate) : null,
          couponFrequency: formData.assetType === "bond" && formData.couponFrequency ? parseInt(formData.couponFrequency) : null,
          maturityDate: formData.assetType === "bond" && formData.maturityDate ? formData.maturityDate : null,
        });
        setSuccess("Asset added successfully!");
        setTimeout(() => router.push("/overview"), 1000);
      } catch { setError("Error adding asset"); }
    });
  };

  const handleBack = () => {
    if (step === 3) {
      if (manualEntry || ["cash", "savings"].includes(selectedAssetType || "")) {
        setStep(1); setSelectedAssetType(null); setManualEntry(false); return;
      }
      setStep(2); setManualEntry(false);
    } else if (step === 2) {
      setStep(1); setSelectedAssetType(null); setCategoryAssets([]); setCategorySearch("");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const isCashOrSavings = ["cash", "savings"].includes(formData.assetType);
  const isBond = formData.assetType === "bond";

  // Step 1: Search + Categories
  if (step === 1) {
    return (
      <div className="space-y-6 max-w-2xl">
        <header>
          <h1 className="text-3xl font-bold text-white mb-2">Add Asset</h1>
          <p className="text-neutral-400">Search for any asset or browse by category</p>
        </header>

        {/* Global Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search stocks, ETFs, crypto, commodities..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            autoFocus
            className="w-full px-4 py-4 bg-neutral-900/50 border border-neutral-700 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-primary"
          />
          {searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-2 bg-neutral-900 border border-neutral-700 rounded-xl max-h-80 overflow-y-auto">
              {searchResults.map((asset, i) => (
                <button
                  key={`${asset.symbol}-${i}`}
                  onClick={() => selectAsset(asset, asset.assetType!)}
                  className="w-full px-4 py-3 text-left hover:bg-neutral-800 transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="text-white font-medium">{asset.displaySymbol || asset.symbol}</span>
                    <span className="text-neutral-400 ml-2 text-sm">{asset.name}</span>
                  </div>
                  <span className="text-xs text-neutral-500">{asset.assetType}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">Quick Actions</p>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <button key={action.value} onClick={() => handleQuickAction(action)}
                className="glass-card !p-4 text-left hover:!bg-surface-light">
                <p className="font-medium text-white">{action.label}</p>
                <p className="text-xs text-neutral-400">{action.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">Browse by Category</p>
          <div className="flex flex-wrap gap-2">
            {ASSET_TYPES.map((type) => (
              <button key={type.value} onClick={() => handleCategorySelect(type.value)}
                className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-xl hover:bg-neutral-700 transition-colors text-sm">
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => { setManualEntry(true); setStep(3); }}
          className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
          Or add manually...
        </button>
      </div>
    );
  }

  // Step 2: Browse category
  if (step === 2) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <button onClick={handleBack} className="text-neutral-400 hover:text-white">← Back</button>
          <h1 className="text-2xl font-bold text-white">
            Select {ASSET_TYPES.find((t) => t.value === selectedAssetType)?.label}
          </h1>
        </div>

        <input
          type="text"
          placeholder="Filter by symbol or name..."
          value={categorySearch}
          onChange={(e) => setCategorySearch(e.target.value)}
          autoFocus
          className="w-full px-4 py-3 bg-neutral-900/50 border border-neutral-700 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-primary"
        />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filteredCategory.map((asset, i) => (
            <button key={i} onClick={() => selectAsset(asset, selectedAssetType!)}
              className="glass-card !p-4 text-left hover:!bg-surface-light">
              <p className="font-medium text-white text-sm">{asset.displaySymbol || asset.symbol}</p>
              <p className="text-xs text-neutral-400 truncate">{asset.name}</p>
              {asset.exchange && <p className="text-xs text-neutral-600 mt-1">{asset.exchange}</p>}
            </button>
          ))}
        </div>

        {filteredCategory.length === 0 && (
          <p className="text-neutral-500 text-center py-8">No assets found</p>
        )}

        <button onClick={() => { setManualEntry(true); setStep(3); }}
          className="w-full py-3 bg-neutral-800 text-neutral-300 rounded-xl hover:bg-neutral-700 transition-colors text-sm">
          Can&apos;t find it? Add manually
        </button>
      </div>
    );
  }

  // Step 3: Form
  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-4">
        <button onClick={handleBack} className="text-neutral-400 hover:text-white">← Back</button>
        <h1 className="text-2xl font-bold text-white">Complete Details</h1>
      </div>

      <form onSubmit={handleSubmit} className="glass-card space-y-5">
        {error && <div className="text-red-400 text-sm bg-red-500/10 py-2 px-3 rounded-lg">{error}</div>}
        {success && <div className="text-green-400 text-sm bg-green-500/10 py-2 px-3 rounded-lg">{success}</div>}

        {isCashOrSavings && (
          <div className="text-sm text-neutral-300 bg-neutral-700/30 px-3 py-2 rounded-lg">
            Enter your total balance. The price is automatically set to 1.
          </div>
        )}

        {(manualEntry || !formData.symbol) && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 text-xs font-medium text-neutral-400">Symbol</label>
              <input type="text" name="symbol" value={formData.symbol} onChange={handleChange}
                required placeholder="e.g. AAPL" disabled={isCashOrSavings}
                className="w-full px-3 py-2 bg-neutral-900/50 border border-neutral-700 rounded-xl text-neutral-200 text-sm uppercase focus:outline-none focus:border-primary disabled:opacity-50" />
            </div>
            <div>
              <label className="block mb-1 text-xs font-medium text-neutral-400">Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange}
                placeholder="Asset name" disabled={isCashOrSavings}
                className="w-full px-3 py-2 bg-neutral-900/50 border border-neutral-700 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-primary disabled:opacity-50" />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-xs font-medium text-neutral-400">
              {isCashOrSavings ? "Balance" : "Quantity"}
            </label>
            <input type="number" step="any" name="quantity" value={formData.quantity}
              onChange={handleChange} required placeholder="0.00"
              className="w-full px-3 py-2 bg-neutral-900/50 border border-neutral-700 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block mb-1 text-xs font-medium text-neutral-400">
              {isCashOrSavings ? "Unit Price" : "Avg Buy Price"} ({formData.currency})
            </label>
            <input type="number" step="any" name="avgBuyPrice" value={formData.avgBuyPrice}
              onChange={handleChange} required placeholder="0.00" disabled={isCashOrSavings}
              className="w-full px-3 py-2 bg-neutral-900/50 border border-neutral-700 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-primary disabled:opacity-50" />
          </div>
        </div>

        {(isCashOrSavings || manualEntry) && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 text-xs font-medium text-neutral-400">Currency</label>
              <select name="currency" value={formData.currency} onChange={handleChange}
                className="w-full px-3 py-2 bg-neutral-900/50 border border-neutral-700 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-primary">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            {formData.assetType === "savings" && (
              <div>
                <label className="block mb-1 text-xs font-medium text-neutral-400">Annual Interest (TAE %)</label>
                <input type="number" step="0.01" name="tae" value={formData.tae} onChange={handleChange}
                  placeholder="e.g. 3.50"
                  className="w-full px-3 py-2 bg-neutral-900/50 border border-neutral-700 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-primary" />
              </div>
            )}
          </div>
        )}

        {isBond && (
          <div className="space-y-4 pt-4 border-t border-neutral-800">
            <p className="text-sm text-neutral-400">Bond Details (optional)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-xs font-medium text-neutral-400">Face Value</label>
                <input type="number" step="any" name="faceValue" value={formData.faceValue} onChange={handleChange} placeholder="1000.00"
                  className="w-full px-3 py-2 bg-neutral-900/50 border border-neutral-700 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium text-neutral-400">Maturity Date</label>
                <input type="date" name="maturityDate" value={formData.maturityDate} onChange={handleChange}
                  className="w-full px-3 py-2 bg-neutral-900/50 border border-neutral-700 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium text-neutral-400">Coupon Rate (%)</label>
                <input type="number" step="0.01" name="couponRate" value={formData.couponRate} onChange={handleChange} placeholder="5.00"
                  className="w-full px-3 py-2 bg-neutral-900/50 border border-neutral-700 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium text-neutral-400">Coupon Frequency</label>
                <select name="couponFrequency" value={formData.couponFrequency} onChange={handleChange}
                  className="w-full px-3 py-2 bg-neutral-900/50 border border-neutral-700 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-primary">
                  <option value="1">Annual</option>
                  <option value="2">Semi-annual</option>
                  <option value="4">Quarterly</option>
                  <option value="12">Monthly</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {!isCashOrSavings && investmentTotal > 0 && (
          <div className="flex justify-between items-center py-3 px-4 bg-neutral-800/50 rounded-xl">
            <span className="text-sm text-neutral-400">Total Investment</span>
            <span className="font-bold text-white">
              {formData.currency} {investmentTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}

        <div className="flex gap-4 pt-2">
          <button type="button" onClick={() => router.push("/overview")}
            className="flex-1 py-3 bg-neutral-800 text-neutral-300 rounded-xl hover:bg-neutral-700 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={isPending}
            className="flex-1 py-3 bg-primary text-neutral-900 font-bold rounded-xl shadow-lg shadow-white/20 hover:bg-white disabled:opacity-50">
            {isPending ? "Saving..." : "Save Asset"}
          </button>
        </div>
      </form>
    </div>
  );
}
