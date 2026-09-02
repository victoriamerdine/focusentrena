import type { Exercise } from "@/lib/types";

// Un "bloque" — le decimos Serie, como ya se le muestra al alumno ("Serie
// A · alterná estos ejercicios") — es un grupo de ejercicios que se
// combinan entre sí. El id es solo para React/drag-and-drop, nunca sale
// de este editor.
export interface Serie {
  id: string;
  ejercicios: Exercise[];
}

let contador = 0;
function nuevoId(): string {
  contador += 1;
  return `serie-${Date.now()}-${contador}`;
}

export function nuevaSerie(): Serie {
  return { id: nuevoId(), ejercicios: [] };
}

// Reconstruye las series a partir de la lista plana que devuelve el
// backend: ejercicios CONSECUTIVOS con el mismo "agrupador" (no vacío)
// forman una serie — coincide con cómo la vista del alumno los combina
// visualmente (ver group-exercises.ts), que también solo junta
// ejercicios consecutivos con el mismo color. Un ejercicio sin
// agrupador (o con uno distinto al de arriba) arranca una serie propia.
export function agruparEnSeries(ejercicios: Exercise[]): Serie[] {
  const series: Serie[] = [];
  for (const ex of ejercicios) {
    const clave = ex.agrupador.trim();
    const ultima = series[series.length - 1];
    const claveUltima = ultima?.ejercicios[0]?.agrupador.trim();
    if (clave && ultima && claveUltima === clave) {
      ultima.ejercicios.push(ex);
    } else {
      series.push({ id: nuevoId(), ejercicios: [ex] });
    }
  }
  return series;
}

// Aplana las series de vuelta a la lista plana que espera el backend,
// recalculando "agrupador" a partir de en qué serie quedó cada ejercicio
// (y no al revés, como era antes con el campo "Grupo" a mano). Una serie
// de un solo ejercicio no lleva número: no hay nada que combinar, queda
// como un ejercicio suelto — igual que si el entrenador nunca hubiera
// usado agrupador.
export function seriesAEjercicios(series: Serie[]): Exercise[] {
  let siguienteNumero = 1;
  const resultado: Exercise[] = [];
  for (const serie of series) {
    const numero = serie.ejercicios.length > 1 ? String(siguienteNumero++) : "";
    for (const ex of serie.ejercicios) {
      resultado.push({ ...ex, agrupador: numero });
    }
  }
  return resultado;
}
