/**
 * Canonical Labels API Client
 *
 * PRD v2.3: Expert-validated ground truth labels that can be reused across Training Sheets.
 * Provides complete CRUD operations, lookups, statistics, and governance.
 */

import type {
  CanonicalLabel,
  CanonicalLabelBulkLookup,
  CanonicalLabelBulkLookupResponse,
  CanonicalLabelCreateRequest,
  CanonicalLabelListResponse,
  CanonicalLabelLookup,
  CanonicalLabelStats,
  CanonicalLabelUpdateRequest,
  CanonicalLabelVersion,
  ItemLabelsets,
  UsageConstraintCheck,
  UsageConstraintCheckResponse,
} from "../types";

const API_BASE = "/api/v1/canonical-labels";

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new canonical label.
 *
 * The composite key (sheet_id, item_ref, label_type) must be unique.
 * Throws 409 Conflict if a label already exists with the same key.
 */
export async function createCanonicalLabel(
  request: CanonicalLabelCreateRequest
): Promise<CanonicalLabel> {
  const response = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to create canonical label");
  }

  return response.json();
}

/**
 * Get a canonical label by ID.
 */
export async function getCanonicalLabel(
  labelId: string
): Promise<CanonicalLabel> {
  const response = await fetch(`${API_BASE}/${labelId}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Canonical label not found");
    }
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch canonical label");
  }

  return response.json();
}

/**
 * Update a canonical label.
 *
 * Creates a new version in the version history table.
 * Only provided fields are updated (partial update).
 */
export async function updateCanonicalLabel(
  labelId: string,
  updates: CanonicalLabelUpdateRequest
): Promise<CanonicalLabel> {
  const response = await fetch(`${API_BASE}/${labelId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to update canonical label");
  }

  return response.json();
}

/**
 * Delete a canonical label.
 *
 * Fails with 409 Conflict if the label is currently referenced by any Training Sheet rows.
 * Check usage with getCanonicalLabelUsage() before deleting.
 */
export async function deleteCanonicalLabel(labelId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${labelId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    if (response.status === 409) {
      const error = await response.json();
      throw new Error(
        error.detail || "Cannot delete: label is currently in use"
      );
    }
    const error = await response.json();
    throw new Error(error.detail || "Failed to delete canonical label");
  }
}

// ============================================================================
// Lookup Operations
// ============================================================================

/**
 * Lookup a canonical label by composite key (sheet_id, item_ref, label_type).
 *
 * Returns null if not found.
 * This is the primary lookup method used during Training Sheet assembly.
 *
 * @example
 * const label = await lookupCanonicalLabel({
 *   sheet_id: "sheet_123",
 *   item_ref: "image_001.jpg",
 *   label_type: "classification"
 * });
 *
 * if (label) {
 *   console.log("Found canonical label:", label.label_data);
 * } else {
 *   console.log("No canonical label found, will use AI generation");
 * }
 */
export async function lookupCanonicalLabel(
  lookup: CanonicalLabelLookup
): Promise<CanonicalLabel | null> {
  const response = await fetch(`${API_BASE}/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lookup),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to lookup canonical label");
  }

  return response.json();
}

/**
 * Bulk lookup of canonical labels by composite keys.
 *
 * Efficiently retrieves multiple labels in a single query.
 * Used during Training Sheet assembly to check all rows at once.
 *
 * @example
 * const result = await bulkLookupCanonicalLabels({
 *   sheet_id: "sheet_123",
 *   items: [
 *     { item_ref: "image_001.jpg", label_type: "classification" },
 *     { item_ref: "image_002.jpg", label_type: "classification" },
 *     { item_ref: "image_003.jpg", label_type: "localization" }
 *   ]
 * });
 *
 * console.log(`Found: ${result.found_count}, Not found: ${result.not_found_count}`);
 * result.found.forEach(label => {
 *   console.log(`Using canonical label for ${label.item_ref}`);
 * });
 * result.not_found.forEach(item => {
 *   console.log(`Need to generate label for ${item.item_ref}`);
 * });
 */
export async function bulkLookupCanonicalLabels(
  lookup: CanonicalLabelBulkLookup
): Promise<CanonicalLabelBulkLookupResponse> {
  const response = await fetch(`${API_BASE}/lookup/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lookup),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to bulk lookup canonical labels");
  }

  return response.json();
}

