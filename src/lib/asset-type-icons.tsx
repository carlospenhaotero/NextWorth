import type { Icon } from "@phosphor-icons/react";
import {
  ChartLineUp,
  ChartPieSlice,
  Briefcase,
  CurrencyBtc,
  Coins,
  Certificate,
  Wallet,
  PiggyBank,
  Question,
} from "@phosphor-icons/react/dist/ssr";

/**
 * Maps each asset type string to its Phosphor icon. Keep in sync with the
 * asset type values used across the app (positions, catalog, add-asset flow).
 */
export const ASSET_TYPE_ICONS: Record<string, Icon> = {
  stock: ChartLineUp,
  etf: ChartPieSlice,
  fund: Briefcase,
  crypto: CurrencyBtc,
  commodity: Coins,
  bond: Certificate,
  cash: Wallet,
  savings: PiggyBank,
};

/**
 * Per-category color for the type chip (tinted background + colored text).
 * The Phosphor icon inside inherits the text color via currentColor, so a
 * single class string colors both the chip and its icon. One distinct hue per
 * category so they read apart at a glance.
 */
export const ASSET_TYPE_CHIP_CLASSES: Record<string, string> = {
  stock: "bg-sky-500/15 text-sky-400",
  etf: "bg-violet-500/15 text-violet-400",
  fund: "bg-fuchsia-500/15 text-fuchsia-400",
  crypto: "bg-orange-500/15 text-orange-400",
  commodity: "bg-yellow-500/15 text-yellow-500",
  bond: "bg-emerald-500/15 text-emerald-400",
  cash: "bg-slate-500/15 text-slate-300",
  savings: "bg-teal-500/15 text-teal-400",
};

/** Chip classes for an asset type, falling back to neutral for unknown types. */
export function assetTypeChipClasses(type: string): string {
  return ASSET_TYPE_CHIP_CLASSES[type] ?? "bg-neutral-800 text-neutral-300";
}

interface AssetTypeIconProps {
  type: string;
  size?: number;
  className?: string;
}

/**
 * Decorative icon for a given asset type. Falls back to a generic question
 * mark icon for unknown/future types instead of rendering nothing.
 */
export function AssetTypeIcon({ type, size = 14, className }: AssetTypeIconProps) {
  const IconComponent = ASSET_TYPE_ICONS[type] ?? Question;
  return <IconComponent size={size} className={className} aria-hidden="true" />;
}
