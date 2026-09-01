export const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ?? "";

// Dominio público donde vive la vista del alumno — para armar el link
// completo y compartible (con protocolo, para que sea clickeable).
export const SITE_URL = "https://focus-entrena.web.app";

export function linkAlumno(id: string): string {
  return `${SITE_URL}/r/${id}/`;
}
