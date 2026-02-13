/**
 * React Query hooks for Curated Datasets
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import * as api from "../services/curated_datasets";
import type {
  CuratedDataset,
  CuratedDatasetCreate,
  CuratedDatasetUpdate,
  DatasetPreview,
  ApprovalRequest,
  ListCuratedDatasetsParams,
  ListCuratedDatasetsResponse,
} from "../types";

// Query key factory
export const curatedDatasetKeys = {
  all: ["curated-datasets"] as const,
  lists: () => [...curatedDatasetKeys.all, "list"] as const,
  list: (filters: ListCuratedDatasetsParams | undefined) =>
    [...curatedDatasetKeys.lists(), filters] as const,
  details: () => [...curatedDatasetKeys.all, "detail"] as const,
  detail: (id: string) => [...curatedDatasetKeys.details(), id] as const,
  preview: (id: string, limit: number) =>
    [...curatedDatasetKeys.all, "preview", id, limit] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

export function useCuratedDatasets(
  filters?: ListCuratedDatasetsParams
): UseQueryResult<ListCuratedDatasetsResponse> {
  return useQuery({
    queryKey: curatedDatasetKeys.list(filters),
    queryFn: () => api.listCuratedDatasets(filters),
  });
}

export function useCuratedDataset(
  id: string
): UseQueryResult<CuratedDataset> {
  return useQuery({
    queryKey: curatedDatasetKeys.detail(id),
    queryFn: () => api.getCuratedDataset(id),
    enabled: !!id,
  });
}

export function useDatasetPreview(
  id: string,
  limit: number = 10
): UseQueryResult<DatasetPreview> {
  return useQuery({
    queryKey: curatedDatasetKeys.preview(id, limit),
    queryFn: () => api.previewDataset(id, limit),
    enabled: !!id,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export function useCreateCuratedDataset(): UseMutationResult<
  CuratedDataset,
  Error,
  CuratedDatasetCreate
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CuratedDatasetCreate) => api.createCuratedDataset(data),
    onSuccess: (newDataset) => {
      // Invalidate list queries
      queryClient.invalidateQueries({
        queryKey: curatedDatasetKeys.lists(),
      });

      // Set the new dataset in cache
      queryClient.setQueryData(
        curatedDatasetKeys.detail(newDataset.id),
        newDataset
      );
    },
  });
}

export function useUpdateCuratedDataset(): UseMutationResult<
  CuratedDataset,
  Error,
  { id: string; data: CuratedDatasetUpdate }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => api.updateCuratedDataset(id, data),
    onSuccess: (updatedDataset, { id }) => {
      // Invalidate list queries
      queryClient.invalidateQueries({
        queryKey: curatedDatasetKeys.lists(),
      });

      // Update the dataset in cache
      queryClient.setQueryData(
        curatedDatasetKeys.detail(id),
        updatedDataset
      );
    },
  });
}

export function useDeleteCuratedDataset(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteCuratedDataset(id),
    onSuccess: (_, id) => {
      // Invalidate list queries
      queryClient.invalidateQueries({
        queryKey: curatedDatasetKeys.lists(),
      });

      // Remove the dataset from cache
      queryClient.removeQueries({
        queryKey: curatedDatasetKeys.detail(id),
      });
    },
  });
}

export function useApproveDataset(): UseMutationResult<
  CuratedDataset,
  Error,
  { id: string; approval: ApprovalRequest }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, approval }) => api.approveDataset(id, approval),
    onSuccess: (updatedDataset, { id }) => {
      // Invalidate list queries
      queryClient.invalidateQueries({
        queryKey: curatedDatasetKeys.lists(),
      });

      // Update the dataset in cache
      queryClient.setQueryData(
        curatedDatasetKeys.detail(id),
        updatedDataset
      );
    },
  });
}

export function useArchiveDataset(): UseMutationResult<
  CuratedDataset,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.archiveDataset(id),
    onSuccess: (updatedDataset, id) => {
      // Invalidate list queries
      queryClient.invalidateQueries({
        queryKey: curatedDatasetKeys.lists(),
      });

      // Update the dataset in cache
      queryClient.setQueryData(
        curatedDatasetKeys.detail(id),
        updatedDataset
      );
    },
  });
}

export function useMarkDatasetInUse(): UseMutationResult<
  CuratedDataset,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.markDatasetInUse(id),
    onSuccess: (updatedDataset, id) => {
      // Invalidate list queries
      queryClient.invalidateQueries({
        queryKey: curatedDatasetKeys.lists(),
      });

      // Update the dataset in cache
      queryClient.setQueryData(
        curatedDatasetKeys.detail(id),
        updatedDataset
      );
    },
  });
}

export function useComputeDatasetMetrics(): UseMutationResult<
  CuratedDataset,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.computeDatasetMetrics(id),
    onSuccess: (updatedDataset, id) => {
      // Update the dataset in cache
      queryClient.setQueryData(
        curatedDatasetKeys.detail(id),
        updatedDataset
      );

      // Invalidate preview to refresh metrics
      queryClient.invalidateQueries({
        queryKey: [curatedDatasetKeys.all[0], "preview", id],
      });
    },
  });
}

export function useExportDataset(): UseMutationResult<
  any,
  Error,
  { id: string; format?: "jsonl" | "csv" | "parquet"; split?: string }
> {
  return useMutation({
    mutationFn: ({ id, format, split }) => api.exportDataset(id, format, split),
  });
}
