/**
 * StatusBadge - Reusable status indicator with icon and label
 */

import { clsx } from "clsx";
import type { StatusConfig } from "../constants/statusConfig";

interface StatusBadgeProps {
  config: StatusConfig;
  animate?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StatusBadge({
  config,
  animate = false,
  size = "md",
  className,
}: StatusBadgeProps) {
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  const iconSizeClasses = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  return (
    <span
      className={clsx(
        "rounded-full font-medium flex items-center gap-1 w-fit",
        sizeClasses[size],
        config.bgColor,
        config.color,
        className,
      )}
    >
      <Icon
        className={clsx(iconSizeClasses[size], animate && "animate-spin")}
      />
      {config.label}
    </span>
  );
}
