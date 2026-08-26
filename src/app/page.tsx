import { Dumbbell } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Dumbbell className="h-8 w-8 text-primary" strokeWidth={2.5} />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">FOCUS ENTRENA</h1>
        <p className="max-w-sm text-sm text-muted">
          Ingresá con el link privado que te compartió tu entrenador para ver
          tu rutina.
        </p>
      </div>
    </main>
  );
}
