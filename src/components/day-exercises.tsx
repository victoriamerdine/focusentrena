import { ExerciseCard } from "@/components/exercise-card";
import { groupExercises } from "@/lib/group-exercises";
import type { Exercise } from "@/lib/types";

export function DayExercises({ ejercicios }: { ejercicios: Exercise[] }) {
  const groups = groupExercises(ejercicios);

  return (
    <>
      {groups.map((group, gi) =>
        group.label ? (
          <div
            key={gi}
            className="rounded-2xl border-2 p-3"
            style={{ borderColor: group.color ?? undefined }}
          >
            <div
              className="mb-2 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wide"
              style={{ color: group.color ?? undefined }}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: group.color ?? undefined }}
              />
              {group.label} · combinar en la misma serie
            </div>
            <div className="space-y-3">
              {group.items.map((ex, i) => (
                <ExerciseCard key={i} exercise={ex} />
              ))}
            </div>
          </div>
        ) : (
          group.items.map((ex, i) => <ExerciseCard key={`${gi}-${i}`} exercise={ex} />)
        )
      )}
    </>
  );
}
