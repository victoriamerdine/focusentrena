"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

// Quita tildes para que buscar "sentadilla" encuentre "SENTADILLA" y
// buscar sin tilde encuentre nombres con tilde (o viceversa).
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Select con buscador: un <input> de texto en vez del <select> nativo, para
// poder filtrar tipeando en listas largas (como el catálogo de ejercicios).
export function SearchableSelect({
  label,
  value,
  options,
  onChange,
  disabled,
  placeholder = "Buscar...",
  allowCustom = false,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  // Si no hay ninguna opción que coincida exacto con lo tipeado, deja
  // usarlo tal cual (sin que esté en el catálogo) — para un nombre
  // puntual que el entrenador no quiere agregar a la biblioteca.
  allowCustom?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [resaltado, setResaltado] = useState(0);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtradas = busqueda
    ? options.filter((o) => normalizar(o).includes(normalizar(busqueda)))
    : options;

  const busquedaLimpia = busqueda.trim();
  const hayCoincidenciaExacta = options.some((o) => normalizar(o) === normalizar(busquedaLimpia));
  const mostrarOpcionCustom = allowCustom && busquedaLimpia !== "" && !hayCoincidenciaExacta;
  const totalOpciones = filtradas.length + (mostrarOpcionCustom ? 1 : 0);

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
        setBusqueda("");
      }
    }
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  useEffect(() => {
    setResaltado(0);
  }, [busqueda, abierto]);

  function elegir(opcion: string) {
    onChange(opcion);
    setBusqueda("");
    setAbierto(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!abierto) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setAbierto(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setResaltado((r) => Math.min(r + 1, totalOpciones - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setResaltado((r) => Math.max(r - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (resaltado < filtradas.length) {
        if (filtradas[resaltado]) elegir(filtradas[resaltado]);
      } else if (mostrarOpcionCustom) {
        elegir(busquedaLimpia);
      }
    } else if (e.key === "Escape") {
      setAbierto(false);
      setBusqueda("");
      inputRef.current?.blur();
    }
  }

  return (
    <div ref={contenedorRef} className="relative">
      <label className="mb-1 block text-xs text-muted">{label}</label>
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none disabled:opacity-50"
        value={abierto ? busqueda : value}
        placeholder={value ? undefined : placeholder}
        onFocus={() => {
          setAbierto(true);
          setBusqueda("");
        }}
        onChange={(e) => setBusqueda(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {abierto ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-card py-1 text-sm shadow-lg">
          {value ? (
            <li>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir("")}
                className="w-full px-3 py-1.5 text-left text-muted hover:bg-white/5"
              >
                — (vaciar)
              </button>
            </li>
          ) : null}
          {filtradas.length === 0 && !mostrarOpcionCustom ? (
            <li className="px-3 py-1.5 text-muted">Sin resultados</li>
          ) : (
            filtradas.map((opcion, i) => (
              <li key={opcion}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => elegir(opcion)}
                  className={cn(
                    "w-full px-3 py-1.5 text-left hover:bg-white/5",
                    i === resaltado && "bg-white/10",
                    opcion === value && "text-primary"
                  )}
                >
                  {opcion}
                </button>
              </li>
            ))
          )}
          {mostrarOpcionCustom ? (
            <li>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(busquedaLimpia)}
                className={cn(
                  "w-full px-3 py-1.5 text-left text-primary hover:bg-white/5",
                  resaltado === filtradas.length && "bg-white/10"
                )}
              >
                Usar «{busquedaLimpia}» tal cual
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
