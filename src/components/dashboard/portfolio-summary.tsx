import {
  CurrencyDollar,
  TrendUp,
  TrendDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "@phosphor-icons/react/dist/ssr";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface PortfolioSummaryProps {
  totalValue: number;
  totalInvested: number;
  totalProfitLoss: number;
  baseCurrency: string;
}

export function PortfolioSummary({
  totalValue,
  totalInvested,
  totalProfitLoss,
  baseCurrency,
}: PortfolioSummaryProps) {
  const isProfit = totalProfitLoss >= 0;
  const returnPct =
    totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

  return (
    <>
      {/* Net Worth Card - Large */}
      <div className="col-span-1 md:col-span-2 glass-card relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Wallet size={120} />
        </div>
        <div className="relative z-10">
          <h3 className="text-neutral-400 font-medium mb-1 flex items-center gap-2">
            <CurrencyDollar size={18} /> Total Net Worth
          </h3>
          <div className="text-5xl font-bold text-white mb-4 tracking-tight">
            {formatCurrency(totalValue, baseCurrency)}
          </div>
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                isProfit
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {isProfit ? (
                <TrendUp size={16} />
              ) : (
                <TrendDown size={16} />
              )}
              {formatCurrency(totalProfitLoss, baseCurrency)}
            </div>
            <span className="text-neutral-500 text-sm">Total Profit/Loss</span>
          </div>
        </div>
      </div>

      {/* Performance Card */}
      <div className="col-span-1 glass-card flex flex-col justify-center">
        <h3 className="text-neutral-400 font-medium mb-4">Performance</h3>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-neutral-500">Total Invested</p>
            <p className="text-xl font-bold text-white">
              {formatCurrency(totalInvested, baseCurrency)}
            </p>
          </div>
          <div className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center">
            <Wallet size={20} className="text-neutral-300" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-500">Return</p>
            <p
              className={`text-xl font-bold ${isProfit ? "text-green-400" : "text-red-400"}`}
            >
              {formatPercent(returnPct)}
            </p>
          </div>
          <div
            className={`h-10 w-10 rounded-full flex items-center justify-center ${
              isProfit ? "bg-green-500/10" : "bg-red-500/10"
            }`}
          >
            {isProfit ? (
              <ArrowUpRight size={20} className="text-green-400" />
            ) : (
              <ArrowDownRight size={20} className="text-red-400" />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
