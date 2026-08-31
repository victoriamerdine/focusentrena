# Focus Entrena — MVP Fase 1

Web app que muestra la rutina de cada alumno leyendo directamente desde el
Google Sheet "PLAN MUSCULOS Y PATRONES", a partir de la estructura de la hoja
**Template Rutina**.

## Cómo funciona

1. Cada alumno tiene su propia pestaña en el Sheet, duplicada de **Template Rutina**,
   con su nombre en **B2**, el tipo de plan ("Musculo"/"Patrones") en **B4**, y
   un id único (slug) en **E2** que se usa para armar su link.
2. Un Google Apps Script (`apps-script/Code.gs`), publicado como Web App, expone
   `GET {WEB_APP_URL}?id=<valor de E2>` y devuelve el JSON de esa rutina.
3. El frontend (Next.js, exportado como sitio estático) sirve `/r/<id>` y
   pide los datos a ese Web App en el navegador del alumno — siempre al día,
   sin rebuild, porque lee el Sheet en el momento.
4. El sitio se hostea gratis en Firebase Hosting.

El `id` de cada alumno vive en la celda **E2** de su hoja (coincidencia exacta,
no se toca B2). `crearNuevaRutina()` lo genera solo a partir del nombre —
"Pablo Salas" → `pablo-salas` — evitando duplicados, así que el link queda
limpio (`focusentrena.web.app/r/pablo-salas`) sin depender de lo que escribas
en B2. Si preferís un id propio, podés editarlo a mano en E2 después de crear
la rutina.

`apps-script/Code.gs` también incluye `filterPatterns`, `configurarColumnaA`,
`crearNuevaRutina`, `actualizarDashboard` y `actualizarDashboardUnicavez` —
toda la automatización que ya tenías para desplegables, auto-completado de
video y el listado de alumnos — no se tocaron, sólo se agregó la parte que
responde al frontend.

---

## 1. Publicar el Apps Script

1. Abrí el Google Sheet → **Extensiones → Apps Script**.
2. Borrá el contenido de `Code.gs` que venga por defecto y pegá el contenido
   de [`apps-script/Code.gs`](apps-script/Code.gs) de este repo.
3. Guardá el proyecto (podés llamarlo "Focus Entrena API").
4. **Implementar → Nueva implementación**:
   - Tipo: **Aplicación web**
   - Execute as / Ejecutar como: **Me** (si dejás "User accessing the web app",
     Google no te va a dejar elegir acceso anónimo)
   - Who has access / Quién tiene acceso: **Anyone** (no "Anyone with Google account")
5. Autorizá los permisos que pida (acceso al Sheet).
6. Copiá la **URL de la aplicación web** (termina en `/exec`). La vas a
   necesitar en el paso 2.

Cada vez que edites `Code.gs` tenés que crear una **nueva versión** de la
implementación (Implementar → Administrar implementaciones → ✏️ → Nueva
versión) para que los cambios se publiquen.

---

## 2. Configurar el frontend

```bash
cp .env.local.example .env.local
```

Editá `.env.local` y pegá la URL del paso anterior:

```
NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycb.../exec
```

Instalar dependencias y probar en local:

```bash
npm install
npm run dev
```

Abrí `http://localhost:3000/r/<valor-de-E2-de-un-alumno>` para probar.

---

## 3. Deploy a Firebase Hosting

Instalar la CLI de Firebase (una sola vez) e iniciar sesión:

```bash
npm install -g firebase-tools
firebase login
```

Configurar el proyecto (una sola vez): editá `.firebaserc` y reemplazá
`REPLACE_WITH_FIREBASE_PROJECT_ID` por el ID de tu proyecto de Firebase, o
corré:

```bash
firebase use --add
```

Compilar y publicar:

```bash
npm run build
firebase deploy --only hosting
```

`npm run build` genera el sitio estático en `out/`. `firebase.json` ya tiene
configurado el rewrite para que cualquier `/r/<slug>` sirva la página
correcta aunque no exista un archivo físico con ese nombre.

