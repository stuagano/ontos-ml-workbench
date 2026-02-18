/**
 * EmptyState - Friendly empty state illustrations and messaging
 */

import { type LucideIcon } from "lucide-react";
import {
  Database,
  FileText,
  Server,
  Activity,
  Inbox,
  Search,
  FolderOpen,
  Rocket,
  Users,
  MessageSquare,
  Layers,
  Sparkles,
} from "lucide-react";
import { clsx } from "clsx";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "compact" | "centered";
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
  className,
}: EmptyStateProps) {
  const ActionIcon = action?.icon;

  return (
    <div
      className={clsx(
        "text-center",
        variant === "default" && "py-16 px-6",
        variant === "compact" && "py-8 px-4",
        variant === "centered" && "min-h-[400px] flex items-center justify-center",
        className
      )}
    >
      <div className={variant === "centered" ? "max-w-md" : ""}>
        {/* Icon */}
        <div
          className={clsx(
            "inline-flex items-center justify-center rounded-full bg-db-gray-100 mb-4",
            variant === "compact" ? "p-3" : "p-4"
          )}
        >
          <Icon
            className={clsx(
              "text-db-gray-400",
              variant === "compact" ? "w-8 h-8" : "w-12 h-12"
            )}
          />
        </div>

        {/* Title */}
        <h3
          className={clsx(
            "font-semibold text-db-gray-700",
            variant === "compact" ? "text-base" : "text-lg"
          )}
        >
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p
            className={clsx(
              "text-db-gray-500 mt-2 max-w-sm mx-auto",
              variant === "compact" ? "text-sm" : "text-base"
            )}
          >
            {description}
          </p>
        )}

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="mt-6 flex items-center justify-center gap-3">
            {action && (
              <button
                onClick={action.onClick}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {ActionIcon && <ActionIcon className="w-4 h-4" />}
                {action.label}
              </button>
            )}
            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                className="px-4 py-2 text-db-gray-600 hover:text-db-gray-800 hover:bg-db-gray-100 rounded-lg transition-colors"
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Pre-configured empty states for common scenarios
// ============================================================================

interface PresetEmptyStateProps {
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function NoDataSources({ action, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={Database}
      title="No data sources"
      description="Drag tables or volumes from the Unity Catalog browser to get started"
      action={action ? { ...action, icon: FolderOpen } : undefined}
      className={className}
    />
  );
}

export function NoTemplates({ action, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={FileText}
      title="No templates yet"
      description="Create your first template to define how data maps to training examples"
      action={action ? { ...action, icon: Sparkles } : undefined}
      className={className}
    />
  );
}

export function NoCurationItems({ action, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={Layers}
      title="No items to review"
      description="Run AI labeling to generate items for curation"
      action={action ? { ...action, icon: Sparkles } : undefined}
      className={className}
    />
  );
}

export function NoEndpoints({ action, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={Server}
      title="No endpoints deployed"
      description="Deploy a model to create a serving endpoint"
      action={action ? { ...action, icon: Rocket } : undefined}
      className={className}
    />
  );
}

export function NoModels({ action, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={Layers}
      title="No models found"
      description="Train a model first to deploy it"
      action={action}
      className={className}
    />
  );
}

export function NoMonitoringData({ action, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={Activity}
      title="No monitoring data"
      description="Deploy an endpoint to start collecting metrics"
      action={action}
      className={className}
    />
  );
}

export function NoFeedback({ action, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No feedback yet"
      description="User feedback will appear here once collected"
      action={action}
      className={className}
    />
  );
}

export function NoSearchResults({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={`No matches for "${query}"`}
      action={{ label: "Clear search", onClick: onClear }}
      variant="compact"
    />
  );
}

export function NoAgents({ action, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={Users}
      title="No agents created"
      description="Create an agent to orchestrate tools and models"
      action={action ? { ...action, icon: Sparkles } : undefined}
      className={className}
    />
  );
}
