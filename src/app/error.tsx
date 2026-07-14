"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ArrowClockwise } from "@phosphor-icons/react/dist/ssr";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="relative z-10 mx-auto max-w-lg text-center">
        <p className="text-sm font-medium text-muted tracking-tight">
          {t("somethingWrong")}
        </p>
        <h1 className="mt-4 text-4xl sm:text-5xl font-bold font-[family-name:var(--font-display)] tracking-tighter leading-[1.15] pb-2 text-white">
          {t("errorTitle")}
        </h1>
        <p className="mt-6 text-lg text-neutral-400 leading-relaxed">
          {t("errorBody")}
        </p>

        <div className="mt-12">
          <button
            onClick={() => reset()}
            className="group inline-flex items-center gap-2 px-9 py-4 bg-primary text-neutral-900 text-lg font-bold rounded-xl shadow-lg shadow-white/20 hover:bg-white hover:shadow-white/40 transition-all duration-300 cursor-pointer"
          >
            <ArrowClockwise className="w-5 h-5 transition-transform duration-300 group-hover:-rotate-45" />
            {t("tryAgain")}
          </button>
        </div>

        {error.digest ? (
          <p className="mt-8 text-xs text-neutral-600">
            {t("errorReference", { digest: error.digest })}
          </p>
        ) : null}
      </div>
    </div>
  );
}
