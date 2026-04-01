import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Adds hover shadow effect for clickable cards */
  hoverable?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className, hoverable, onClick }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-100 shadow-sm",
        hoverable && "cursor-pointer transition-shadow hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("px-5 pt-5 pb-3", className)}>{children}</div>
  );
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("px-5 pb-5", className)}>{children}</div>
  );
}
