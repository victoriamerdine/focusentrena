import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Focus Entrena",
  description: "Tu rutina de entrenamiento, siempre a mano.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
