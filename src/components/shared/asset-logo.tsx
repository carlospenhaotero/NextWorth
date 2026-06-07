"use client";

import { useState } from "react";

const TOKEN = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN;

/**
 * Builds a logo.dev image URL for the asset, or null when no logo source
 * applies (token missing, or an asset type logo.dev doesn't cover — cash,
 * savings, bonds, commodities, Morningstar-coded funds). `fallback=404` makes
 * logo.dev return a 404 for unknown tickers instead of its own monogram, so the
 * <img> onError handler can swap in our own placeholder.
 */
function logoUrl(symbol: string, assetType: string, size: number): string | null {
  if (!TOKEN) return null;
  const params = `token=${TOKEN}&size=${size}&fallback=404`;

  if (assetType === "crypto") {
    // Yahoo crypto symbols look like "BTC-USD"; logo.dev wants the bare ticker.
    const base = symbol.split("-")[0].toLowerCase();
    return base ? `https://img.logo.dev/crypto/${base}?${params}` : null;
  }

  if (assetType === "stock" || assetType === "etf") {
    return `https://img.logo.dev/ticker/${encodeURIComponent(symbol)}?${params}`;
  }

  return null;
}

interface AssetLogoProps {
  symbol: string;
  assetType: string;
  name?: string;
  /** Logo size requested from logo.dev in px; use ~2x the render size for retina. */
  size?: number;
  /** Container sizing/shape classes, e.g. "w-10 h-10 rounded-lg". */
  className?: string;
  /** Text shown when no logo is available. Defaults to the symbol's first char. */
  fallbackLabel?: string;
}

/**
 * Asset avatar: shows the real logo from logo.dev when available, otherwise a
 * neutral monogram placeholder. Safe for any asset type and degrades gracefully
 * when the logo.dev token is unset.
 */
export function AssetLogo({
  symbol,
  assetType,
  name,
  size = 64,
  className = "w-10 h-10 rounded-lg",
  fallbackLabel,
}: AssetLogoProps) {
  const [failed, setFailed] = useState(false);
  const url = logoUrl(symbol, assetType, size);
  const showImg = url != null && !failed;
  const label = fallbackLabel ?? (symbol || name || "?").charAt(0).toUpperCase();

  return (
    <div
      className={`shrink-0 flex items-center justify-center overflow-hidden text-xs font-bold ${
        showImg ? "" : "bg-neutral-800 text-neutral-300"
      } ${className}`}
    >
      {showImg ? (
        // logo.dev returns square JPEGs with their own background; let the image
        // fill the box and rely on the container's rounded corners + overflow.
        <img
          src={url}
          alt={name || symbol}
          loading="lazy"
          onError={() => setFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        label
      )}
    </div>
  );
}