// ============================================================================
// List & Search Operations
// ============================================================================

/**
 * List canonical labels with filtering and pagination.
 *
 * @example
 * // Get all high-confidence classification labels for a sheet
 * const { labels, total } = await listCanonicalLabels({
 *   sheet_id: "sheet_123",
 *   label_type: "classification",
 *   confidence: "high",
 *   page: 1,
 *   page_size: 50
 * });
 *
 * @example
 * // Get labels that have been reused at least 5 times
 * const popularLabels = await listCanonicalLabels({
 *   min_reuse_count: 5,
 *   page: 1,
 *   page_size: 100
 * });
 */
export async function listCanonicalLabels(params?: {
  sheet_id?: string;
  label_type?: string;
  confidence?: "high" | "medium" | "low";
  min_reuse_count?: number;
  page?: number;
  page_size?: number;
}): Promise<CanonicalLabelListResponse> {
  const queryParams = new URLSearchParams();

  if (params?.sheet_id) queryParams.set("sheet_id", params.sheet_id);
  if (params?.label_type) queryParams.set("label_type", params.label_type);
  if (params?.confidence) queryParams.set("confidence", params.confidence);
  if (params?.min_reuse_count !== undefined)
    queryParams.set("min_reuse_count", params.min_reuse_count.toString());
  if (params?.page) queryParams.set("page", params.page.toString());
  if (params?.page_size)
    queryParams.set("page_size", params.page_size.toString());

  const url = `${API_BASE}?${queryParams.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to list canonical labels");
  }

  return response.json();
}

// ============================================================================
// Statistics & Analytics
// ============================================================================

/**
 * Get canonical label statistics for a sheet.
 *
 * Returns comprehensive stats including:
 * - Total labels created
 * - Breakdown by label_type
 * - Average reuse count
 * - Top 10 most reused labels
 * - Coverage % (items with at least one label)
 *
 * @example
 * const stats = await getSheetCanonicalStats("sheet_123");
 * console.log(`Total labels: ${stats.total_labels}`);
 * console.log(`Coverage: ${stats.coverage_percent}%`);
 * console.log("Labels by type:", stats.labels_by_type);
 * // { classification: 200, localization: 150, root_cause: 100 }
 */
export async function getSheetCanonicalStats(
  sheetId: string
): Promise<CanonicalLabelStats> {
  const response = await fetch(`${API_BASE}/sheets/${sheetId}/stats`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Sheet not found");
    }
    const error = await response.json();
    throw new Error(
      error.detail || "Failed to fetch canonical label statistics"
    );
  }

  return response.json();
}

/**
 * Get all labelsets (canonical labels) for a single source item.
 *
 * Shows all the different ways an item has been labeled.
 *
 * @example
 * const labelsets = await getItemLabelsets("sheet_123", "image_001.jpg");
 * console.log(`Item has ${labelsets.label_types.length} labelsets:`, labelsets.label_types);
 * // ["classification", "localization", "root_cause", "pass_fail"]
 *
 * labelsets.labelsets.forEach(label => {
 *   console.log(`${label.label_type}:`, label.label_data);
 * });
 */
export async function getItemLabelsets(
  sheetId: string,
  itemRef: string
): Promise<ItemLabelsets> {
  const response = await fetch(`${API_BASE}/items/${sheetId}/${encodeURIComponent(itemRef)}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("No canonical labels found for this item");
    }
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch item labelsets");
  }

  return response.json();
}

// ============================================================================
// Usage & Governance
// ============================================================================

/**
 * Check if a requested usage is allowed for a canonical label.
 *
 * Validates against:
 * 1. allowed_uses: Must be in the allowed list
 * 2. prohibited_uses: Must NOT be in the prohibited list
 *
 * @example
 * const check = await checkUsageConstraints({
 *   canonical_label_id: "label_123",
 *   requested_usage: "training"
 * });
 *
 * if (check.allowed) {
 *   console.log("Usage permitted - proceed with training");
 * } else {
 *   console.error("Usage denied:", check.reason);
 *   // "Usage 'training' is explicitly prohibited for this label"
 * }
 */
