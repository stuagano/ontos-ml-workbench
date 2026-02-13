# Asset Lifecycle Management - Gap Analysis

**Date:** 2026-02-06  
**Status:** Analysis Complete - Implementation Needed  
**Priority:** HIGH - Critical for production readiness

---

## Executive Summary

While we have comprehensive documentation for the **workflow stages** (DATA → GENERATE → LABEL → TRAIN → DEPLOY → MONITOR → IMPROVE), we lack full **CRUD lifecycle management** for the assets created at each stage. This analysis identifies what exists vs. what's needed for production-grade asset management.

**Key Finding:** Most assets have CREATE and READ operations, but are missing UPDATE, DELETE, versioning, archiving, and status transitions needed for real-world usage.

---

## Asset Inventory by Stage

### Stage 1: DATA - Sheets

**Asset Type:** Sheet (dataset pointer)

**Current Operations:**
| Operation | Endpoint | Status |
|-----------|----------|--------|
| **Create** | `POST /sheets` | ✅ Exists |
| **List** | `GET /sheets` | ✅ Exists (with filtering) |
| **Get** | `GET /sheets/{sheet_id}` | ✅ Exists |
| **Update** | `PUT /sheets/{sheet_id}` | ✅ Exists |
| **Delete** | `DELETE /sheets/{sheet_id}` | ✅ Exists |
| **Preview** | `GET /sheets/{sheet_id}/preview` | ✅ Exists |
| **Publish** | `POST /sheets/{sheet_id}/publish` | ✅ Exists |
| **Archive** | `POST /sheets/{sheet_id}/archive` | ✅ Exists |

**Sub-resources: Columns**
| Operation | Endpoint | Status |
|-----------|----------|--------|
| Add Column | `POST /sheets/{sheet_id}/columns` | ✅ Exists |
| Update Column | `PUT /sheets/{sheet_id}/columns/{column_id}` | ✅ Exists |
| Delete Column | `DELETE /sheets/{sheet_id}/columns/{column_id}` | ✅ Exists |

**Missing Operations:**
- ❌ **Version history** - No way to see/rollback sheet definition changes
- ❌ **Clone sheet** - Copy sheet with new name for experimentation
- ❌ **Duplicate detection** - Warn if similar sheet exists
- ❌ **Usage tracking** - Which Training Sheets use this Sheet?
- ⚠️  **Soft delete** - Currently hard deletes, should preserve for lineage

**Risk Level:** 🟡 MEDIUM - Core CRUD exists but missing quality-of-life features

---

### Stage 2: GENERATE - Training Sheets (Assemblies)

**Asset Type:** Training Sheet (Q&A pair dataset)

**Current Operations:**
| Operation | Endpoint | Status |
|-----------|----------|--------|
| **Create** | `POST /sheets/{sheet_id}/assemble` | ✅ Exists (via sheets) |
| **List** | `GET /assemblies/list` | ✅ Exists |
| **Get** | `GET /assemblies/{assembly_id}` | ✅ Exists |
| **Delete** | `DELETE /assemblies/{assembly_id}` | ✅ Exists |
| **Preview** | `GET /assemblies/{assembly_id}/preview` | ✅ Exists |
| **Get Row** | `GET /assemblies/{assembly_id}/rows/{row_index}` | ✅ Exists |
| **Update Row** | `PUT /assemblies/{assembly_id}/rows/{row_index}` | ✅ Exists |
| **Generate** | `POST /assemblies/{assembly_id}/generate` | ✅ Exists |
| **Export** | `POST /assemblies/{assembly_id}/export` | ✅ Exists |

**Missing Operations:**
- ❌ **UPDATE** - No `PUT /assemblies/{assembly_id}` to update metadata (name, description, status)
- ❌ **Clone/Duplicate** - Can't create Training Sheet v2 from v1
- ❌ **Version management** - No way to track template changes across generations
- ❌ **Bulk row operations** - Approve/reject multiple rows at once
- ❌ **Status transitions** - No explicit approve/finalize operation
- ❌ **Archive** - No way to mark as archived (keeps list clean)
- ❌ **Compare** - Can't diff two Training Sheets
- ⚠️  **Soft delete** - Should preserve for lineage tracking
- ❌ **Regenerate specific rows** - Retry failed AI generations
- ❌ **Split** - Create train/val/test splits from one Training Sheet
- ❌ **Merge** - Combine multiple Training Sheets
- ❌ **Quality metrics** - Overall quality scores, approval rate