---

## 4. Panel del entrenador (`/entrenador`)

Página protegida por contraseña para crear, editar y borrar rutinas desde el
navegador, sin tocar el Sheet a mano. Sigue usando el Sheet como única fuente
de datos — solo agrega una forma de escribirlo desde la web.

**Activarlo (una sola vez):**

1. En el editor de Apps Script, ejecutá la función `configurarPasswordEntrenador`
   (menú de funciones arriba → elegila → ▶ Ejecutar). Te va a pedir la
   contraseña que quieras usar y la guarda en las Propiedades del Script (no
   queda en el código ni en git).
2. Volvé a implementar una nueva versión del Web App (mismos pasos del punto 1
   de este README) para que `doPost` quede publicado.
3. Entrá a `focus-entrena.web.app/entrenador`, ingresá esa contraseña.

**Qué se puede hacer ahí:**
- Crear un alumno nuevo (nombre + tipo de plan) — arma la hoja sola, como
  `crearNuevaRutina()`.
- Editar nombre/tipo de plan de un alumno existente.
- Editar los ejercicios de cada día: agregar, sacar, cambiar patrón/músculo
  y ejercicio (con los mismos desplegables que arma `EjerciciosConsolidado`),
  series/repeticiones/intensidad/pausas/notas, y el color para agrupar
  ejercicios "a combinar en la misma serie".
- Borrar un alumno.

**Límite a tener en cuenta:** guardar los ejercicios de un día nunca inserta
ni borra filas del Sheet (para no arriesgar romper fórmulas de las columnas
de la derecha) — reescribe dentro de las filas que ya existen entre ese día y
el siguiente. Si un día del medio (no el último de la hoja) se queda sin
lugar, la página avisa con un error pidiendo agregar filas a mano en esa
sección del Sheet antes de reintentar. El último día de la hoja no tiene ese
límite.

La contraseña es simple (no es un login "de verdad" con Google) — alcanza
para que solo vos entres, pero no la compartas ni la dejes en un lugar
público.

---

## Estructura del proyecto

```
src/
  app/
    page.tsx              → landing mínima
    r/[id]/page.tsx        → shell estático de la rutina (dynamicParams=false)
    entrenador/page.tsx     → panel del entrenador (protegido por contraseña)
    layout.tsx, globals.css
  components/
    routine-view.tsx       → fetch + estados (loading/error/ready), vista alumno
    exercise-card.tsx       → card de cada ejercicio (vista alumno)
    ui/tabs.tsx              → tabs de días (Radix)
    admin/                    → panel del entrenador (login, dashboard, editor)
  lib/
    types.ts                  → Routine / Day / Exercise
    admin-types.ts              → AlumnoResumen / Catalogo
    admin-api.ts                  → cliente del doPost (crear/editar/borrar/guardar)
    admin-auth.ts                  → contraseña del entrenador en localStorage
    config.ts                       → NEXT_PUBLIC_APPS_SCRIPT_URL
apps-script/
  Code.gs                            → API pública (doGet) + de administración (doPost)
```

## Notas y límites del MVP

- No hay login: cualquiera con el link `/r/<id>` puede ver esa rutina
  (no hay datos sensibles más allá de la rutina de gimnasio).
- El botón "🎥 Ver Video" solo aparece si la columna **Referencia** (H) tiene
  un link cargado (texto plano, hipervínculo o `=HYPERLINK(...)`).
- Si agregás una pestaña nueva duplicando **Template Rutina**, queda
  disponible automáticamente — no hace falta tocar código ni volver a
  desplegar el Apps Script.
- El sitio es 100% estático (sin servidor propio): los datos siempre se leen
  en vivo desde el Sheet vía Apps Script, pero el HTML/CSS/JS del sitio en sí
  solo cambia si volvés a correr `npm run build && firebase deploy`.
