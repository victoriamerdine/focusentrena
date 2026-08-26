# Focus Entrena — MVP Fase 1

Web app que muestra la rutina de cada alumno leyendo directamente desde el
Google Sheet "PLAN MUSCULOS Y PATRONES", a partir de la estructura de la hoja
**Template Rutina**.

## Cómo funciona

1. Cada alumno tiene su propia pestaña en el Sheet, duplicada de **Template Rutina**.
2. Un Google Apps Script (`apps-script/Code.gs`), publicado como Web App, expone
   `GET {WEB_APP_URL}?id=<slug-de-la-pestaña>` y devuelve el JSON de esa rutina.
3. El frontend (Next.js, exportado como sitio estático) sirve `/r/<slug>` y
   pide los datos a ese Web App en el navegador del alumno — siempre al día,
   sin rebuild, porque lee el Sheet en el momento.
4. El sitio se hostea gratis en Firebase Hosting.

El `id`/slug de cada alumno es el nombre de su pestaña "normalizado":
minúsculas, sin acentos, espacios → guiones. Por ejemplo la pestaña
`Juan Pérez` queda en `focusentrena.web.app/r/juan-perez`.

> El nombre del alumno se toma de la celda **B2** de su hoja. Si la dejás
> vacía, se usa el nombre de la pestaña como respaldo.

---

## 1. Publicar el Apps Script

1. Abrí el Google Sheet → **Extensiones → Apps Script**.
2. Borrá el contenido de `Code.gs` que venga por defecto y pegá el contenido
   de [`apps-script/Code.gs`](apps-script/Code.gs) de este repo.
3. Guardá el proyecto (podés llamarlo "Focus Entrena API").
4. **Implementar → Nueva implementación**:
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo (tu cuenta)**
   - Quién tiene acceso: **Cualquier usuario**
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

Abrí `http://localhost:3000/r/<slug-de-un-alumno>` para probar (usá el nombre
de una pestaña real, normalizado — ver regla arriba).

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

## Estructura del proyecto

```
src/
  app/
    page.tsx            → landing mínima
    r/[id]/page.tsx      → shell estático de la rutina (dynamicParams=false)
    layout.tsx, globals.css
  components/
    routine-view.tsx     → fetch + estados (loading/error/ready)
    exercise-card.tsx     → card de cada ejercicio
    ui/tabs.tsx           → tabs de días (Radix)
  lib/
    types.ts              → Routine / Day / Exercise
    config.ts              → NEXT_PUBLIC_APPS_SCRIPT_URL
apps-script/
  Code.gs                  → API que lee el Sheet y arma el JSON
```

## Notas y límites del MVP

- No hay login: cualquiera con el link `/r/<slug>` puede ver esa rutina
  (no hay datos sensibles más allá de la rutina de gimnasio).
- El botón "🎥 Ver Video" solo aparece si la columna **Referencia** (H) tiene
  un link cargado (texto plano, hipervínculo o `=HYPERLINK(...)`).
- Si agregás una pestaña nueva duplicando **Template Rutina**, queda
  disponible automáticamente — no hace falta tocar código ni volver a
  desplegar el Apps Script.
- El sitio es 100% estático (sin servidor propio): los datos siempre se leen
  en vivo desde el Sheet vía Apps Script, pero el HTML/CSS/JS del sitio en sí
  solo cambia si volvés a correr `npm run build && firebase deploy`.
