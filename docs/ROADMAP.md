# Roadmap de entrega — NextWorth (TFG)

Plan de trabajo para llevar NextWorth a una versión que satisfaga la revisión del
tutor (Martín) antes de la entrega del TFG. Documentación aparte, al final.

- **Meta:** versión desplegada, defendible ante tribunal, que responda punto por
  punto al feedback del tutor.
- **Restricción temporal:** el tutor no está disponible gran parte de agosto. La
  ventana útil para que vea avances es corta, por eso el orden prioriza lo que
  ya está construido y lo más visible.

---

## Diagnóstico de partida

La aplicación desplegada en producción es **anterior** al trabajo del working
tree actual. Muchas de las peticiones del tutor ya están construidas en el código
pero **no desplegadas**, así que él no las ha visto. Ver `docs/borrar.md` para el
detalle de las features pendientes de commit.

Además, el core previo ya está hecho y verificado: AI Advisor (Gemini vía Vercel
AI SDK), gráfica de patrimonio por reconstrucción real, market data (Yahoo + FX
Frankfurter), CRUD de cartera, auth email+password con reset, i18n ES/EN, y el
servicio ML Chronos desplegado en Railway.

### Feedback del tutor — estado real

| # | Petición | Estado |
|---|---|---|
| 1 | Qué IA para generación de texto (transparencia) | HECHO. Gemini 2.5 Flash; disclaimer en el asesor + tarjeta global "Cómo funciona la IA" en /settings |
| 2 | Qué modelo de predicción y con qué datos | HECHO. Amazon Chronos T5-small, declarado como pre-entrenado zero-shot sobre histórico de Yahoo en la tarjeta de fuentes |
| 3 | Cuenta demo con activos | HECHO (sin desplegar). `demo@nextworth.app` / `demo1234`, 11 activos, botón "Probar demo". Discrepancia de credenciales con la guía de pruebas, a unificar |
| 4 | Repositorio con el código | HECHO. GitHub |
| 5 | Ver evolución pasada y futura al añadir un activo | HECHO (sin desplegar). Modal de alta ancho a 2 columnas con histórico ~24m + proyección Chronos 1y siempre activa |
| 6 | Sugerir qué activos añadir | HECHO como avisos de diversificación neutros (concentración por posición/sector/país) en /advisor. El catálogo de "populares" sigue siendo estático |
| 7 | Indicador de si un activo es aconsejable | HECHO. Señal educativa neutra por activo (momentum, volatilidad, riesgo, encaje con la cartera) en el detalle. No recomienda comprar/vender |
| 8 | Cartera: invertido, variación hoy, 30d, próxima semana | HECHO (sin desplegar). Fila de KPIs fijos en /overview: invertido + variación hoy + 30d. Proyección semanal descartada por criterio (Chronos proyecta a meses/años; 7d sería ruido); la proyección mensual/anual sigue en la gráfica |
| 9 | Panel de distribución también en cartera | HECHO (sin desplegar). StackedAllocation añadido a /overview (por tipo, sector, país) |
| 10 | Iconos por tipo de activo en add-asset | HECHO (sin desplegar) |
| 11 | Qué tests hay | HECHO. 69 tests unitarios (Vitest) de la lógica crítica + suite e2e (Playwright) del flujo demo. `pnpm test` / `pnpm test:e2e` |
| 12 | Test de carga (1000 activos) | HECHO. Seed de 1000 posiciones + medición documentada en `docs/LOAD-TEST.md`; aflora el N+1 de `getPortfolioForUser` (~78 s, 300 quotes secuenciales) |
| 13 | "Precios obtenidos de:" | HECHO. Global: tarjeta de fuentes en /settings + línea precios+FX al pie de /overview; FX (Frankfurter) declarado |
| 14 | Modificar datos de usuario (nombre, contraseña) | HECHO (sin desplegar). Ajustes permite cambiar nombre y contraseña; el cambio de contraseña exige la actual y revoca las demás sesiones |
| 15 | La predicción está muy escondida, debe estar siempre activa | HECHO parcial. Activada por defecto en el detalle y en el alta; falta subirla a cartera |
| 16 | Más IA (consejos, indicador de qué comprar) | HECHO vía 6 y 7 (señal por activo + avisos de diversificación) |

