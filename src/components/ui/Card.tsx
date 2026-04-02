import { cn } from "@/lib/utils";

type CardVariant = "default" | "elevated" | "flat";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: CardVariant;
  /** Adds hover lift + shadow increase for interactive cards */
  hoverable?: boolean;
  onClick?: () => void;
}

const variantStyles: Record<CardVariant, string> = {
  default: "bg-white border border-slate-200 shadow-sm",
  elevated: "bg-white border border-slate-200 shadow-md",
  flat: "bg-white border border-slate-200",
};

export default function Card({
  children,
  className,
  variant = "default",
  hoverable,
  onClick,
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl transition-all duration-150",
        variantStyles[variant],
        hoverable &&
          "cursor-pointer hover:shadow-md hover:-translate-y-px active:translate-y-0 active:shadow-sm",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-5 pt-5 pb-3 border-b border-slate-100", className)}>
      {children}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

export function CardFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-xl",
        className
      )}
    >
      {children}
    </div>
  );
}
