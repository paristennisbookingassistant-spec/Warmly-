"use client";

import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  /** Deprecated: use helperText */
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function Input({
  label,
  error,
  helperText,
  hint,
  leftIcon,
  rightIcon,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  const helpText = helperText ?? hint;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-gray-700 leading-none"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {leftIcon}
          </div>
        )}

        <input
          id={inputId}
          className={cn(
            "w-full rounded-lg border text-sm text-gray-900",
            "placeholder:text-gray-400",
            "transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
            "disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed",
            leftIcon ? "pl-9" : "pl-3.5",
            rightIcon ? "pr-9" : "pr-3.5",
            "py-2.5",
            error
              ? "border-red-400 bg-red-50/50 focus:ring-red-500/20 focus:border-red-500"
              : "border-gray-200 bg-white hover:border-gray-300",
            className
          )}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-600">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
      {helpText && !error && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  );
}
