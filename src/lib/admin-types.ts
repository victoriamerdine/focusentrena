export interface AlumnoResumen {
  id: string;
  alumno: string;
  tipoPlan: string;
  hoja: string;
  // "yyyy-MM-dd" o "" si todavía no se cargó.
  fechaCreacion: string;
}

export interface Catalogo {
  patrones: string[];
  musculos: string[];
  ejerciciosPorPatron: Record<string, string[]>;
  ejerciciosPorMusculo: Record<string, string[]>;
  videosPorEjercicio: Record<string, string>;
}

// Una fila de EjerciciosConsolidado tal cual, para la pantalla de
// administrar la biblioteca (a diferencia de Catalogo, que viene
// agregado por patrón/músculo). "fila" es el número de fila real en la
// hoja — identificador estable para editar/borrar ese ejercicio puntual.
export interface EjercicioCatalogo {
  fila: number;
  categoria: string;
  musculo: string;
  nombre: string;
  link: string;
}
