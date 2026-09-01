// "yyyy-MM-dd" -> "d/m/aaaa". Devuelve "" si no hay fecha cargada.
export function formatearFecha(fechaISO: string): string {
  if (!fechaISO) return "";
  const partes = fechaISO.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!partes) return "";
  return `${Number(partes[3])}/${Number(partes[2])}/${partes[1]}`;
}
