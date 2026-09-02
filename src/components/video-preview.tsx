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
}) {
  const [open, setOpen] = useState(false);
  const videoId = getYouTubeId(url);
  const tamanoClase = grow ? "flex-1" : "self-stretch";

  if (!videoId) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex min-h-24 w-20 shrink-0 items-center justify-center ${tamanoClase} rounded-lg bg-primary text-primary-foreground sm:min-h-28 sm:w-24`}
        aria-label="Ver video"
      >
        <Video className="h-5 w-5" strokeWidth={2.5} />
      </a>
    );
  }

  const isShort = url.includes("/shorts/");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        // Altura: self-stretch o flex-1 según el contexto (ver arriba) en
        // vez de una altura fija, para que ocupe todo el alto disponible
        // junto a un bloque de contenido más alto (por ejemplo, con las
        // notas del alumno debajo) en vez de quedar corto. min-h como
        // piso por si el contenido de al lado es más bajo que un
        // thumbnail.
        className={`group relative block min-h-24 w-20 shrink-0 ${tamanoClase} overflow-hidden rounded-lg bg-black sm:min-h-28 sm:w-24`}
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
    </>
  );
}
