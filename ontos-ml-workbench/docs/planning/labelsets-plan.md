# Labelsets & Curated Datasets - Full CRUD Implementation Plan

## Overview

Implementing a complete asset-based workflow with:
1. **Labelsets** - Reusable label collections with canonical labels
2. **Curated Datasets** - Approved, training-ready QA pairs
3. **Approval Workflows** - State transitions with governance
4. **Full CRUD** - Create, Read, Update, Delete, List for each asset type

---

## Data Models

### 1. Labelset Model

**Purpose:** Reusable collection of label definitions and canonical labels

```python
# backend/app/models/labelset.py

from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field

class LabelsetStatus(str, Enum):
    """Labelset lifecycle status."""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class LabelClass(BaseModel):
    """A single label class definition."""
    name: str = Field(..., description="Label name (e.g., 'solder_bridge')")
    display_name: str | None = Field(None, description="Human-readable name")
    color: str = Field(default="#6b7280", description="Hex color for UI")
    description: str | None = None
    hotkey: str | None = Field(None, description="Keyboard shortcut")
    confidence_threshold: float | None = Field(None, ge=0, le=1)

class ResponseSchema(BaseModel):
    """JSON schema for expected response format."""
    type: str = "object"  # JSON Schema type
    properties: dict[str, Any]
    required: list[str] | None = None
    examples: list[dict[str, Any]] | None = None

class Labelset(BaseModel):
    """A reusable collection of label definitions."""
    id: str
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    
    # Label definitions
    label_classes: list[LabelClass] = Field(
        default_factory=list,
        description="Available label classes for this labelset"
    )
    response_schema: ResponseSchema | None = Field(
        default=None,
        description="JSON schema for structured responses"
    )
    
    # Canonical labels association
    label_type: str = Field(
        ...,
        description="Label type identifier (links to canonical_labels table)"
    )
    canonical_label_count: int = Field(
        default=0,
        description="Number of canonical labels using this labelset"
    )
    
    # Status and governance
    status: LabelsetStatus = LabelsetStatus.DRAFT
    version: str = "1.0.0"
    
    # Usage constraints
    allowed_uses: list[str] | None = Field(
        default=None,
        description="Permitted usage types (training, validation, testing)"
    )
    prohibited_uses: list[str] | None = None
    
    # Metadata
    created_by: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    published_by: str | None = None
    published_at: datetime | None = None
    
    # Tags for organization
    tags: list[str] | None = Field(default=None, description="Tags for search/filter")
    use_case: str | None = Field(None, description="Primary use case")

class LabelsetCreate(BaseModel):
    """Request to create a labelset."""
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    label_classes: list[LabelClass] = Field(default_factory=list)
    response_schema: ResponseSchema | None = None
    label_type: str
    allowed_uses: list[str] | None = None
    prohibited_uses: list[str] | None = None
    tags: list[str] | None = None
    use_case: str | None = None

class LabelsetUpdate(BaseModel):
    """Request to update a labelset."""
    name: str | None = None
    description: str | None = None
    label_classes: list[LabelClass] | None = None
    response_schema: ResponseSchema | None = None
    allowed_uses: list[str] | None = None
    prohibited_uses: list[str] | None = None
    tags: list[str] | None = None
    use_case: str | None = None
    version: str | None = None

class LabelsetListResponse(BaseModel):
    """Response for listing labelsets."""
    labelsets: list[Labelset]
    total: int
    page: int
    page_size: int
```

**Database Schema:**
```sql
CREATE TABLE IF NOT EXISTS lakebase_db.labelsets (
    id STRING PRIMARY KEY,
    name STRING NOT NULL,
    description STRING,
    label_classes STRING,  -- JSON array
    response_schema STRING,  -- JSON object
    label_type STRING NOT NULL,
    canonical_label_count INT DEFAULT 0,
    status STRING DEFAULT 'draft',
    version STRING DEFAULT '1.0.0',
    allowed_uses STRING,  -- JSON array
    prohibited_uses STRING,  -- JSON array
    created_by STRING,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    published_by STRING,
    published_at TIMESTAMP,
    tags STRING,  -- JSON array
    use_case STRING
) USING DELTA;
```

