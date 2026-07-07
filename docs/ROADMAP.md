# Roadmap de entrega — NextWorth (TFG)

Documento de planificación para llevar NextWorth a estado de entrega del TFG.

- **Meta:** MVP prod-ready, defendible ante tribunal.
- **Estado de partida:** el core está funcional y usa datos reales — AI Advisor (Gemini vía Vercel AI SDK), gráfica de patrimonio (reconstrucción real desde Yahoo Finance), market data (Yahoo/FX Frankfurter), CRUD de cartera y auth email+password.
- **Frentes de trabajo:** limpieza → reset password → despliegue ML → i18n → documentación.
- **Estado (2026-07-06):** Fases 0, 1, 2 y 3 completadas y verificadas end-to-end en local (puerto 3005). Pendientes que requieren cuentas/infra externa del autor: despliegue del servicio ML a un host de contenedores y `RESEND_API_KEY` con dominio verificado para envío real de emails. Fase 4 (documentación) pendiente.

## Estado actual (resumen del análisis)

| Pieza | Estado | Notas |
|---|---|---|
| AI Advisor (chat Gemini) | Funciona end-to-end | Requiere `GOOGLE_GENERATIVE_AI_API_KEY` en Vercel |
| Métricas / insights advisor | Funciona, real y determinista | Calcula allocation, riesgo e insights desde datos reales |
| Gráfica de patrimonio | Funciona end-to-end | Reconstrucción real con forward-fill, TAE compuesto y FX |
| Market data (Yahoo / FX) | Funciona, sin mocks | Caché de 3 niveles robusta |
| CRUD de cartera | Funciona | Server actions con `requireSession()` |
| Auth email+password | Funciona, **con reset** | Reset password end-to-end (Resend + fallback consola en dev). Sin verificación, sin OAuth |
| Predicciones ML (código Next) | Completo | Cliente + caché 3 niveles bien cableados |
| Servicio ML Chronos (Python) | **Construye y corre en Docker** | Imagen reproducible; `/api/predict` devuelve predicciones reales. Falta desplegar a host externo |
| i18n | **Completo (ES/EN)** | next-intl por cookie, catálogos completos, selector + persistencia, advisor multilingüe |
| Tests / CI | 0% | Fuera de scope |

---

## Fase 0 — Limpieza y coherencia — HECHA

Barato y de alto retorno: hace que el repo se perciba como ingeniería y no como prototipo.

- [x] **Eliminar código muerto:** borrados `src/components/dashboard/allocation-chart.tsx` y `src/components/dashboard/portfolio-summary.tsx` (no se importaban en ningún sitio).
- [x] **Arreglar middleware:** `/advisor` añadido a `protectedRoutes` y al `matcher` de `src/middleware.ts`.
- [x] **Botón "Sign in with Google" (Coming soon):** no existía en el código actual (ni el enlace forgot deshabilitado que mencionaba el roadmap). Nada que quitar.

**Criterio de hecho:** cumplido. Sin ficheros huérfanos, middleware coherente, sin botones deshabilitados visibles.

---

## Fase 1 — Auth: recuperación de contraseña — HECHA

Completa el flujo de auth.

- [x] **Proveedor de email:** Resend integrado (`pnpm add resend`, `src/server/email.ts`). Con fallback dev: sin `RESEND_API_KEY` imprime la URL de reset en la consola del servidor. Validación en `src/lib/env.ts` (`RESEND_API_KEY`, `EMAIL_FROM` como `optionalStr`).
- [x] **BetterAuth:** `sendResetPassword` + `resetPasswordTokenExpiresIn: 3600` en `emailAndPassword` (`src/server/auth.ts`).
- [x] **UI:** `src/app/(auth)/forgot-password/page.tsx` (solicitud, con respuesta neutra anti-enumeración) + `reset-password/page.tsx` (con token vía `useSearchParams` + `Suspense`). Enlace "¿Has olvidado la contraseña?" añadido en login. Método cliente correcto: `authClient.requestPasswordReset` (no `forgetPassword` en BetterAuth 1.5.6).
- [x] Reutiliza la tabla `Verification` del schema (sin migración nueva).

**Criterio de hecho:** cumplido y verificado en 3005. Flujo completo probado: solicitud → URL en consola → verificación de token → nueva contraseña → login con la nueva.

**Riesgo / decisión:** para envío real de emails en producción falta cuenta Resend + dominio verificado (`RESEND_API_KEY`, `EMAIL_FROM`). En local funciona por el fallback de consola.

---

## Fase 2 — Desplegar el servicio ML (Chronos) — HECHA (build+run local; despliegue externo pendiente)

La pieza más técnica y la que más luce en demo.

