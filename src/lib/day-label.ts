const DAY_SHORT_REGEX = /^d[ií]a\s*\d+/i;

// "Día 1 FUERZA TREN SUP" -> "Día 1" (para pestañas cortas). Si el nombre
// no matchea el patrón esperado, se devuelve tal cual.
export function getShortDayLabel(nombre: string): string {
  const match = nombre.match(DAY_SHORT_REGEX);
  return match ? match[0] : nombre;
}

// El resto del nombre después de "Día N", si lo hay (ej. "FUERZA TREN SUP").
export function getDaySubtitle(nombre: string): string {
  const short = getShortDayLabel(nombre);
  if (short === nombre) return "";
  return nombre.slice(short.length).trim();
}
