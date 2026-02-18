/**
 * API client for the VITAL → Ontos DQX quality proxy endpoint.
 */

import type { QualityProxyRunResponse } from "../types/quality-proxy";

const API_BASE = "/api/v1/quality-proxy";

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

  return response.json();
}

export async function runQualityProxy(
  collectionId: string,
): Promise<QualityProxyRunResponse> {
  return fetchJson(`${API_BASE}/collections/${collectionId}/run`, {
    method: "POST",
  });
}
