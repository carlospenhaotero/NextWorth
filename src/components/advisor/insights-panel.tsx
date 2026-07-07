import { getTranslations } from "next-intl/server";
import { Warning, Info, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import type { AdvisorInsight } from "@/server/advisor/metrics";

interface InsightsPanelProps {
  insights: AdvisorInsight[];
}

export async function InsightsPanel({ insights }: InsightsPanelProps) {
  const t = await getTranslations("advisor.insights");
  return (
    <div className="glass-card flex-1 min-h-0 flex flex-col overflow-hidden">
      <h3 className="text-neutral-400 font-medium mb-3 shrink-0">{t("title")}</h3>
      {insights.length > 0 ? (
        <ul className="space-y-2.5 flex-1 min-h-0 overflow-y-auto pr-1">
          {insights.map((ins) => {
            const Icon = ins.severity === "warn" ? Warning : Info;
            return (
              <li key={ins.id} className="flex items-start gap-2.5 text-sm">
                <Icon
                  size={18}
                  weight="fill"
                  className={
                    ins.severity === "warn"
                      ? "text-amber-400 shrink-0 mt-0.5"
                      : "text-accent-hover shrink-0 mt-0.5"
                  }
                />
                <span className="text-neutral-300">{ins.text}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
          <CheckCircle size={28} weight="fill" className="text-success" />
          <p className="text-neutral-400 text-sm">
            {t("balancedFallback")}
          </p>
        </div>
      )}
    </div>
  );
}
