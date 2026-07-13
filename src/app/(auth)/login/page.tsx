"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Envelope, ArrowRight, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { signIn } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/auth/password-input";

// Credenciales de la cuenta demo publica (prisma/seed-demo.ts). Es intencional
// que vayan en el cliente: la cuenta solo contiene datos de ejemplo.
const DEMO_EMAIL = "demo-e2e@nextworth.app";
const DEMO_PASSWORD = "NextWorth2026!";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const loginWith = async (loginEmail: string, loginPassword: string) => {
    setError("");
    try {
      const result = await signIn.email({ email: loginEmail, password: loginPassword });
      if (result.error) {
        setError(result.error.message ?? t("login.errorInvalid"));
        return false;
      }
      router.push("/overview");
      return true;
    } catch {
      setError(t("login.errorGeneric"));
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await loginWith(email, password);
    setLoading(false);
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    await loginWith(DEMO_EMAIL, DEMO_PASSWORD);
    setDemoLoading(false);
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

        <Button
          type="submit"
          size="lg"
          loading={loading}
          disabled={demoLoading}
          className="w-full"
        >
          {loading ? t("login.submitting") : t("login.submit")}
          {!loading && <ArrowRight size={18} weight="bold" />}
        </Button>
      </form>

      <div className="space-y-1.5">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          loading={demoLoading}
          disabled={loading}
          onClick={handleDemoLogin}
          className="w-full"
        >
          {!demoLoading && <Sparkle size={18} weight="bold" />}
          {t("login.demoButton")}
        </Button>
        <p className="text-center text-xs text-neutral-500">{t("login.demoHint")}</p>
      </div>

      <p className="text-center text-sm text-neutral-500">
        {t("login.noAccount")}{" "}
        <Link href="/register" className="font-medium text-accent-hover hover:underline">
          {t("login.createAccount")}
        </Link>
      </p>
    </div>
  );
}
