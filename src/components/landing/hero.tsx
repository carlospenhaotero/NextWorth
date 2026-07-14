"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { BackgroundPaths } from "@/components/ui/background-paths";

export function Hero() {
  const t = useTranslations("landing.hero");
  return (
    <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden px-6">
      <BackgroundPaths />

      {/* Vignette to keep the title legible over the lines */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--color-background)_85%)]" />

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold font-[family-name:var(--font-display)] tracking-tighter leading-[1.15] pb-2 text-white drop-shadow-[0_2px_30px_rgba(0,0,0,0.5)]">
          {t("title")}
        </h1>

        <div className="mt-12">
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 px-9 py-4 bg-accent text-accent-foreground text-lg font-bold rounded-xl shadow-lg shadow-accent/30 hover:bg-accent-hover hover:shadow-accent/40 transition-all duration-300 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("cta")}
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
