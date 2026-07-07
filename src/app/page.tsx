import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Hero } from "@/components/landing/hero";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { PortfolioPreview } from "@/components/landing/portfolio-preview";
import { Features } from "@/components/landing/features";

export default async function LandingPage() {
  const t = await getTranslations("landing");
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
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/login"
              className="text-sm px-4 py-2 text-neutral-300 font-medium rounded-lg hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              {t("nav.login")}
            </Link>
            <Link
              href="/register"
              className="text-sm px-4 py-2 bg-accent text-accent-foreground font-medium rounded-lg shadow-lg shadow-accent/25 hover:bg-accent-hover transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t("nav.getStarted")}
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
                {t("scroll.title")}
              </h2>
              <p className="mt-6 text-lg sm:text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
                {t("scroll.subtitle")}
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
            {t("footer.rights", { year: String(new Date().getFullYear()) })}
          </span>
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
            >
              {t("nav.login")}
            </Link>
            <Link
              href="/register"
              className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
            >
              {t("footer.register")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
