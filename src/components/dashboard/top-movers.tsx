import { formatCurrency, formatPercent } from "@/lib/utils";

interface Position {
  id: number;
  symbol: string;
  name: string;
  currentPrice: number | null;
  profitLoss: number | null;
  profitLossPct: number | null;
}

interface TopMoversProps {
  positions: Position[];
  baseCurrency: string;
}

export function TopMovers({ positions, baseCurrency }: TopMoversProps) {
  const sorted = [...positions]
    .filter((p) => p.profitLossPct != null)
    .sort(
      (a, b) => Math.abs(b.profitLossPct!) - Math.abs(a.profitLossPct!)
    )
    .slice(0, 6);

  return (
    <div className="col-span-1 md:col-span-3 glass-card">
      <h3 className="text-slate-400 font-medium mb-4">Top Movers</h3>
      {sorted.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((pos) => (
            <div
              key={pos.id}
              className="flex items-center justify-between p-3 bg-slate-800/30 hover:bg-slate-800/50 rounded-xl transition-colors border border-slate-800/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-300">
                  {(pos.name || pos.symbol).substring(0, 2)}
                </div>
                <div>
                  <p className="font-medium text-white truncate max-w-[120px]">
                    {pos.name || pos.symbol}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatCurrency(pos.currentPrice, baseCurrency)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`font-bold ${
                    (pos.profitLossPct ?? 0) >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {formatPercent(pos.profitLossPct)}
                </div>
                <div
                  className={`text-xs ${
                    (pos.profitLoss ?? 0) >= 0
                      ? "text-green-500/70"
                      : "text-red-500/70"
                  }`}
                >
                  {formatCurrency(pos.profitLoss, baseCurrency)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-500 text-sm">
          No positions yet. Add assets to see movers.
        </p>
      )}
    </div>
  );
}
