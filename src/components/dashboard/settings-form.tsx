"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { updateBaseCurrency, updateLocale, updateDisplayName } from "@/actions/settings";
import { authClient } from "@/lib/auth-client";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const CURRENCIES = ["EUR", "USD", "GBP"] as const;
const LOCALES = ["en", "es"] as const;
const PASSWORD_MIN_LENGTH = 8;

interface SettingsFormProps {
  currentCurrency: string;
  currentName: string;
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

/**
 * One settings entry: label + description on the left, the control on the
 * right. Fills the card width and keeps every row visually consistent.
 */
function SettingRow({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-8">
      <div className="md:max-w-xs md:shrink-0">
        <h3 className="font-medium text-white">{title}</h3>
        <p className="mt-1 text-sm text-neutral-400">{desc}</p>
      </div>
      <div className="w-full md:max-w-md">{children}</div>
    </div>
  );
}

export function SettingsForm({ currentCurrency, currentName }: SettingsFormProps) {
  const t = useTranslations("settings");
  const router = useRouter();
  const activeLocale = useLocale();
  const [currency, setCurrency] = useState(currentCurrency);
  const [locale, setLocale] = useState(activeLocale);
  const [savingCurrency, setSavingCurrency] = useState<string | null>(null);
  const [savingLocale, setSavingLocale] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLocalePending, startLocaleTransition] = useTransition();

  // Profile name
  const [name, setName] = useState(currentName);
  const [savingName, startNameTransition] = useTransition();

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, startPasswordTransition] = useTransition();

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

  const handleName = () => {
    const trimmed = name.trim();
    if (trimmed === currentName.trim() || trimmed.length === 0) return;
    startNameTransition(async () => {
      const res = await updateDisplayName(trimmed);
      if (res.ok) {
        toast.success(t("toast.saved"));
        router.refresh();
      } else {
        toast.error(t(`errors.${res.code}`));
      }
    });
  };

  const handlePassword = () => {
    setPasswordError(null);
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setPasswordError(t("errors.weak_password"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("errors.mismatch"));
      return;
    }
    startPasswordTransition(async () => {
      // Password changes go through BetterAuth on the client so the rotated
      // session cookie is applied to the browser. Doing this via a server action
      // (auth.api.changePassword) would rotate the token server-side without
      // updating the cookie, stranding the session. revokeOtherSessions signs
      // out every other device on success.
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (error) {
        if (error.code === "INVALID_PASSWORD") {
          setPasswordError(t("errors.invalid_password"));
        } else if (error.code === "PASSWORD_TOO_SHORT") {
          setPasswordError(t("errors.weak_password"));
        } else {
          setPasswordError(t("errors.error"));
        }
        return;
      }
      toast.success(t("password.updated"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    });
  };

  const nameDirty = name.trim() !== currentName.trim() && name.trim().length > 0;
  const passwordFilled =
    currentPassword.length > 0 && newPassword.length > 0 && confirmPassword.length > 0;

  const rowGroupClass =
    "mt-6 divide-y divide-neutral-800/60 [&>*]:py-6 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0";

  return (
    <div className="flex flex-col gap-6">
      {/* Account */}
      <section className="glass-card">
        <h2 className="text-lg font-semibold text-white">{t("sections.account")}</h2>
        <div className={rowGroupClass}>
          <SettingRow title={t("profile.title")} desc={t("profile.desc")}>
            <div className="flex flex-col gap-3">
              <Field htmlFor="displayName" label={t("profile.nameLabel")}>
                <Input
                  id="displayName"
                  value={name}
                  maxLength={64}
                  disabled={savingName}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Button
                variant="primary"
                size="sm"
                className="self-start"
                loading={savingName}
                disabled={!nameDirty || savingName}
                onClick={handleName}
              >
                {t("profile.save")}
              </Button>
            </div>
          </SettingRow>

          <SettingRow title={t("password.title")} desc={t("password.desc")}>
            <div className="flex flex-col gap-3">
              <Field htmlFor="currentPassword" label={t("password.current")}>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  disabled={savingPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </Field>
              <Field htmlFor="newPassword" label={t("password.new")}>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  disabled={savingPassword}
                  aria-invalid={passwordError != null}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </Field>
              <Field htmlFor="confirmPassword" label={t("password.confirm")}>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  disabled={savingPassword}
                  aria-invalid={passwordError != null}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </Field>
              <p className="text-xs text-muted">{t("password.hint")}</p>
              {passwordError && <p className="text-sm text-danger">{passwordError}</p>}
              <Button
                variant="primary"
                size="sm"
                className="self-start"
                loading={savingPassword}
                disabled={!passwordFilled || savingPassword}
                onClick={handlePassword}
              >
                {t("password.save")}
              </Button>
            </div>
          </SettingRow>
        </div>
      </section>

      {/* Preferences */}
      <section className="glass-card">
        <h2 className="text-lg font-semibold text-white">{t("sections.preferences")}</h2>
        <div className={rowGroupClass}>
          <SettingRow title={t("currency.title")} desc={t("currency.desc")}>
            <div className="flex flex-wrap gap-3">
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
          </SettingRow>

          <SettingRow title={t("language.title")} desc={t("language.desc")}>
            <div className="flex flex-wrap gap-3">
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
          </SettingRow>
        </div>
      </section>
    </div>
  );
}
