/**
 * API client for Ontos ML native data quality endpoints.
 */

import type {
  ProfileResult,
  RunChecksResult,
  DQCheck,
  GenerateRulesResult,
  QualityResults,
} from "../types/data-quality";

const API_BASE = "/api/v1/data-quality";

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

export async function profileSheet(sheetId: string): Promise<ProfileResult> {
  return fetchJson(`${API_BASE}/sheets/${sheetId}/profile`, {
    method: "POST",
  });
}

export async function runChecks(
  sheetId: string,
  checks: DQCheck[],
): Promise<RunChecksResult> {
  return fetchJson(`${API_BASE}/sheets/${sheetId}/run-checks`, {
    method: "POST",
    body: JSON.stringify({ checks }),
  });
}

export async function generateRules(
  sheetId: string,
  description: string,
): Promise<GenerateRulesResult> {
  return fetchJson(`${API_BASE}/sheets/${sheetId}/generate-rules`, {
    method: "POST",
    body: JSON.stringify({ description }),
  });
}

export async function getQualityResults(
  sheetId: string,
): Promise<QualityResults> {
  return fetchJson(`${API_BASE}/sheets/${sheetId}/results`);
}
