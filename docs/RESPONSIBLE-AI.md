# Uso responsable de la IA — NextWorth

Este documento describe cómo NextWorth usa la inteligencia artificial, qué datos
se procesan, qué límites se imponen y cómo se comunica todo al usuario. Responde
al punto del feedback del tutor sobre uso responsable de la IA y sirve como
referencia para la defensa del TFG.

## 1. Principios

1. **Copiloto educativo, no asesor financiero.** NextWorth ayuda a entender una
   cartera; no recomienda comprar ni vender, no da precios objetivo ni promete
   rentabilidades. Toda salida de IA lleva un recordatorio de que no es
   asesoramiento y de que conviene consultar a un profesional regulado.
2. **Transparencia.** El usuario siempre sabe cuándo un texto o una cifra vienen
   de un modelo, de qué modelo, y de dónde salen los datos de origen.
3. **Determinismo donde importa.** Las decisiones con impacto (qué activos se
   sugieren, las métricas de riesgo, las señales por activo) son cálculo
   determinista y auditable. Los modelos generativos solo redactan explicaciones
   o resúmenes; no eligen por el usuario.
4. **Minimización de datos.** Al exterior solo sale lo imprescindible y de forma
   agregada. Nunca salen credenciales, identidad ni cantidades individuales.
5. **Degradación segura.** Si un modelo no está disponible, la app no inventa:
   cae a una alternativa determinista, muestra datos cacheados con aviso, o
   oculta la función. Nunca presenta una salida fabricada como real.

## 2. Sistemas de IA en la app

Hay **dos** sistemas de IA/ML. Todo lo demás etiquetado como inteligente en la
interfaz (señal por activo, insights del asesor, selección de diversificación) es
matemática determinista, sin modelo.

| Punto de uso | Proveedor | ¿Salen datos de cartera del servidor? | Disclaimer | Alternativa determinista |
|---|---|---|---|---|
| Chat del asesor | Google Gemini | Sí, métricas agregadas a Google | Sí (prompt + UI) | No (se desactiva sin API key) |
| Explicación de diversificación | Google Gemini | Sí, %/bandas agregadas a Google | Sí (UI) | Sí (texto fijo) |
| Resumen de noticias | Google Gemini | No (nombre del activo + titulares públicos) | Sí (UI) | Sí (solo titulares) |
| Predicción de precios | Amazon Chronos (autoalojado) | No (símbolo + histórico público, en la propia infra) | Sí (UI) | Sí (caché; si no, se oculta) |
| Señal por activo | Ninguno (determinista) | N/A | Sí (UI) | N/A |

### 2.1. Google Gemini (`gemini-2.5-flash`)

Se usa vía Vercel AI SDK (`@ai-sdk/google`), siempre en servidor. Tres usos, los
tres condicionados a la variable `GOOGLE_GENERATIVE_AI_API_KEY`; sin ella, cada
función degrada como indica la tabla.

- **Chat del asesor** (`src/app/api/advisor/chat/route.ts`, prompt en
  `src/server/advisor/prompt.ts`). Conversación educativa sobre la cartera. El
  system prompt prohíbe explícitamente recomendaciones de compra/venta, precios
  objetivo, market timing y consejo personalizado, y obliga al recordatorio
  educativo. Gemini solo recibe los mensajes del chat y, cuando invoca la
  herramienta `getPortfolioMetrics`, las métricas **agregadas** de la cartera
  (valor total, invertido, P/L, mayor posición, reparto por tipo/sector/país y
  perfil de riesgo). No recibe cantidades ni precios de compra individuales. El
  `userId` sale siempre de la sesión de servidor, nunca del cuerpo de la
  petición.
- **Explicación de diversificación** (`src/server/asset-suggestions.ts`). La
  elección de activos es **determinista** (`selectSuggestionCandidates` en
  `src/lib/diversification.ts`); Gemini solo redacta el "por qué". Recibe
  porcentajes de reparto por tipo, banda de riesgo y etiquetas de clases
  infrarrepresentadas. Sin API key usa `fallbackExplanation` (texto educativo
  fijo); el campo `source` distingue `ai` de `fallback`.
- **Resumen de noticias** (`src/server/asset-news.ts`). Resumen neutral de 2-3
  frases de titulares de Yahoo Finance para un activo que el usuario posee.
  Recibe el nombre/símbolo del activo y los titulares públicos; ningún dato de
  cartera. Sin API key o sin noticias, se muestran solo los titulares.

### 2.2. Amazon Chronos (`amazon/chronos-t5-small`)

