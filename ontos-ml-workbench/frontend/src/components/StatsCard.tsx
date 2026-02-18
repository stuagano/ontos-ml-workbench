/**
 * StatsCard - Simplified metric card for statistics display
 *
 * A wrapper around MetricCard optimized for displaying statistics
 * with icon and subtitle (no change/trend indicator).
 *
 * Use MetricCard directly if you need trend indicators.
 */

import { type LucideIcon } from "lucide-react";
import { MetricCard } from "./MetricCard";

export interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: string;
  className?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  color,
  className,
}: StatsCardProps) {
  return (
    <MetricCard
      title={title}
      value={value}
      icon={icon}
      color={color}
      subtitle={subtitle}
      className={className}
    />
  );
}
