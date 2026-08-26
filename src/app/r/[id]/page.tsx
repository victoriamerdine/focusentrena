import { RoutineView } from "@/components/routine-view";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function RoutinePage() {
  return <RoutineView />;
}
