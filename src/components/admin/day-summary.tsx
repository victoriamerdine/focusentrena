import { calcularStatsPorPatron, formatearNumero } from "@/lib/routine-stats";
import type { Exercise } from "@/lib/types";

export function DaySummary({ ejercicios }: { ejercicios: Exercise[] }) {
  const stats = calcularStatsPorPatron(ejercicios);

  if (stats.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card p-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
        Volumen / Intensidad por patrón — este día
      </p>
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr>
            <th className="pr-3 pb-1 text-left text-xs font-normal text-muted"> </th>
            {stats.map((s) => (
              <th
                key={s.patron}
                className="px-2 pb-1 text-left text-xs font-semibold text-foreground"
              >
                {s.patron}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="pr-3 text-xs text-muted">Volumen</td>
            {stats.map((s) => (
              <td key={s.patron} className="px-2 font-semibold text-primary">
                {formatearNumero(s.volumen)}
              </td>
            ))}
          </tr>
          <tr>
            <td className="pr-3 text-xs text-muted">Intensidad</td>
            {stats.map((s) => (
              <td key={s.patron} className="px-2 text-foreground">
                {formatearNumero(s.intensidad)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
