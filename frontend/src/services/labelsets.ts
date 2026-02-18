/**
 * API service for Labelsets - reusable label collections
 */

import type {
  Labelset,
  LabelsetCreate,
  LabelsetUpdate,
  LabelsetStats,
  LabelsetStatus,
} from '../types';

const API_BASE = "/api/v1";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export interface ListLabelsetsParams {
  status?: LabelsetStatus;
  use_case?: string;
  label_type?: string;
  tags?: string[];
  page?: number;
  page_size?: number;
}

export interface ListLabelsetsResponse {
  labelsets: Labelset[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * List labelsets with optional filtering
 */
export async function listLabelsets(
  params?: ListLabelsetsParams
): Promise<ListLabelsetsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.use_case) searchParams.set("use_case", params.use_case);
  if (params?.label_type) searchParams.set("label_type", params.label_type);
  if (params?.tags) searchParams.set("tags", params.tags.join(","));
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.page_size) searchParams.set("page_size", String(params.page_size));

  const query = searchParams.toString();
  return fetchJson(`${API_BASE}/labelsets${query ? `?${query}` : ""}`);
}

/**
 * Get a single labelset by ID
 */
export async function getLabelset(id: string): Promise<Labelset> {
  return fetchJson(`${API_BASE}/labelsets/${id}`);
}

/**
 * Create a new labelset
 */
export async function createLabelset(data: LabelsetCreate): Promise<Labelset> {
  return fetchJson(`${API_BASE}/labelsets`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing labelset
 */
export async function updateLabelset(
  id: string,
  data: LabelsetUpdate
): Promise<Labelset> {
  return fetchJson(`${API_BASE}/labelsets/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Delete a labelset
 */
export async function deleteLabelset(id: string): Promise<void> {
  return fetchJson(`${API_BASE}/labelsets/${id}`, { method: "DELETE" });
}

/**
 * Publish a labelset (draft → published)
 */
export async function publishLabelset(id: string): Promise<Labelset> {
  return fetchJson(`${API_BASE}/labelsets/${id}/publish`, { method: "POST" });
}

/**
 * Archive a labelset
 */
export async function archiveLabelset(id: string): Promise<Labelset> {
  return fetchJson(`${API_BASE}/labelsets/${id}/archive`, { method: "POST" });
}

/**
 * Get statistics for a labelset
 */
export async function getLabelsetStats(id: string): Promise<LabelsetStats> {
  return fetchJson(`${API_BASE}/labelsets/${id}/stats`);
}

/**
 * Get canonical labels associated with a labelset
 */
export async function getLabelsetCanonicalLabels(id: string): Promise<any> {
  return fetchJson(`${API_BASE}/labelsets/${id}/canonical-labels`);
}
