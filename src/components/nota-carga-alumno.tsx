"use client";

import { useRef, useState } from "react";

import { guardarNotaAlumno } from "@/lib/student-api";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none";

// Campos donde el alumno anota, para sí mismo, con cuánta carga hizo el
// ejercicio y cómo le fue. Se guardan solos al salir del campo (sin botón
// de guardar) — son datos personales de bajo riesgo, no hace falta
// confirmación extra.
export function NotaCargaAlumno({
  id,
  diaNombre,
  indice,
  notaInicial,
  cargaInicial,
}: {
  id: string;
  diaNombre: string;
  indice: number;
  notaInicial: string;
  cargaInicial: string;
}) {
  const [nota, setNota] = useState(notaInicial);
  const [carga, setCarga] = useState(cargaInicial);
  const [estado, setEstado] = useState<"idle" | "guardando" | "ok" | "error">("idle");
  const ultimoGuardado = useRef({ nota: notaInicial, carga: cargaInicial });

  async function guardar(nuevaNota: string, nuevaCarga: string) {
    if (ultimoGuardado.current.nota === nuevaNota && ultimoGuardado.current.carga === nuevaCarga) {
      return; // nada cambió desde el último guardado, no repetir el pedido
    }
    setEstado("guardando");
    try {
      await guardarNotaAlumno(id, diaNombre, indice, nuevaNota, nuevaCarga);
      ultimoGuardado.current = { nota: nuevaNota, carga: nuevaCarga };
      setEstado("ok");
    } catch {
      setEstado("error");
    }
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
      <div>
        <label className="mb-1 block text-xs text-muted">Mi carga</label>
        <input
          type="text"
          className={inputClass}
          value={carga}
          placeholder="Ej: 20kg"
          onChange={(e) => setCarga(e.target.value)}
          onBlur={() => guardar(nota, carga)}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted">Mi nota</label>
        <input
          type="text"
          className={inputClass}
          value={nota}
          placeholder="Cómo te sentiste..."
          onChange={(e) => setNota(e.target.value)}
          onBlur={() => guardar(nota, carga)}
        />
      </div>
      {estado === "guardando" ? (
        <p className="col-span-2 text-xs text-muted">Guardando...</p>
      ) : null}
      {estado === "error" ? (
        <p className="col-span-2 text-xs text-red-400">No se pudo guardar, probá de nuevo.</p>
      ) : null}
    </div>
  );
}
