"use client";

import { Send } from "lucide-react";
import { useState } from "react";

import { guardarNotaAlumno } from "@/lib/student-api";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none";

interface Entrada {
  carga: string;
  nota: string;
}

// La celda de Sheets guarda un renglón por envío (separados por salto de
// línea) — acá se parte en entradas para mostrarlas como historial. Carga
// y nota siempre tienen la misma cantidad de renglones porque el backend
// agrega uno a cada una por cada "Enviar" (ver manejarGuardarNotaAlumno).
function parsearHistorial(cargaCelda: string, notaCelda: string): Entrada[] {
  const cargas = cargaCelda ? cargaCelda.split("\n") : [];
  const notas = notaCelda ? notaCelda.split("\n") : [];
  const total = Math.max(cargas.length, notas.length);
  const entradas: Entrada[] = [];
  for (let i = 0; i < total; i++) {
    entradas.push({ carga: cargas[i] ?? "", nota: notas[i] ?? "" });
  }
  return entradas;
}

// Carga y nota que el alumno anota, para sí mismo, por ejercicio. Cada
// "Enviar" agrega un renglón nuevo (no pisa lo anterior) — así queda un
// historial de cómo le fue cada vez que hizo ese ejercicio. Lo ya
// enviado se muestra fijo (no editable); los campos de arriba quedan
// libres para cargar el próximo.
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
  const [historial, setHistorial] = useState<Entrada[]>(() =>
    parsearHistorial(cargaInicial, notaInicial)
  );
  const [carga, setCarga] = useState("");
  const [nota, setNota] = useState("");
  const [estado, setEstado] = useState<"idle" | "enviando" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function enviar() {
    const cargaLimpia = carga.trim();
    const notaLimpia = nota.trim();
    if (!cargaLimpia && !notaLimpia) return;

    setEstado("enviando");
    setErrorMsg("");
    try {
      await guardarNotaAlumno(id, diaNombre, indice, notaLimpia, cargaLimpia);
      setHistorial((prev) => [...prev, { carga: cargaLimpia, nota: notaLimpia }]);
      setCarga("");
      setNota("");
      setEstado("idle");
    } catch (err) {
      setEstado("error");
      setErrorMsg(err instanceof Error ? err.message : "No se pudo guardar.");
    }
  }

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      {historial.length > 0 ? (
        <div className="space-y-1.5">
          {historial.map((entrada, i) => (
            <div key={i} className="rounded-lg bg-white/5 px-2.5 py-1.5 text-sm">
              {entrada.carga ? (
                <span className="font-semibold text-foreground">{entrada.carga}</span>
              ) : null}
              {entrada.carga && entrada.nota ? <span className="text-muted"> · </span> : null}
              {entrada.nota ? <span className="text-muted">{entrada.nota}</span> : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted">Mi carga</label>
          <input
            type="text"
            className={inputClass}
            value={carga}
            placeholder="Ej: 20kg"
            onChange={(e) => setCarga(e.target.value)}
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
          />
        </div>
      </div>

      <button
        type="button"
        onClick={enviar}
        disabled={estado === "enviando" || (!carga.trim() && !nota.trim())}
        className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
      >
        <Send className="h-3.5 w-3.5" />
        {estado === "enviando" ? "Enviando..." : "Enviar"}
      </button>

      {estado === "error" ? <p className="text-xs text-red-400">{errorMsg}</p> : null}
    </div>
  );
}
