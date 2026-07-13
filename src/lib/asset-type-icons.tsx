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
