"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { User, Envelope, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { signUp } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/auth/password-input";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("register.passwordMismatch"));
      return;
    }

    setLoading(true);

    try {
      const result = await signUp.email({ name, email, password });
      if (result.error) {
        setError(result.error.message ?? t("register.errorFailed"));
      } else {
        router.push("/overview");
      }
    } catch {
      setError(t("register.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold text-white font-[family-name:var(--font-display)]">
          {t("register.title")}
        </h1>
        <p className="text-sm text-neutral-400">{t("register.subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-danger/10 py-2 text-center text-sm text-danger">
            {error}
          </div>
        )}

        <Field htmlFor="name" label={t("register.nameLabel")}>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            placeholder={t("register.namePlaceholder")}
            icon={<User size={18} />}
          />
        </Field>

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

        <Field htmlFor="password" label={t("register.passwordLabel")}>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder={t("register.passwordPlaceholder")}
            showLabel={t("showPassword")}
            hideLabel={t("hidePassword")}
          />
        </Field>

        <Field htmlFor="confirmPassword" label={t("register.confirmLabel")}>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder={t("register.confirmPlaceholder")}
            showLabel={t("showPassword")}
            hideLabel={t("hidePassword")}
          />
        </Field>

        <Button type="submit" size="lg" loading={loading} className="w-full">
          {loading ? t("register.submitting") : t("register.submit")}
          {!loading && <ArrowRight size={18} weight="bold" />}
        </Button>
      </form>

      <p className="text-center text-sm text-muted">
        {t("register.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-accent-hover hover:underline">
          {t("register.signIn")}
        </Link>
      </p>
    </div>
  );
}
