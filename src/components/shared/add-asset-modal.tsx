"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { upsertPosition } from "@/actions/portfolio";
import type { CatalogAsset } from "@/lib/assets-catalog";

interface AddAssetModalProps {
  open: boolean;
  onClose: () => void;
  asset: (CatalogAsset & { assetType: string }) | null;
  baseCurrency: string;
}

export function AddAssetModal({
  open,
  onClose,
  asset,
  baseCurrency,
}: AddAssetModalProps) {
  const [quantity, setQuantity] = useState("");
  const [avgBuyPrice, setAvgBuyPrice] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!open || !asset) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!quantity || !avgBuyPrice) {
      setError("Both fields are required");
      return;
    }

    startTransition(async () => {
      try {
        await upsertPosition({
          symbol: asset.symbol,
          name: asset.name,
          assetType: asset.assetType,
          currency: asset.currency || baseCurrency,
          quantity: parseFloat(quantity),
          avgBuyPrice: parseFloat(avgBuyPrice),
        });
        setSuccess("Added successfully!");
        setTimeout(() => {
          setQuantity("");
          setAvgBuyPrice("");
          setSuccess("");
          onClose();
        }, 1000);
      } catch {
        setError("Error adding asset");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative glass-card w-full max-w-md mx-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-white mb-1">
          Add {asset.name}
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          {asset.displaySymbol || asset.symbol}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 py-2 px-3 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="text-green-400 text-sm bg-green-500/10 py-2 px-3 rounded-lg">
              {success}
            </div>
          )}

          <div>
            <label className="block mb-1 text-xs font-medium text-slate-400">
              Quantity
            </label>
            <input
              type="number"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              placeholder="0.00"
              autoFocus
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block mb-1 text-xs font-medium text-slate-400">
              Avg Buy Price ({asset.currency || baseCurrency})
            </label>
            <input
              type="number"
              step="any"
              value={avgBuyPrice}
              onChange={(e) => setAvgBuyPrice(e.target.value)}
              required
              placeholder="0.00"
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 bg-primary text-slate-900 font-bold rounded-xl shadow-lg shadow-cyan-500/20 hover:bg-[#33d1ff] disabled:opacity-50 text-sm"
            >
              {isPending ? "Adding..." : "Add to Portfolio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
