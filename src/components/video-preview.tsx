"use client";

import { Play, Video, X } from "lucide-react";
import { useState } from "react";

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:shorts\/|watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/
  );
  return match ? match[1] : null;
}

export function VideoPreview({
  url,
  grow = false,
  onRemove,
}: {
  url: string;
  // Por defecto se estira con self-stretch (para cuando VideoPreview es
  // hijo directo de una fila flex, como en la tarjeta del alumno — el
  // alto de la fila ya lo da el resto del contenido). grow usa flex-1 en
  // vez de self-stretch, para cuando el padre directo es una COLUMNA
  // flex (como en el panel del entrenador, con el label "Video" arriba)
  // — ahí lo que hace falta es crecer en el eje principal, no estirarse
  // en el cruzado.
  grow?: boolean;
  // Si se pasa, se muestra una "x" para quitar el video de este
  // ejercicio puntual (panel del entrenador) — el alumno nunca la ve.
  onRemove?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const videoId = getYouTubeId(url);
  const tamanoClase = grow ? "flex-1" : "self-stretch";
  // El tamaño (min-h/w/grow-o-stretch) vive en este div contenedor —
  // adentro, el thumbnail/link ocupa todo (h-full w-full) y la "x" de
  // sacar el video es un hermano posicionado encima, no anidado dentro
  // del botón que abre el video (no se puede anidar <button>).
  const contenedorClase = `relative min-h-24 w-20 shrink-0 ${tamanoClase} sm:min-h-28 sm:w-24`;

  function BotonQuitar() {
    if (!onRemove) return null;
    return (
      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow"
        aria-label="Quitar video de este ejercicio"
        title="Quitar video"
      >
        <X className="h-3 w-3" />
      </button>
    );
  }

  if (!videoId) {
    return (
      <div className={contenedorClase}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-full w-full items-center justify-center rounded-lg bg-primary text-primary-foreground"
          aria-label="Ver video"
        >
          <Video className="h-5 w-5" strokeWidth={2.5} />
        </a>
        <BotonQuitar />
      </div>
    );
  }

  const isShort = url.includes("/shorts/");

  return (
    <div className={contenedorClase}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block h-full w-full overflow-hidden rounded-lg bg-black"
        aria-label="Reproducir video"
      >
        <img
          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
          alt=""
          className="h-full w-full object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <Play className="h-3.5 w-3.5 translate-x-0.5" fill="currentColor" />
          </span>
        </span>
      </button>

      <BotonQuitar />

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className={`relative w-full max-w-xs overflow-hidden rounded-xl bg-black ${
              isShort ? "aspect-[9/16]" : "aspect-video"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1`}
              className="h-full w-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title="Video del ejercicio"
            />
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
