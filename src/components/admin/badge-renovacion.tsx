import { calcularRenovacion } from "@/lib/renovacion";

export function BadgeRenovacion({ fechaCreacion }: { fechaCreacion: string }) {
  const estado = calcularRenovacion(fechaCreacion);
  if (!estado) return null;

  const { diasRestantes } = estado;

  if (diasRestantes < 0) {
    const dias = Math.abs(diasRestantes);
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-red-400/10 px-2 py-0.5 text-xs font-semibold text-red-400">
        Vencido hace {dias} día{dias === 1 ? "" : "s"}
      </span>
    );
  }

  if (diasRestantes < 7) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-yellow-400/10 px-2 py-0.5 text-xs font-semibold text-yellow-400">
        {diasRestantes === 0 ? "Renueva hoy" : `Renueva en ${diasRestantes} día${diasRestantes === 1 ? "" : "s"}`}
      </span>
    );
  }

  return null;
}
