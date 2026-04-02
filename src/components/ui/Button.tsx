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
    "inline-flex items-center justify-center font-medium rounded-lg",
    "transition-all duration-150",
    "focus:outline-none focus:ring-2 focus:ring-offset-2",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "select-none",
  ].join(" ");

  const variants = {
    primary: [
      "bg-blue-500 text-white",
      "hover:bg-blue-600 active:bg-blue-700",
      "focus:ring-blue-500",
      "shadow-sm hover:shadow",
    ].join(" "),
    secondary: [
      "bg-white text-gray-700 border border-gray-200",
      "hover:bg-gray-50 hover:border-gray-300 active:bg-gray-100",
      "focus:ring-blue-500",
      "shadow-sm",
    ].join(" "),
    ghost: [
      "text-gray-600 bg-transparent",
      "hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200",
      "focus:ring-gray-400",
    ].join(" "),
    danger: [
      "bg-red-500 text-white",
      "hover:bg-red-600 active:bg-red-700",
      "focus:ring-red-500",
      "shadow-sm hover:shadow",
    ].join(" "),
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5 gap-1.5 h-7",
    md: "text-sm px-4 py-2 gap-2 h-9",
    lg: "text-sm px-5 py-2.5 gap-2 h-11",
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
