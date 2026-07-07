import * as React from "react";

import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap " +
  "transition-colors duration-200 outline-none " +
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-foreground font-semibold shadow-lg shadow-accent/25 hover:bg-accent-hover",
  secondary: "bg-neutral-800 text-neutral-100 hover:bg-neutral-700",
  ghost: "text-neutral-400 hover:text-white hover:bg-neutral-800",
  outline:
    "border border-neutral-700 text-neutral-200 hover:border-neutral-500 hover:bg-neutral-800/60",
  destructive: "bg-danger text-white shadow-lg shadow-danger/25 hover:bg-red-600",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10",
};

/**
 * Compose button classes for elements that can't be a <button>
 * (e.g. a Next.js <Link> that should look like a primary CTA).
 */
export function buttonClasses(
  variant: Variant = "primary",
  size: Size = "md",
  className?: string,
) {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading, disabled, children, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={buttonClasses(variant, size, className)}
      {...props}
    >
      {loading && <Spinner size={size === "lg" ? 20 : 16} />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
