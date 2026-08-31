import type { Metadata } from "next";

import { AdminApp } from "@/components/admin/admin-app";

export const metadata: Metadata = {
  title: "Panel del entrenador — Focus Entrena",
  robots: { index: false, follow: false },
};

export default function EntrenadorPage() {
  return <AdminApp />;
}