---

### 2. Curated Dataset Model

**Purpose:** Approved, training-ready collection of QA pairs

```python
# backend/app/models/curated_dataset.py

from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field

class CuratedDatasetStatus(str, Enum):
    """Curated dataset lifecycle status."""
    DRAFT = "draft"
    APPROVED = "approved"
    IN_USE = "in_use"
    ARCHIVED = "archived"

class DatasetSplit(BaseModel):
    """Train/validation/test split configuration."""
    train_count: int
    val_count: int | None = None
    test_count: int | None = None
    split_strategy: str = "random"  # random, stratified, temporal
    random_seed: int = 42

class QualityMetrics(BaseModel):
    """Quality metrics for the curated dataset."""
    total_examples: int
    verified_count: int
    canonical_count: int
    flagged_count: int
    avg_confidence: float | None = None
    coverage_percent: float | None = None

class CuratedDataset(BaseModel):
    """A curated, training-ready collection of QA pairs."""
    id: str
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    
    # Source reference
    assembly_id: str = Field(..., description="Source Assembly ID")
    assembly_name: str | None = Field(None, description="Source Assembly name")
    sheet_id: str | None = Field(None, description="Original Sheet ID")
    
    # Selection criteria
    selected_row_indices: list[int] = Field(
        default_factory=list,
        description="Row indices included in this dataset"
    )
    include_sources: list[str] | None = Field(
        default=None,
        description="Response sources to include (human_verified, canonical, etc.)"
    )
    exclude_flagged: bool = Field(default=True, description="Exclude flagged examples")
    min_confidence: float | None = Field(None, ge=0, le=1)
    
    # Dataset splits
    split_config: DatasetSplit | None = None
    
    # Quality metrics
    quality_metrics: QualityMetrics | None = None
    
    # Status and governance
    status: CuratedDatasetStatus = CuratedDatasetStatus.DRAFT
    version: str = "1.0.0"
    
    # Usage tracking
    used_in_training_jobs: list[str] | None = Field(
        default=None,
        description="Training job IDs that used this dataset"
    )
    
    # Export info
    export_path: str | None = Field(None, description="UC Volume path for JSONL export")
    export_format: str = "openai_chat"
    
    # Metadata
    created_by: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    approved_by: str | None = None
    approved_at: datetime | None = None
    
    # Tags
    tags: list[str] | None = None
    use_case: str | None = None

class CuratedDatasetCreate(BaseModel):
    """Request to create a curated dataset."""
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    assembly_id: str
    selected_row_indices: list[int] | None = None  # If None, use filter criteria
    include_sources: list[str] | None = None
    exclude_flagged: bool = True
    min_confidence: float | None = None
    split_config: DatasetSplit | None = None
    tags: list[str] | None = None
    use_case: str | None = None

class CuratedDatasetUpdate(BaseModel):
    """Request to update a curated dataset."""
    name: str | None = None
    description: str | None = None
    selected_row_indices: list[int] | None = None
    include_sources: list[str] | None = None
    exclude_flagged: bool | None = None
    min_confidence: float | None = None
    split_config: DatasetSplit | None = None
    tags: list[str] | None = None
    use_case: str | None = None
    version: str | None = None

class CuratedDatasetListResponse(BaseModel):
    """Response for listing curated datasets."""
    datasets: list[CuratedDataset]
    total: int
    page: int
    page_size: int
```

