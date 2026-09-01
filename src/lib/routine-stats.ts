import type { Exercise } from "@/lib/types";

export interface PatronStats {
  patron: string;
  volumen: number;
  intensidad: number; // promedio
}

function num(valor: string): number {
  const n = parseFloat(valor);
  return isNaN(n) ? 0 : n;
}

// Volumen = suma de "Series" y intensidad = promedio de "Intensidad",
// agrupado por Patrón/Músculo — el mismo cálculo que el entrenador ya
// tenía armado a mano en columnas aparte del Sheet (Volumen/Intensidad
// por día y semanal), para saber de un vistazo si algún patrón viene
// bajo o muy exigido.
export function calcularStatsPorPatron(ejercicios: Exercise[]): PatronStats[] {
  const acumulado: Record<
    string,
    { volumen: number; sumaIntensidad: number; cantidad: number }
  > = {};

  ejercicios.forEach((ex) => {
    const patron = ex.patron.trim();
    if (!patron) return;
    if (!acumulado[patron]) {
      acumulado[patron] = { volumen: 0, sumaIntensidad: 0, cantidad: 0 };
    }
    acumulado[patron].volumen += num(ex.series);
    acumulado[patron].sumaIntensidad += num(ex.intensidad);
    acumulado[patron].cantidad += 1;
  });

  return Object.keys(acumulado)
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
    .map((patron) => ({
      patron,
      volumen: acumulado[patron].volumen,
      intensidad:
        acumulado[patron].cantidad > 0
          ? acumulado[patron].sumaIntensidad / acumulado[patron].cantidad
          : 0,
    }));
}

export function formatearNumero(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
