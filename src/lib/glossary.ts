// Identificadores de términos del glosario contextual.
// Las definiciones (term/definition) viven en i18n bajo el namespace "glossary",
// no aquí, para que sean traducibles.
export const GLOSSARY_TERM_IDS = [
  "tae",
  "coupon",
  "dividendYield",
  "bondYield",
  "riskProfile",
  "diversification",
  "netWorth",
] as const;

export type GlossaryTermId = (typeof GLOSSARY_TERM_IDS)[number];