Modelo de series temporales **autoalojado** (Flask + Gunicorn en Docker,
`ml-service/`). Los pesos se descargan de Hugging Face en tiempo de build y
quedan dentro de la imagen: en ejecución **no se llama a ninguna API externa de
inferencia**. Es un T5 encoder-decoder de 46M de parámetros, licencia Apache 2.0,
preentrenado y usado en modo zero-shot sobre el histórico de precios.

- **Qué predice:** precios de cierre mensuales futuros para un horizonte
  (3m/6m/1a/2a/5a) a partir del histórico de cierres.
- **Qué recibe el servicio:** solo un símbolo y su serie histórica pública de
  precios (de Yahoo). **Ni identidad, ni posiciones, ni cantidades.** Al ser
  autoalojado en la misma infraestructura, los datos no salen a terceros.
- **Naturaleza probabilística:** Chronos genera varias trayectorias posibles y la
  app muestra la mediana. Es una estimación con incertidumbre, declarada como tal
  en la interfaz ("no es garantía de rentabilidad").

### 2.3. Componentes deterministas (no IA)

La señal por activo (`src/server/asset-signal.ts`: momentum, volatilidad, clase
de riesgo, encaje con la cartera), los insights del asesor
(`src/server/advisor/metrics.ts`) y la selección de diversificación
(`src/lib/diversification.ts`) son cálculo puro sobre datos históricos. No usan
modelos ni llamadas externas, y describen sin recomendar operar.

## 3. Datos y privacidad

- **Qué sale del servidor y a quién:** solo al chat del asesor y a la explicación
  de diversificación se envían métricas **agregadas** de cartera, a Google
  (Gemini). El resumen de noticias envía a Google el nombre del activo y
  titulares públicos. Chronos, al ser autoalojado, no envía nada a terceros.
- **Qué nunca sale:** credenciales, identidad del usuario, cantidades por
  posición o precios de compra individuales.
- **Claves y superficie:** todas las llamadas a IA son `server-only`; ninguna
  clave de proveedor se expone al cliente.
- **Control de acceso:** los endpoints exigen sesión y el `userId` procede
  siempre de la sesión. Noticias y señal por activo están además restringidas a
  activos que el usuario posee (gate de propiedad), lo que evita fugas entre
  usuarios y que se usen como proxy abierto.

## 4. Transparencia

- **Tarjeta "Cómo funciona la IA"** en `/settings`
  (`src/components/dashboard/data-sources-card.tsx`): declara las cuatro fuentes
  (precios de Yahoo, divisas de Frankfurter, texto del asesor con Gemini 2.5
  Flash, predicciones con Amazon Chronos, con enlace a la ficha del modelo en
  Hugging Face) y un disclaimer global.
- **Etiquetado en cada salida:** el texto generado por Gemini se marca con
  "generado con IA · Gemini"; las predicciones citan "Amazon Chronos". Cada
  superficie de IA lleva su línea de "no es asesoramiento financiero" o "no es
  garantía de rentabilidad".

## 5. Limitaciones conocidas

- **Las predicciones no son garantías.** Chronos es un modelo estadístico
  zero-shot sobre precios pasados; no conoce el contexto de mercado ni eventos
  futuros. Se presenta como orientación educativa.
- **El texto generativo puede equivocarse.** Gemini puede producir imprecisiones;
  por eso las decisiones (qué sugerir, métricas de riesgo) no dependen de él y se
  muestra el disclaimer correspondiente.
- **Alcance de mercado.** La calidad depende de la cobertura de Yahoo Finance;
  activos sin histórico fiable no obtienen señal ni predicción.

## 6. Fiabilidad y degradación

- **Gemini no disponible:** el chat se desactiva (503 informativo); sugerencias y
  noticias caen a su versión determinista (texto fijo / solo titulares).
- **Chronos no disponible:** se sirve caché con TTL; si no hay, caché obsoleta con
  aviso explícito de servicio no disponible; si tampoco, la predicción no se
  muestra. No hay sustituto numérico inventado.
- **Deduplicación y caché** en memoria y BD evitan repetir llamadas y reducen la
  exposición de datos y el coste.

## 7. Trabajo futuro

- **Bandas de confianza (p10/p90).** Chronos ya genera varias trayectorias; hoy
  se muestra solo la mediana. Mostrar el rango entre los percentiles 10 y 90
  comunicaría mejor la incertidumbre. Las columnas `confidenceLow`/`confidenceHigh`
  ya existen en el esquema, pendientes de rellenar.