**Database Schema:**
```sql
CREATE TABLE IF NOT EXISTS lakebase_db.curated_datasets (
    id STRING PRIMARY KEY,
    name STRING NOT NULL,
    description STRING,
    assembly_id STRING NOT NULL,
    assembly_name STRING,
    sheet_id STRING,
    selected_row_indices STRING,  -- JSON array
    include_sources STRING,  -- JSON array
    exclude_flagged BOOLEAN DEFAULT true,
    min_confidence DOUBLE,
    split_config STRING,  -- JSON object
    quality_metrics STRING,  -- JSON object
    status STRING DEFAULT 'draft',
    version STRING DEFAULT '1.0.0',
    used_in_training_jobs STRING,  -- JSON array
    export_path STRING,
    export_format STRING DEFAULT 'openai_chat',
    created_by STRING,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    approved_by STRING,
    approved_at TIMESTAMP,
    tags STRING,  -- JSON array
    use_case STRING
) USING DELTA;
```

---

### 3. Updated Assembly Model (Add Approval States)

```python
# backend/app/models/assembly.py - ADD to existing

class AssemblyStatus(str, Enum):
    """Assembly lifecycle status with approval gates."""
    ASSEMBLING = "assembling"       # Currently being assembled
    READY = "ready"                  # Assembly complete, ready for review
    REVIEWED = "reviewed"            # Human reviewed, ready for curation
    CURATED = "curated"              # Curated, ready for approval
    APPROVED = "approved"            # Approved for training
    FAILED = "failed"                # Assembly failed
    ARCHIVED = "archived"            # Archived

# Add to AssembledDataset model:
class AssembledDataset(BaseModel):
    # ... existing fields ...
    
    # Approval workflow
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    curated_by: str | None = None
    curated_at: datetime | None = None
    approved_by: str | None = None
    approved_at: datetime | None = None
```

---

## Backend API Endpoints

### Labelsets API

**File:** `backend/app/api/v1/endpoints/labelsets.py`

```python
from fastapi import APIRouter, HTTPException, Query
from app.models.labelset import *
from app.services.sql_service import get_sql_service

router = APIRouter()

# ============================================================================
# CRUD Operations
# ============================================================================

@router.post("/", response_model=Labelset, status_code=201)
async def create_labelset(labelset: LabelsetCreate, created_by: str = "system"):
    """Create a new labelset."""
    # Implementation
    pass

@router.get("/{labelset_id}", response_model=Labelset)
async def get_labelset(labelset_id: str):
    """Get a labelset by ID."""
    pass

@router.put("/{labelset_id}", response_model=Labelset)
async def update_labelset(labelset_id: str, updates: LabelsetUpdate):
    """Update a labelset."""
    pass

@router.delete("/{labelset_id}", status_code=204)
async def delete_labelset(labelset_id: str):
    """Delete a labelset."""
    pass

@router.get("/", response_model=LabelsetListResponse)
async def list_labelsets(
    status: LabelsetStatus | None = None,
    use_case: str | None = None,
    tags: list[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    """List labelsets with filtering."""
    pass

# ============================================================================
# Canonical Labels Association
# ============================================================================

@router.get("/{labelset_id}/canonical-labels")
async def get_labelset_canonical_labels(labelset_id: str):
    """Get all canonical labels associated with this labelset."""
    pass

@router.post("/{labelset_id}/canonical-labels/{label_id}")
async def link_canonical_label(labelset_id: str, label_id: str):
    """Link an existing canonical label to this labelset."""
    pass

@router.delete("/{labelset_id}/canonical-labels/{label_id}")
async def unlink_canonical_label(labelset_id: str, label_id: str):
    """Unlink a canonical label from this labelset."""
    pass

# ============================================================================
# Status Transitions
# ============================================================================

@router.post("/{labelset_id}/publish")
async def publish_labelset(labelset_id: str, published_by: str = "system"):
    """Publish a labelset (draft → published)."""
    pass

@router.post("/{labelset_id}/archive")
async def archive_labelset(labelset_id: str):
    """Archive a labelset."""
    pass

# ============================================================================
# Statistics
# ============================================================================

@router.get("/{labelset_id}/stats")
async def get_labelset_stats(labelset_id: str):
    """Get statistics for a labelset."""
    # - Total canonical labels
    # - Coverage across assemblies
    # - Usage in training jobs
    pass
```

---

### Curated Datasets API

**File:** `backend/app/api/v1/endpoints/curated_datasets.py`

