/**
 * React Query hooks for Canonical Labels
 *
 * Provides type-safe data fetching, caching, and mutations for canonical labels.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CanonicalLabelUpdateRequest } from "../types";
import {
  bulkLookupCanonicalLabels,
  checkUsageConstraints,
  createCanonicalLabel,
  deleteCanonicalLabel,
  getCanonicalLabel,
  getCanonicalLabelUsage,
  getCanonicalLabelVersions,
  getItemLabelsets,
  getSheetCanonicalStats,
  listCanonicalLabels,
  lookupCanonicalLabel,
  updateCanonicalLabel,
} from "../services/canonical-labels";

// ============================================================================
// Query Keys
// ============================================================================

export const canonicalLabelKeys = {
  all: ["canonical-labels"] as const,
  lists: () => [...canonicalLabelKeys.all, "list"] as const,
  list: (filters: Record<string, any>) =>
    [...canonicalLabelKeys.lists(), filters] as const,
  details: () => [...canonicalLabelKeys.all, "detail"] as const,
  detail: (id: string) => [...canonicalLabelKeys.details(), id] as const,
  stats: (sheetId: string) =>
    [...canonicalLabelKeys.all, "stats", sheetId] as const,
  itemLabelsets: (sheetId: string, itemRef: string) =>
    [...canonicalLabelKeys.all, "item-labelsets", sheetId, itemRef] as const,
  versions: (labelId: string) =>
    [...canonicalLabelKeys.all, "versions", labelId] as const,
  usage: (labelId: string) =>
    [...canonicalLabelKeys.all, "usage", labelId] as const,
};

// ============================================================================
// Queries
// ============================================================================

/**
 * Get a single canonical label by ID
 */
export function useCanonicalLabel(labelId: string | undefined) {
  return useQuery({
    queryKey: canonicalLabelKeys.detail(labelId!),
    queryFn: () => getCanonicalLabel(labelId!),
    enabled: !!labelId,
  });
}

/**
 * List canonical labels with filtering
 */
export function useCanonicalLabels(params?: {
  sheet_id?: string;
  label_type?: string;
  confidence?: "high" | "medium" | "low";
  min_reuse_count?: number;
  page?: number;
  page_size?: number;
}) {
  return useQuery({
    queryKey: canonicalLabelKeys.list(params || {}),
    queryFn: () => listCanonicalLabels(params),
  });
}

/**
 * Get canonical label statistics for a sheet
 */
export function useSheetCanonicalStats(sheetId: string | undefined) {
  return useQuery({
    queryKey: canonicalLabelKeys.stats(sheetId!),
    queryFn: () => getSheetCanonicalStats(sheetId!),
    enabled: !!sheetId,
  });
}

/**
 * Get all labelsets for a source item
 */
export function useItemLabelsets(
  sheetId: string | undefined,
  itemRef: string | undefined
) {
  return useQuery({
    queryKey: canonicalLabelKeys.itemLabelsets(sheetId!, itemRef!),
    queryFn: () => getItemLabelsets(sheetId!, itemRef!),
    enabled: !!sheetId && !!itemRef,
  });
}

/**
 * Get version history for a canonical label
 */
export function useCanonicalLabelVersions(labelId: string | undefined) {
  return useQuery({
    queryKey: canonicalLabelKeys.versions(labelId!),
    queryFn: () => getCanonicalLabelVersions(labelId!),
    enabled: !!labelId,
  });
}

/**
 * Get usage information for a canonical label
 */
export function useCanonicalLabelUsage(labelId: string | undefined) {
  return useQuery({
    queryKey: canonicalLabelKeys.usage(labelId!),
    queryFn: () => getCanonicalLabelUsage(labelId!),
    enabled: !!labelId,
  });
}

/**
 * Lookup a canonical label by composite key
 *
 * Use this for real-time lookup during labeling.
 */
