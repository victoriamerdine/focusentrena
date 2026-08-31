"use client";

import { X } from "lucide-react";

import { ColorPicker } from "@/components/admin/color-picker";
import type { Catalogo } from "@/lib/admin-types";
import type { Exercise } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none";

function Campo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-muted">{label}</label>
      <input
        type="text"
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function ExerciseRowEditor({
  exercise,
  tipoPlan,
  catalogo,
  onChange,
  onRemove,
}: {
  exercise: Exercise;
  tipoPlan: string;
  catalogo: Catalogo;
  onChange: (next: Exercise) => void;
  onRemove: () => void;
}) {
  const esPatrones = tipoPlan === "Patrones";
  const opcionesPatron = esPatrones ? catalogo.patrones : catalogo.musculos;
  const opcionesEjercicio = exercise.patron
    ? (esPatrones
        ? catalogo.ejerciciosPorPatron[exercise.patron]
        : catalogo.ejerciciosPorMusculo[exercise.patron]) || []
    : [];

  function set<K extends keyof Exercise>(key: K, value: Exercise[K]) {
    onChange({ ...exercise, [key]: value });
  }

  function onPatronChange(valor: string) {
    // al cambiar el patrón/músculo, el ejercicio elegido puede no
    // pertenecer más a la lista nueva — se resetea junto con el video.
    onChange({ ...exercise, patron: valor, ejercicio: "", video: "" });
  }

  function onEjercicioChange(nombre: string) {
    const video = catalogo.videosPorEjercicio[nombre] || "";
    onChange({ ...exercise, ejercicio: nombre, video });
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-2">
        <div className="grid flex-1 grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-muted">
              {esPatrones ? "Patrón" : "Músculo"}
            </label>
            <select
              className={inputClass}
              value={exercise.patron}
              onChange={(e) => onPatronChange(e.target.value)}
            >
              <option value="">—</option>
              {opcionesPatron.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Ejercicio</label>
            <select
              className={inputClass}
              value={exercise.ejercicio}
              onChange={(e) => onEjercicioChange(e.target.value)}
              disabled={!exercise.patron}
            >
              <option value="">—</option>
              {opcionesEjercicio.map((ej) => (
                <option key={ej} value={ej}>
                  {ej}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="mt-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-foreground"
          aria-label="Quitar ejercicio"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Campo label="Series" value={exercise.series} onChange={(v) => set("series", v)} />
        <Campo
          label="Repeticiones"
          value={exercise.repeticiones}
          onChange={(v) => set("repeticiones", v)}
        />
        <Campo
          label="Intensidad"
          value={exercise.intensidad}
          onChange={(v) => set("intensidad", v)}
        />
        <Campo label="Pausa" value={exercise.pausas} onChange={(v) => set("pausas", v)} />
      </div>

      <Campo label="Notas" value={exercise.notas} onChange={(v) => set("notas", v)} />
      <Campo label="Link de video" value={exercise.video} onChange={(v) => set("video", v)} />

      <div>
        <label className="mb-1 block text-xs text-muted">Combinar con (color)</label>
        <ColorPicker value={exercise.grupo} onChange={(v) => set("grupo", v)} />
      </div>
    </div>
  );
}
