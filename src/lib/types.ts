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
  // Posición 0-based dentro de los ejercicios de su día — la manda el
  // servidor (ver construirRutina en Code.gs) y la usa la vista del alumno
  // para guardar su nota/carga en el ejercicio correcto (guardar_nota_alumno).
  // No la manda el entrenador al editar/crear (no existe todavía en un
  // ejercicio nuevo o recién editado desde el panel).
  indice?: number;
  // Cargados por el ALUMNO desde su propia vista (no el entrenador):
  // columnas J/K de la hoja. El entrenador solo las puede ver, no editar.
  notaAlumno: string;
  carga: string;
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
