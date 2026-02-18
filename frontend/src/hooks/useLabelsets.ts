/**
 * React Query hooks for Labelsets
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/labelsets';
import type { LabelsetCreate, LabelsetUpdate } from '../types';

// ============================================================================
// Query Keys Factory
// ============================================================================

export const labelsetKeys = {
  all: ['labelsets'] as const,
  lists: () => [...labelsetKeys.all, 'list'] as const,
  list: (filters: any) => [...labelsetKeys.lists(), filters] as const,
  details: () => [...labelsetKeys.all, 'detail'] as const,
  detail: (id: string) => [...labelsetKeys.details(), id] as const,
  stats: (id: string) => [...labelsetKeys.detail(id), 'stats'] as const,
  canonicalLabels: (id: string) =>
    [...labelsetKeys.detail(id), 'canonical'] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * List labelsets with optional filtering
 */
export function useLabelsets(filters?: api.ListLabelsetsParams) {
  return useQuery({
    queryKey: labelsetKeys.list(filters),
    queryFn: () => api.listLabelsets(filters),
  });
}

/**
 * Get a single labelset by ID
 */
export function useLabelset(id: string | undefined) {
  return useQuery({
    queryKey: labelsetKeys.detail(id!),
    queryFn: () => api.getLabelset(id!),
    enabled: !!id,
  });
}

/**
 * Get statistics for a labelset
 */
export function useLabelsetStats(id: string | undefined) {
  return useQuery({
    queryKey: labelsetKeys.stats(id!),
    queryFn: () => api.getLabelsetStats(id!),
    enabled: !!id,
  });
}

/**
 * Get canonical labels for a labelset
 */
export function useLabelsetCanonicalLabels(id: string | undefined) {
  return useQuery({
    queryKey: labelsetKeys.canonicalLabels(id!),
    queryFn: () => api.getLabelsetCanonicalLabels(id!),
    enabled: !!id,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new labelset
 */
export function useCreateLabelset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LabelsetCreate) => api.createLabelset(data),
    onSuccess: (newLabelset) => {
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: labelsetKeys.lists() });
      // Set detail in cache
      queryClient.setQueryData(
        labelsetKeys.detail(newLabelset.id),
        newLabelset
      );
    },
  });
}

/**
 * Update a labelset
 */
export function useUpdateLabelset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LabelsetUpdate }) =>
      api.updateLabelset(id, data),
    onSuccess: (updatedLabelset, { id }) => {
      // Invalidate detail and lists
      queryClient.invalidateQueries({ queryKey: labelsetKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: labelsetKeys.lists() });
    },
  });
}

/**
 * Delete a labelset
 */
export function useDeleteLabelset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteLabelset(id),
    onSuccess: () => {
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: labelsetKeys.lists() });
    },
  });
}

/**
 * Publish a labelset (draft → published)
 */
export function usePublishLabelset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.publishLabelset(id),
    onSuccess: (publishedLabelset, id) => {
      // Update detail cache
      queryClient.setQueryData(
        labelsetKeys.detail(id),
        publishedLabelset
      );
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: labelsetKeys.lists() });
    },
  });
}

/**
 * Archive a labelset
 */
export function useArchiveLabelset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.archiveLabelset(id),
    onSuccess: (archivedLabelset, id) => {
      // Update detail cache
      queryClient.setQueryData(
        labelsetKeys.detail(id),
        archivedLabelset
      );
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: labelsetKeys.lists() });
    },
  });
}
