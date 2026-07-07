import * as React from "react";

interface FieldProps {
  htmlFor?: string;
  label: string;
  /** Optional element on the right of the label (e.g. a "forgot password" link). */
  action?: React.ReactNode;
  children: React.ReactNode;
}

/** Label + control wrapper for forms. */
export function Field({ htmlFor, label, action, children }: FieldProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-medium text-neutral-300">
          {label}
        </label>
        {action}
      </div>
      {children}
    </div>
  );
}
