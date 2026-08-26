# Focus Entrena - MVP Fase 1

## Contexto

Estoy desarrollando una plataforma web para mis alumnos de entrenamiento llamada **Focus Entrena**.

Actualmente toda la información se administra desde Google Sheets.

La aplicación debe consumir datos desde Google Sheets y mostrar la rutina de un alumno de manera visual, moderna y optimizada para celular.

La experiencia debe parecer una aplicación fitness profesional y no una planilla de cálculo.

Inspiración:

- Trainerize
- TrueCoach
- Nike Training Club

Referencia de marca:

https://www.instagram.com/focus.entrena/

---

# Objetivo del MVP

Crear una web app donde cada alumno pueda ingresar a una URL privada y visualizar:

- Sus días de entrenamiento
- Los ejercicios
- Series
- Repeticiones
- Intensidad
- Pausas
- Notas
- Videos

---

# Stack Deseado

Frontend:
- Next.js 15
- TypeScript
- TailwindCSS
- shadcn/ui
- Lucide Icons

Hosting:
- Firebase

Backend:
- Google Apps Script

Fuente de datos:
- Google Sheets

---

# Fuente de Verdad

Voy a compartir el archivo Google Sheets junto con este documento.

La hoja principal que debe utilizarse como referencia para la estructura es:

Template Rutina

Todas las futuras rutinas seguirán exactamente la misma estructura que dicha hoja.

---

# Datos Generales

Dentro de cada hoja de rutina:

## Nombre Alumno

Celda:
B2

## Tipo de Plan

Celda:
B4

Valores posibles:
- Musculo
- Patrones

---

# Datos que deben mostrarse

La rutina se encuentra en:

A8:H

Columnas:

A = Patrón / Músculo
B = Ejercicio
C = Series
D = Repeticiones
E = Intensidad
F = Pausas
G = Notas
H = Referencia

---

# Referencia

La columna H contiene el link del video del ejercicio.

Debe mostrarse como:

🎥 Ver Video

Y abrir en una nueva pestaña.

---

# Organización de la Rutina

La hoja contiene bloques:

- Día 1
- Día 2
- Día 3
- Día 4
- Día 5

La aplicación debe detectarlos automáticamente y separarlos visualmente.

---

# Modelo de Datos Esperado

```ts
interface Routine {
  alumno: string
  tipoPlan: string
  dias: Day[]
}

interface Day {
  nombre: string
  ejercicios: Exercise[]
}

interface Exercise {
  patron: string
  ejercicio: string
  series: string
  repeticiones: string
  intensidad: string
  pausas: string
  notas: string
  video: string
}
```

---

# Diseño Visual

## Identidad

Inspirada en Focus Entrena.

Estilo:

- Premium
- Minimalista
- Moderna
- Atlética
- Profesional

## Colores

Primary:
#f97316

Background:
#0f172a

Cards:
#1e293b

Text:
#ffffff
#cbd5e1

---

# Pantalla Principal

Mostrar:

FOCUS ENTRENA

Hola {Nombre Alumno}
Nombre del alumno esta en B2

Plan:
{Tipo Plan}
Tipo de plan esta en B4

Luego tabs:

- Día 1
- Día 2
- Día 3
- Día 4
- Día 5

---

# Card de Ejercicio

PRESS PLANO

Pecho

Series: 4

Repeticiones: 8-6-4-4

Intensidad: 8

Pausa: 3 min

Notas: Subir carga

[ 🎥 Ver Video ]

---

# Navegación

URL:

/r/[id]

Ejemplo:

/r/abc123

La aplicación consulta Google Apps Script y devuelve únicamente la rutina del alumno.

---

# MVP Fase 1

Incluye:

✅ Ver rutina
✅ Ver días
✅ Ver ejercicios
✅ Ver series
✅ Ver repeticiones
✅ Ver intensidad
✅ Ver pausas
✅ Ver notas
✅ Ver videos
✅ Mobile First
✅ Responsive
✅ Deploy en Firebase

---

# No incluir todavía

❌ Login
❌ Registro
❌ Base de datos
❌ Seguimiento
❌ Dashboard entrenador
❌ Check de ejercicios
❌ Historial

---

# Entregable esperado

1. Estructura completa del proyecto.
2. Frontend completo.
3. Diseño visual.
4. API Apps Script.
5. Integración con Google Sheets.
6. Instrucciones de deploy en Firebase.
7. Código listo para producción.

---

# Aclaración importante para Claude

Voy a adjuntar el Google Sheet.

La hoja Template Rutina es la definición oficial del formato.

La aplicación debe interpretar y renderizar cualquier hoja futura que siga esa misma estructura.
