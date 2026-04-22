"use client";

import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  children?: React.ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconPosition = "left",
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base = [
    "inline-flex items-center justify-center font-medium",
    "transition-all duration-150",
    "focus:outline-none focus:ring-2 focus:ring-offset-2",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "select-none",
  ].join(" ");

  const variants = {
    primary: [
      "bg-[#171717] text-white rounded-full",
      "hover:bg-[#2a2a2a] active:bg-[#111111]",
      "focus:ring-[#171717]/30",
      "shadow-[0_1px_2px_rgba(0,0,0,0.08)]",
    ].join(" "),
    secondary: [
      "bg-white text-[#171717] border border-[rgba(0,0,0,0.1)] rounded-full",
      "hover:bg-[#f5f5f5] hover:border-[rgba(0,0,0,0.15)] active:bg-[#eeeeee]",
      "focus:ring-[#171717]/10",
      "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.04)]",
    ].join(" "),
    ghost: [
      "text-[#525252] bg-transparent rounded-lg",
      "hover:bg-[rgba(0,0,0,0.04)] hover:text-[#171717] active:bg-[rgba(0,0,0,0.07)]",
      "focus:ring-[#171717]/10",
    ].join(" "),
    danger: [
      "bg-white text-[#dc2626] border border-[rgba(220,38,38,0.2)] rounded-full",
      "hover:bg-[#fef2f2] hover:border-[rgba(220,38,38,0.35)]",
      "focus:ring-red-500/20",
      "shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
    ].join(" "),
  };

  const sizes = {
    sm: "text-xs px-3.5 py-1.5 gap-1.5 h-7",
    md: "text-[13px] px-4 py-2 gap-2 h-9",
    lg: "text-sm px-5 py-2.5 gap-2 h-10",
  };

  const Spinner = () => (
    <svg
      className="animate-spin h-3.5 w-3.5 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Spinner />
      ) : (
        icon && iconPosition === "left" && (
          <span className="flex-shrink-0">{icon}</span>
        )
      )}
      {children}
      {!loading && icon && iconPosition === "right" && (
        <span className="flex-shrink-0">{icon}</span>
      )}
    </button>
  );
}