export async function checkUsageConstraints(
  check: UsageConstraintCheck
): Promise<UsageConstraintCheckResponse> {
  const response = await fetch(`${API_BASE}/usage/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(check),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to check usage constraints");
  }

  return response.json();
}

/**
 * Get all Training Sheets that use this canonical label.
 *
 * Returns details about where and how the label is being reused.
 * Useful before deleting or modifying a label.
 *
 * @example
 * const usage = await getCanonicalLabelUsage("label_123");
 * console.log(`Label is used in ${usage.usage_count} Training Sheets`);
 *
 * if (usage.usage_count > 0) {
 *   console.warn("Cannot delete - label is in use by:");
 *   usage.used_in.forEach(u => {
 *     console.log(`- ${u.assembly_name} (row ${u.row_index})`);
 *   });
 * }
 */
export async function getCanonicalLabelUsage(labelId: string): Promise<{
  canonical_label_id: string;
  usage_count: number;
  used_in: Array<{
    assembly_id: string;
    assembly_name: string;
    sheet_id: string;
    row_index: number;
  }>;
}> {
  const response = await fetch(`${API_BASE}/${labelId}/usage`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Canonical label not found");
    }
    const error = await response.json();
    throw new Error(error.detail || "Failed to fetch canonical label usage");
  }

  return response.json();
}

// ============================================================================
// Version History
// ============================================================================

/**
 * Get version history for a canonical label.
 *
 * Shows all previous versions with their label_data, confidence, and who modified them.
 * Useful for audit trails and understanding label evolution.
 *
 * @example
 * const versions = await getCanonicalLabelVersions("label_123");
 * console.log(`Label has ${versions.length} versions`);
 *
 * versions.forEach(v => {
 *   console.log(`v${v.version}: Modified by ${v.modified_by} at ${v.modified_at}`);
 *   console.log("Label data:", v.label_data);
 * });
 */
export async function getCanonicalLabelVersions(
  labelId: string
): Promise<CanonicalLabelVersion[]> {
  const response = await fetch(`${API_BASE}/${labelId}/versions`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Canonical label not found");
    }
    const error = await response.json();
    throw new Error(
      error.detail || "Failed to fetch canonical label version history"
    );
  }

  return response.json();
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a canonical label with default values.
 *
 * Helper that sets sensible defaults for optional fields.
 */
export async function createCanonicalLabelWithDefaults(
  sheetId: string,
  itemRef: string,
  labelType: string,
  labelData: any,
  labeledBy: string,
  options?: {
    confidence?: "high" | "medium" | "low";
    notes?: string;
    allowedUses?: string[];
    prohibitedUses?: string[];
  }
): Promise<CanonicalLabel> {
  return createCanonicalLabel({
    sheet_id: sheetId,
    item_ref: itemRef,
    label_type: labelType,
    label_data: labelData,
    confidence: options?.confidence || "high",
    notes: options?.notes,
    allowed_uses: options?.allowedUses || [
      "training",
      "validation",
      "evaluation",
      "few_shot",
      "testing",
    ],
    prohibited_uses: options?.prohibitedUses || [],
    data_classification: "internal",
    labeled_by: labeledBy,
  });
}

/**
 * Check if a canonical label exists for the given composite key.
 *
 * Helper that returns a boolean instead of the full label object.
 */
export async function canonicalLabelExists(
  sheetId: string,
  itemRef: string,
  labelType: string
): Promise<boolean> {
  try {
    const label = await lookupCanonicalLabel({
      sheet_id: sheetId,
      item_ref: itemRef,
      label_type: labelType,
    });
    return label !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Get or create a canonical label.
 *
 * If a label exists for the composite key, returns it.
 * Otherwise, creates a new label with the provided data.
 */
export async function getOrCreateCanonicalLabel(
  request: CanonicalLabelCreateRequest
): Promise<{ label: CanonicalLabel; created: boolean }> {
  // Try to lookup existing label
  const existing = await lookupCanonicalLabel({
    sheet_id: request.sheet_id,
    item_ref: request.item_ref,
    label_type: request.label_type,
  });

  if (existing) {
    return { label: existing, created: false };
  }

  // Create new label
  const created = await createCanonicalLabel(request);
  return { label: created, created: true };
}