**Risk Level:** 🔴 HIGH - Missing critical update and lifecycle operations

---

### TOOLS Section: Prompt Templates

**Asset Type:** Template (prompt definition)

**Current Operations:**
| Operation | Endpoint | Status |
|-----------|----------|--------|
| **Create** | `POST /templates` | ✅ Exists |
| **List** | `GET /templates` | ✅ Exists (with filtering) |
| **Get** | `GET /templates/{template_id}` | ✅ Exists |
| **Update** | `PUT /templates/{template_id}` | ✅ Exists |
| **Delete** | `DELETE /templates/{template_id}` | ✅ Exists |
| **Publish** | `POST /templates/{template_id}/publish` | ✅ Exists |
| **Archive** | `POST /templates/{template_id}/archive` | ✅ Exists |
| **Version** | `POST /templates/{template_id}/version` | ✅ Exists |

**Missing Operations:**
- ❌ **Clone template** - Duplicate for customization
- ❌ **Compare versions** - Diff between template versions
- ❌ **Usage tracking** - Which Training Sheets use this template?
- ❌ **Test template** - Try template on sample data before creating Training Sheet
- ❌ **Template metrics** - Average quality scores for sheets using this template
- ⚠️  **Soft delete** - Hard delete breaks lineage

**Risk Level:** 🟡 MEDIUM - Good lifecycle but missing usage analytics

---

### TOOLS Section: Canonical Labels

**Asset Type:** Canonical Label (ground truth)

**Current Operations:**
| Operation | Endpoint | Status |
|-----------|----------|--------|
| **Create** | `POST /canonical-labels` | ✅ Exists |
| **List** | `GET /canonical-labels` | ✅ Exists (with filtering) |
| **Get** | `GET /canonical-labels/{label_id}` | ✅ Exists |
| **Update** | `PUT /canonical-labels/{label_id}` | ✅ Exists |
| **Delete** | `DELETE /canonical-labels/{label_id}` | ✅ Exists |
| **Lookup** | `POST /canonical-labels/lookup` | ✅ Exists |
| **Bulk Lookup** | `POST /canonical-labels/lookup/bulk` | ✅ Exists |
| **Stats** | `GET /canonical-labels/sheets/{sheet_id}/stats` | ✅ Exists |
| **Item Labels** | `GET /canonical-labels/items/{sheet_id}/{item_ref}` | ✅ Exists |
| **Usage Check** | `POST /canonical-labels/usage/check` | ✅ Exists |
| **Versions** | `GET /canonical-labels/{label_id}/versions` | ✅ Exists |
| **Increment Reuse** | `POST /canonical-labels/{label_id}/increment-reuse` | ✅ Exists |

**Missing Operations:**
- ❌ **Bulk create** - Import many labels at once (CSV/JSONL)
- ❌ **Bulk update** - Change governance constraints for multiple labels
- ❌ **Clone label to new item** - Copy label structure for similar items
- ❌ **Quality review** - Mark labels as verified/needs-review
- ❌ **Export labels** - Download canonical labels as dataset
- ❌ **Compare label versions** - Diff between versions
- ⚠️  **Soft delete** - Should preserve for audit trail

**Risk Level:** 🟢 LOW - Comprehensive CRUD, just missing bulk ops

---

### Stage 3: LABEL - Q&A Pair Review

**Asset Type:** Q&A Pair (individual rows in Training Sheet)

**Current Operations:**
| Operation | Endpoint | Status |
|-----------|----------|--------|
| **Get** | `GET /assemblies/{id}/rows/{index}` | ✅ Exists |
| **Update** | `PUT /assemblies/{id}/rows/{index}` | ✅ Exists |

**Missing Operations:**
- ❌ **Bulk approve** - Approve 50 pairs at once
- ❌ **Bulk reject** - Reject low-quality pairs in batch
- ❌ **Bulk flag** - Flag for expert review
- ❌ **Assign to reviewer** - Route to specific expert
- ❌ **Review queue** - Next unlabeled pair endpoint
- ❌ **Review progress** - % complete, estimated time remaining
- ❌ **Review stats** - Approval rate, avg time per review
- ❌ **Comment/annotation** - Leave notes on specific pairs
- ❌ **Disagreement tracking** - Multiple reviewers, consensus
- ❌ **Skip** - Skip pair temporarily, come back later
- ❌ **Filter by source** - Review only AI-generated, only manual, etc.

