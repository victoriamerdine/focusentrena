import { calcularStatsPorPatron, formatearNumero } from "@/lib/routine-stats";
import type { Day } from "@/lib/types";

export function WeekSummary({ dias }: { dias: Day[] }) {
  const todos = dias.flatMap((d) => d.ejercicios);
  const stats = calcularStatsPorPatron(todos);

  if (stats.length === 0) return null;

  const maxVolumen = Math.max(...stats.map((s) => s.volumen), 1);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="font-display mb-3 text-sm uppercase tracking-tight text-primary">
        Volumen semanal por patrón
      </p>
      <div className="space-y-2">
        {stats.map((s) => (
          <div key={s.patron} className="flex items-center gap-3 text-sm">
            <span className="w-28 shrink-0 truncate text-muted" title={s.patron}>
              {s.patron}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(s.volumen / maxVolumen) * 100}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right font-semibold text-foreground">
              {formatearNumero(s.volumen)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
