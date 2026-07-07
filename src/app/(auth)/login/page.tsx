"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Envelope, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { signIn } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/auth/password-input";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message ?? t("login.errorInvalid"));
      } else {
        router.push("/overview");
      }
    } catch {
      setError(t("login.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold text-white font-[family-name:var(--font-display)]">
          {t("login.title")}
        </h1>
        <p className="text-sm text-neutral-400">{t("login.subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg bg-danger/10 py-2 text-center text-sm text-danger">
            {error}
          </div>
        )}

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

        <Field
          htmlFor="password"
          label={t("login.passwordLabel")}
          action={
            <Link
              href="/forgot-password"
              className="text-sm text-neutral-400 transition-colors hover:text-accent-hover"
            >
              {t("login.forgotPassword")}
            </Link>
          }
        >
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder={t("login.passwordPlaceholder")}
            showLabel={t("showPassword")}
            hideLabel={t("hidePassword")}
          />
        </Field>

        <Button type="submit" size="lg" loading={loading} className="w-full">
          {loading ? t("login.submitting") : t("login.submit")}
          {!loading && <ArrowRight size={18} weight="bold" />}
        </Button>
      </form>

      <p className="text-center text-sm text-neutral-500">
        {t("login.noAccount")}{" "}
        <Link href="/register" className="font-medium text-accent-hover hover:underline">
          {t("login.createAccount")}
        </Link>
      </p>
    </div>
  );
}
