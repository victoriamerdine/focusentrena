"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { DaySummary } from "@/components/admin/day-summary";
import { SerieEditor } from "@/components/admin/serie-editor";
import type { Catalogo } from "@/lib/admin-types";
import { nuevaSerie, type Serie } from "@/lib/serie-ejercicios";
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

// Componente controlado: no guarda nada por su cuenta ni tiene estado
// propio de las series — así, cambiar qué días están abiertos (ver
// RoutineEditor) no lo desmonta y no se pierden ediciones sin guardar.
// El guardado es responsabilidad del padre, con un solo botón para
// todos los días modificados.
export function DayEditor({
  diaNombre,
  series,
  onChangeSeries,
  tipoPlan,
  catalogo,
}: {
  diaNombre: string;
  series: Serie[];
  onChangeSeries: (series: Serie[]) => void;
  tipoPlan: string;
  catalogo: Catalogo;
}) {
  // Qué ejercicio se está arrastrando ahora mismo (de qué serie, qué
  // posición) — se guarda al arrancar el drag y se consume al soltar.
  const [arrastrando, setArrastrando] = useState<{ serieId: string; index: number } | null>(null);

  function actualizarEjercicio(serieId: string, index: number, next: Exercise) {
    onChangeSeries(
      series.map((s) =>
        s.id === serieId
          ? { ...s, ejercicios: s.ejercicios.map((ex, i) => (i === index ? next : ex)) }
          : s
      )
    );
  }

  function quitarEjercicio(serieId: string, index: number) {
    onChangeSeries(
      series.map((s) =>
        s.id === serieId ? { ...s, ejercicios: s.ejercicios.filter((_, i) => i !== index) } : s
      )
    );
  }

  function agregarEjercicio(serieId: string) {
    onChangeSeries(
      series.map((s) => {
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
    onChangeSeries([...series, nuevaSerie()]);
  }

  function quitarSerie(serieId: string) {
    onChangeSeries(series.filter((s) => s.id !== serieId));
  }

  // Mueve el ejercicio que se venía arrastrando (arrastrando.serieId +
  // index) a la posición destinoIndex dentro de destinoSerieId — sirve
  // tanto para mover entre series como para reordenar dentro de la misma.
  function moverEjercicio(destinoSerieId: string, destinoIndex: number) {
    if (!arrastrando) return;
    const origen = arrastrando;

    const copia = series.map((s) => ({ ...s, ejercicios: [...s.ejercicios] }));

    const serieOrigen = copia.find((s) => s.id === origen.serieId);
    if (!serieOrigen) return;

    const [ejercicio] = serieOrigen.ejercicios.splice(origen.index, 1);
    if (!ejercicio) return;

    const serieDestino = copia.find((s) => s.id === destinoSerieId);
    if (!serieDestino) return;

    // si se movió dentro de la misma serie, el splice de arriba ya
    // corrió los índices posteriores un lugar hacia atrás.
    let idx =
      serieOrigen.id === serieDestino.id && origen.index < destinoIndex
        ? destinoIndex - 1
        : destinoIndex;
    idx = Math.max(0, Math.min(idx, serieDestino.ejercicios.length));

    serieDestino.ejercicios.splice(idx, 0, ejercicio);

    onChangeSeries(copia);
    setArrastrando(null);
  }

  const todosLosEjercicios = series.flatMap((s) => s.ejercicios);

  return (
    <div className="space-y-3">
      <h3 className="font-display text-sm uppercase tracking-tight text-muted">{diaNombre}</h3>

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
    </div>
  );
}
