"use client";

/**
 * components/v2/prep/NoteField.tsx
 * Labelled textarea for taking notes in the Questions tab.
 */

interface Props {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}

export function NoteField({ label, placeholder, value, onChange, rows = 3 }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="font-mono-tag" style={{ color: "#6b5e4a", fontSize: 10 }}>
        {label}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border bg-white px-3.5 py-2.5 outline-none resize-none leading-[1.6]"
        style={{
          borderColor: "#d9cdb4",
          color: "var(--ink-2)",
          fontSize: 12.5,
          fontFamily: "var(--font-mono)",
        }}
        rows={rows}
      />
    </div>
  );
}
