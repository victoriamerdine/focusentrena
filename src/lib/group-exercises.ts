import type { Exercise } from "@/lib/types";

export interface ExerciseGroup {
  color: string | null;
  label: string | null;
  items: Exercise[];
}

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function groupExercises(ejercicios: Exercise[]): ExerciseGroup[] {
  const groups: ExerciseGroup[] = [];

  for (const ex of ejercicios) {
    const color = ex.grupo || null;
    const last = groups[groups.length - 1];

    if (color && last && last.color === color) {
      last.items.push(ex);
    } else {
      groups.push({ color, label: null, items: [ex] });
    }
  }

  let letraIndex = 0;
  for (const group of groups) {
    if (group.color && group.items.length > 1) {
      group.label = `Serie ${LETRAS[letraIndex] ?? letraIndex + 1}`;
      letraIndex++;
    }
  }

  return groups;
}
