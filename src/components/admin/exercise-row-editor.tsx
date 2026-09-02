"use client";

import { GripVertical, Plus, X } from "lucide-react";
import { useState } from "react";

import { AgregarEjercicioModal } from "@/components/admin/agregar-ejercicio-modal";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { VideoPreview } from "@/components/video-preview";
import type { Catalogo } from "@/lib/admin-types";
import { agregarAlCatalogoEnMemoria } from "@/lib/catalogo";
import { normalizarNombreEjercicio } from "@/lib/normalizar-ejercicio";
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
  password,
  onChange,
  onRemove,
  onDragHandleStart,
  onCatalogoActualizado,
}: {
  exercise: Exercise;
  tipoPlan: string;
  catalogo: Catalogo;
  password: string;
  onChange: (next: Exercise) => void;
  onRemove: () => void;
  // Si se pasa, se muestra un handle para arrastrar este ejercicio a otra
  // serie (ver SerieEditor/DayEditor) — el grupo/serie ya no se elige a
  // mano, sale de en qué serie quedó el ejercicio.
  onDragHandleStart?: () => void;
  // Para reflejar al toque un ejercicio agregado a la biblioteca desde
  // acá (ver AgregarEjercicioModal), sin recargar todo el panel.
  onCatalogoActualizado: (catalogo: Catalogo) => void;
}) {
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false);
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
    // El catálogo guarda videosPorEjercicio con la clave normalizada (ver
    // normalizarNombreEjercicio): en EjerciciosConsolidado el mismo
    // ejercicio puede tener el video cargado en una fila cuya grafía
    // difiere apenas (mayúsculas, espacios, tildes) de la fila que arma
    // esta opción del desplegable.
    const video = catalogo.videosPorEjercicio[normalizarNombreEjercicio(nombre)] || "";
    onChange({ ...exercise, ejercicio: nombre, video });
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-2">
        {onDragHandleStart ? (
          <button
            type="button"
            draggable
            onDragStart={onDragHandleStart}
            className="mt-5 flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-foreground active:cursor-grabbing"
            aria-label="Arrastrar para mover a otra serie"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}

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
          <div className="flex gap-1">
            <div className="min-w-0 flex-1">
              <SearchableSelect
                label="Ejercicio"
                value={exercise.ejercicio}
                options={opcionesEjercicio}
                onChange={onEjercicioChange}
                disabled={!exercise.patron}
                placeholder={exercise.patron ? "Buscar..." : "Elegí primero"}
                allowCustom
              />
            </div>
            <button
              type="button"
              onClick={() => setMostrarModalNuevo(true)}
              disabled={!exercise.patron}
              className="mt-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted hover:border-primary hover:text-primary disabled:opacity-50"
              aria-label="Agregar ejercicio nuevo a la biblioteca"
              title="Agregar ejercicio nuevo"
            >
              <Plus className="h-4 w-4" />
            </button>
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

      <div className="flex gap-3">
        <div className="flex-1 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Campo label="Series" value={exercise.series} onChange={(v) => set("series", v)} />
            <Campo
              label="Repeticiones"
              value={exercise.repeticiones}
              onChange={(v) => set("repeticiones", v)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Campo
              label="Intensidad"
              value={exercise.intensidad}
              onChange={(v) => set("intensidad", v)}
            />
            <Campo label="Pausa" value={exercise.pausas} onChange={(v) => set("pausas", v)} />
          </div>
          <Campo label="Notas" value={exercise.notas} onChange={(v) => set("notas", v)} />

          {exercise.notaAlumno || exercise.carga ? (
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-white/5 p-2.5 text-sm">
              <div>
                <p className="text-xs text-muted">Carga del alumno</p>
                {/* Un envío por renglón (ver NotaCargaAlumno) — whitespace-pre-line
                    para que cada uno se vea en su propia línea. */}
                <p className="whitespace-pre-line text-foreground">{exercise.carga || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Nota del alumno</p>
                <p className="whitespace-pre-line text-foreground">{exercise.notaAlumno || "—"}</p>
              </div>
            </div>
          ) : null}
        </div>

        {/* flex-col propio para que VideoPreview (self-stretch) tenga un
            padre flex directo del que estirarse — así ocupa toda la
            altura disponible debajo del label, hasta el final del
            bloque de al lado (stats + notas + comentarios del alumno),
            no solo un thumbnail chico arriba. */}
        <div className="flex shrink-0 flex-col">
          <label className="mb-1 block text-xs text-muted">Video</label>
          {/* Sale solo del catálogo (según el ejercicio elegido) — no se
              edita a mano acá; si está mal, se corrige en EjerciciosConsolidado.
              El preview embebido es para identificar al toque si es el
              correcto. La "x" saca el video de este ejercicio puntual
              (el alumno deja de verlo) sin tocar la biblioteca. */}
          {exercise.video ? (
            <VideoPreview url={exercise.video} grow onRemove={() => set("video", "")} />
          ) : (
            <p className="max-w-24 text-xs text-muted">Sin video para este ejercicio.</p>
          )}
        </div>
      </div>

      {mostrarModalNuevo ? (
        <AgregarEjercicioModal
          password={password}
          catalogo={catalogo}
          onClose={() => setMostrarModalNuevo(false)}
          onCreado={(nuevo) => {
            onCatalogoActualizado(agregarAlCatalogoEnMemoria(catalogo, nuevo));
            // selecciona el ejercicio recién creado en esta misma fila
            const patronElegido = (esPatrones ? nuevo.categoria : nuevo.musculo) || exercise.patron;
            onChange({ ...exercise, patron: patronElegido, ejercicio: nuevo.nombre, video: nuevo.link });
            setMostrarModalNuevo(false);
          }}
        />
      ) : null}
    </div>
  );
}
