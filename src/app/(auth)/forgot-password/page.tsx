"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Envelope, ArrowRight, ArrowLeft, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { authClient } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authClient.requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });
    } catch {
      // Swallow errors on purpose: we never reveal whether an account exists.
    } finally {
      // Always show the same neutral state (anti-enumeration).
      setSubmitted(true);
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <CheckCircle size={48} weight="fill" className="text-accent-hover" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold text-white font-[family-name:var(--font-display)]">
            {t("forgotPassword.successTitle")}
          </h1>
          <p className="text-sm text-neutral-400">{t("forgotPassword.successBody")}</p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 text-sm text-neutral-400 transition-colors hover:text-accent-hover"
        >
          <ArrowLeft size={16} weight="bold" />
          {t("forgotPassword.backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold text-white font-[family-name:var(--font-display)]">
          {t("forgotPassword.title")}
        </h1>
        <p className="text-sm text-neutral-400">{t("forgotPassword.subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field htmlFor="email" label={t("emailLabel")}>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            icon={<Envelope size={18} />}
          />
        </Field>

        <Button type="submit" size="lg" loading={loading} className="w-full">
          {loading ? t("forgotPassword.submitting") : t("forgotPassword.submit")}
          {!loading && <ArrowRight size={18} weight="bold" />}
        </Button>
      </form>

      <p className="text-center text-sm text-neutral-500">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-neutral-400 transition-colors hover:text-accent-hover"
        >
          <ArrowLeft size={16} weight="bold" />
          {t("forgotPassword.backToLogin")}
        </Link>
      </p>
    </div>
  );
}
