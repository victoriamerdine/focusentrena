export interface Exercise {
  patron: string;
  ejercicio: string;
  series: string;
  repeticiones: string;
  intensidad: string;
  pausas: string;
  notas: string;
  video: string;
  // "agrupador": lo que escribe el entrenador (número/texto libre); "grupo":
  // color calculado por el servidor a partir del agrupador (mismo
  // agrupador dentro de un día = mismo color). La vista del alumno usa
  // "grupo"; el panel del entrenador usa "agrupador".
  agrupador: string;
  grupo: string;
}

export interface Day {
  nombre: string;
  ejercicios: Exercise[];
}

export interface Routine {
  alumno: string;
  tipoPlan: string;
  // "yyyy-MM-dd" o "" si todavía no se cargó.
  fechaCreacion: string;
  dias: Day[];
}

export interface RoutineError {
  error: string;
}
