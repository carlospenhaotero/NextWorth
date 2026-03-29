import Link from "next/link";
import {
  BarChart3,
  BrainCircuit,
  DollarSign,
  Radio,
  UserPlus,
  PlusCircle,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Portfolio Tracking",
    description:
      "Monitor all your assets in one place with real-time valuations and performance metrics.",
  },
  {
    icon: BrainCircuit,
    title: "AI Predictions",
    description:
      "Powered by Amazon Chronos, get time-series forecasts to make smarter investment decisions.",
  },
  {
    icon: DollarSign,
    title: "Multi-Currency",
    description:
      "Track your portfolio in multiple currencies with automatic conversion rates.",
  },
  {
    icon: Radio,
    title: "Real-time Data",
    description:
      "Live market data from Yahoo Finance keeps your portfolio always up to date.",
  },
];

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Create an account",
    description: "Sign up in seconds with just your email and password.",
  },
  {
    icon: PlusCircle,
    step: "02",
    title: "Add your assets",
    description:
      "Search and add stocks, ETFs, crypto, and bonds to your portfolio.",
  },
  {
    icon: TrendingUp,
    step: "03",
    title: "Track & Predict",
    description:
      "Monitor performance and get AI-powered predictions for your investments.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
          <Link
            href="/"
            className="text-lg font-bold font-[family-name:var(--font-display)] text-white tracking-tight"
          >
            NextWorth
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="text-sm px-4 py-2 bg-white/10 text-white font-medium rounded-lg border border-white/10 hover:bg-white/15 transition-colors cursor-pointer"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6">
        {/* Background glow orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="animate-glow-pulse absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-primary/15 blur-[120px]" />
          <div className="animate-glow-pulse absolute top-60 -left-40 h-[300px] w-[400px] rounded-full bg-secondary/10 blur-[100px]" style={{ animationDelay: "2s" }} />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          <span className="animate-fade-in inline-block px-4 py-1.5 text-xs font-semibold tracking-wide uppercase rounded-full bg-primary/10 text-primary border border-primary/20 mb-8">
            Now in Beta
          </span>
          <h1 className="animate-fade-in-delay-1 text-5xl sm:text-6xl md:text-7xl font-bold font-[family-name:var(--font-display)] leading-[1.1] tracking-tight">
            AI-Powered
            <br />
            <span className="text-primary drop-shadow-[0_0_30px_rgba(0,194,255,0.3)]">
              Portfolio Management
            </span>
          </h1>
          <p className="animate-fade-in-delay-2 mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Track your investments, get AI-driven predictions, and make smarter
            financial decisions — all in one place.
          </p>
          <div className="animate-fade-in-delay-3 mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="group flex items-center gap-2 px-8 py-3.5 bg-primary text-slate-900 font-bold rounded-xl shadow-lg shadow-cyan-500/25 hover:bg-[#33d1ff] hover:shadow-cyan-500/40 transition-all duration-300 cursor-pointer"
            >
              Start for free
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 border border-border text-slate-300 rounded-xl hover:bg-surface-light hover:border-slate-600 transition-all duration-300 cursor-pointer"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-display)] mb-4">
              Everything you need
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Powerful tools to manage, analyze, and predict your portfolio
              performance.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`glass-card group cursor-default animate-fade-in-delay-${i + 1}`}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/15 mb-5 transition-colors duration-300 group-hover:bg-primary/20">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-display)] mb-4">
              How it works
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Get started in three simple steps.
            </p>
          </div>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-7 left-[calc(16.67%+28px)] right-[calc(16.67%+28px)] h-px bg-gradient-to-r from-primary/30 via-primary/15 to-primary/30" />

            {steps.map((step) => (
              <div key={step.step} className="relative text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-5 relative z-10">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="block text-xs font-semibold text-primary/70 uppercase tracking-widest mb-2">
                  Step {step.step}
                </span>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="relative mx-auto max-w-3xl">
          {/* Glow behind card */}
          <div className="absolute inset-0 rounded-2xl bg-primary/5 blur-2xl" />
          <div className="relative text-center glass-card border-primary/10 py-12 px-8">
            <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-display)] mb-4">
              Start tracking your portfolio today
            </h2>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              Join the beta and be among the first to experience AI-powered
              portfolio management.
            </p>
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-slate-900 font-bold rounded-xl shadow-lg shadow-cyan-500/25 hover:bg-[#33d1ff] hover:shadow-cyan-500/40 transition-all duration-300 cursor-pointer"
            >
              Create free account
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} NextWorth. All rights reserved.
          </span>
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
