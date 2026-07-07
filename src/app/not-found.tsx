import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="relative z-10 mx-auto max-w-lg text-center">
        <p className="text-sm font-medium text-neutral-500 tracking-tight">
          {t("notFoundCode")}
        </p>
        <h1 className="mt-4 text-4xl sm:text-5xl font-bold font-[family-name:var(--font-display)] tracking-tighter leading-[1.15] pb-2 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
          {t("notFoundTitle")}
        </h1>
        <p className="mt-6 text-lg text-neutral-400 leading-relaxed">
          {t("notFoundBody")}
        </p>

        <div className="mt-12">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 px-9 py-4 bg-primary text-neutral-900 text-lg font-bold rounded-xl shadow-lg shadow-white/20 hover:bg-white hover:shadow-white/40 transition-all duration-300 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" />
            {t("goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
