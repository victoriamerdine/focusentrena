// Debe coincidir exactamente con normalizarNombreEjercicio() en
// apps-script/Code.gs — mismo criterio para no fallar el link de video al
// elegir un ejercicio por una diferencia de mayúsculas/tildes/espacios
// entre la fila de EjerciciosConsolidado que arma la opción del
// desplegable y la fila que tiene el video cargado.
export function normalizarNombreEjercicio(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
