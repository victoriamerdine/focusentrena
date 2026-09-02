import { APPS_SCRIPT_URL } from "@/lib/config";
import type { AlumnoResumen, Catalogo } from "@/lib/admin-types";
import type { Exercise, Routine } from "@/lib/types";

export class AdminApiError extends Error {
  code: string;
  constructor(code: string, detalle?: string) {
    super(mensajeError(code, detalle));
    this.code = code;
  }
}

function mensajeError(code: string, detalle?: string): string {
  switch (code) {
    case "unauthorized":
      return "Contraseña incorrecta.";
    case "bad_request":
      return "Solicitud inválida.";
    case "accion_desconocida":
      return "Acción no reconocida.";
    case "server_error":
      return detalle || "Ocurrió un error en el servidor.";
    default:
      return detalle || "Ocurrió un error.";
  }
}

interface AdminResponse {
  ok?: boolean;
  error?: string;
  detalle?: string;
  [key: string]: unknown;
}

async function postAdmin<T extends AdminResponse>(
  password: string,
  accion: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  if (!APPS_SCRIPT_URL) {
    throw new AdminApiError("bad_request", "Falta configurar la URL del backend.");
  }

  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    // text/plain evita el preflight CORS que Apps Script no puede responder.
    // El body sigue siendo JSON — Apps Script lo parsea igual del lado del
    // servidor, sin importar el Content-Type declarado.
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ password, accion, ...payload }),
  });

  let data: T;
  try {
    data = (await res.json()) as T;
  } catch {
    throw new AdminApiError("server_error", "Respuesta inválida del servidor.");
  }

  if (data.error) {
    throw new AdminApiError(data.error, data.detalle);
  }

  return data;
}

export function listarAlumnos(password: string) {
  return postAdmin<{ ok: true; alumnos: AlumnoResumen[] }>(password, "listar_alumnos");
}

export function obtenerCatalogo(password: string) {
  return postAdmin<{ ok: true; catalogo: Catalogo }>(password, "obtener_catalogo");
}

// Junta listar_alumnos + obtener_catalogo en un solo pedido: se usan
// siempre juntos al entrar al panel, y cada request a Apps Script tiene un
// costo fijo de arranque bastante alto, así que un solo viaje de ida y
// vuelta en vez de dos en paralelo achica bastante la carga inicial.
export function cargarPanel(password: string) {
  return postAdmin<{ ok: true; alumnos: AlumnoResumen[]; catalogo: Catalogo }>(
    password,
    "cargar_panel"
  );
}

export function crearAlumno(password: string, nombreAlumno: string, tipoPlan: string) {
  return postAdmin<{ ok: true; alumno: AlumnoResumen }>(password, "crear_alumno", {
    nombreAlumno,
    tipoPlan,
  });
}

export function actualizarAlumno(
  password: string,
  id: string,
  cambios: { nombreAlumno?: string; tipoPlan?: string; fechaCreacion?: string }
) {
  return postAdmin<{ ok: true }>(password, "actualizar_alumno", { id, ...cambios });
}

export function eliminarAlumno(password: string, id: string) {
  return postAdmin<{ ok: true }>(password, "eliminar_alumno", { id });
}

// Duplica el plan de un alumno hacia uno nuevo con el nombre que elija el
// entrenador — mismos días/ejercicios, pero sin la carga/notas personales
// del original (no tienen sentido en un plan nuevo).
export function duplicarAlumno(password: string, id: string, nombreNuevo: string) {
  return postAdmin<{ ok: true; alumno: AlumnoResumen }>(password, "duplicar_alumno", {
    id,
    nombreNuevo,
  });
}

export function guardarDia(
  password: string,
  id: string,
  diaNombre: string,
  ejercicios: Exercise[]
) {
  return postAdmin<{ ok: true }>(password, "guardar_dia", { id, diaNombre, ejercicios });
}

// Lectura pública (misma que usa la vista del alumno), reutilizada acá
// para cargar los datos actuales de una rutina al editarla.
export async function obtenerRutina(id: string): Promise<Routine> {
  const res = await fetch(`${APPS_SCRIPT_URL}?id=${encodeURIComponent(id)}`);
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(
      data.error === "not_found" ? "No se encontró esa rutina." : "No se pudo cargar la rutina."
    );
  }
  return data as Routine;
}