---

## Fase 0 — Consolidar lo que ya existe (en local) ✅ COMPLETADA

Sin código nuevo. Máximo retorno: adelanta o cierra los puntos 3, 10, 13, 15 y
parte de 8 y 9 sin escribir una línea. Todo el trabajo se hace y se verifica en
**local**; el despliegue a producción se pospone a una fase posterior.

- [x] Revisar y agrupar el working tree en commits limpios por feature
  (Conventional Commits). Rama `feat/mvp-consolidation`, 10 commits temáticos.
- [x] Unificar credenciales demo. Únicas: `demo-e2e@nextworth.app` /
  `NextWorth2026!`, alineadas en seed + guía + botón "Probar demo".
- [x] Levantar la app en local (`pnpm dev` + `docker compose up -d`), seedear la
  demo y verificar la cuenta de extremo a extremo.

**Criterio de hecho:** en local, entrando con la demo se ven iconos, proyección,
distribución en /assets y predicciones IA activas. El despliegue a producción
queda pendiente para más adelante.

---

## Fase 1 — Huecos visibles que pidió explícitamente

Lo que de verdad falta y es de cara al usuario.

- [x] **Add-asset con histórico + proyección (punto 5).** Al seleccionar un
  activo de mercado en el alta, el modal se ensancha a 2 columnas y muestra su
  histórico ~24m + una mini-proyección Chronos a 1 año, siempre activa. Camino de
  predicción sin BD (`predictFromHistory` + `getPreviewPrediction` +
  `/api/predictions/preview`, `getAssetHistory` con `persist:false`) para no crear
  filas al previsualizar. Gráfica compartida `AssetChart` extraída del detalle.
  Fallback a solo-histórico si el ML falla. Archivos: `src/server/prediction.ts`,
  `src/server/prediction-preview.ts`, `src/server/market-data.ts`,
  `src/components/shared/asset-chart.tsx`,
  `src/components/shared/asset-preview-chart.tsx`,
  `src/components/shared/add-asset-modal.tsx`.
- [x] **Cartera (/overview) completa (puntos 8 y 9).**
  - [x] Fila de KPIs fijos: dinero invertido, variación de hoy, últimos 30 días
    (`getPortfolioKpis` reusa la reconstrucción de 1m; hoy = delta del último día
    neteando depósitos). Componente `portfolio-kpis.tsx`.
  - [x] Panel de distribución (`StackedAllocation`) añadido a /overview.
  - [~] Granularidad semanal descartada por criterio: Chronos proyecta a
    meses/años; una previsión a 7 días de la cartera sería ruido y poco
    defendible. La proyección mensual/anual sigue disponible en la gráfica.
  - Archivos: `src/app/(dashboard)/overview/page.tsx`,
    `src/components/dashboard/portfolio-kpis.tsx`, `src/server/portfolio-history.ts`.
- [x] **Ajustes de perfil (punto 14).** Cambiar nombre y contraseña estando
  logueado. Nombre via server action (`updateDisplayName`); contraseña via
  `authClient.changePassword` en cliente (exige la actual + `revokeOtherSessions`,
  así BetterAuth rota la cookie del navegador correctamente). De paso se cerró un
  bug latente del middleware: una cookie presente pero con sesión revocada/expirada
  metía al usuario en un loop /login<->/overview; ahora `requireSession` la limpia
  via `/api/auth/session-expired`. Archivos: `src/actions/settings.ts`,
  `src/components/dashboard/settings-form.tsx`, `src/server/require-session.ts`,
  `src/app/api/auth/session-expired/route.ts`.
