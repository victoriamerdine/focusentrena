import { Flame, Layers, Repeat, StickyNote, Timer, Video } from "lucide-react";

import type { Exercise } from "@/lib/types";

function Stat({
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
    <div className="flex items-center gap-2 rounded-lg bg-background/60 px-3 py-2">
      <Icon className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-muted">
          {label}
        </div>
        <div className="truncate text-sm font-semibold text-foreground">
          {value}
        </div>
      </div>
    </div>
  );
}

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-base font-bold uppercase tracking-tight text-foreground">
          {exercise.ejercicio || "Ejercicio"}
        </h3>
        {exercise.patron ? (
          <p className="text-sm text-primary">{exercise.patron}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat icon={Layers} label="Series" value={exercise.series} />
        <Stat icon={Repeat} label="Repeticiones" value={exercise.repeticiones} />
        <Stat icon={Flame} label="Intensidad" value={exercise.intensidad} />
        <Stat icon={Timer} label="Pausa" value={exercise.pausas} />
      </div>

      {exercise.notas ? (
        <div className="mt-3 flex items-start gap-2 text-sm text-muted">
          <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
          <span>{exercise.notas}</span>
        </div>
      ) : null}

      {exercise.video ? (
        <a
          href={exercise.video}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Video className="h-4 w-4" strokeWidth={2.5} />
          Ver Video
        </a>
      ) : null}
    </div>
  );
}
