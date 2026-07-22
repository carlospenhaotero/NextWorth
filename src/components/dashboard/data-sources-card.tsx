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
    {
      icon: TrendUp,
      key: "forecast",
      href: "https://huggingface.co/amazon/chronos-t5-small",
    },
  ] as const;

  return (
    <section className="glass-card">
      <h2 className="text-lg font-semibold text-white">{t("title")}</h2>
      <p className="mt-1 text-sm text-neutral-400">{t("desc")}</p>

      <ul className="mt-4 flex flex-col gap-3">
        {rows.map((row) => {
          const { icon: Icon, key } = row;
          const href = "href" in row ? row.href : undefined;
          const source = t(`${key}.source`);
          return (
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
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-xs font-normal text-accent-hover underline decoration-dotted underline-offset-2 hover:text-white"
                    >
                      {source}
                    </a>
                  ) : (
                    <span className="ml-2 text-xs font-normal text-accent-hover">
                      {source}
                    </span>
                  )}
                </p>
                <p className="text-xs text-neutral-400">{t(`${key}.desc`)}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs text-muted">{t("disclaimer")}</p>
    </section>
  );
}
