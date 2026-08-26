export interface Exercise {
  patron: string;
  ejercicio: string;
  series: string;
  repeticiones: string;
  intensidad: string;
  pausas: string;
  notas: string;
  video: string;
  grupo: string;
}

export interface Day {
  nombre: string;
  ejercicios: Exercise[];
}

export interface Routine {
  alumno: string;
  tipoPlan: string;
  dias: Day[];
}

export interface RoutineError {
  error: string;
}
