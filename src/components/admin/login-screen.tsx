"use client";

import { Loader2, Lock } from "lucide-react";
import { useState, type FormEvent } from "react";

export function LoginScreen({
  onSubmit,
  cargando,
  error,
}: {
  onSubmit: (password: string) => void;
  cargando: boolean;
  error: string;
}) {
  const [password, setPassword] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(password);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      <h1 className="font-display text-2xl tracking-tight">Panel del entrenador</h1>
      <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          autoFocus
          className="rounded-lg border border-border bg-card px-3 py-2 text-center text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={cargando || !password}
          className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Entrar
        </button>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </form>
    </div>
  );
}
