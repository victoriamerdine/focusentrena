"use client";

import { ArrowLeft, Pencil, Plus, Save, Trash2, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AgregarEjercicioModal } from "@/components/admin/agregar-ejercicio-modal";
import {
  editarEjercicioCatalogo,
  eliminarEjercicioCatalogo,
  listarEjerciciosCatalogo,
} from "@/lib/admin-api";
import { agregarAlCatalogoEnMemoria } from "@/lib/catalogo";
import type { Catalogo, EjercicioCatalogo } from "@/lib/admin-types";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none";

// Igual que el normalizar de SearchableSelect — sin tildes ni mayúsculas,
// para que buscar "sentadilla" encuentre "SENTADILLA".
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function BibliotecaEjercicios({
  password,
  catalogo,
  onVolver,
  onCatalogoActualizado,
}: {
  password: string;
  catalogo: Catalogo;
  onVolver: () => void;
  onCatalogoActualizado: (catalogo: Catalogo) => void;
}) {
  const [ejercicios, setEjercicios] = useState<EjercicioCatalogo[] | null>(null);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroPatron, setFiltroPatron] = useState("");
  const [filtroMusculo, setFiltroMusculo] = useState("");
  const [mostrarAgregar, setMostrarAgregar] = useState(false);
  const [editandoFila, setEditandoFila] = useState<number | null>(null);

  useEffect(() => {
    listarEjerciciosCatalogo(password)
      .then(({ ejercicios }) => setEjercicios(ejercicios))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar."));
  }, [password]);

  const filtrados = useMemo(() => {
    if (!ejercicios) return [];
    const busquedaNorm = normalizar(busqueda.trim());
    return ejercicios.filter((ex) => {
      if (filtroPatron && ex.categoria !== filtroPatron) return false;
      if (filtroMusculo && ex.musculo !== filtroMusculo) return false;
      if (busquedaNorm && !normalizar(ex.nombre).includes(busquedaNorm)) return false;
      return true;
    });
  }, [ejercicios, busqueda, filtroPatron, filtroMusculo]);

  async function eliminar(ex: EjercicioCatalogo) {
    if (!confirm(`¿Borrar "${ex.nombre}" de la biblioteca? No se puede deshacer.`)) return;
    try {
      await eliminarEjercicioCatalogo(password, ex.fila);
      setEjercicios((prev) => (prev ? prev.filter((e) => e.fila !== ex.fila) : prev));
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo borrar.");
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onVolver}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg uppercase tracking-tight">Biblioteca de ejercicios</h2>
          <p className="text-xs text-muted">
            Todos los ejercicios disponibles para armar planes — buscá, filtrá, editá o borrá.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMostrarAgregar(true)}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Agregar ejercicio
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <input
          type="text"
          placeholder="Buscar ejercicio..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className={inputClass}
        />
        <select
          value={filtroPatron}
          onChange={(e) => setFiltroPatron(e.target.value)}
          className={inputClass}
        >
          <option value="">Todos los patrones</option>
          {catalogo.patrones.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={filtroMusculo}
          onChange={(e) => setFiltroMusculo(e.target.value)}
          className={inputClass}
        >
          <option value="">Todos los músculos</option>
          {catalogo.musculos.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {!ejercicios && !error ? <p className="text-sm text-muted">Cargando...</p> : null}

      {ejercicios ? (
        <>
          <p className="text-xs text-muted">
            {filtrados.length} de {ejercicios.length} ejercicios
          </p>
          <div className="space-y-1.5">
            {filtrados.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted">
                Sin resultados.
              </p>
            ) : (
              filtrados.map((ex) =>
                editandoFila === ex.fila ? (
                  <FilaEdicion
                    key={ex.fila}
                    ejercicio={ex}
                    catalogo={catalogo}
                    password={password}
                    onGuardado={(actualizado) => {
                      setEjercicios((prev) =>
                        prev ? prev.map((e) => (e.fila === ex.fila ? actualizado : e)) : prev
                      );
                      setEditandoFila(null);
                    }}
                    onCancelar={() => setEditandoFila(null)}
                  />
                ) : (
                  <FilaEjercicio
                    key={ex.fila}
                    ejercicio={ex}
                    onEditar={() => setEditandoFila(ex.fila)}
                    onEliminar={() => eliminar(ex)}
                  />
                )
              )
            )}
          </div>
        </>
      ) : null}

      {mostrarAgregar ? (
        <AgregarEjercicioModal
          password={password}
          catalogo={catalogo}
          onClose={() => setMostrarAgregar(false)}
          onCreado={(nuevo) => {
            onCatalogoActualizado(agregarAlCatalogoEnMemoria(catalogo, nuevo));
            setEjercicios((prev) => (prev ? [...prev, nuevo] : prev));
            setMostrarAgregar(false);
          }}
        />
      ) : null}
    </div>
  );
}

function FilaEjercicio({
  ejercicio,
  onEditar,
  onEliminar,
}: {
  ejercicio: EjercicioCatalogo;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-card px-3 py-2 text-sm">
      <span className="min-w-0 flex-1 truncate font-semibold text-foreground">
        {ejercicio.nombre}
      </span>
      <span className="shrink-0 text-xs text-muted">{ejercicio.categoria || "—"}</span>
      <span className="shrink-0 text-xs text-muted">{ejercicio.musculo || "—"}</span>
      {ejercicio.link ? (
        <a
          href={ejercicio.link}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-primary"
          aria-label={`Ver video de ${ejercicio.nombre}`}
        >
          <Video className="h-4 w-4" />
        </a>
      ) : null}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onEditar}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-primary"
          aria-label={`Editar ${ejercicio.nombre}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onEliminar}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-red-400"
          aria-label={`Borrar ${ejercicio.nombre}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function FilaEdicion({
  ejercicio,
  catalogo,
  password,
  onGuardado,
  onCancelar,
}: {
  ejercicio: EjercicioCatalogo;
  catalogo: Catalogo;
  password: string;
  onGuardado: (actualizado: EjercicioCatalogo) => void;
  onCancelar: () => void;
}) {
  const [categoria, setCategoria] = useState(ejercicio.categoria);
  const [musculo, setMusculo] = useState(ejercicio.musculo);
  const [nombre, setNombre] = useState(ejercicio.nombre);
  const [link, setLink] = useState(ejercicio.link);
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
    const datos = {
      fila: ejercicio.fila,
      categoria: categoria.trim(),
      musculo: musculo.trim(),
      nombre: nombreLimpio,
      link: link.trim(),
    };
    try {
      await editarEjercicioCatalogo(password, datos);
      onGuardado(datos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-primary bg-card p-3 text-sm">
      <div className="grid gap-2 sm:grid-cols-2">
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className={inputClass}>
          <option value="">—</option>
          {catalogo.patrones.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select value={musculo} onChange={(e) => setMusculo(e.target.value)} className={inputClass}>
          <option value="">—</option>
          {catalogo.musculos.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <input
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre del ejercicio"
        className={inputClass}
      />
      <input
        type="text"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="Link de video (opcional)"
        className={inputClass}
      />
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-full px-3 py-1.5 text-xs text-muted hover:text-foreground"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {guardando ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}
