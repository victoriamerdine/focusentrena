export interface AlumnoResumen {
  id: string;
  alumno: string;
  tipoPlan: string;
  hoja: string;
}

export interface Catalogo {
  patrones: string[];
  musculos: string[];
  ejerciciosPorPatron: Record<string, string[]>;
  ejerciciosPorMusculo: Record<string, string[]>;
  videosPorEjercicio: Record<string, string>;
}
