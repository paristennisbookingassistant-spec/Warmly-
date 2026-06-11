"use client";

/**
 * components/v2/prep/FormTextarea.tsx
 * Labelled textarea used inside the intake form.
 */

interface Props {
  label: string;
  optional?: boolean;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  maxWidth?: number;
}

export function FormTextarea({
  label,
  optional,
  placeholder,
  value,
  onChange,
  rows = 3,
  maxWidth = 640,
}: Props) {
  return (
    <div>
      <label className="block text-[13px] font-medium mb-2" style={{ color: "var(--ink-2)" }}>
        {label}
        {optional && (
          <span className="font-normal ml-1" style={{ color: "var(--ink-4)" }}>
            (optional)
          </span>
        )}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-[13.5px] rounded-lg border bg-white px-3.5 py-3 outline-none resize-none leading-relaxed"
        style={{ borderColor: "#d9cdb4", color: "var(--ink-2)", maxWidth }}
        rows={rows}
      />
    </div>
  );
}