```python
from fastapi import APIRouter, HTTPException, Query
from app.models.curated_dataset import *
from app.services.sql_service import get_sql_service

router = APIRouter()

# ============================================================================
# CRUD Operations
# ============================================================================

@router.post("/", response_model=CuratedDataset, status_code=201)
async def create_curated_dataset(dataset: CuratedDatasetCreate, created_by: str = "system"):
    """Create a new curated dataset from an Assembly."""
    # 1. Validate assembly exists
    # 2. Apply selection criteria (filter rows)
    # 3. Calculate quality metrics
    # 4. Create dataset record
    pass

@router.get("/{dataset_id}", response_model=CuratedDataset)
async def get_curated_dataset(dataset_id: str):
    """Get a curated dataset by ID."""
    pass

@router.put("/{dataset_id}", response_model=CuratedDataset)
async def update_curated_dataset(dataset_id: str, updates: CuratedDatasetUpdate):
    """Update a curated dataset."""
    pass

@router.delete("/{dataset_id}", status_code=204)
async def delete_curated_dataset(dataset_id: str):
    """Delete a curated dataset."""
    pass

@router.get("/", response_model=CuratedDatasetListResponse)
async def list_curated_datasets(
    status: CuratedDatasetStatus | None = None,
    assembly_id: str | None = None,
    use_case: str | None = None,
    tags: list[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    """List curated datasets with filtering."""
    pass

# ============================================================================
# Preview and Export
# ============================================================================

@router.get("/{dataset_id}/preview")
async def preview_curated_dataset(
    dataset_id: str,
    limit: int = Query(default=10, ge=1, le=100),
):
    """Preview examples from the curated dataset."""
    pass

@router.post("/{dataset_id}/export")
async def export_curated_dataset(
    dataset_id: str,
    volume_path: str,
    format: str = "openai_chat",
):
    """Export curated dataset to Unity Catalog volume as JSONL."""
    pass

# ============================================================================
# Status Transitions
# ============================================================================

@router.post("/{dataset_id}/approve")
async def approve_curated_dataset(dataset_id: str, approved_by: str = "system"):
    """Approve a curated dataset for training (draft → approved)."""
    pass

@router.post("/{dataset_id}/mark-in-use")
async def mark_dataset_in_use(dataset_id: str, training_job_id: str):
    """Mark dataset as in use by a training job."""
    pass

@router.post("/{dataset_id}/archive")
async def archive_curated_dataset(dataset_id: str):
    """Archive a curated dataset."""
    pass

# ============================================================================
# Statistics
# ============================================================================

@router.get("/{dataset_id}/quality-report")
async def get_quality_report(dataset_id: str):
    """Get detailed quality report for the curated dataset."""
    # - Example distribution
    # - Confidence scores
    # - Canonical label coverage
    # - Verification status
    pass
```

---

## Frontend Implementation

### 1. TypeScript Types

**File:** `frontend/src/types/index.ts` (add to existing)

