/**
 * API service for Labelsets - reusable label collections
 */

import { apiClient } from './api';
import type {
  Labelset,
  LabelsetCreate,
  LabelsetUpdate,
  LabelsetStats,
  LabelsetStatus,
} from '../types';

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
  const response = await apiClient.get('/labelsets', { params });
  return response.data;
}

/**
 * Get a single labelset by ID
 */
export async function getLabelset(id: string): Promise<Labelset> {
  const response = await apiClient.get(`/labelsets/${id}`);
  return response.data;
}

/**
 * Create a new labelset
 */
export async function createLabelset(data: LabelsetCreate): Promise<Labelset> {
  const response = await apiClient.post('/labelsets', data);
  return response.data;
}

/**
 * Update an existing labelset
 */
export async function updateLabelset(
  id: string,
  data: LabelsetUpdate
): Promise<Labelset> {
  const response = await apiClient.put(`/labelsets/${id}`, data);
  return response.data;
}

/**
 * Delete a labelset
 */
export async function deleteLabelset(id: string): Promise<void> {
  await apiClient.delete(`/labelsets/${id}`);
}

/**
 * Publish a labelset (draft → published)
 */
export async function publishLabelset(id: string): Promise<Labelset> {
  const response = await apiClient.post(`/labelsets/${id}/publish`);
  return response.data;
}

/**
 * Archive a labelset
 */
export async function archiveLabelset(id: string): Promise<Labelset> {
  const response = await apiClient.post(`/labelsets/${id}/archive`);
  return response.data;
}

/**
 * Get statistics for a labelset
 */
export async function getLabelsetStats(id: string): Promise<LabelsetStats> {
  const response = await apiClient.get(`/labelsets/${id}/stats`);
  return response.data;
}

/**
 * Get canonical labels associated with a labelset
 */
export async function getLabelsetCanonicalLabels(id: string): Promise<any> {
  const response = await apiClient.get(`/labelsets/${id}/canonical-labels`);
  return response.data;
}