**Risk Level:** 🔴 HIGH - Missing all batch operations and workflow features

---

### Stage 4: TRAIN - Model Training

**Asset Type:** Fine-tuning Job + Registered Model

**Current Operations:**
| Operation | Endpoint | Status |
|-----------|----------|--------|
| Export Training Sheet | `POST /assemblies/{id}/export` | ✅ Exists |
| List Models | `GET /deployment/models` | ✅ Exists |
| Get Model Versions | `GET /deployment/models/{name}/versions` | ✅ Exists |

**Missing Operations:**
- ❌ **CREATE training job** - No `/training/jobs` endpoint
- ❌ **List training jobs** - Can't see all jobs
- ❌ **Get job status** - No polling endpoint for FMAPI job
- ❌ **Cancel job** - Can't stop running training
- ❌ **Retry failed job** - Restart with same config
- ❌ **Job history** - All training runs for a Training Sheet
- ❌ **Hyperparameter tracking** - Record what config was used
- ❌ **Model lineage** - Which Training Sheet produced this model?
- ❌ **Model comparison** - Compare metrics across models
- ❌ **Model versioning** - Promote/demote versions
- ❌ **Model metadata** - Update description, tags, owner
- ❌ **Model archival** - Archive old models
- ❌ **Model deletion** - Remove unused models

**Risk Level:** 🔴 CRITICAL - No training job management at all

---

### Stage 5: DEPLOY - Model Serving

**Asset Type:** Model Serving Endpoint

**Current Operations:**
| Operation | Endpoint | Status |
|-----------|----------|--------|
| **List Endpoints** | `GET /deployment/endpoints` | ✅ Exists |
| **Get Endpoint** | `GET /deployment/endpoints/{name}` | ✅ Exists |
| **Create/Deploy** | `POST /deployment/deploy` | ✅ Exists |
| **Delete** | `DELETE /deployment/endpoints/{name}` | ✅ Exists |
| **Query** | `POST /deployment/endpoints/{name}/query` | ✅ Exists |

**Missing Operations:**
- ❌ **Update endpoint config** - Change served model, scaling, etc.
- ❌ **Stop/Start endpoint** - Pause without deleting
- ❌ **Endpoint metrics** - Request rate, latency, errors
- ❌ **Traffic split** - A/B testing between models
- ❌ **Rollback** - Quick revert to previous model
- ❌ **Endpoint history** - Changes over time
- ❌ **Cost tracking** - DBU consumption per endpoint
- ❌ **Health check** - Automated monitoring
- ❌ **Logs** - Access serving logs
- ❌ **Alerts** - Configure error/latency alerts

**Risk Level:** 🟡 MEDIUM - Basic ops exist, missing monitoring/ops features

---

### Stage 6: MONITOR - Production Monitoring

**Asset Type:** Inference Logs + Feedback

**Current Operations:**
| Operation | Endpoint | Status |
|-----------|----------|--------|
| Submit Feedback | `POST /feedback` (inferred) | ⚠️  Unknown |

**Missing Operations:**
- ❌ **List feedback** - See all user feedback
- ❌ **Get feedback by model** - Filter by model/endpoint
- ❌ **Feedback aggregation** - Summary stats
- ❌ **Inference logs** - Query production requests/responses
- ❌ **Error tracking** - Failed requests, error rates
- ❌ **Latency tracking** - P50/P95/P99 latencies
- ❌ **Cost tracking** - Token usage, DBU consumption
- ❌ **Drift detection** - Input distribution changes
- ❌ **Performance metrics** - Accuracy over time
- ❌ **Alerting** - Configure alerts on metrics
- ❌ **Dashboards** - Visual monitoring

**Risk Level:** 🔴 CRITICAL - Almost no monitoring capabilities

---

### Stage 7: IMPROVE - Feedback Loop

**Asset Type:** Improvement Tasks/Issues

**Current Operations:**
| Operation | Endpoint | Status |
|-----------|----------|--------|
| None | N/A | ❌ Missing |

