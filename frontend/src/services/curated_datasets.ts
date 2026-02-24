/**
 * Curated Datasets API Service
 * Training-ready QA pairs selected from reviewed training sheets
 */

import {
  CuratedDataset,
  CuratedDatasetCreate,
  CuratedDatasetUpdate,
  DatasetPreview,
  ApprovalRequest,
  ListCuratedDatasetsParams,
  ListCuratedDatasetsResponse,
} from "../types";

const API_BASE = "/api/v1/curated-datasets";

export async function listCuratedDatasets(
  params?: ListCuratedDatasetsParams
): Promise<ListCuratedDatasetsResponse> {
  const queryParams = new URLSearchParams();

  if (params?.status) queryParams.append("status", params.status);
  if (params?.labelset_id) queryParams.append("labelset_id", params.labelset_id);
  if (params?.use_case) queryParams.append("use_case", params.use_case);
  if (params?.tags) queryParams.append("tags", params.tags);
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.offset) queryParams.append("offset", params.offset.toString());

  const url = queryParams.toString()
    ? `${API_BASE}?${queryParams}`
    : API_BASE;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to list curated datasets: ${response.statusText}`);
  }
  return response.json();
}

export async function getCuratedDataset(id: string): Promise<CuratedDataset> {
  const response = await fetch(`${API_BASE}/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to get curated dataset: ${response.statusText}`);
  }
  return response.json();
}

export async function createCuratedDataset(
  data: CuratedDatasetCreate
): Promise<CuratedDataset> {
  const response = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to create curated dataset: ${response.statusText}`);
  }
  return response.json();
}

export async function updateCuratedDataset(
  id: string,
  data: CuratedDatasetUpdate
): Promise<CuratedDataset> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to update curated dataset: ${response.statusText}`);
  }
  return response.json();
}

export async function deleteCuratedDataset(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete curated dataset: ${response.statusText}`);
  }
}

export async function previewDataset(
  id: string,
  limit: number = 10
): Promise<DatasetPreview> {
  const response = await fetch(`${API_BASE}/${id}/preview?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Failed to preview dataset: ${response.statusText}`);
  }
  return response.json();
}

export async function approveDataset(
  id: string,
  approval: ApprovalRequest
): Promise<CuratedDataset> {
  const response = await fetch(`${API_BASE}/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(approval),
  });
  if (!response.ok) {
    throw new Error(`Failed to approve dataset: ${response.statusText}`);
  }
  return response.json();
}

export async function archiveDataset(id: string): Promise<CuratedDataset> {
  const response = await fetch(`${API_BASE}/${id}/archive`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to archive dataset: ${response.statusText}`);
  }
  return response.json();
}

export async function markDatasetInUse(id: string): Promise<CuratedDataset> {
  const response = await fetch(`${API_BASE}/${id}/mark-in-use`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to mark dataset in use: ${response.statusText}`);
  }
  return response.json();
}

export async function computeDatasetMetrics(
  id: string
): Promise<CuratedDataset> {
  const response = await fetch(`${API_BASE}/${id}/compute-metrics`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to compute dataset metrics: ${response.statusText}`);
  }
  return response.json();
}

export async function exportDataset(
  id: string,
  format: "jsonl" | "csv" | "parquet" = "jsonl",
  split?: string
): Promise<any> {
  const queryParams = new URLSearchParams({ format });
  if (split) queryParams.append("split", split);

  const response = await fetch(
    `${API_BASE}/${id}/export?${queryParams}`
  );
  if (!response.ok) {
    throw new Error(`Failed to export dataset: ${response.statusText}`);
  }
  return response.json();
}
