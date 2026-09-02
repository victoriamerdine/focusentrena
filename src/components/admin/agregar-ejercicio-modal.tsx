"use client";

import { useState } from "react";

import { agregarEjercicioCatalogo } from "@/lib/admin-api";
import type { Catalogo } from "@/lib/admin-types";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none";

export interface EjercicioNuevo {
  categoria: string;
  musculo: string;
  nombre: string;
  link: string;
}

// Modal para agregar un ejercicio nuevo a la biblioteca compartida
// (EjerciciosConsolidado) — así el entrenador lo puede elegir de nuevo
// más adelante, para cualquier alumno. Patrón/Músculo salen de las
// listas ya existentes en el catálogo (no arma categorías nuevas); el
// nombre y el link se escriben a mano.
export function AgregarEjercicioModal({
  password,
  catalogo,
  onClose,
  onCreado,
}: {
  password: string;
  catalogo: Catalogo;
  onClose: () => void;
  onCreado: (nuevo: EjercicioNuevo) => void;
}) {
  const [categoria, setCategoria] = useState("");
  const [musculo, setMusculo] = useState("");
  const [nombre, setNombre] = useState("");
  const [link, setLink] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function guardar() {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      setError("Falta el nombre del ejercicio.");
      return;
    }
    setGuardando(true);
    setError("");
    const nuevo: EjercicioNuevo = {
      categoria: categoria.trim(),
      musculo: musculo.trim(),
      nombre: nombreLimpio,
      link: link.trim(),
    };
    try {
      await agregarEjercicioCatalogo(password, nuevo);
      onCreado(nuevo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
      setGuardando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-card p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="font-display text-base uppercase tracking-tight">Nuevo ejercicio</h3>
          <p className="text-xs text-muted">
            Se agrega a la biblioteca — vas a poder elegirlo de nuevo más adelante, para
            cualquier alumno.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-muted">Patrón</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {catalogo.patrones.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Músculo</label>
            <select
              value={musculo}
              onChange={(e) => setMusculo(e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {catalogo.musculos.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted">Nombre</label>
          <input
            type="text"
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del ejercicio"
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted">Link de video (opcional)</label>
          <input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </div>

        {error ? <p className="text-xs text-red-400">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm text-muted hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}
