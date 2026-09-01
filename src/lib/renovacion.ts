// Los planes se consideran mensuales = 30 días desde la fecha de creación.
const DIAS_PLAN = 30;

export interface EstadoRenovacion {
  // negativo = ya venció hace esa cantidad de días.
  diasRestantes: number;
}

export function calcularRenovacion(fechaCreacionISO: string): EstadoRenovacion | null {
  const partes = fechaCreacionISO.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!partes) return null;

  const creacion = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  const renovacion = new Date(creacion);
  renovacion.setDate(renovacion.getDate() + DIAS_PLAN);
  renovacion.setHours(0, 0, 0, 0);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const msPorDia = 1000 * 60 * 60 * 24;
  const diasRestantes = Math.round((renovacion.getTime() - hoy.getTime()) / msPorDia);

  return { diasRestantes };
}
