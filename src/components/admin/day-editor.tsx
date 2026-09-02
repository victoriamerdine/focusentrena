"use client";

import { Plus, Save } from "lucide-react";
import { useState } from "react";

import { DaySummary } from "@/components/admin/day-summary";
import { SerieEditor } from "@/components/admin/serie-editor";
import type { Catalogo } from "@/lib/admin-types";
import { agruparEnSeries, nuevaSerie, seriesAEjercicios, type Serie } from "@/lib/serie-ejercicios";
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
  notaAlumno: "",
  carga: "",
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
  const [series, setSeries] = useState<Serie[]>(() => agruparEnSeries(ejerciciosIniciales));
  // Qué ejercicio se está arrastrando ahora mismo (de qué serie, qué
  // posición) — se guarda al arrancar el drag y se consume al soltar.
  const [arrastrando, setArrastrando] = useState<{ serieId: string; index: number } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  function actualizarEjercicio(serieId: string, index: number, next: Exercise) {
    setSeries((prev) =>
      prev.map((s) =>
        s.id === serieId
          ? { ...s, ejercicios: s.ejercicios.map((ex, i) => (i === index ? next : ex)) }
          : s
      )
    );
  }

  function quitarEjercicio(serieId: string, index: number) {
    setSeries((prev) =>
      prev.map((s) =>
        s.id === serieId ? { ...s, ejercicios: s.ejercicios.filter((_, i) => i !== index) } : s
      )
    );
  }

  function agregarEjercicio(serieId: string) {
    setSeries((prev) =>
      prev.map((s) => {
        if (s.id !== serieId) return s;
        // a partir del segundo ejercicio de la serie, Series/Repeticiones/
        // Intensidad arrancan con los mismos valores que el anterior — la
        // mayoría de las veces se repiten dentro de la misma serie, así se
        // ahorra tipearlos.
        const anterior = s.ejercicios[s.ejercicios.length - 1];
        const nuevo: Exercise = {
          ...EJERCICIO_VACIO,
          series: anterior?.series ?? "",
          repeticiones: anterior?.repeticiones ?? "",
          intensidad: anterior?.intensidad ?? "",
        };
        return { ...s, ejercicios: [...s.ejercicios, nuevo] };
      })
    );
  }

  function agregarSerie() {
    setSeries((prev) => [...prev, nuevaSerie()]);
  }

  function quitarSerie(serieId: string) {
    setSeries((prev) => prev.filter((s) => s.id !== serieId));
  }

  // Mueve el ejercicio que se venía arrastrando (arrastrando.serieId +
  // index) a la posición destinoIndex dentro de destinoSerieId — sirve
  // tanto para mover entre series como para reordenar dentro de la misma.
  function moverEjercicio(destinoSerieId: string, destinoIndex: number) {
    if (!arrastrando) return;
    const origen = arrastrando;

    setSeries((prev) => {
      const copia = prev.map((s) => ({ ...s, ejercicios: [...s.ejercicios] }));

      const serieOrigen = copia.find((s) => s.id === origen.serieId);
      if (!serieOrigen) return prev;

      const [ejercicio] = serieOrigen.ejercicios.splice(origen.index, 1);
      if (!ejercicio) return prev;

      const serieDestino = copia.find((s) => s.id === destinoSerieId);
      if (!serieDestino) return prev;

      // si se movió dentro de la misma serie, el splice de arriba ya
      // corrió los índices posteriores un lugar hacia atrás.
      let idx =
        serieOrigen.id === serieDestino.id && origen.index < destinoIndex
          ? destinoIndex - 1
          : destinoIndex;
      idx = Math.max(0, Math.min(idx, serieDestino.ejercicios.length));

      serieDestino.ejercicios.splice(idx, 0, ejercicio);

      return copia;
    });

    setArrastrando(null);
  }

  async function guardar() {
    setGuardando(true);
    setMensaje(null);
    try {
      await onGuardar(diaNombre, seriesAEjercicios(series));
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

  const todosLosEjercicios = series.flatMap((s) => s.ejercicios);

  return (
    <div className="space-y-3">
      <DaySummary ejercicios={todosLosEjercicios} />

      {series.length === 0 ? (
        <p className="text-sm text-muted">Sin series en este día todavía.</p>
      ) : (
        series.map((serie, i) => (
          <SerieEditor
            key={serie.id}
            serie={serie}
            numero={i + 1}
            tipoPlan={tipoPlan}
            catalogo={catalogo}
            onDragStartEjercicio={(index) => setArrastrando({ serieId: serie.id, index })}
            onDropEnIndice={(index) => moverEjercicio(serie.id, index)}
            onDropAlFinal={() => moverEjercicio(serie.id, Number.MAX_SAFE_INTEGER)}
            onChangeEjercicio={(index, next) => actualizarEjercicio(serie.id, index, next)}
            onRemoveEjercicio={(index) => quitarEjercicio(serie.id, index)}
            onAgregarEjercicio={() => agregarEjercicio(serie.id)}
            onRemoveSerie={() => quitarSerie(serie.id)}
          />
        ))
      )}

      <button
        type="button"
        onClick={agregarSerie}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted hover:border-primary hover:text-primary"
      >
        <Plus className="h-4 w-4" />
        Nueva serie
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
