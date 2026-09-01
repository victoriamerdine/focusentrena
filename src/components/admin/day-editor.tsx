"use client";

import { Plus, Save } from "lucide-react";
import { useState } from "react";

import { DaySummary } from "@/components/admin/day-summary";
import { ExerciseRowEditor } from "@/components/admin/exercise-row-editor";
import type { Catalogo } from "@/lib/admin-types";
import type { Exercise } from "@/lib/types";

const EJERCICIO_VACIO: Exercise = {
  patron: "",
  ejercicio: "",
  series: "",
  repeticiones: "",
  intensidad: "",
  pausas: "",
  notas: "",
  video: "",
  agrupador: "",
  grupo: "",
};

export function DayEditor({
  diaNombre,
  ejerciciosIniciales,
  tipoPlan,
  catalogo,
  onGuardar,
}: {
  diaNombre: string;
  ejerciciosIniciales: Exercise[];
  tipoPlan: string;
  catalogo: Catalogo;
  onGuardar: (diaNombre: string, ejercicios: Exercise[]) => Promise<void>;
}) {
  const [ejercicios, setEjercicios] = useState<Exercise[]>(ejerciciosIniciales);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  function actualizarEjercicio(i: number, next: Exercise) {
    setEjercicios((prev) => prev.map((ex, idx) => (idx === i ? next : ex)));
  }

  function quitarEjercicio(i: number) {
    setEjercicios((prev) => prev.filter((_, idx) => idx !== i));
  }

  function agregarEjercicio() {
    setEjercicios((prev) => {
      // a partir del segundo ejercicio, Series/Repeticiones/Intensidad
      // arrancan con los mismos valores que el anterior — la mayoría de
      // las veces se repiten dentro del mismo día, así se ahorra tipearlos.
      const anterior = prev[prev.length - 1];
      const nuevo: Exercise = {
        ...EJERCICIO_VACIO,
        series: anterior?.series ?? "",
        repeticiones: anterior?.repeticiones ?? "",
        intensidad: anterior?.intensidad ?? "",
      };
      return [...prev, nuevo];
    });
  }

  async function guardar() {
    setGuardando(true);
    setMensaje(null);
    try {
      await onGuardar(diaNombre, ejercicios);
      setMensaje({ tipo: "ok", texto: "Guardado." });
    } catch (err) {
      setMensaje({
        tipo: "error",
        texto: err instanceof Error ? err.message : "No se pudo guardar.",
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-3">
      <DaySummary ejercicios={ejercicios} />

      {ejercicios.length === 0 ? (
        <p className="text-sm text-muted">Sin ejercicios en este día todavía.</p>
      ) : (
        ejercicios.map((ex, i) => (
          <ExerciseRowEditor
            key={i}
            exercise={ex}
            tipoPlan={tipoPlan}
            catalogo={catalogo}
            onChange={(next) => actualizarEjercicio(i, next)}
            onRemove={() => quitarEjercicio(i)}
          />
        ))
      )}

      <button
        type="button"
        onClick={agregarEjercicio}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted hover:border-primary hover:text-primary"
      >
        <Plus className="h-4 w-4" />
        Agregar ejercicio
      </button>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {guardando ? "Guardando..." : `Guardar ${diaNombre}`}
        </button>
        {mensaje ? (
          <span className={`text-sm ${mensaje.tipo === "ok" ? "text-primary" : "text-red-400"}`}>
            {mensaje.texto}
          </span>
        ) : null}
      </div>
    </div>
  );
}
