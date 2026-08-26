import type { Routine } from "@/lib/types";

function cacheKey(id: string): string {
  return `focus-entrena:routine:${id}`;
}

export function readCachedRoutine(id: string): Routine | null {
  try {
    const raw = localStorage.getItem(cacheKey(id));
    if (!raw) return null;
    return JSON.parse(raw) as Routine;
  } catch {
    return null;
  }
}

export function writeCachedRoutine(id: string, routine: Routine): void {
  try {
    localStorage.setItem(cacheKey(id), JSON.stringify(routine));
  } catch {
    // localStorage puede fallar (modo privado, cuota llena, etc.) — no es crítico.
  }
}
