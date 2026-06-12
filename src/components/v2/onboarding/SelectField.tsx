"use client";

/**
 * components/v2/onboarding/SelectField.tsx
 * Labelled select + text-input primitives for the review step.
 */

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

export function Field({ label, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11.5px] font-medium uppercase tracking-wide" style={{ color: "var(--ink-3)", letterSpacing: "0.08em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}

export function SelectInput({ value, onChange, options, placeholder }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="focus-ring h-10 w-full rounded-lg px-3 text-[13.5px] transition-shadow appearance-none"
      style={{
        border: "1px solid var(--line)",
        background: "var(--surface)",
        color: value ? "var(--ink)" : "var(--ink-3)",
        outline: "none",
      }}
    >
      {placeholder && (
        <option value="" disabled>{placeholder}</option>
      )}
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

interface TextInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function TextInput({ value, onChange, placeholder }: TextInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="focus-ring h-10 w-full rounded-lg px-3 text-[13.5px] transition-shadow"
      style={{
        border: "1px solid var(--line)",
        background: "var(--surface)",
        color: "var(--ink)",
        outline: "none",
      }}
    />
  );
}
