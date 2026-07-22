# Test de carga — NextWorth (Fase 3)

Responde a los puntos 11 y 12 del feedback del tutor: qué pasa con una cartera
grande y dónde está el cuello de botella.

## Metodología

- **Datos:** cuenta dedicada con **1000 posiciones** sembradas por
  `pnpm db:seed:load` (`prisma/seed-load.ts`). Mezcla: 300 activos de mercado
  (stock/etf/crypto/commodity) + 700 sin red (cash/savings/bond). Símbolos
  sintéticos: no existen en Yahoo, así que cada quote falla rápido y la posición
  cae a coste. Lo que se mide es la **estructura** (una llamada por posición), no
  la latencia de un símbolo concreto.
- **Medición:** `pnpm loadtest` (`scripts/load-test.ts`) cronometra en frío
  (cachés vacías) y en caliente (histórico ya en la BD) las dos rutas caras:
  `getPortfolioForUser` y `getPortfolioHistory("all")`.
- **Entorno:** local, Postgres en Docker, `NODE_OPTIONS=--conditions=react-server`
  para poder ejecutar módulos `server-only` fuera de Next.

## Resultados

Baseline (código secuencial original) frente al estado actual (batch + caché de
cotizaciones + prefetch de FX en paralelo), misma cuenta de 1000 posiciones:

| Ruta | Frío (antes → ahora) | Caliente (antes → ahora) |
|---|---|---|
| `getPortfolioForUser` (1000 pos.) | 78 312 ms → **3 803 ms** (~20×) | 62 215 ms → **338 ms** (~184×) |
| `getPortfolioHistory("all")` (1000 pos.) | ~13 600 ms (sin cambios) | ~6 900 ms (sin cambios) |

- Posiciones de mercado: 300. En el baseline cada una hacía quote + FX
  **secuencial**: ~261 ms/posición × 300 ≈ los 78 s observados (casi todo espera
  de red en serie).
- Con el batch, la latencia efectiva por posición de mercado cae a **~13 ms** en
  frío. El run en caliente (~338 ms) refleja la nueva caché de cotizaciones (TTL
  60 s): apenas queda trabajo que repetir.
- `getPortfolioHistory` no se tocó en esta fase; su variación entra dentro del
  ruido de red.

## Diagnóstico: el N+1 de `getPortfolioForUser`

`src/queries/portfolio.ts` recorre las posiciones en un bucle y, **por cada una**,
espera de forma secuencial una cotización y un tipo de cambio:

- `getQuote(symbol)` — una llamada HTTP a Yahoo por posición (`portfolio.ts:111`).
- `getFxRate(from, to)` — una llamada a Frankfurter por divisa; esta **sí** tiene
  caché por divisa dentro de la petición (`fxCache`, `portfolio.ts:82-90`), así
  que su coste no crece con el número de posiciones, solo con el de divisas.

El multiplicador real es `getQuote`, y son dos problemas sumados:

1. **Secuencialidad.** El `await` está dentro del `for`, no en paralelo: N
   posiciones = N viajes de red uno detrás de otro.
2. **Sin caché.** A diferencia del histórico (`getAssetHistory` tiene caché de 3
   niveles: dedup en memoria -> BD con TTL -> stale), `getQuote` va a Yahoo
   siempre. Por eso el run **en caliente sigue en ~62 s**: no hay nada que
   reutilizar entre llamadas.

`getPortfolioHistory` escala mucho mejor (~13 s para las mismas 1000 posiciones)
justamente porque su histórico por activo pasa por esa caché y por dedup de
peticiones en vuelo.

## Solución aplicada

Las tres recomendaciones del análisis original, ya implementadas:

1. **Batch de quotes.** `getYahooQuotes(symbols[])` (`src/server/yahoo-finance.ts`)
   pide los tickers en tandas de 50 por llamada, con las tandas en paralelo. Las
   ~300 peticiones secuenciales pasan a ~6 llamadas concurrentes.
2. **Caché de cotizaciones.** `getQuotes(symbols[])` (`src/server/market-data.ts`)
   añade una caché in-memory con TTL de 60 s: las recargas y los usuarios que
   comparten símbolos ya no vuelven a Yahoo. Es lo que lleva el run caliente de
   ~62 s a ~0,3 s.
3. **Prefetch de FX en paralelo.** `getPortfolioForUser`
   (`src/queries/portfolio.ts`) resuelve el batch de quotes y los tipos de cambio
   distintos antes del bucle; el bucle pasa a ser cómputo puro sin `await`.

El resultado no cambia (mismos valores por posición y mismos totales); solo cambia
el orden de espera. En cliente, `AssetListView` pagina el render (30 por página,
botón "cargar más") para no montar 1000 tarjetas de golpe.

Regresión cubierta por `tests/unit/portfolio.test.ts`: se verifica que
`getPortfolioForUser` pide todos los símbolos en **una sola** llamada a
`getQuotes` (no vuelve al N+1) y que un símbolo sin precio cae al coste.

## Cómo reproducir

```bash
docker compose up -d          # Postgres
pnpm db:seed:load             # crea loadtest@nextworth.app con 1000 posiciones
pnpm loadtest                 # imprime la tabla de arriba
```

Parametrizable: `LOAD_N` (total, por defecto 1000) y `LOAD_MARKET` (de mercado,
por defecto 300).
