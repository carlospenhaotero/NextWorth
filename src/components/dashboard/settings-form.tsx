"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { updateBaseCurrency, updateLocale } from "@/actions/settings";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const CURRENCIES = ["EUR", "USD", "GBP"] as const;
const LOCALES = ["en", "es"] as const;

interface SettingsFormProps {
  currentCurrency: string;
}

interface OptionButtonProps {
  code: string;
  label: string;
  active: boolean;
  pending: boolean;
  disabled: boolean;
  onClick: () => void;
}

/** Shared segmented option — currency and language now behave identically. */
function OptionButton({ code, label, active, pending, disabled, onClick }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-5 py-3 transition-colors duration-200 outline-none",
        "focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:opacity-60 disabled:pointer-events-none",
        active
          ? "border-accent bg-accent text-accent-foreground shadow-lg shadow-accent/25"
          : "border-neutral-700 bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200",
      )}
    >
      <span className="font-bold uppercase">{code}</span>
      <span className="text-xs opacity-80">{label}</span>
      {pending ? (
        <Spinner size={14} className="ml-0.5" />
      ) : active ? (
        <Check size={14} weight="bold" className="ml-0.5" />
      ) : null}
    </button>
  );
}

export function SettingsForm({ currentCurrency }: SettingsFormProps) {
  const t = useTranslations("settings");
  const router = useRouter();
  const activeLocale = useLocale();
  const [currency, setCurrency] = useState(currentCurrency);
  const [locale, setLocale] = useState(activeLocale);
  const [savingCurrency, setSavingCurrency] = useState<string | null>(null);
  const [savingLocale, setSavingLocale] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLocalePending, startLocaleTransition] = useTransition();

  const handleCurrency = (next: string) => {
    if (next === currency) return;
    setCurrency(next);
    setSavingCurrency(next);
    startTransition(async () => {
      try {
        await updateBaseCurrency(next);
        toast.success(t("toast.saved"));
        router.refresh();
      } catch {
        toast.error(t("toast.error"));
        setCurrency(currentCurrency);
      } finally {
        setSavingCurrency(null);
      }
    });
  };

  const handleLocale = (next: string) => {
    if (next === locale) return;
    setLocale(next);
    setSavingLocale(next);
    startLocaleTransition(async () => {
      try {
        await updateLocale(next);
        toast.success(t("toast.saved"));
      } catch {
        toast.error(t("toast.error"));
        setLocale(activeLocale);
      } finally {
        setSavingLocale(null);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Currency */}
      <section className="glass-card">
        <h2 className="text-lg font-semibold text-white">{t("currency.title")}</h2>
        <p className="mt-1 text-sm text-neutral-400">{t("currency.desc")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {CURRENCIES.map((code) => (
            <OptionButton
              key={code}
              code={code}
              label={t(`currency.options.${code}`)}
              active={currency === code}
              pending={savingCurrency === code}
              disabled={isPending}
              onClick={() => handleCurrency(code)}
            />
          ))}
        </div>
      </section>

      {/* Language */}
      <section className="glass-card">
        <h2 className="text-lg font-semibold text-white">{t("language.title")}</h2>
        <p className="mt-1 text-sm text-neutral-400">{t("language.desc")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {LOCALES.map((code) => (
            <OptionButton
              key={code}
              code={code}
              label={t(`language.options.${code}`)}
              active={locale === code}
              pending={savingLocale === code}
              disabled={isLocalePending}
              onClick={() => handleLocale(code)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