**Missing Operations:**
- ❌ **Create improvement task** - Log issue from feedback
- ❌ **List improvement tasks** - Backlog of improvements
- ❌ **Prioritize tasks** - Rank by impact
- ❌ **Assign task** - Route to team member
- ❌ **Link to feedback** - Trace back to original issue
- ❌ **Track resolution** - Close task when fixed
- ❌ **Impact analysis** - Estimate improvement impact
- ❌ **Trend analysis** - Recurring issues
- ❌ **Automated suggestions** - AI-suggested improvements

**Risk Level:** 🔴 CRITICAL - Entire stage missing

---

## Cross-Cutting Gaps

### Versioning & History
- ❌ Most assets lack version history
- ❌ No rollback capabilities
- ❌ No change tracking/audit log
- ❌ No "revert to version X" operation

### Soft Delete & Archival
- ⚠️  Most deletes are hard deletes (breaks lineage)
- ❌ No trash/recycle bin
- ❌ No archive state for inactive assets
- ❌ No auto-archive after N days

### Bulk Operations
- ❌ Minimal bulk endpoints (create many, update many, delete many)
- ❌ No batch status updates
- ❌ No CSV import/export for most assets

### Search & Filtering
- ⚠️  Basic filtering exists but limited
- ❌ No full-text search across assets
- ❌ No advanced filters (date ranges, multiple fields)
- ❌ No saved searches/views

### Permissions & Access Control
- ❌ No asset-level permissions (who can edit/delete?)
- ❌ No sharing/collaboration features
- ❌ No role-based access control (RBAC)

### Usage Analytics
- ❌ No "used by" tracking across assets
- ❌ No usage metrics (access frequency, last used)
- ❌ No dependency graphs
- ❌ No impact analysis (what breaks if I delete this?)

### Lineage Tracking
- ⚠️  Schema designed but not fully exposed via API
- ❌ No lineage query endpoints
- ❌ No lineage visualization
- ❌ No "trace to source" operations

### Validation & Quality
- ❌ No pre-flight validation (check before create/update)
- ❌ No quality scoring at asset level
- ❌ No automated quality checks
- ❌ No quality dashboards

---

## Priority Recommendations

### P0 - Must Have for MVP
1. **Training Job Management** (Stage 4)
   - Create job, get status, cancel job, list jobs
   - Critical for actually training models

2. **Q&A Pair Bulk Operations** (Stage 3)
   - Bulk approve, bulk reject, review queue
   - Expert efficiency blocker

3. **Training Sheet Update** (Stage 2)
   - Update metadata, status transitions, archive
   - Basic asset lifecycle

4. **Soft Deletes**
   - Preserve lineage, enable undo
   - Data integrity protection

5. **Basic Monitoring** (Stage 6)
   - List feedback, error tracking, basic metrics
   - Production readiness

### P1 - Should Have Soon
1. **Asset Versioning**
   - Version history, rollback, change tracking
   - Collaboration and safety

2. **Bulk Import/Export**
   - CSV import for canonical labels
   - Productivity improvement

3. **Usage Tracking**
   - Which assets use which other assets
   - Impact analysis

4. **Advanced Filtering**
   - Date ranges, multi-field, saved views
   - User experience

### P2 - Nice to Have
1. **Clone/Duplicate**
   - Experiment from existing assets
   - Productivity

2. **Comparison Tools**
   - Diff templates, compare Training Sheets
   - Quality improvement

3. **Automated Suggestions**
   - Quality warnings, duplicate detection
   - AI-assisted curation

---

## Implementation Estimate

| Priority | Scope | Backend Days | Frontend Days | Total |
|----------|-------|--------------|---------------|-------|
| **P0** | 5 critical gaps | 10-15 | 8-12 | 18-27 |
| **P1** | 4 important features | 8-12 | 6-10 | 14-22 |
| **P2** | 3 nice-to-haves | 6-10 | 5-8 | 11-18 |
| **Total** | Full lifecycle | 24-37 | 19-30 | **43-67 days** |

**Recommendation:** Focus on P0 first (3-4 weeks), reassess before P1.

---

## Next Steps

1. **Prioritize gaps** with product/user input
2. **Design APIs** for top priority gaps
3. **Update PRD** with new requirements
4. **Create implementation plan** with milestones
5. **Build incrementally** - one stage at a time

---

**Status:** Analysis complete, awaiting prioritization decision.
