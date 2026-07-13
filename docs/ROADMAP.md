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
| 1 | Qué IA para generación de texto (transparencia) | HECHO. Gemini 2.5 Flash; disclaimer visible "Google Gemini" en el asesor |
| 2 | Qué modelo de predicción y con qué datos | HECHO, mejorable. Amazon Chronos T5-small; falta aclarar que es pre-entrenado zero-shot sobre histórico de Yahoo (quita el "parece random") |
| 3 | Cuenta demo con activos | HECHO (sin desplegar). `demo@nextworth.app` / `demo1234`, 11 activos, botón "Probar demo". Discrepancia de credenciales con la guía de pruebas, a unificar |
| 4 | Repositorio con el código | HECHO. GitHub |
| 5 | Ver evolución pasada y futura al añadir un activo | HECHO (sin desplegar). Modal de alta ancho a 2 columnas con histórico ~24m + proyección Chronos 1y siempre activa |
| 6 | Sugerir qué activos añadir | PARCIAL. Catálogo estático de "populares", no personalizado |
| 7 | Indicador de si un activo es aconsejable | FALTA. Se hará como señal educativa neutra (ver Fase 2) |
| 8 | Cartera: invertido, variación hoy, 30d, próxima semana | HECHO (sin desplegar). Fila de KPIs fijos en /overview: invertido + variación hoy + 30d. Proyección semanal descartada por criterio (Chronos proyecta a meses/años; 7d sería ruido); la proyección mensual/anual sigue en la gráfica |
| 9 | Panel de distribución también en cartera | HECHO (sin desplegar). StackedAllocation añadido a /overview (por tipo, sector, país) |
| 10 | Iconos por tipo de activo en add-asset | HECHO (sin desplegar) |
| 11 | Qué tests hay | FALTA. Cero tests |
| 12 | Test de carga (1000 activos) | FALTA |
| 13 | "Precios obtenidos de:" | HECHO parcial. Visible en detalle de activo; falta hacerlo global; FX no declarado |
| 14 | Modificar datos de usuario (nombre, contraseña) | FALTA. Ajustes solo tiene divisa e idioma |
| 15 | La predicción está muy escondida, debe estar siempre activa | HECHO parcial. Activada por defecto en el detalle y en el alta; falta subirla a cartera |
| 16 | Más IA (consejos, indicador de qué comprar) | Solapa con 6 y 7 |

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
- [ ] **Ajustes de perfil (punto 14).** Cambiar nombre y contraseña estando
  logueado. BetterAuth soporta `changePassword`. Archivos:
  `src/actions/settings.ts`, `src/components/dashboard/settings-form.tsx`,
  `src/server/auth.ts`.
- [ ] **Reforzar transparencia (puntos 1, 2, 13).** Tarjeta "Cómo funciona la IA"
  (Chronos pre-entrenado zero-shot, datos de Yahoo) y "Fuente de precios" visible
  de forma global, no solo en el detalle. Declarar también FX (Frankfurter).

**Criterio de hecho:** cada punto anterior comprobable en producción.

---

## Fase 2 — IA diferenciadora

Lo que sube la nota y responde al "cuanta más IA, mejor".

- [ ] **Señal educativa por activo (puntos 6, 7, 16).** Indicador neutro de
  momentum, volatilidad y encaje con el perfil de riesgo del usuario. NO
  recomendación explícita de comprar/vender: respeta el enfoque de copiloto
  educativo y evita responsabilidad de asesoramiento financiero.
- [ ] **Sugerencias personalizadas de diversificación.** A partir de la
  distribución real de la cartera ("estás 80% en tecnología, considera
  diversificar"). Reutiliza `getAdvisorMetrics`.

**Decisión tomada:** el punto 7 se implementa como señal educativa neutra, no como
rating de compra/venta.

**Criterio de hecho:** el usuario ve, al valorar un activo, una lectura contextual
no prescriptiva; y en cartera, avisos de concentración basados en datos reales.

---

## Fase 3 — Rigor de ingeniería

Responde a los puntos 11 y 12 y da material para la defensa.

- [ ] **Tests unitarios** de la lógica crítica: reconstrucción de patrimonio,
  proyección por tipo de activo, cálculo de P/L, caché de 3 niveles.
- [ ] **Tests e2e** (Playwright): login demo, alta de activo, ver predicción.
- [ ] **Test de carga:** seed de 1000 activos, medir y documentar. Probablemente
  aflore el N+1 conocido de `getPortfolioForUser` (quote + FX secuencial por
  posición): documentarlo y, si compensa, optimizarlo. Buena historia técnica.

**Criterio de hecho:** suite verde, un `pnpm test`, y una nota con los resultados
del test de carga.

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
