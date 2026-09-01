"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { BadgeRenovacion } from "@/components/admin/badge-renovacion";
import { crearAlumno, eliminarAlumno } from "@/lib/admin-api";
import { formatearFecha } from "@/lib/format-fecha";
import type { AlumnoResumen } from "@/lib/admin-types";

export function AlumnoDashboard({
  password,
  alumnos,
  onAlumnoCreado,
  onAlumnoEliminado,
  onEditar,
}: {
  password: string;
  alumnos: AlumnoResumen[];
  onAlumnoCreado: (alumno: AlumnoResumen) => void;
  onAlumnoEliminado: (id: string) => void;
  onEditar: (alumno: AlumnoResumen) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [tipoPlan, setTipoPlan] = useState("Musculo");
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState("");
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  async function crear(e: FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setCreando(true);
    setErrorCrear("");
    try {
      const { alumno } = await crearAlumno(password, nombre.trim(), tipoPlan);
      onAlumnoCreado(alumno);
      setNombre("");
    } catch (err) {
      setErrorCrear(err instanceof Error ? err.message : "No se pudo crear.");
    } finally {
      setCreando(false);
    }
  }

  async function eliminar(id: string, nombreAlumno: string) {
    if (!confirm(`¿Borrar la rutina de ${nombreAlumno}? No se puede deshacer.`)) return;
    setEliminandoId(id);
    try {
      await eliminarAlumno(password, id);
      onAlumnoEliminado(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo eliminar.");
    } finally {
      setEliminandoId(null);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={crear} className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-display mb-3 text-lg uppercase tracking-tight">Nuevo alumno</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            type="text"
            placeholder="Nombre del alumno"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
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
            type="submit"
            disabled={creando}
            className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {creando ? "Creando..." : "Crear"}
          </button>
        </div>
        {errorCrear ? <p className="mt-2 text-sm text-red-400">{errorCrear}</p> : null}
      </form>

      <div className="space-y-2">
        {alumnos.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay alumnos cargados.</p>
        ) : (
          alumnos.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
            >
              <button type="button" onClick={() => onEditar(a)} className="min-w-0 flex-1 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold text-foreground">{a.alumno}</p>
                  {a.fechaCreacion ? <BadgeRenovacion fechaCreacion={a.fechaCreacion} /> : null}
                </div>
                <p className="truncate text-xs text-muted">
                  {a.tipoPlan || "—"} · /r/{a.id}
                  {a.fechaCreacion ? ` · Creado ${formatearFecha(a.fechaCreacion)}` : ""}
                </p>
              </button>
              <button
                type="button"
                onClick={() => eliminar(a.id, a.alumno)}
                disabled={eliminandoId === a.id}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-red-400 disabled:opacity-50"
                aria-label={`Eliminar rutina de ${a.alumno}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
