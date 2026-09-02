"use client";

import { Plus, Trash2 } from "lucide-react";

import { ExerciseRowEditor } from "@/components/admin/exercise-row-editor";
import type { Catalogo } from "@/lib/admin-types";
import type { Serie } from "@/lib/serie-ejercicios";
import type { Exercise } from "@/lib/types";

// Una Serie es un bloque de ejercicios que se combinan entre sí (lo que
// antes era escribir el mismo número en "Grupo"). Acá adentro se agregan
// ejercicios y se pueden arrastrar hacia/desde otras series — el
// "agrupador" que termina yendo al backend se recalcula solo, a partir
// de en qué serie quedó cada ejercicio (ver seriesAEjercicios).
export function SerieEditor({
  serie,
  numero,
  tipoPlan,
  catalogo,
  onDragStartEjercicio,
  onDropEnIndice,
  onDropAlFinal,
  onChangeEjercicio,
  onRemoveEjercicio,
  onAgregarEjercicio,
  onRemoveSerie,
}: {
  serie: Serie;
  numero: number;
  tipoPlan: string;
  catalogo: Catalogo;
  onDragStartEjercicio: (index: number) => void;
  onDropEnIndice: (index: number) => void;
  onDropAlFinal: () => void;
  onChangeEjercicio: (index: number, next: Exercise) => void;
  onRemoveEjercicio: (index: number) => void;
  onAgregarEjercicio: () => void;
  onRemoveSerie: () => void;
}) {
  function eliminar() {
    if (
      serie.ejercicios.length > 0 &&
      !confirm(`¿Borrar la Serie ${numero} y sus ${serie.ejercicios.length} ejercicio(s)?`)
    ) {
      return;
    }
    onRemoveSerie();
  }

  return (
    <div className="space-y-2 rounded-2xl border border-dashed border-border p-3">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-sm uppercase tracking-tight text-muted">
          Serie {numero}
          {serie.ejercicios.length > 1 ? (
            <span className="ml-2 text-xs font-normal normal-case text-muted">
              · alterná estos ejercicios
            </span>
          ) : null}
        </h4>
        <button
          type="button"
          onClick={eliminar}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-red-400"
          aria-label={`Borrar Serie ${numero}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-2">
        {serie.ejercicios.map((ex, i) => (
          // El drop target es toda la fila: soltar acá inserta el
          // ejercicio arrastrado justo antes de este (o lo reordena, si
          // ya estaba en esta misma serie).
          <div key={i} onDragOver={(e) => e.preventDefault()} onDrop={() => onDropEnIndice(i)}>
            <ExerciseRowEditor
              exercise={ex}
              tipoPlan={tipoPlan}
              catalogo={catalogo}
              onChange={(next) => onChangeEjercicio(i, next)}
              onRemove={() => onRemoveEjercicio(i)}
              onDragHandleStart={() => onDragStartEjercicio(i)}
            />
          </div>
        ))}
      </div>

      <div onDragOver={(e) => e.preventDefault()} onDrop={onDropAlFinal} className="space-y-2">
        {serie.ejercicios.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-3 text-center text-xs text-muted">
            Arrastrá un ejercicio acá, o agregá uno nuevo
          </p>
        ) : null}
        <button
          type="button"
          onClick={onAgregarEjercicio}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2 text-xs text-muted hover:border-primary hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar ejercicio
        </button>
      </div>
    </div>
  );
}
