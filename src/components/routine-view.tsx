"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { DayExercises } from "@/components/day-exercises";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { APPS_SCRIPT_URL } from "@/lib/config";
import { readCachedRoutine, writeCachedRoutine } from "@/lib/routine-cache";
import type { Routine } from "@/lib/types";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; routine: Routine; refreshing: boolean };

function getIdFromPath(): string {
  const segments = window.location.pathname.split("/").filter(Boolean);
  const rIndex = segments.indexOf("r");
  if (rIndex === -1 || rIndex === segments.length - 1) return "";
  return decodeURIComponent(segments[rIndex + 1]);
}

export function RoutineView() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const id = getIdFromPath();

    if (!id) {
      setState({ status: "error", message: "Link inválido: falta el identificador de la rutina." });
      return;
    }

    if (!APPS_SCRIPT_URL) {
      setState({
        status: "error",
        message: "La app todavía no está configurada (falta la URL del backend).",
      });
      return;
    }

    // Si ya vimos esta rutina antes en este dispositivo, se muestra al
    // instante mientras se pide la versión actualizada en segundo plano.
    const cached = readCachedRoutine(id);
    if (cached) {
      setState({ status: "ready", routine: cached, refreshing: true });
    }

    const controller = new AbortController();

    fetch(`${APPS_SCRIPT_URL}?id=${encodeURIComponent(id)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(
            data.error === "not_found"
              ? "No encontramos una rutina con ese link."
              : "No se pudo cargar la rutina."
          );
        }
        writeCachedRoutine(id, data as Routine);
        setState({ status: "ready", routine: data as Routine, refreshing: false });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState((prev) => {
          // ya había datos en caché mostrados: no los tapamos con un error,
          // simplemente se deja de intentar actualizar en segundo plano.
          if (prev.status === "ready") return { ...prev, refreshing: false };
          const message = err instanceof Error ? err.message : "No se pudo cargar la rutina.";
          return { status: "error", message };
        });
      });

    return () => controller.abort();
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted">Cargando tu rutina...</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertTriangle className="h-8 w-8 text-primary" />
        <p className="max-w-sm text-sm text-muted">{state.message}</p>
      </div>
    );
  }

  const { routine, refreshing } = state;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 pb-16 pt-10 sm:px-6">
      <header className="space-y-1">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
          Focus Entrena
          {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        </p>
        <h1 className="font-display text-3xl tracking-tight">
          Hola {routine.alumno}
        </h1>
        {routine.tipoPlan ? (
          <p className="text-sm text-muted">
            Plan: <span className="text-foreground">{routine.tipoPlan}</span>
          </p>
        ) : null}
      </header>

      {routine.dias.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay días cargados en esta rutina.</p>
      ) : (
        <Tabs defaultValue={routine.dias[0].nombre}>
          <TabsList>
            {routine.dias.map((dia) => (
              <TabsTrigger key={dia.nombre} value={dia.nombre}>
                {dia.nombre}
              </TabsTrigger>
            ))}
          </TabsList>

          {routine.dias.map((dia) => (
            <TabsContent key={dia.nombre} value={dia.nombre} className="space-y-3">
              {dia.ejercicios.length === 0 ? (
                <p className="text-sm text-muted">Sin ejercicios cargados para este día.</p>
              ) : (
                <DayExercises ejercicios={dia.ejercicios} />
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </main>
  );
}
