import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "blue"
  | "green"
  | "amber"
  | "red"
  | "purple"
  | "success"
  | "warning"
  | "danger";

type BadgeSize = "sm" | "md";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  /** Optional leading dot indicator */
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-600 border border-slate-200",
  blue: "bg-blue-50 text-blue-700 border border-blue-200",
  green: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border border-amber-200",
  red: "bg-red-50 text-red-700 border border-red-200",
  purple: "bg-purple-50 text-purple-700 border border-purple-200",
  // Aliases for semantic naming
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-slate-400",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  purple: "bg-purple-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "text-[10px] px-1.5 py-0.5 gap-1",
  md: "text-xs px-2 py-0.5 gap-1.5",
};

export default function Badge({
  children,
  variant = "default",
  size = "md",
  className,
  dot,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            "rounded-full flex-shrink-0",
            size === "sm" ? "w-1 h-1" : "w-1.5 h-1.5",
            dotColors[variant]
          )}
        />
      )}
      {children}
    </span>
  );
}
