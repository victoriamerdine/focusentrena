import { Flame, Layers, Repeat, StickyNote, Timer } from "lucide-react";

import { NotaCargaAlumno } from "@/components/nota-carga-alumno";
import { VideoPreview } from "@/components/video-preview";
import type { Exercise } from "@/lib/types";

function StatLine({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-1.5 text-sm text-muted">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.5} />
      <span className="min-w-0 break-words">
        <span className="font-semibold text-foreground">{label}:</span> {value}
      </span>
    </div>
  );
}

export function ExerciseCard({
  exercise,
  badge,
  id,
  diaNombre,
}: {
  exercise: Exercise;
  badge?: string;
  // Para poder guardar la nota/carga del alumno. Si faltan (o el ejercicio
  // no trae "indice"), esos campos no se muestran.
  id?: string;
  diaNombre?: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-4 shadow-sm">
      {/* El video se alinea con este bloque (título, stats, nota del
          entrenador) — Mi carga/Mi nota del alumno queda abajo, fuera de
          esta fila, así el video no se estira de más por el historial
          del alumno (que puede tener varios renglones). */}
      <div className="flex flex-1 gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-base uppercase leading-tight tracking-tight text-foreground">
                {exercise.ejercicio || "Ejercicio"}
              </h3>
              {exercise.patron ? (
                <p className="text-sm text-primary">{exercise.patron}</p>
              ) : null}
            </div>
            {badge ? (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {badge}
              </span>
            ) : null}
          </div>

          <div className="space-y-1">
            <StatLine icon={Layers} label="Series" value={exercise.series} />
            <StatLine icon={Repeat} label="Repeticiones" value={exercise.repeticiones} />
            <StatLine icon={Flame} label="Intensidad" value={exercise.intensidad} />
            <StatLine icon={Timer} label="Pausa" value={exercise.pausas} />
          </div>

          {exercise.notas ? (
            <div className="mt-2 flex items-start gap-1.5 text-sm text-muted">
              <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.5} />
              <span>{exercise.notas}</span>
            </div>
          ) : null}
        </div>

        {exercise.video ? <VideoPreview url={exercise.video} /> : null}
      </div>

      {id && diaNombre && typeof exercise.indice === "number" ? (
        <NotaCargaAlumno
          id={id}
          diaNombre={diaNombre}
          indice={exercise.indice}
          notaInicial={exercise.notaAlumno}
          cargaInicial={exercise.carga}
        />
      ) : null}
    </div>
  );
}
