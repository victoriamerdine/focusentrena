"use client";

const PALETA: { hex: string; label: string }[] = [
  { hex: "", label: "Sin color" },
  { hex: "#bfbfbf", label: "Gris" },
  { hex: "#ffe599", label: "Amarillo" },
  { hex: "#b6d7a8", label: "Verde" },
  { hex: "#f4cccc", label: "Rojo" },
  { hex: "#a4c2f4", label: "Azul" },
  { hex: "#ffc000", label: "Naranja" },
];

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PALETA.map((c) => {
        const activo = (value || "") === c.hex;
        return (
          <button
            key={c.label || "ninguno"}
            type="button"
            onClick={() => onChange(c.hex)}
            title={c.label}
            aria-label={c.label}
            className={`h-7 w-7 rounded-full border-2 transition-transform ${
              activo ? "scale-110 border-primary" : "border-border"
            }`}
            style={{ backgroundColor: c.hex || "transparent" }}
          />
        );
      })}
    </div>
  );
}
