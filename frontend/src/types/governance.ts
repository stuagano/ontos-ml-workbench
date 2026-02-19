/**
 * Governance types - Roles, Teams, Data Domains, and Asset Reviews
 */

export type AccessLevel = "none" | "read" | "write" | "admin";

export interface AppRole {
  id: string;
  name: string;
  description: string | null;
  feature_permissions: Record<string, AccessLevel>;
  allowed_stages: string[];
  is_default: boolean;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface UserRoleAssignment {
  id: string;
  user_email: string;
  user_display_name: string | null;
  role_id: string;
  role_name: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
}

export interface CurrentUserInfo {
  email: string;
  display_name: string;
  role_id: string;
  role_name: string;
  permissions: Record<string, AccessLevel>;
  allowed_stages: string[];
}

export interface TeamMetadata {
  tools: string[];
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  domain_id: string | null;
  domain_name: string | null;
  leads: string[];
  metadata: TeamMetadata;
  is_active: boolean;
  member_count: number;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_email: string;
  user_display_name: string | null;
  role_override: string | null;
  role_override_name: string | null;
  added_at: string | null;
  added_by: string | null;
}

export interface DataDomain {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  owner_email: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string | null;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface DomainTreeNode {
  id: string;
  name: string;
  description: string | null;
  owner_email: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  children: DomainTreeNode[];
}

// Asset Reviews (G4)

export type ReviewStatus = "pending" | "in_review" | "approved" | "rejected" | "changes_requested";

export type AssetType = "sheet" | "template" | "training_sheet";

export interface AssetReview {
  id: string;
  asset_type: AssetType;
  asset_id: string;
  asset_name: string | null;
  status: ReviewStatus;
  requested_by: string;
  reviewer_email: string | null;
  review_notes: string | null;
  decision_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}
