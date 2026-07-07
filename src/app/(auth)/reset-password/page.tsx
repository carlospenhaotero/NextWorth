"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { PasswordInput } from "@/components/auth/password-input";

function ResetPasswordForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const tokenError = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const invalidToken = !token || tokenError === "INVALID_TOKEN";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError(t("resetPassword.tooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("resetPassword.mismatch"));
      return;
    }

    setLoading(true);

    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token: token!,
      });
      if (result.error) {
        setError(result.error.message ?? t("resetPassword.errorFailed"));
      } else {
        toast.success(t("resetPassword.successToast"));
        router.push("/login");
      }
    } catch {
      setError(t("resetPassword.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  if (invalidToken) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <WarningCircle size={48} weight="fill" className="text-danger" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold text-white font-[family-name:var(--font-display)]">
            {t("resetPassword.invalidTitle")}
          </h1>
          <p className="text-sm text-neutral-400">{t("resetPassword.invalidBody")}</p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex items-center justify-center gap-2 text-sm font-medium text-accent-hover hover:underline"
        >
          {t("resetPassword.invalidCta")}
          <ArrowRight size={16} weight="bold" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold text-white font-[family-name:var(--font-display)]">
          {t("resetPassword.title")}
        </h1>
        <p className="text-sm text-neutral-400">{t("resetPassword.subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-danger/10 py-2 text-center text-sm text-danger">
            {error}
          </div>
        )}

        <Field htmlFor="password" label={t("resetPassword.newPasswordLabel")}>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder={t("resetPassword.newPasswordPlaceholder")}
            showLabel={t("showPassword")}
            hideLabel={t("hidePassword")}
          />
        </Field>

        <Field htmlFor="confirmPassword" label={t("resetPassword.confirmLabel")}>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder={t("resetPassword.confirmPlaceholder")}
            showLabel={t("showPassword")}
            hideLabel={t("hidePassword")}
          />
        </Field>

        <Button type="submit" size="lg" loading={loading} className="w-full">
          {loading ? t("resetPassword.submitting") : t("resetPassword.submit")}
          {!loading && <ArrowRight size={18} weight="bold" />}
        </Button>
      </form>

      <p className="text-center text-sm text-neutral-500">
        <Link href="/login" className="text-neutral-400 transition-colors hover:text-accent-hover">
          {t("resetPassword.backToLogin")}
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Spinner size={24} className="text-neutral-600" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