```typescript
// Labelset types
export interface LabelClass {
  name: string;
  display_name?: string;
  color: string;
  description?: string;
  hotkey?: string;
  confidence_threshold?: number;
}

export interface ResponseSchema {
  type: string;
  properties: Record<string, any>;
  required?: string[];
  examples?: Record<string, any>[];
}

export type LabelsetStatus = 'draft' | 'published' | 'archived';

export interface Labelset {
  id: string;
  name: string;
  description?: string;
  label_classes: LabelClass[];
  response_schema?: ResponseSchema;
  label_type: string;
  canonical_label_count: number;
  status: LabelsetStatus;
  version: string;
  allowed_uses?: string[];
  prohibited_uses?: string[];
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  published_by?: string;
  published_at?: string;
  tags?: string[];
  use_case?: string;
}

export interface LabelsetCreate {
  name: string;
  description?: string;
  label_classes?: LabelClass[];
  response_schema?: ResponseSchema;
  label_type: string;
  allowed_uses?: string[];
  prohibited_uses?: string[];
  tags?: string[];
  use_case?: string;
}

// Curated Dataset types
export interface DatasetSplit {
  train_count: number;
  val_count?: number;
  test_count?: number;
  split_strategy: string;
  random_seed: number;
}

export interface QualityMetrics {
  total_examples: number;
  verified_count: number;
  canonical_count: number;
  flagged_count: number;
  avg_confidence?: number;
  coverage_percent?: number;
}

export type CuratedDatasetStatus = 'draft' | 'approved' | 'in_use' | 'archived';

export interface CuratedDataset {
  id: string;
  name: string;
  description?: string;
  assembly_id: string;
  assembly_name?: string;
  sheet_id?: string;
  selected_row_indices: number[];
  include_sources?: string[];
  exclude_flagged: boolean;
  min_confidence?: number;
  split_config?: DatasetSplit;
  quality_metrics?: QualityMetrics;
  status: CuratedDatasetStatus;
  version: string;
  used_in_training_jobs?: string[];
  export_path?: string;
  export_format: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  approved_by?: string;
  approved_at?: string;
  tags?: string[];
  use_case?: string;
}

export interface CuratedDatasetCreate {
  name: string;
  description?: string;
  assembly_id: string;
  selected_row_indices?: number[];
  include_sources?: string[];
  exclude_flagged?: boolean;
  min_confidence?: number;
  split_config?: DatasetSplit;
  tags?: string[];
  use_case?: string;
}
```

---

### 2. API Service Functions

**File:** `frontend/src/services/labelsets.ts`

```typescript
import { apiClient } from './api';
import type { Labelset, LabelsetCreate } from '../types';

export async function listLabelsets(params?: {
  status?: string;
  use_case?: string;
  tags?: string[];
  page?: number;
  page_size?: number;
}) {
  const response = await apiClient.get('/labelsets', { params });
  return response.data;
}

export async function getLabelset(id: string) {
  const response = await apiClient.get(`/labelsets/${id}`);
  return response.data;
}

export async function createLabelset(data: LabelsetCreate) {
  const response = await apiClient.post('/labelsets', data);
  return response.data;
}

export async function updateLabelset(id: string, data: Partial<Labelset>) {
  const response = await apiClient.put(`/labelsets/${id}`, data);
  return response.data;
}

export async function deleteLabelset(id: string) {
  await apiClient.delete(`/labelsets/${id}`);
}

export async function publishLabelset(id: string) {
  const response = await apiClient.post(`/labelsets/${id}/publish`);
  return response.data;
}

export async function archiveLabelset(id: string) {
  const response = await apiClient.post(`/labelsets/${id}/archive`);
  return response.data;
}

export async function getLabelsetStats(id: string) {
  const response = await apiClient.get(`/labelsets/${id}/stats`);
  return response.data;
}

export async function getLabelsetCanonicalLabels(id: string) {
  const response = await apiClient.get(`/labelsets/${id}/canonical-labels`);
  return response.data;
}
```

**File:** `frontend/src/services/curated-datasets.ts`

```typescript
import { apiClient } from './api';
import type { CuratedDataset, CuratedDatasetCreate } from '../types';

export async function listCuratedDatasets(params?: {
  status?: string;
  assembly_id?: string;
  use_case?: string;
  tags?: string[];
  page?: number;
  page_size?: number;
}) {
  const response = await apiClient.get('/curated-datasets', { params });
  return response.data;
}

export async function getCuratedDataset(id: string) {
  const response = await apiClient.get(`/curated-datasets/${id}`);
  return response.data;
}

export async function createCuratedDataset(data: CuratedDatasetCreate) {
  const response = await apiClient.post('/curated-datasets', data);
  return response.data;
}

export async function updateCuratedDataset(id: string, data: Partial<CuratedDataset>) {
  const response = await apiClient.put(`/curated-datasets/${id}`, data);
  return response.data;
}

export async function deleteCuratedDataset(id: string) {
  await apiClient.delete(`/curated-datasets/${id}`);
}

export async function approveCuratedDataset(id: string) {
  const response = await apiClient.post(`/curated-datasets/${id}/approve`);
  return response.data;
}

export async function exportCuratedDataset(id: string, volumePath: string, format: string = 'openai_chat') {
  const response = await apiClient.post(`/curated-datasets/${id}/export`, {
    volume_path: volumePath,
    format,
  });
  return response.data;
}

export async function getQualityReport(id: string) {
  const response = await apiClient.get(`/curated-datasets/${id}/quality-report`);
  return response.data;
}
```

