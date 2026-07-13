import { getTranslations } from "next-intl/server";
import {
  ChartLineUp,
  CurrencyCircleDollar,
  Sparkle,
  TrendUp,
} from "@phosphor-icons/react/dist/ssr";

/**
 * Tarjeta de transparencia: explica en un solo sitio de donde salen los datos
 * y que modelos de IA se usan (precios Yahoo, FX Frankfurter, texto Gemini,
 * predicciones Chronos zero-shot). Responde a los puntos 1, 2 y 13 del feedback
 * del tutor. Es la fuente canonica; los microcopys sueltos del detalle/asesor se
 * mantienen. Componente de servidor, read-only.
 */
export async function DataSourcesCard() {
  const t = await getTranslations("dataSources");

  const rows = [
    { icon: ChartLineUp, key: "prices" },
    { icon: CurrencyCircleDollar, key: "fx" },
    { icon: Sparkle, key: "advisorText" },
    { icon: TrendUp, key: "forecast" },
  ] as const;

  return (
    <section className="glass-card">
      <h2 className="text-lg font-semibold text-white">{t("title")}</h2>
      <p className="mt-1 text-sm text-neutral-400">{t("desc")}</p>

      <ul className="mt-4 flex flex-col gap-3">
        {rows.map(({ icon: Icon, key }) => (
          <li
            key={key}
            className="flex items-start gap-3 rounded-xl border border-neutral-800/60 bg-neutral-900/40 p-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-hover">
              <Icon size={18} weight="bold" />
            </span>
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-white">
                {t(`${key}.title`)}
                <span className="ml-2 text-xs font-normal text-accent-hover">
                  {t(`${key}.source`)}
                </span>
              </p>
              <p className="text-xs text-neutral-400">{t(`${key}.desc`)}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-neutral-500">{t("disclaimer")}</p>
    </section>
  );
}
