/**
 * Governance API service - Roles, Teams, Data Domains, and Asset Reviews
 */

import type {
  AppRole,
  UserRoleAssignment,
  CurrentUserInfo,
  Team,
  TeamMember,
  TeamMetadata,
  DataDomain,
  DomainTreeNode,
  AssetReview,
  AssetType,
  ReviewStatus,
} from "../types/governance";

const API_BASE = "/api/v1/governance";
const DEFAULT_TIMEOUT = 30000;

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: "Unknown error" }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timeout - please try again");
    }
    throw error;
  }
}

// ============================================================================
// Roles
// ============================================================================

export async function listRoles(): Promise<AppRole[]> {
  return fetchJson(`${API_BASE}/roles`);
}

export async function getRole(roleId: string): Promise<AppRole> {
  return fetchJson(`${API_BASE}/roles/${roleId}`);
}

export async function createRole(
  data: Partial<AppRole>,
): Promise<AppRole> {
  return fetchJson(`${API_BASE}/roles`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateRole(
  roleId: string,
  data: Partial<AppRole>,
): Promise<AppRole> {
  return fetchJson(`${API_BASE}/roles/${roleId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteRole(roleId: string): Promise<void> {
  return fetchJson(`${API_BASE}/roles/${roleId}`, { method: "DELETE" });
}

// ============================================================================
// Users
// ============================================================================

export async function listUserAssignments(): Promise<UserRoleAssignment[]> {
  return fetchJson(`${API_BASE}/users`);
}

export async function getCurrentUser(): Promise<CurrentUserInfo> {
  return fetchJson(`${API_BASE}/users/me`);
}

export async function assignUserRole(data: {
  user_email: string;
  user_display_name?: string;
  role_id: string;
}): Promise<UserRoleAssignment> {
  return fetchJson(`${API_BASE}/users/assign`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ============================================================================
// Teams
// ============================================================================

export async function listTeams(): Promise<Team[]> {
  return fetchJson(`${API_BASE}/teams`);
}

export async function getTeam(teamId: string): Promise<Team> {
  return fetchJson(`${API_BASE}/teams/${teamId}`);
}

export async function createTeam(
  data: { name: string; description?: string; domain_id?: string; leads?: string[]; metadata?: TeamMetadata },
): Promise<Team> {
  return fetchJson(`${API_BASE}/teams`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTeam(
  teamId: string,
  data: Partial<Team>,
): Promise<Team> {
  return fetchJson(`${API_BASE}/teams/${teamId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteTeam(teamId: string): Promise<void> {
  return fetchJson(`${API_BASE}/teams/${teamId}`, { method: "DELETE" });
}

export async function listTeamMembers(teamId: string): Promise<TeamMember[]> {
  return fetchJson(`${API_BASE}/teams/${teamId}/members`);
}

export async function addTeamMember(
  teamId: string,
  data: { user_email: string; user_display_name?: string; role_override?: string },
): Promise<TeamMember> {
  return fetchJson(`${API_BASE}/teams/${teamId}/members`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTeamMember(
  teamId: string,
  memberId: string,
  data: { role_override?: string | null; user_display_name?: string },
): Promise<TeamMember> {
  return fetchJson(`${API_BASE}/teams/${teamId}/members/${memberId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function removeTeamMember(
  teamId: string,
  memberId: string,
): Promise<void> {
  return fetchJson(`${API_BASE}/teams/${teamId}/members/${memberId}`, {
    method: "DELETE",
  });
}

// ============================================================================
// Domains
// ============================================================================

export async function listDomains(): Promise<DataDomain[]> {
  return fetchJson(`${API_BASE}/domains`);
}

export async function getDomain(domainId: string): Promise<DataDomain> {
  return fetchJson(`${API_BASE}/domains/${domainId}`);
}

export async function createDomain(
  data: { name: string; description?: string; parent_id?: string; owner_email?: string; icon?: string; color?: string },
): Promise<DataDomain> {
  return fetchJson(`${API_BASE}/domains`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateDomain(
  domainId: string,
  data: Partial<DataDomain>,
): Promise<DataDomain> {
  return fetchJson(`${API_BASE}/domains/${domainId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteDomain(domainId: string): Promise<void> {
  return fetchJson(`${API_BASE}/domains/${domainId}`, { method: "DELETE" });
}

export async function getDomainTree(): Promise<DomainTreeNode[]> {
  return fetchJson(`${API_BASE}/domains/tree`);
}

// ============================================================================
// Asset Reviews (G4)
// ============================================================================

export async function listReviews(filters?: {
  asset_type?: AssetType;
  asset_id?: string;
  status?: ReviewStatus;
  reviewer_email?: string;
}): Promise<AssetReview[]> {
  const params = new URLSearchParams();
  if (filters?.asset_type) params.set("asset_type", filters.asset_type);
  if (filters?.asset_id) params.set("asset_id", filters.asset_id);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.reviewer_email) params.set("reviewer_email", filters.reviewer_email);
  const qs = params.toString();
  return fetchJson(`${API_BASE}/reviews${qs ? `?${qs}` : ""}`);
}

export async function getReview(reviewId: string): Promise<AssetReview> {
  return fetchJson(`${API_BASE}/reviews/${reviewId}`);
}

export async function requestReview(data: {
  asset_type: AssetType;
  asset_id: string;
  asset_name?: string;
  reviewer_email?: string;
}): Promise<AssetReview> {
  return fetchJson(`${API_BASE}/reviews`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function assignReviewer(
  reviewId: string,
  reviewerEmail: string,
): Promise<AssetReview> {
  return fetchJson(`${API_BASE}/reviews/${reviewId}/assign`, {
    method: "PUT",
    body: JSON.stringify({ reviewer_email: reviewerEmail }),
  });
}

export async function submitDecision(
  reviewId: string,
  data: { status: "approved" | "rejected" | "changes_requested"; review_notes?: string },
): Promise<AssetReview> {
  return fetchJson(`${API_BASE}/reviews/${reviewId}/decide`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteReview(reviewId: string): Promise<void> {
  return fetchJson(`${API_BASE}/reviews/${reviewId}`, { method: "DELETE" });
}
