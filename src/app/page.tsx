import Link from "next/link";
import { Hero } from "@/components/landing/hero";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { PortfolioPreview } from "@/components/landing/portfolio-preview";
import { Features } from "@/components/landing/features";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Nav */}
      <nav className="absolute top-0 inset-x-0 z-50">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
          <Link
            href="/"
            className="text-lg font-bold font-[family-name:var(--font-display)] text-white tracking-tight"
          >
            NextWorth
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/register"
              className="text-sm px-4 py-2 bg-white/10 text-white font-medium rounded-lg border border-white/10 hover:bg-white/15 transition-colors cursor-pointer"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <Hero />

      {/* Features — scroll-reveal tablet */}
      <section className="relative">
        <ContainerScroll
          titleComponent={
            <div className="mb-8">
              <h2 className="text-4xl sm:text-6xl md:text-7xl font-bold font-[family-name:var(--font-display)] tracking-tighter leading-[1.15] pb-2 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
                Everything you need
              </h2>
              <p className="mt-6 text-lg sm:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
                Track every asset, forecast tomorrow with AI, and watch your net
                worth climb — all from one beautiful dashboard.
              </p>
            </div>
          }
        >
          <PortfolioPreview />
        </ContainerScroll>
      </section>

      {/* Features */}
      <Features />

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-neutral-500">
            &copy; {new Date().getFullYear()} NextWorth. All rights reserved.
          </span>
          <div className="flex items-center gap-6">
            <Link
              href="/register"
              className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
            >
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
