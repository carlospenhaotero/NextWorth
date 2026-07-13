import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus, Sparkle, ChatCircle } from "@phosphor-icons/react/dist/ssr";
import { buttonClasses } from "@/components/ui/button";

/**
 * Bienvenida guiada que sustituye al dashboard cuando el usuario todavia
 * no tiene ninguna posicion en cartera. Explica en tres pasos que puede
 * hacer en la app y ofrece un CTA directo a anadir el primer activo.
 */
export async function OnboardingEmpty() {
  const t = await getTranslations("onboarding");

  const steps = [
    { icon: Plus, title: t("step1Title"), desc: t("step1Desc") },
    { icon: Sparkle, title: t("step2Title"), desc: t("step2Desc") },
    { icon: ChatCircle, title: t("step3Title"), desc: t("step3Desc") },
  ];

  return (
    <div className="glass-card flex flex-col items-center gap-8 py-12 text-center">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-white font-[family-name:var(--font-display)]">
          {t("title")}
        </h2>
        <p className="mx-auto max-w-md text-sm text-neutral-400">{t("subtitle")}</p>
      </div>

      <ul className="grid w-full max-w-2xl gap-4 sm:grid-cols-3">
        {steps.map(({ icon: Icon, title, desc }) => (
          <li
            key={title}
            className="flex flex-col items-center gap-3 rounded-xl border border-neutral-800/60 bg-neutral-900/40 p-5 text-center"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-hover">
              <Icon size={20} weight="bold" />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-medium text-white">{title}</p>
              <p className="text-xs text-neutral-400">{desc}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Link href="/add-asset" className={buttonClasses("primary", "md")}>
          {t("cta")}
        </Link>
        <Link
          href="/advisor"
          className="text-sm text-neutral-400 transition-colors hover:text-accent-hover"
        >
          {t("ctaSecondary")}
        </Link>
      </div>
    </div>
  );
}
