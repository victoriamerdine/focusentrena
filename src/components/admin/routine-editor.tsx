"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { DayEditor } from "@/components/admin/day-editor";
import { actualizarAlumno, guardarDia, obtenerRutina } from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import type { AlumnoResumen, Catalogo } from "@/lib/admin-types";
import type { Exercise, Routine } from "@/lib/types";

export function RoutineEditor({
  password,
  alumno,
  catalogo,
  onVolver,
  onAlumnoActualizado,
}: {
  password: string;
  alumno: AlumnoResumen;
  catalogo: Catalogo;
  onVolver: () => void;
  onAlumnoActualizado: (alumno: AlumnoResumen) => void;
}) {
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [error, setError] = useState("");
  const [diaActivo, setDiaActivo] = useState<string | null>(null);

  const [nombre, setNombre] = useState(alumno.alumno);
  const [tipoPlan, setTipoPlan] = useState(alumno.tipoPlan || "Musculo");
  const [guardandoDatos, setGuardandoDatos] = useState(false);
  const [mensajeDatos, setMensajeDatos] = useState("");

  useEffect(() => {
    obtenerRutina(alumno.id)
      .then((r) => {
        setRoutine(r);
        setDiaActivo(r.dias[0]?.nombre ?? null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "No se pudo cargar la rutina.")
      );
  }, [alumno.id]);

  async function guardarDatosAlumno() {
    setGuardandoDatos(true);
    setMensajeDatos("");
    try {
      await actualizarAlumno(password, alumno.id, { nombreAlumno: nombre, tipoPlan });
      onAlumnoActualizado({ ...alumno, alumno: nombre, tipoPlan });
      setMensajeDatos("Guardado.");
    } catch (err) {
      setMensajeDatos(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardandoDatos(false);
    }
  }

  async function handleGuardarDia(diaNombre: string, ejercicios: Exercise[]) {
    await guardarDia(password, alumno.id, diaNombre, ejercicios);
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
        {mensajeDatos ? <p className="mt-2 text-sm text-muted">{mensajeDatos}</p> : null}
        <p className="mt-2 text-xs text-muted">
          Link del alumno: <code>focus-entrena.web.app/r/{alumno.id}</code>
        </p>
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
          <div className="flex flex-wrap gap-2">
            {routine.dias.map((dia) => (
              <button
                key={dia.nombre}
                type="button"
                onClick={() => setDiaActivo(dia.nombre)}
                className={cn(
                  "rounded-full border border-border px-4 py-1.5 text-sm font-medium text-muted transition-colors",
                  diaActivo === dia.nombre && "border-primary bg-primary text-primary-foreground"
                )}
              >
                {dia.nombre}
              </button>
            ))}
          </div>

          {routine.dias
            .filter((dia) => dia.nombre === diaActivo)
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
      ) : null}
    </div>
  );
}
