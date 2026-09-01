import { APPS_SCRIPT_URL } from "@/lib/config";

// Acción pública (sin contraseña) que el alumno dispara desde su propia
// vista para guardar su nota personal y la carga usada en un ejercicio.
// "indice" es la posición 0-based del ejercicio dentro de ese día — la
// misma que manda el backend en cada ejercicio (Exercise.indice), no el
// número de fila real de la hoja.
export async function guardarNotaAlumno(
  id: string,
  diaNombre: string,
  indice: number,
  notaAlumno: string,
  carga: string
): Promise<void> {
  if (!APPS_SCRIPT_URL) {
    throw new Error("Falta configurar la URL del backend.");
  }

  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    // text/plain evita el preflight CORS que Apps Script no puede responder.
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      accion: "guardar_nota_alumno",
      id,
      diaNombre,
      indice,
      notaAlumno,
      carga,
    }),
  });

  let data: { ok?: boolean; error?: string; detalle?: string };
  try {
    data = await res.json();
  } catch {
    throw new Error("Respuesta inválida del servidor.");
  }

  if (data.error) {
    throw new Error(data.detalle || "No se pudo guardar.");
  }
}
