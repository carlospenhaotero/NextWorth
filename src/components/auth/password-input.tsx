"use client";

import { useState } from "react";
import { Lock, Eye, EyeSlash } from "@phosphor-icons/react/dist/ssr";
import { Input, type InputProps } from "@/components/ui/input";

interface PasswordInputProps
  extends Omit<InputProps, "type" | "icon" | "trailing"> {
  showLabel: string;
  hideLabel: string;
}

/** Password field with a self-contained show/hide toggle and lock icon. */
export function PasswordInput({ showLabel, hideLabel, ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false);
  return (
    <Input
      {...props}
      type={show ? "text" : "password"}
      icon={<Lock size={18} />}
      trailing={
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? hideLabel : showLabel}
          aria-pressed={show}
          className="pointer-events-auto text-muted transition-colors hover:text-neutral-300 outline-none focus-visible:text-neutral-200"
        >
          {show ? <EyeSlash size={18} /> : <Eye size={18} />}
        </button>
      }
    />
  );
}