- [x] **Robustecer el build Docker:** `requirements.txt` fija `chronos-forecasting==1.5.3` (sin el extra `[training]` que arrastraba el `chronos2` roto), `pandas==2.2.3`, `typing_extensions==4.12.2`. Dockerfile con `torch==2.4.1` CPU, `HF_HOME` y modelo horneado en build (`RUN python -c "from chronos import ChronosPipeline; ..."`) **antes** de `COPY` para no reinvalidar la capa. Corregido `ml-service/models/chronos_model.py`: la API 1.5.x recibe `context` posicional (antes `inputs=`). Parches Windows (`patch_chronos.py`, `fix_pipeline.py`, `patch_typealias.py`, `run.bat`, `temp_chronos/`) eliminados. `.dockerignore` añadido. Verificado: imagen construye y arranca en contenedor limpio.
- [ ] **Desplegar** `ml-service/` en un host de contenedores (Railway / Render / Fly / Cloud Run). **Pendiente: requiere cuenta del autor.** Vercel no puede alojar Python persistente.
- [ ] **Conectar:** setear `ML_SERVICE_URL` en Vercel a la URL pública del servicio (pendiente del despliegue). En local apunta a `http://localhost:5001`.
- [x] **Cold start:** modelo horneado en la imagen (no descarga en la primera petición). `checkHealth()` (`src/server/chronos.ts`) exportado y documentado para degradación proactiva del UI. Timeout de predicción de 30s intacto.
- [ ] **Opcional (suma en defensa):** rellenar `confidenceLow` / `confidenceHigh` para dibujar banda de confianza. No implementado (opcional).

**Criterio de hecho:** cumplido en local. `GET /api/predictions/[symbol]` devuelve predicciones reales (verificado en 3005: 200 OK + serie futura en la gráfica), con degradación a caché stale si el servicio cae. Falta el despliegue externo para que aplique también en producción Vercel.

---

## Fase 3 — i18n completo — HECHA

La tarea de mayor volumen.

- [x] **Librería:** next-intl v4 con estrategia **por cookie (`NEXT_LOCALE`), sin segmento `[locale]`** en la ruta. Detección `NEXT_LOCALE` → `Accept-Language` → `en` en `src/i18n/request.ts`. `next.config.ts` envuelto con `createNextIntlPlugin`.
- [x] **Extraer todos los strings** a catálogos `messages/en.json` y `messages/es.json` (paridad de claves): landing, auth (incl. forgot/reset), dashboard, modal de alta de activos, settings, advisor, errores/404, metadata. Corregido el literal suelto `"ETF (sin desglose)"`.
- [x] **Selector de idioma** en Settings + detección por navegador. Preferencia persistida en `User.locale` (migración `add_user_locale`, `additionalFields` en auth, acción `updateLocale` que también fija la cookie). Formatters (`formatCurrency`, fechas) locale-aware vía `localeToIntl`.
- [x] **Advisor multilingüe:** `ADVISOR_SYSTEM_PROMPT` → `buildAdvisorSystemPrompt(locale)` con instrucción explícita de idioma; la ruta de chat pasa `session.user.locale`. `getAdvisorMetrics(userId, locale)` localiza labels e insights en servidor.

**Criterio de hecho:** cumplido y verificado en 3005. El cambio a Español propaga toda la UI (sidebar, settings, overview, formato `es-ES`), persiste, y el advisor responde en español usando datos reales.

**Nota:** raw data de proveedores (sector "Technology", país "United States", símbolos) se deja sin traducir por ser datos, no etiquetas de UI.

---

## Fase 4 — Documentación

Se ejecutará aparte mediante un flujo `/goal` con directrices proporcionadas por Carlos.

- [ ] README serio (quitar el estado "beta").
- [ ] Diagrama de arquitectura.
- [ ] Decisiones técnicas justificadas: por qué Chronos, la reconstrucción de patrimonio, la caché de 3 niveles, el modelo de datos (User cuid vs tablas de dominio Int).

**Criterio de hecho:** el repo respalda directamente la memoria del TFG.

---

## Fuera de scope (límites explícitos)

- Tests y CI (decisión explícita).
- OAuth Google y verificación de email.
- Edición de perfil / borrado de cuenta / preferencias más allá de divisa + idioma.
- Optimización de rendimiento de `getPortfolioForUser` (quote + FX secuencial por posición): margen de mejora conocido, no bloqueante. Anotado por si surge en la defensa.

---

## Orden de ejecución

**0 → 1 → 2 → 3 → 4**

- **Fase 0** — HECHA.
- **Fase 1** — HECHA (falta solo cuenta Resend para emails reales en prod).
- **Fase 2** — HECHA en local (falta desplegar el contenedor a host externo).
- **Fase 3** — HECHA.
- **Fase 4 (docs)** — pendiente, al final.

### Cómo correr en local (verificado en puerto 3005)

- `docker compose up -d db ml-service` (en esta máquina el 5436 lo ocupa otro proyecto: hay `docker-compose.override.yml` que mapea la DB a 5441).
- `ML_SERVICE_URL=http://localhost:5001`, `BETTER_AUTH_URL`/`NEXT_PUBLIC_APP_URL=http://localhost:3005`.
- `pnpm build && pnpm exec next start -p 3005`.
- Reset password sin `RESEND_API_KEY`: la URL de reset se imprime en la consola del servidor.
