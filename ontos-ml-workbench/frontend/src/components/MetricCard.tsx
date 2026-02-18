/**
 * MetricCard - Reusable metric display component
 *
 * Displays a metric with:
 * - Title and value
 * - Icon with custom color
 * - Optional change/trend indicator
 * - Optional subtitle
 * - Optional click handler
 */

import { clsx } from "clsx";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  change?: number;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  change,
  subtitle,
  onClick,
  className,
}: MetricCardProps) {
  const isClickable = !!onClick;

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className={clsx(
        "bg-white rounded-lg border border-db-gray-200 p-4 text-left transition-all",
        isClickable && "hover:border-rose-300 hover:shadow-sm cursor-pointer",
        !isClickable && "cursor-default",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-db-gray-500">{title}</span>
        <Icon className={clsx("w-5 h-5", color)} />
      </div>

      <div className="text-2xl font-bold text-db-gray-900">{value}</div>

      {change !== undefined && (
        <div
          className={clsx(
            "flex items-center gap-1 text-sm mt-1",
            change >= 0 ? "text-green-600" : "text-red-600",
          )}
        >
          {change >= 0 ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          {Math.abs(change)}% vs last period
        </div>
      )}

      {subtitle && !change && (
        <div className={clsx("text-xs mt-1", color.replace("-600", "-500"))}>
          {subtitle}
        </div>
      )}
    </button>
  );
}