- [x] **Reforzar transparencia (puntos 1, 2, 13).** Tarjeta canónica
  `DataSourcesCard` en /settings ("Cómo funciona la IA y de dónde vienen los
  datos"): precios (Yahoo), FX (Frankfurter), texto del asesor (Gemini) y
  predicciones (Amazon Chronos, pre-entrenado zero-shot sobre histórico de Yahoo,
  quita el "parece random"). Línea de fuente global precios+FX al pie de /overview,
  ya no vive solo en el detalle. Los microcopys del detalle/lista/asesor se
  mantienen. Archivos: `src/components/dashboard/data-sources-card.tsx`,
  `src/app/(dashboard)/settings/page.tsx`, `src/app/(dashboard)/overview/page.tsx`.

**Criterio de hecho:** cada punto anterior comprobable en producción.

---

## Fase 2 — IA diferenciadora

Lo que sube la nota y responde al "cuanta más IA, mejor".

- [x] **Señal educativa por activo (puntos 6, 7, 16).** Panel `AssetSignalPanel`
  en el detalle: momentum (retorno de arrastre 3m/6m/12m por fecha real),
  volatilidad (desviación anualizada según el espaciado inferido de la serie) y
  clase de riesgo por tipo, más el encaje con la banda de riesgo derivada de la
  cartera. Descriptivo, nunca recomienda comprar/vender. El tipo se lee del
  activo que el usuario POSEE (no del histórico), lo que además acota el cálculo
  a activos propios. Lógica pura y testeable en `src/server/asset-signal.ts`.
  Archivos: `src/server/asset-signal.ts`,
  `src/app/api/assets/[symbol]/signal/route.ts`,
  `src/components/dashboard/asset-signal.tsx`.
- [x] **Sugerencias personalizadas de diversificación.** Ya estaban construidas:
  `getAdvisorMetrics` → `buildInsights` genera avisos deterministas y neutros
  (concentración por posición ≥40%, por sector ≥60%, por país ≥70%, falta de
  defensivos, exceso de liquidez), mostrados en /advisor (`InsightsPanel`) junto
  al perfil de riesgo de la cartera. Describe, no recomienda operar.

**Decisión tomada:** el punto 7 se implementa como señal educativa neutra, no como
rating de compra/venta.

**Criterio de hecho:** el usuario ve, al valorar un activo, una lectura contextual
no prescriptiva; y en cartera, avisos de concentración basados en datos reales.

---

## Fase 3 — Rigor de ingeniería

Responde a los puntos 11 y 12 y da material para la defensa.

- [x] **Tests unitarios** de la lógica crítica (Vitest, 69 tests): reconstrucción
  de patrimonio y P/L neteando depósitos (`portfolio-history`), caché de 3 niveles
  (`market-data`: dedup, hit de BD, fetch de Yahoo, stale, not-found), banda de
  riesgo/allocations/insights (`metrics`), métricas derivadas por tipo
  (`portfolio`: dividendos, cupón, TAE, fallback a coste) y la señal por activo
  (`asset-signal`: momentum/volatilidad/riesgo). Dependencias y red mockeadas en
  el límite; `server-only` neutralizado por alias. Archivos: `vitest.config.ts`,
  `tests/`.
- [x] **Tests e2e** (Playwright): login demo -> /overview con KPIs fijos; detalle
  de activo con la predicción Chronos activa por defecto. Reusa el dev server de
  :3005, fuerza inglés para estabilidad. Archivos: `playwright.config.ts`, `e2e/`.
- [x] **Test de carga:** seed de 1000 posiciones (`prisma/seed-load.ts`) +
  medición (`scripts/load-test.ts`), documentado en `docs/LOAD-TEST.md`. Aflora el
  N+1 de `getPortfolioForUser`: ~78 s en frío con 1000 activos, dominado por 300
  cotizaciones secuenciales a Yahoo (~261 ms cada una) y **sin caché de quote** (el
  run en caliente sigue en ~62 s). Se documenta la causa y el fix propuesto
  (pool acotado + caché de quote); no se implementa para no tocar lógica de
  negocio sin acordarlo.

**Criterio de hecho:** suite verde (`pnpm test`), e2e verde (`pnpm test:e2e`), y la
nota de carga en `docs/LOAD-TEST.md`.

---

## Orden de ejecución

**0 → 1 → 2 → 3**

La Fase 0 es urgente: sin desplegar, nada de lo nuevo lo verá el tutor. El resto
en orden de visibilidad decreciente y esfuerzo creciente.

## Fuera de scope (límites explícitos)

- Documentación / memoria del TFG: flujo aparte, al final.
- OAuth Google y verificación de email.
- Borrado de cuenta.
- Trading real, órdenes o integración con brokers: NextWorth es copiloto, no
  ejecuta operaciones.
