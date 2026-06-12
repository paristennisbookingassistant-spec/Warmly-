"use client";

/**
 * components/v2/onboarding/DropZone.tsx
 * File drop target used in the Upload step. Supports real drag-and-drop,
 * a click-to-pick file dialog, and a selected-file display with remove.
 */

import { useRef, useState } from "react";
import type { DragEvent, ChangeEvent } from "react";
import { Icon } from "@/components/v2/icons";

export interface PickedFile {
  name: string;
  file: File;
}

interface DropZoneProps {
  label: string;
  hint?: string;
  accept?: string;
  file: PickedFile | null;
  onPick: (f: PickedFile) => void;
  onRemove: () => void;
  big?: boolean;
  required?: boolean;
}

export function DropZone({ label, hint, accept, file, onPick, onRemove, big, required }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (f) onPick({ name: f.name, file: f });
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
  }
  function onDragLeave() { setDragging(false); }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }
  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files);
    e.target.value = "";
  }

  const hasFile = !!file;
  const borderColor = dragging ? "#b87a4a" : hasFile ? "#b87a4a" : "#cdbf9f";
  const bg = hasFile || dragging ? "#f3e2cd" : "white";

  return (
    <div
      onClick={() => !hasFile && inputRef.current?.click()}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative w-full rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${big ? "p-9" : "p-5"}`}
      style={{ borderColor, background: bg }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept ?? ".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
        className="sr-only"
        onChange={onInputChange}
      />
      <div className={`flex ${big ? "flex-col items-center text-center gap-3" : "items-center gap-4"}`}>
        <div
          className={`flex items-center justify-center rounded-xl flex-shrink-0 ${big ? "w-12 h-12" : "w-10 h-10"}`}
          style={{ background: hasFile ? "#fff" : "#f4ede0", color: "#7a4a25" }}
        >
          <Icon.FileText size={big ? 22 : 18} />
        </div>
        <div className={`flex-1 ${big ? "text-center" : ""}`}>
          {hasFile ? (
            <div className={`flex items-center gap-2 ${big ? "justify-center" : ""}`}>
              <span className="text-[14px] font-medium" style={{ color: "var(--ink)" }}>{file.name}</span>
              <span
                role="button"
                aria-label="Remove file"
                className="transition-colors cursor-pointer"
                style={{ color: "var(--ink-3)" }}
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
              >
                <Icon.X size={14} />
              </span>
            </div>
          ) : (
            <>
              <div
                className={`font-medium ${big ? "text-[15px]" : "text-[13.5px]"}`}
                style={{ color: "var(--ink-2)" }}
              >
                {label}
                {required && <span className="ml-1" style={{ color: "#b87a4a" }}>*</span>}
              </div>
              {hint && (
                <div className="text-[12px] mt-1" style={{ color: "var(--ink-3)" }}>{hint}</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
