import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  /** Diameter in pixels. */
  size?: number;
}

/**
 * Single, consistent loading spinner used across the app.
 * Replaces the hand-rolled `border-2 ... animate-spin` spans that were
 * duplicated in every form and the Phosphor icon spinners.
 */
export function Spinner({ className, size = 20 }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="loading"
      style={{ width: size, height: size }}
      className={cn(
        "inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
    />
  );
}