export function useLookupCanonicalLabel(
  sheetId: string | undefined,
  itemRef: string | undefined,
  labelType: string | undefined
) {
  return useQuery({
    queryKey: [
      "canonical-labels",
      "lookup",
      sheetId,
      itemRef,
      labelType,
    ] as const,
    queryFn: () =>
      lookupCanonicalLabel({
        sheet_id: sheetId!,
        item_ref: itemRef!,
        label_type: labelType!,
      }),
    enabled: !!sheetId && !!itemRef && !!labelType,
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new canonical label
 */
export function useCreateCanonicalLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCanonicalLabel,
    onSuccess: (newLabel) => {
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: canonicalLabelKeys.lists() });

      // Invalidate sheet stats
      queryClient.invalidateQueries({
        queryKey: canonicalLabelKeys.stats(newLabel.sheet_id),
      });

      // Add to cache
      queryClient.setQueryData(
        canonicalLabelKeys.detail(newLabel.id),
        newLabel
      );
    },
  });
}

/**
 * Update a canonical label
 */
export function useUpdateCanonicalLabel(labelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: CanonicalLabelUpdateRequest) =>
      updateCanonicalLabel(labelId, updates),
    onSuccess: (updatedLabel) => {
      // Update cache
      queryClient.setQueryData(
        canonicalLabelKeys.detail(labelId),
        updatedLabel
      );

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: canonicalLabelKeys.lists() });

      // Invalidate versions (new version created)
      queryClient.invalidateQueries({
        queryKey: canonicalLabelKeys.versions(labelId),
      });

      // Invalidate sheet stats
      queryClient.invalidateQueries({
        queryKey: canonicalLabelKeys.stats(updatedLabel.sheet_id),
      });
    },
  });
}

/**
 * Delete a canonical label
 */
export function useDeleteCanonicalLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCanonicalLabel,
    onSuccess: (_, labelId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: canonicalLabelKeys.detail(labelId) });

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: canonicalLabelKeys.lists() });

      // Invalidate all stats (we don't know which sheet it belonged to)
      queryClient.invalidateQueries({
        queryKey: [...canonicalLabelKeys.all, "stats"],
      });
    },
  });
}

/**
 * Bulk lookup canonical labels
 *
 * Use this for Training Sheet assembly to check many items at once.
 */
export function useBulkLookupCanonicalLabels() {
  return useMutation({
    mutationFn: bulkLookupCanonicalLabels,
  });
}

/**
 * Check usage constraints for a canonical label
 */
export function useCheckUsageConstraints() {
  return useMutation({
    mutationFn: checkUsageConstraints,
  });
}

// ============================================================================
// Composite Hooks
// ============================================================================

/**
 * Get canonical label with usage information
 *
 * Useful before deleting or modifying a label.
 */
export function useCanonicalLabelWithUsage(labelId: string | undefined) {
  const labelQuery = useCanonicalLabel(labelId);
  const usageQuery = useCanonicalLabelUsage(labelId);

  return {
    label: labelQuery.data,
    usage: usageQuery.data,
    isLoading: labelQuery.isLoading || usageQuery.isLoading,
    error: labelQuery.error || usageQuery.error,
  };
}

/**
 * Get all data needed to display a canonical label detail page
 */
export function useCanonicalLabelDetail(labelId: string | undefined) {
  const labelQuery = useCanonicalLabel(labelId);
  const versionsQuery = useCanonicalLabelVersions(labelId);
  const usageQuery = useCanonicalLabelUsage(labelId);

  return {
    label: labelQuery.data,
    versions: versionsQuery.data,
    usage: usageQuery.data,
    isLoading:
      labelQuery.isLoading || versionsQuery.isLoading || usageQuery.isLoading,
    error: labelQuery.error || versionsQuery.error || usageQuery.error,
    refetch: () => {
      labelQuery.refetch();
      versionsQuery.refetch();
      usageQuery.refetch();
    },
  };
}