---

### 3. React Query Hooks

**File:** `frontend/src/hooks/useLabelsets.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/labelsets';
import type { LabelsetCreate } from '../types';

// Query keys factory
export const labelsetKeys = {
  all: ['labelsets'] as const,
  lists: () => [...labelsetKeys.all, 'list'] as const,
  list: (filters: any) => [...labelsetKeys.lists(), filters] as const,
  details: () => [...labelsetKeys.all, 'detail'] as const,
  detail: (id: string) => [...labelsetKeys.details(), id] as const,
  stats: (id: string) => [...labelsetKeys.detail(id), 'stats'] as const,
  canonicalLabels: (id: string) => [...labelsetKeys.detail(id), 'canonical'] as const,
};

// List labelsets
export function useLabelsets(filters?: any) {
  return useQuery({
    queryKey: labelsetKeys.list(filters),
    queryFn: () => api.listLabelsets(filters),
  });
}

// Get single labelset
export function useLabelset(id: string | undefined) {
  return useQuery({
    queryKey: labelsetKeys.detail(id!),
    queryFn: () => api.getLabelset(id!),
    enabled: !!id,
  });
}

// Create labelset
export function useCreateLabelset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LabelsetCreate) => api.createLabelset(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labelsetKeys.lists() });
    },
  });
}

// Update labelset
export function useUpdateLabelset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.updateLabelset(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: labelsetKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: labelsetKeys.lists() });
    },
  });
}

// Delete labelset
export function useDeleteLabelset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteLabelset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labelsetKeys.lists() });
    },
  });
}

// Publish labelset
export function usePublishLabelset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.publishLabelset(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: labelsetKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: labelsetKeys.lists() });
    },
  });
}

// Archive labelset
export function useArchiveLabelset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.archiveLabelset(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: labelsetKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: labelsetKeys.lists() });
    },
  });
}

// Get labelset stats
export function useLabelsetStats(id: string | undefined) {
  return useQuery({
    queryKey: labelsetKeys.stats(id!),
    queryFn: () => api.getLabelsetStats(id!),
    enabled: !!id,
  });
}

// Get canonical labels for labelset
export function useLabelsetCanonicalLabels(id: string | undefined) {
  return useQuery({
    queryKey: labelsetKeys.canonicalLabels(id!),
    queryFn: () => api.getLabelsetCanonicalLabels(id!),
    enabled: !!id,
  });
}
```

**File:** `frontend/src/hooks/useCuratedDatasets.ts`

```typescript
// Similar structure to useLabelsets.ts
// Hooks for: list, get, create, update, delete, approve, export, getQualityReport
```

---

### 4. React Components

#### LabelSetsPage

**File:** `frontend/src/pages/LabelSetsPage.tsx`

