import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "outline";
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-primary/20 text-primary border-primary/30",
      success: "bg-emerald/20 text-emerald border-emerald/30",
      warning: "bg-amber-500/20 text-amber-500 border-amber-500/30",
      danger: "bg-red-500/20 text-red-500 border-red-500/30",
      info: "bg-blue-500/20 text-blue border-blue/30",
      outline: "bg-transparent text-foreground-muted border-border",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge };
