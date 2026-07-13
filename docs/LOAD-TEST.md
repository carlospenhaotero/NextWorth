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

| Ruta | Frío | Caliente |
|---|---|---|
| `getPortfolioForUser` (1000 pos.) | **78 312 ms** | **62 215 ms** |
| `getPortfolioHistory("all")` (1000 pos.) | 13 637 ms | 11 096 ms |

- Posiciones de mercado: 300, cada una con quote + FX secuencial.
- Latencia por posición de mercado (frío): **~261 ms**. 300 × 261 ms ≈ los 78 s
  observados: el tiempo es casi todo espera de red secuencial.

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

## Recomendación (no aplicada aún)

Ordenadas por retorno/esfuerzo. No se implementan en esta fase para no tocar
lógica de negocio crítica sin acordarlo; quedan como trabajo propuesto.

1. **Paralelizar las cotizaciones con un pool acotado** (p. ej. 8-10 en vuelo).
   Convierte 300 viajes secuenciales en ~30 tandas: proyección ~78 s -> ~8-10 s
   sin cambiar el resultado, solo el orden de espera. Pool acotado (no
   `Promise.all` a pelo) para no disparar el rate-limit de Yahoo.
2. **Cachear `getQuote`** con el mismo patrón que `getAssetHistory` (memoria + BD
   con TTL corto, p. ej. 60 s). Elimina el coste en cargas repetidas y en varios
   usuarios sobre los mismos símbolos.
3. **Batch de quotes.** `yahoo-finance2` acepta varios símbolos por llamada:
   una petición para todos los tickers en vez de una por posición.

Con (1)+(2) la cartera de 1000 activos bajaría de ~78 s a segundos, y las cargas
recurrentes serían casi instantáneas.

## Cómo reproducir

```bash
docker compose up -d          # Postgres
pnpm db:seed:load             # crea loadtest@nextworth.app con 1000 posiciones
pnpm loadtest                 # imprime la tabla de arriba
```

Parametrizable: `LOAD_N` (total, por defecto 1000) y `LOAD_MARKET` (de mercado,
por defecto 300).