```typescript
/**
 * LabelSetsPage - Manage reusable label collections
 *
 * Features:
 * - List view with DataTable
 * - Create/edit labelset form
 * - Publish/archive actions
 * - Link to canonical labels
 * - Usage statistics
 */

import { useState } from 'react';
import { Plus, Edit, Archive, Eye } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { useLabelsets, useDeleteLabelset, usePublishLabelset } from '../hooks/useLabelsets';
import { LabelsetForm } from '../components/LabelsetForm';

export function LabelSetsPage() {
  const [viewMode, setViewMode] = useState<'browse' | 'create'>('browse');
  const [editingLabelset, setEditingLabelset] = useState(null);
  
  const { data: labelsetsData, isLoading } = useLabelsets();
  const deleteMutation = useDeleteLabelset();
  const publishMutation = usePublishLabelset();
  
  // DataTable columns
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'label_type', label: 'Label Type' },
    { key: 'canonical_label_count', label: 'Canonical Labels' },
    { key: 'status', label: 'Status' },
    { key: 'use_case', label: 'Use Case' },
    { key: 'created_at', label: 'Created' },
  ];
  
  // Row actions
  const rowActions = [
    {
      label: 'Edit',
      icon: Edit,
      onClick: (labelset) => {
        setEditingLabelset(labelset);
        setViewMode('create');
      },
    },
    {
      label: 'Publish',
      icon: Eye,
      onClick: (labelset) => publishMutation.mutate(labelset.id),
      condition: (labelset) => labelset.status === 'draft',
    },
    {
      label: 'Archive',
      icon: Archive,
      onClick: (labelset) => deleteMutation.mutate(labelset.id),
    },
  ];
  
  if (viewMode === 'create') {
    return (
      <LabelsetForm
        labelset={editingLabelset}
        onClose={() => {
          setViewMode('browse');
          setEditingLabelset(null);
        }}
        onSaved={() => {
          setViewMode('browse');
          setEditingLabelset(null);
        }}
      />
    );
  }
  
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Labelsets</h1>
        <button
          onClick={() => setViewMode('create')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Create Labelset
        </button>
      </div>
      
      <DataTable
        columns={columns}
        data={labelsetsData?.labelsets || []}
        rowActions={rowActions}
        isLoading={isLoading}
      />
    </div>
  );
}
```

#### CuratePage (New - Dataset Curation)

**File:** `frontend/src/pages/CuratePage.tsx` (separate from current CuratePage which becomes AssemblePage)

```typescript
/**
 * CuratePage - Select and approve training examples
 *
 * Features:
 * - Load Assembly that's been reviewed
 * - Filter/select examples for training
 * - Configure train/val split
 * - Create Curated Dataset
 * - Quality metrics dashboard
 * - Approval workflow
 */

import { useState } from 'react';
import { Check, Filter, Download } from 'lucide-react';
import { useAssembly } from '../hooks/useAssemblies';
import { useCreateCuratedDataset, useApproveCuratedDataset } from '../hooks/useCuratedDatasets';
import { DataTable } from '../components/DataTable';

export function CuratePage() {
  const [selectedAssembly, setSelectedAssembly] = useState(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [splitConfig, setSplitConfig] = useState({ train: 80, val: 20 });
  
  const createMutation = useCreateCuratedDataset();
  const approveMutation = useApproveCuratedDataset();
  
  const handleCreateDataset = () => {
    createMutation.mutate({
      name: `Curated Dataset - ${selectedAssembly.name}`,
      assembly_id: selectedAssembly.id,
      selected_row_indices: selectedRows,
      exclude_flagged: true,
      split_config: {
        train_count: Math.floor(selectedRows.length * splitConfig.train / 100),
        val_count: Math.ceil(selectedRows.length * splitConfig.val / 100),
        split_strategy: 'random',
        random_seed: 42,
      },
    });
  };
  
  // Implementation...
  return (
    <div className="p-6">
      {/* Assembly selector */}
      {/* Example selection interface */}
      {/* Quality metrics */}
      {/* Split configuration */}
      {/* Create/approve buttons */}
    </div>
  );
}
```

---

## Navigation Update

**File:** `frontend/src/components/apx/AppLayout.tsx`

