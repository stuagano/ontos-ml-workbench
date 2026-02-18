/**
 * Shared status configurations for various entities in the Ontos ML Workbench
 */

import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Activity,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ============================================================================
// Status Config Types
// ============================================================================

export interface StatusConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  label: string;
}

export type StatusConfigMap = Record<string, StatusConfig>;

// ============================================================================
// Endpoint Status Configuration (Deploy & Monitor pages)
// ============================================================================

export const ENDPOINT_STATUS_CONFIG: StatusConfigMap = {
  READY: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-50",
    label: "Ready",
  },
  NOT_READY: {
    icon: Loader2,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    label: "Starting",
  },
  PENDING: {
    icon: Clock,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    label: "Pending",
  },
  FAILED: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    label: "Failed",
  },
  unknown: {
    icon: Activity,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    label: "Unknown",
  },
};

// ============================================================================
// Monitor-specific variant (uses "Healthy" label for READY)
// ============================================================================

export const MONITOR_ENDPOINT_STATUS_CONFIG: StatusConfigMap = {
  ...ENDPOINT_STATUS_CONFIG,
  READY: {
    ...ENDPOINT_STATUS_CONFIG.READY,
    label: "Healthy",
  },
};

// ============================================================================
// Job Status Configuration (Training runs)
// ============================================================================

export const JOB_STATUS_CONFIG: StatusConfigMap = {
  pending: {
    icon: Clock,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    label: "Pending",
  },
  running: {
    icon: Loader2,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    label: "Running",
  },
  succeeded: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-50",
    label: "Completed",
  },
  failed: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    label: "Failed",
  },
  cancelled: {
    icon: AlertCircle,
    color: "text-db-gray-500",
    bgColor: "bg-db-gray-50",
    label: "Cancelled",
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get status configuration with fallback to unknown/default
 */
export function getStatusConfig(
  status: string | undefined,
  configMap: StatusConfigMap,
  fallbackKey = "unknown",
): StatusConfig {
  if (!status) return configMap[fallbackKey] || configMap.unknown;
  return configMap[status] || configMap[fallbackKey] || configMap.unknown;
}

/**
 * Check if status indicates an active/in-progress state
 */
export function isStatusActive(status: string): boolean {
  const activeStates = ["running", "pending", "NOT_READY", "PENDING"];
  return activeStates.includes(status);
}

/**
 * Check if status indicates success/completion
 */
export function isStatusSuccess(status: string): boolean {
  const successStates = ["succeeded", "READY", "completed"];
  return successStates.includes(status);
}

/**
 * Check if status indicates failure
 */
export function isStatusFailure(status: string): boolean {
  const failureStates = ["failed", "FAILED", "error", "cancelled"];
  return failureStates.includes(status);
}
