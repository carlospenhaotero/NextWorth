"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { BackgroundPaths } from "@/components/ui/background-paths";

export function Hero() {
  return (
    <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden px-6">
      <BackgroundPaths />

      {/* Vignette to keep the title legible over the lines */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--color-background)_85%)]" />

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold font-[family-name:var(--font-display)] tracking-tighter leading-[1.05] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 drop-shadow-[0_2px_30px_rgba(0,0,0,0.5)]">
          AI-Powered Portfolio Management
        </h1>

        <div className="mt-12">
          <Link
            href="/register"
            className="group inline-flex items-center gap-2 px-9 py-4 bg-primary text-neutral-900 text-lg font-bold rounded-xl shadow-lg shadow-white/20 hover:bg-white hover:shadow-white/40 transition-all duration-300 cursor-pointer"
          >
            Start for free
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