```typescript
const LIFECYCLE_STAGES: StageConfig[] = [
  {
    id: "data",
    label: "Sheets",
    icon: Database,
    color: "text-blue-500",
    description: "Create and manage data sources",
  },
  {
    id: "configure",  // NEW
    label: "Configure",
    icon: Settings2,
    color: "text-purple-500",
    description: "Attach templates and labelsets",
  },
  {
    id: "assemble",  // RENAMED from "curate"
    label: "Assemble",
    icon: Layers,
    color: "text-amber-500",
    description: "Generate prompt/response pairs",
  },
  {
    id: "review",  // RENAMED from "label"
    label: "Review",
    icon: CheckCircle,
    color: "text-orange-500",
    description: "Verify and correct labels",
  },
  {
    id: "curate",  // NEW
    label: "Curate",
    icon: Filter,
    color: "text-teal-500",
    description: "Select and approve training examples",
  },
  {
    id: "train",
    label: "Train",
    icon: Cpu,
    color: "text-green-500",
    description: "Fine-tune models",
  },
  {
    id: "deploy",
    label: "Deploy",
    icon: Rocket,
    color: "text-cyan-500",
    description: "Deploy to production",
  },
  {
    id: "monitor",
    label: "Monitor",
    icon: Activity,
    color: "text-rose-500",
    description: "Monitor performance",
  },
  {
    id: "improve",
    label: "Improve",
    icon: RefreshCw,
    color: "text-indigo-500",
    description: "Continuous improvement",
  },
];

// Add to Tools section
const TOOLS_CONFIG = {
  labelsets: {
    id: "labelsets",
    label: "Labelsets",
    icon: Tag,
    color: "text-pink-500",
    description: "Manage label collections",
  },
  datasets: {
    id: "datasets",
    label: "Datasets",
    icon: Database,
    color: "text-violet-500",
    description: "Manage curated datasets",
  },
  // ... existing tools
};
```

---

## Implementation Phases

### Phase 1: Data Models & Backend (Week 1)
- [ ] Create Labelset model and database table
- [ ] Create CuratedDataset model and database table
- [ ] Update Assembly model with approval states
- [ ] Create labelsets API endpoints (13 endpoints)
- [ ] Create curated datasets API endpoints (12 endpoints)
- [ ] Add router registrations

### Phase 2: Frontend Types & Services (Week 1)
- [ ] Add TypeScript types for Labelsets and Curated Datasets
- [ ] Create labelsets API service functions
- [ ] Create curated datasets API service functions
- [ ] Create React Query hooks for labelsets
- [ ] Create React Query hooks for curated datasets

### Phase 3: UI Components (Week 2)
- [ ] Create LabelsetForm component
- [ ] Create LabelsetCard component
- [ ] Create LabelSetsPage with DataTable
- [ ] Create CuratedDatasetForm component
- [ ] Create CuratedDatasetCard component
- [ ] Create CuratePage (new) with selection interface
- [ ] Create QualityMetrics dashboard component

### Phase 4: Navigation & Integration (Week 2)
- [ ] Update AppLayout with 9-stage navigation
- [ ] Add Labelsets and Datasets to Tools section
- [ ] Rename CuratePage → AssemblePage
- [ ] Create new ConfigurePage for template attachment
- [ ] Update routing in AppWithSidebar
- [ ] Add approval workflow UI components

### Phase 5: Testing & Documentation (Week 3)
- [ ] Update seed data to include labelsets
- [ ] Test full workflow: Sheets → Configure → Assemble → Review → Curate → Train
- [ ] Validate approval state transitions
- [ ] Test canonical label association with labelsets
- [ ] Update all documentation
- [ ] Create user guide for labelsets and curation

---

## Summary

This implementation adds:

**New Models:**
- Labelset (reusable label collections)
- CuratedDataset (training-ready QA pairs)
- Updated Assembly (approval states)

**New API Endpoints:**
- 13 labelsets endpoints (CRUD + list + stats + canonical labels + approval)
- 12 curated datasets endpoints (CRUD + list + export + quality + approval)

**New Pages:**
- LabelSetsPage (manage labelsets)
- ConfigurePage (attach template + labelset to sheet)
- CuratePage (select and approve training examples)
- AssemblePage (renamed from CuratePage)

**Updated Navigation:**
- 9-stage workflow: Sheets → Configure → Assemble → Review → Curate → Train → Deploy → Monitor → Improve
- Asset management tools: Labelsets, Templates, Datasets, Examples, DSPy

Ready to start implementation?
