import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import {
  Brain,
  Coins,
  Pulse,
  ChartBar,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";

const allocation = [
  { key: "stocks", pct: 46 },
  { key: "crypto", pct: 27 },
  { key: "etfs", pct: 18 },
  { key: "cash", pct: 9 },
] as const;

export async function Features() {
  // The landing page is always English, regardless of the visitor's locale.
  const t = await getTranslations({
    locale: "en",
    namespace: "landing.features",
  });
  return (
    <section className="py-24 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-display)] tracking-tighter text-white mb-4">
            {t("title")}
          </h2>
          <p className="text-neutral-400 max-w-xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-6 gap-4">
          {/* AI Predictions */}
          <Card className="col-span-full sm:col-span-3 lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex size-12 items-center justify-center rounded-xl bg-accent-soft border border-accent/20 mb-5">
                <Brain className="size-6 text-accent-hover" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {t("aiPredictions.title")}
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed mb-5">
                {t("aiPredictions.desc")}
              </p>
              {/* Forecast sparkline */}
              <svg viewBox="0 0 200 48" className="w-full h-12" fill="none">
                <polyline
                  points="0,40 25,34 50,36 75,26 100,28 125,18"
                  stroke="#fafafa"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points="125,18 150,14 175,8 200,4"
                  stroke="#a3a3a3"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </CardContent>
          </Card>

          {/* Multi-currency */}
          <Card className="col-span-full sm:col-span-3 lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex size-12 items-center justify-center rounded-xl bg-accent-soft border border-accent/20 mb-5">
                <Coins className="size-6 text-accent-hover" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {t("multiCurrency.title")}
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed mb-5">
                {t("multiCurrency.desc")}
              </p>
              <div className="flex flex-wrap gap-2">
                {["USD", "EUR", "GBP", "JPY"].map((c) => (
                  <span
                    key={c}
                    className="rounded-lg border border-border bg-neutral-800/60 px-2.5 py-1 text-xs font-medium text-neutral-300"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Real-time data */}
          <Card className="col-span-full sm:col-span-3 lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex size-12 items-center justify-center rounded-xl bg-accent-soft border border-accent/20 mb-5">
                <Pulse className="size-6 text-accent-hover" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {t("realTime.title")}
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed mb-5">
                {t("realTime.desc")}
              </p>
              <div className="flex items-center gap-2 text-sm text-neutral-300">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-white/60 opacity-75 animate-ping" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-white" />
                </span>
                {t("realTime.badge")}
              </div>
            </CardContent>
          </Card>

          {/* Portfolio tracking & allocation */}
          <Card className="col-span-full lg:col-span-3">
            <CardContent className="grid p-6 sm:grid-cols-2 gap-6 h-full">
              <div className="flex flex-col justify-between gap-6">
                <div className="flex size-12 items-center justify-center rounded-xl bg-accent-soft border border-accent/20">
                  <ChartBar className="size-6 text-accent-hover" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {t("tracking.title")}
                  </h3>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    {t("tracking.desc")}
                  </p>
                </div>
              </div>
              <div className="flex flex-col justify-center gap-3">
                {allocation.map((a) => (
                  <div key={a.key}>
                    <div className="flex justify-between text-xs text-neutral-400 mb-1">
                      <span>{t(`allocation.${a.key}`)}</span>
                      <span className="text-neutral-300">{a.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover"
                        style={{ width: `${a.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="col-span-full lg:col-span-3">
            <CardContent className="grid p-6 sm:grid-cols-2 gap-6 h-full">
              <div className="flex flex-col justify-between gap-6">
                <div className="flex size-12 items-center justify-center rounded-xl bg-accent-soft border border-accent/20">
                  <ShieldCheck className="size-6 text-accent-hover" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {t("security.title")}
                  </h3>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    {t("security.desc")}
                  </p>
                </div>
              </div>
              <div className="relative flex items-center justify-center">
                <div className="absolute size-32 rounded-full border border-white/5" />
                <div className="absolute size-24 rounded-full border border-white/10" />
                <div className="flex size-16 items-center justify-center rounded-full border border-white/15 bg-neutral-800/60">
                  <ShieldCheck className="size-8 text-white" weight="light" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
