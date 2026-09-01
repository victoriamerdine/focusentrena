import { ExerciseCard } from "@/components/exercise-card";
import { groupExercises } from "@/lib/group-exercises";
import type { Exercise } from "@/lib/types";

export function DayExercises({
  ejercicios,
  id,
  diaNombre,
}: {
  ejercicios: Exercise[];
  id?: string;
  diaNombre?: string;
}) {
  const groups = groupExercises(ejercicios);

  return (
    <div className="space-y-4">
      {groups.map((group, gi) =>
        group.label ? (
          <div key={gi}>
            <div
              className="mb-2 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wide"
              style={{ color: group.color ?? undefined }}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: group.color ?? undefined }}
              />
              {group.label} · alterná estos ejercicios
            </div>
            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              {group.items.map((ex, i) => (
                <div key={i} className="w-[82%] shrink-0 snap-start sm:w-[380px]">
                  <ExerciseCard exercise={ex} badge={String(i + 1)} id={id} diaNombre={diaNombre} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          group.items.map((ex, i) => (
            <ExerciseCard key={`${gi}-${i}`} exercise={ex} id={id} diaNombre={diaNombre} />
          ))
        )
      )}
    </div>
  );
}
