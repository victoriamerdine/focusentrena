import type { Day } from "@/lib/types";

export function WeekOverview({ dias }: { dias: Day[] }) {
  return (
    <div className="space-y-6">
      {dias.map((dia) => (
        <div key={dia.nombre}>
          <h2 className="font-display mb-2 text-lg uppercase tracking-tight text-primary">
            {dia.nombre}
          </h2>
          {dia.ejercicios.length === 0 ? (
            <p className="text-sm text-muted">Sin ejercicios cargados.</p>
          ) : (
            <ul className="space-y-1.5">
              {dia.ejercicios.map((ex, i) => (
                <li key={i} className="flex items-baseline gap-2 text-sm">
                  <span className="h-1 w-1 shrink-0 translate-y-[-2px] rounded-full bg-primary" />
                  <span className="font-semibold text-foreground">
                    {ex.ejercicio || "Ejercicio"}
                  </span>
                  {ex.patron ? (
                    <span className="text-muted">— {ex.patron}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
