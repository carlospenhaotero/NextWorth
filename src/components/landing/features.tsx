import { Card, CardContent } from "@/components/ui/card";
import {
  Brain,
  Coins,
  Pulse,
  ChartBar,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";

const allocation = [
  { label: "Stocks", pct: 46 },
  { label: "Crypto", pct: 27 },
  { label: "ETFs", pct: 18 },
  { label: "Cash", pct: 9 },
];

export function Features() {
  return (
    <section className="py-24 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-display)] tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 mb-4">
            Powerful under the hood
          </h2>
          <p className="text-neutral-400 max-w-xl mx-auto">
            Real-time data, AI forecasting, and bank-grade security — everything
            your portfolio needs.
          </p>
        </div>

        <div className="grid grid-cols-6 gap-4">
          {/* AI Predictions */}
          <Card className="col-span-full sm:col-span-3 lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/15 mb-5">
                <Brain className="size-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                AI Predictions
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed mb-5">
                Time-series forecasts powered by Amazon Chronos to anticipate
                where your assets are heading.
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
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/15 mb-5">
                <Coins className="size-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Multi-Currency
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed mb-5">
                Track your net worth in your preferred currency with automatic
                conversion rates.
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
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/15 mb-5">
                <Pulse className="size-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Real-time Data
              </h3>
              <p className="text-sm text-neutral-400 leading-relaxed mb-5">
                Live market quotes from Yahoo Finance keep every valuation up to
                the second.
              </p>
              <div className="flex items-center gap-2 text-sm text-neutral-300">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-white/60 opacity-75 animate-ping" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-white" />
                </span>
                Live · Yahoo Finance
              </div>
            </CardContent>
          </Card>

          {/* Portfolio tracking & allocation */}
          <Card className="col-span-full lg:col-span-3">
            <CardContent className="grid p-6 sm:grid-cols-2 gap-6 h-full">
              <div className="flex flex-col justify-between gap-6">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/15">
                  <ChartBar className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Portfolio Tracking
                  </h3>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    All your assets in one place, with net worth and allocation
                    broken down in real time.
                  </p>
                </div>
              </div>
              <div className="flex flex-col justify-center gap-3">
                {allocation.map((a) => (
                  <div key={a.label}>
                    <div className="flex justify-between text-xs text-neutral-400 mb-1">
                      <span>{a.label}</span>
                      <span className="text-neutral-300">{a.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-white/90 to-white/50"
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
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/15">
                  <ShieldCheck className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Bank-grade Security
                  </h3>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    Encrypted sessions and modern authentication keep your
                    financial data private by default.
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
