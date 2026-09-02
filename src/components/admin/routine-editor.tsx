"use client";

import { ArrowLeft, Files, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { BadgeRenovacion } from "@/components/admin/badge-renovacion";
import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { DayEditor } from "@/components/admin/day-editor";
import { WeekSummary } from "@/components/admin/week-summary";
import {
  actualizarAlumno,
  duplicarAlumno,
  eliminarAlumno,
  guardarDia,
  obtenerRutina,
} from "@/lib/admin-api";
import { linkAlumno } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { AlumnoResumen, Catalogo } from "@/lib/admin-types";
import type { Exercise, Routine } from "@/lib/types";

export function RoutineEditor({
  password,
  alumno,
  catalogo,
  onVolver,
  onAlumnoActualizado,
  onAlumnoEliminado,
  onAlumnoDuplicado,
}: {
  password: string;
  alumno: AlumnoResumen;
  catalogo: Catalogo;
  onVolver: () => void;
  onAlumnoActualizado: (alumno: AlumnoResumen) => void;
  onAlumnoEliminado: (id: string) => void;
  onAlumnoDuplicado: (alumno: AlumnoResumen) => void;
}) {
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [error, setError] = useState("");
  // Hasta 2 días abiertos a la vez, para poder cargar/comparar dos días sin
  // ir cambiando de tab todo el tiempo.
  const [diasActivos, setDiasActivos] = useState<string[]>([]);

  const [nombre, setNombre] = useState(alumno.alumno);
  const [tipoPlan, setTipoPlan] = useState(alumno.tipoPlan || "Musculo");
  const [fechaCreacion, setFechaCreacion] = useState(alumno.fechaCreacion || "");
  const [guardandoDatos, setGuardandoDatos] = useState(false);
  const [mensajeDatos, setMensajeDatos] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [duplicando, setDuplicando] = useState(false);
  const [mensajeDuplicar, setMensajeDuplicar] = useState("");

  useEffect(() => {
    obtenerRutina(alumno.id)
      .then((r) => {
        setRoutine(r);
        setDiasActivos(r.dias[0] ? [r.dias[0].nombre] : []);
        // la rutina completa trae la fecha más al día que el listado
        // (que puede venir de un caché de 60s).
        if (r.fechaCreacion) setFechaCreacion(r.fechaCreacion);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "No se pudo cargar la rutina.")
      );
  }, [alumno.id]);

  async function guardarDatosAlumno() {
    setGuardandoDatos(true);
    setMensajeDatos("");
    try {
      await actualizarAlumno(password, alumno.id, { nombreAlumno: nombre, tipoPlan, fechaCreacion });
      onAlumnoActualizado({ ...alumno, alumno: nombre, tipoPlan, fechaCreacion });
      setMensajeDatos("Guardado.");
    } catch (err) {
      setMensajeDatos(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardandoDatos(false);
    }
  }

  async function duplicar() {
    const nombreNuevo = window.prompt(
      `Nombre para la copia de "${alumno.alumno}":`,
      `${alumno.alumno} (copia)`
    );
    if (!nombreNuevo || !nombreNuevo.trim()) return;
    setDuplicando(true);
    setMensajeDuplicar("");
    try {
      const { alumno: nuevo } = await duplicarAlumno(password, alumno.id, nombreNuevo.trim());
      onAlumnoDuplicado(nuevo);
      setMensajeDuplicar(`Se creó "${nuevo.alumno}".`);
    } catch (err) {
      setMensajeDuplicar(err instanceof Error ? err.message : "No se pudo duplicar.");
    } finally {
      setDuplicando(false);
    }
  }

  async function eliminarAlumnoActual() {
    if (!confirm(`¿Borrar la rutina de ${alumno.alumno}? No se puede deshacer.`)) return;
    setEliminando(true);
    try {
      await eliminarAlumno(password, alumno.id);
      onAlumnoEliminado(alumno.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo eliminar.");
      setEliminando(false);
    }
  }

  function toggleDia(nombre: string) {
    setDiasActivos((prev) => {
      if (prev.includes(nombre)) {
        // no permitir quedar sin ningún día abierto
        const next = prev.filter((d) => d !== nombre);
        return next.length > 0 ? next : prev;
      }
      if (prev.length >= 2) {
        // ya hay 2 abiertos: entra el nuevo, sale el que se abrió primero
        return [prev[1], nombre];
      }
      return [...prev, nombre];
    });
  }

  async function handleGuardarDia(diaNombre: string, ejercicios: Exercise[]) {
    await guardarDia(password, alumno.id, diaNombre, ejercicios);
    // así el resumen semanal refleja lo recién guardado sin esperar a
    // recargar toda la rutina.
    setRoutine((prev) =>
      prev
        ? {
            ...prev,
            dias: prev.dias.map((d) => (d.nombre === diaNombre ? { ...d, ejercicios } : d)),
          }
        : prev
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onVolver}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </button>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display mb-3 text-lg uppercase tracking-tight">Datos del alumno</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <select
            value={tipoPlan}
            onChange={(e) => setTipoPlan(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="Musculo">Musculo</option>
            <option value="Patrones">Patrones</option>
          </select>
          <button
            type="button"
            onClick={guardarDatosAlumno}
            disabled={guardandoDatos}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {guardandoDatos ? "Guardando..." : "Guardar"}
          </button>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs text-muted">
            Fecha de creación del plan (para saber cuándo renovarlo)
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={fechaCreacion}
              onChange={(e) => setFechaCreacion(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
            {fechaCreacion ? <BadgeRenovacion fechaCreacion={fechaCreacion} /> : null}
          </div>
        </div>

        {mensajeDatos ? <p className="mt-2 text-sm text-muted">{mensajeDatos}</p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>Link del alumno:</span>
          <a
            href={linkAlumno(alumno.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {linkAlumno(alumno.id)}
          </a>
          <CopyLinkButton url={linkAlumno(alumno.id)} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-3">
          <button
            type="button"
            onClick={duplicar}
            disabled={duplicando}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-primary disabled:opacity-50"
          >
            <Files className="h-4 w-4" />
            {duplicando ? "Duplicando..." : "Duplicar plan"}
          </button>
          <button
            type="button"
            onClick={eliminarAlumnoActual}
            disabled={eliminando}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-red-400 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {eliminando ? "Eliminando..." : "Eliminar alumno"}
          </button>
        </div>
        {mensajeDuplicar ? <p className="mt-2 text-sm text-muted">{mensajeDuplicar}</p> : null}
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {!routine && !error ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando ejercicios...
        </div>
      ) : null}

      {routine ? (
        <div className="space-y-4">
          <WeekSummary dias={routine.dias} />

          <div className="flex flex-wrap items-center gap-2">
            {routine.dias.map((dia) => (
              <button
                key={dia.nombre}
                type="button"
                onClick={() => toggleDia(dia.nombre)}
                className={cn(
                  "rounded-full border border-border px-4 py-1.5 text-sm font-medium text-muted transition-colors",
                  diasActivos.includes(dia.nombre) && "border-primary bg-primary text-primary-foreground"
                )}
              >
                {dia.nombre}
              </button>
            ))}
            <span className="text-xs text-muted">Podés tener 2 días abiertos a la vez</span>
          </div>

          <div className={cn("grid gap-4", diasActivos.length > 1 && "lg:grid-cols-2")}>
            {routine.dias
              .filter((dia) => diasActivos.includes(dia.nombre))
              .map((dia) => (
                <DayEditor
                  key={dia.nombre}
                  diaNombre={dia.nombre}
                  ejerciciosIniciales={dia.ejercicios}
                  tipoPlan={tipoPlan}
                  catalogo={catalogo}
                  onGuardar={handleGuardarDia}
                />
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
