"use client";

import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";

import { AlumnoDashboard } from "@/components/admin/alumno-dashboard";
import { LoginScreen } from "@/components/admin/login-screen";
import { RoutineEditor } from "@/components/admin/routine-editor";
import { AdminApiError, cargarPanel } from "@/lib/admin-api";
import { clearStoredPassword, getStoredPassword, setStoredPassword } from "@/lib/admin-auth";
import type { AlumnoResumen, Catalogo } from "@/lib/admin-types";

type Estado =
  | { vista: "cargando" }
  | { vista: "login"; error: string }
  | { vista: "dashboard"; password: string; alumnos: AlumnoResumen[]; catalogo: Catalogo }
  | {
      vista: "editor";
      password: string;
      alumnos: AlumnoResumen[];
      catalogo: Catalogo;
      alumno: AlumnoResumen;
    };

function ordenarAlumnos(alumnos: AlumnoResumen[]): AlumnoResumen[] {
  return [...alumnos].sort((a, b) => a.alumno.localeCompare(b.alumno, "es", { sensitivity: "base" }));
}

export function AdminApp() {
  const [estado, setEstado] = useState<Estado>({ vista: "cargando" });
  const [loginCargando, setLoginCargando] = useState(false);

  useEffect(() => {
    const guardada = getStoredPassword();
    if (!guardada) {
      setEstado({ vista: "login", error: "" });
      return;
    }
    cargarSesion(guardada);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarSesion(password: string) {
    try {
      const { alumnos, catalogo } = await cargarPanel(password);
      setStoredPassword(password);
      setEstado({ vista: "dashboard", password, alumnos: ordenarAlumnos(alumnos), catalogo });
    } catch (err) {
      clearStoredPassword();
      const mensaje = err instanceof AdminApiError ? err.message : "No se pudo conectar.";
      setEstado({ vista: "login", error: mensaje });
    }
  }

  async function handleLogin(password: string) {
    setLoginCargando(true);
    await cargarSesion(password);
    setLoginCargando(false);
  }

  function salir() {
    clearStoredPassword();
    setEstado({ vista: "login", error: "" });
  }

  if (estado.vista === "cargando") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted">Cargando...</p>
      </div>
    );
  }

  if (estado.vista === "login") {
    return <LoginScreen onSubmit={handleLogin} cargando={loginCargando} error={estado.error} />;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 pb-16 pt-10 sm:px-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Focus Entrena</p>
          <h1 className="font-display text-2xl tracking-tight">Panel del entrenador</h1>
        </div>
        <button
          type="button"
          onClick={salir}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Salir
        </button>
      </header>

      {estado.vista === "dashboard" ? (
        <AlumnoDashboard
          password={estado.password}
          alumnos={estado.alumnos}
          onAlumnoCreado={(alumno) => {
            const s = estado;
            setEstado({ ...s, alumnos: ordenarAlumnos([...s.alumnos, alumno]) });
          }}
          onAlumnoEliminado={(id) => {
            const s = estado;
            setEstado({ ...s, alumnos: s.alumnos.filter((a) => a.id !== id) });
          }}
          onEditar={(alumno) => {
            const s = estado;
            setEstado({ ...s, vista: "editor", alumno });
          }}
        />
      ) : (
        <RoutineEditor
          password={estado.password}
          alumno={estado.alumno}
          catalogo={estado.catalogo}
          onVolver={() => {
            const s = estado;
            setEstado({ vista: "dashboard", password: s.password, alumnos: s.alumnos, catalogo: s.catalogo });
          }}
          onAlumnoActualizado={(alumnoActualizado) => {
            const s = estado;
            setEstado({
              ...s,
              alumno: alumnoActualizado,
              alumnos: ordenarAlumnos(
                s.alumnos.map((a) => (a.id === alumnoActualizado.id ? alumnoActualizado : a))
              ),
            });
          }}
          onAlumnoEliminado={(id) => {
            const s = estado;
            setEstado({
              vista: "dashboard",
              password: s.password,
              alumnos: s.alumnos.filter((a) => a.id !== id),
              catalogo: s.catalogo,
            });
          }}
          onAlumnoDuplicado={(nuevo) => {
            const s = estado;
            setEstado({ ...s, alumnos: ordenarAlumnos([...s.alumnos, nuevo]) });
          }}
        />
      )}
    </main>
  );
}
