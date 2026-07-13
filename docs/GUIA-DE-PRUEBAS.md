# NextWorth — Guía de pruebas

Documento para evaluar la aplicación en producción. No requiere instalar nada:
todo funciona desde el navegador.

**Aplicación en producción:** https://next-worth-livid.vercel.app

---

## 1. Qué es NextWorth

NextWorth es un copiloto de cartera de inversión para inversores particulares.
Permite registrar los activos que uno posee (acciones, ETFs, cripto, bonos,
depósitos), ver su patrimonio consolidado con precios reales de mercado, obtener
una previsión de precio generada por un modelo de IA (Amazon Chronos) y
conversar con un asesor de IA que razona sobre la composición real de la cartera.

**Arquitectura desplegada:**

- **Web** (Next.js 16) en Vercel.
- **Base de datos** PostgreSQL gestionada.
- **Servicio de ML** (Flask + Amazon Chronos) en Railway, contenedor propio.
- **Precios de mercado** en tiempo real vía Yahoo Finance.
- **Asesor conversacional** con Google Gemini.

---

## 2. Acceso

Hay dos formas de entrar. Recomendada la **cuenta demo**, que ya tiene un activo
cargado para ver la app con datos desde el primer momento.

### Opción A — Cuenta demo (recomendada)

1. Abrir https://next-worth-livid.vercel.app
2. Ir a **Iniciar sesión**.
3. Credenciales:
   - **Email:** `demo-e2e@nextworth.app`
   - **Contraseña:** `NextWorth2026!`

### Opción B — Crear una cuenta nueva

1. Abrir https://next-worth-livid.vercel.app
2. **Registrarse** con un email y contraseña propios.
3. Se entra a una cartera vacía. Añadir un activo (ver sección 3.4) para ver
   la app con datos.

> Usar siempre la URL `next-worth-livid.vercel.app`. Otras URLs de Vercel del
> mismo proyecto pueden dar error de conexión con el servicio de precios.

---

## 3. Recorrido de prueba

La navegación está en la barra lateral izquierda (en móvil, botón de menú arriba).
Cinco secciones: **Cartera**, **Activos**, **Asesor**, **Añadir activo** y **Ajustes**.

### 3.1. Cartera (vista general)

Pantalla de inicio tras el login. Qué comprobar:

- **Patrimonio total** consolidado en la divisa configurada.
- **Gráfica de evolución** del patrimonio.
- **Reparto** de la cartera (por tipo de activo, sector, país).
- **Mayores movimientos** del día.

### 3.2. Activos

Lista de todos los activos de la cartera.

- Ver cada posición con su valor actual y variación.
- **Pulsar sobre un activo** (ej. AAPL en la cuenta demo) para abrir su ficha.

En la ficha de activo comprobar:

- **Precio actual** obtenido en vivo de Yahoo Finance.
- **Gráfica de histórico** de precio.
- **Previsión de IA:** proyección de precio a futuro generada por el modelo
  Amazon Chronos.

> Nota: la primera predicción del día puede tardar unos segundos si el servicio
> de ML estaba inactivo (arranque en frío). Las siguientes son casi instantáneas.

### 3.3. Asesor

Asesor de IA que conoce la composición real de la cartera del usuario.

- Panel superior con **indicadores clave** (KPIs) y **reparto** de la cartera.
- Panel de **insights** generados sobre la cartera.
- **Chat:** escribir una pregunta y enviar. Ejemplos:
  - "¿Está bien diversificada mi cartera?"
  - "¿Qué peso tiene la tecnología en mi cartera?"
  - "¿Qué riesgos ves en mi asignación actual?"

El asesor responde en streaming y usa los datos reales de la cartera (no
inventa cifras: consulta las métricas del usuario autenticado).

### 3.4. Añadir activo

Alta de un nuevo activo en la cartera.

1. **Buscar** por nombre o ticker (ej. "Microsoft", "MSFT", "Bitcoin").
   El buscador consulta el catálogo de Yahoo Finance.
2. Seleccionar el resultado.
3. Indicar la **cantidad** poseída.
4. Guardar. El activo aparece en **Activos** y se refleja en **Cartera**.

También admite productos de renta fija (depósitos y bonos) introduciendo su TAE.

### 3.5. Ajustes

- Cambiar la **divisa** de referencia de la cartera.
- Cambiar el **idioma** (español / inglés). Toda la interfaz se traduce.
- Ajustar el **perfil de riesgo**, que el asesor de IA tiene en cuenta.

---

## 4. Qué se está evaluando (resumen técnico)

Un recorrido completo ejercita, de punta a punta:

| Prueba | Comprueba |
|---|---|
| Registro / login | Autenticación, sesión y persistencia en base de datos |
| Cartera y Activos | Consolidación de patrimonio y precios reales de mercado |
| Ficha de activo | Integración con Yahoo Finance e histórico |
| Previsión de IA | Servicio de ML propio (Amazon Chronos) en Railway |
| Asesor | Integración con LLM (Gemini) y acceso a datos reales del usuario |
| Añadir activo | Escritura en base de datos y búsqueda en catálogo externo |
| Ajustes | Internacionalización, divisa y perfil persistidos |

---

## 5. Notas

- La app es responsive: funciona en escritorio y móvil.
- Los precios dependen de la disponibilidad de Yahoo Finance; fuera del horario
  de mercado se muestra el último cierre.
- Si una predicción tarda, reintentar: es el arranque en frío del contenedor de ML.
