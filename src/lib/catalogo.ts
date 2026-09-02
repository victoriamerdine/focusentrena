import type { Catalogo } from "@/lib/admin-types";
import { normalizarNombreEjercicio } from "@/lib/normalizar-ejercicio";

const ordenar = (arr: string[]) => [...arr].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

// Devuelve un catálogo nuevo con el ejercicio recién agregado (ver
// agregar_ejercicio_catalogo en Code.gs) ya adentro, sin tener que
// recargar todo el panel para poder elegirlo. Mismo criterio de orden
// que arma manejarObtenerCatalogo() del lado del servidor.
export function agregarAlCatalogoEnMemoria(
  catalogo: Catalogo,
  nuevo: { categoria: string; musculo: string; nombre: string; link: string }
): Catalogo {
  const patrones =
    nuevo.categoria && !catalogo.patrones.includes(nuevo.categoria)
      ? ordenar([...catalogo.patrones, nuevo.categoria])
      : catalogo.patrones;

  const musculos =
    nuevo.musculo && !catalogo.musculos.includes(nuevo.musculo)
      ? ordenar([...catalogo.musculos, nuevo.musculo])
      : catalogo.musculos;

  const ejerciciosPorPatron = { ...catalogo.ejerciciosPorPatron };
  if (nuevo.categoria) {
    const actuales = ejerciciosPorPatron[nuevo.categoria] || [];
    if (!actuales.includes(nuevo.nombre)) {
      ejerciciosPorPatron[nuevo.categoria] = ordenar([...actuales, nuevo.nombre]);
    }
  }

  const ejerciciosPorMusculo = { ...catalogo.ejerciciosPorMusculo };
  if (nuevo.musculo) {
    const actuales = ejerciciosPorMusculo[nuevo.musculo] || [];
    if (!actuales.includes(nuevo.nombre)) {
      ejerciciosPorMusculo[nuevo.musculo] = ordenar([...actuales, nuevo.nombre]);
    }
  }

  const videosPorEjercicio = { ...catalogo.videosPorEjercicio };
  if (nuevo.link) {
    videosPorEjercicio[normalizarNombreEjercicio(nuevo.nombre)] = nuevo.link;
  }

  return { patrones, musculos, ejerciciosPorPatron, ejerciciosPorMusculo, videosPorEjercicio };
}
