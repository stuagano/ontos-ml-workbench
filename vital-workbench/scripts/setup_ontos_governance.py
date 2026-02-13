#!/usr/bin/env python3
"""
Ontos Governance Layer Quick-Start Setup

This script sets up the governance tables for Ontos integration with VITAL Workbench.
It creates the schema, seeds initial glossary terms from existing canonical labels,
and configures baseline compliance rules.

Usage:
    python scripts/setup_ontos_governance.py [--profile PROFILE] [--catalog CATALOG] [--schema SCHEMA]

Requirements:
    - databricks-sdk
    - python-dotenv

Author: Stuart Gano
Date: 2026-02-12
"""

import argparse
import os
import sys
import uuid
from datetime import datetime
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

try:
    from databricks.sdk import WorkspaceClient
    from databricks.sdk.service.sql import StatementState
except ImportError:
    print("Error: databricks-sdk not installed. Run: pip install databricks-sdk")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / "backend" / ".env")
except ImportError:
    pass  # dotenv is optional


# =============================================================================
# Configuration
# =============================================================================

DEFAULT_CATALOG = os.getenv("DATABRICKS_CATALOG", "serverless_dxukih_catalog")
DEFAULT_SCHEMA = os.getenv("DATABRICKS_SCHEMA", "mirion")
DEFAULT_WAREHOUSE_ID = os.getenv("DATABRICKS_WAREHOUSE_ID", "387bcda0f2ece20c")
DEFAULT_PROFILE = os.getenv("DATABRICKS_CONFIG_PROFILE", "fe-vm-serverless-dxukih")


# =============================================================================
# SQL Statements: Governance Tables
# =============================================================================

GOVERNANCE_TABLES_SQL = """
-- ============================================================================
-- ONTOS GOVERNANCE TABLES
-- ============================================================================
-- These tables store governance metadata that complements VITAL Workbench
-- operational data. Together they enable semantic search, compliance automation,
-- and impact analysis.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: glossary_terms
-- ---------------------------------------------------------------------------
-- Business terms and metrics definitions. Synced from VITAL domain concepts.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS {catalog}.{schema}.glossary_terms (
    id STRING NOT NULL,
    name STRING NOT NULL COMMENT 'Term name (e.g., Solder Bridge, Label Coverage)',
    domain STRING NOT NULL COMMENT 'Domain hierarchy (e.g., Quality Control, Model Lifecycle)',
    definition STRING COMMENT 'Human-readable definition',
    aliases ARRAY<STRING> COMMENT 'Alternative names for this term',

    -- Measurement
    measurement_rule STRING COMMENT 'SQL expression to measure this term',
    data_contract_id STRING COMMENT 'Link to formal data contract',
    target_slo STRING COMMENT 'Target SLO (e.g., >= 30%)',

    -- Usage statistics (updated by sync)
    usage_count INT DEFAULT 0 COMMENT 'Number of assets using this term',
    avg_confidence DOUBLE COMMENT 'Average confidence of related labels',
    last_used_at TIMESTAMP COMMENT 'Most recent usage timestamp',

    -- Relationships
    parent_term_id STRING COMMENT 'Broader term (hierarchy)',
    related_term_ids ARRAY<STRING> COMMENT 'Related terms',

    -- Audit
    source STRING DEFAULT 'manual' COMMENT 'Origin: manual, vital_sync, import',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    created_by STRING,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    updated_by STRING,

    CONSTRAINT pk_glossary_terms PRIMARY KEY (id)
)
COMMENT 'Business glossary terms synced from VITAL Workbench domain model'
TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true');

-- ---------------------------------------------------------------------------
-- Table: semantic_relationships
-- ---------------------------------------------------------------------------
-- Knowledge graph edges connecting terms, assets, and concepts.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS {catalog}.{schema}.semantic_relationships (
    id STRING NOT NULL,

    -- Source node
    source_type STRING NOT NULL COMMENT 'Type: term, canonical_label, sheet, template, model',
    source_id STRING NOT NULL COMMENT 'ID of source entity',
    source_name STRING COMMENT 'Name for display',

    -- Relationship
    relationship_type STRING NOT NULL COMMENT 'Type: instance_of, related_to, broader_than, measured_by, trained_on',

    -- Target node
    target_type STRING NOT NULL,
    target_id STRING NOT NULL,
    target_name STRING COMMENT 'Name for display',

    -- Metadata
    confidence DOUBLE DEFAULT 1.0 COMMENT 'Relationship confidence (0-1)',
    evidence STRING COMMENT 'Why this relationship exists',

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    created_by STRING,

    CONSTRAINT pk_semantic_relationships PRIMARY KEY (id)
)
COMMENT 'Knowledge graph edges for semantic search and impact analysis'
TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true');

-- Create index for graph traversal
CREATE INDEX IF NOT EXISTS idx_sem_rel_source
ON {catalog}.{schema}.semantic_relationships (source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_sem_rel_target
ON {catalog}.{schema}.semantic_relationships (target_type, target_id);

-- ---------------------------------------------------------------------------
-- Table: compliance_rules
-- ---------------------------------------------------------------------------
-- Declarative compliance rules evaluated against VITAL data.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS {catalog}.{schema}.compliance_rules (
    id STRING NOT NULL,
    name STRING NOT NULL COMMENT 'Rule name (e.g., high_severity_dual_review)',
    description STRING COMMENT 'What this rule enforces',
    domain STRING COMMENT 'Domain this rule applies to',

    -- Rule definition
    severity STRING NOT NULL COMMENT 'warning, error, critical',
    rule_sql STRING NOT NULL COMMENT 'SQL query that returns violations',

    -- Scheduling
    schedule STRING COMMENT 'When to run: hourly, daily, on_event, manual',
    trigger_events ARRAY<STRING> COMMENT 'Events that trigger this rule',

    -- Status
    enabled BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP,
    last_run_status STRING,

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    created_by STRING,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),

    CONSTRAINT pk_compliance_rules PRIMARY KEY (id)
)
COMMENT 'Declarative compliance rules for automated governance'
TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true');

-- ---------------------------------------------------------------------------
-- Table: compliance_results
-- ---------------------------------------------------------------------------
-- Results from compliance rule evaluations.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS {catalog}.{schema}.compliance_results (
    id STRING NOT NULL,
    rule_id STRING NOT NULL COMMENT 'Reference to compliance_rules.id',
    rule_name STRING COMMENT 'Denormalized for querying',

    -- Results
    check_time TIMESTAMP NOT NULL,
    status STRING NOT NULL COMMENT 'pass, fail, error',
    violations_count INT DEFAULT 0,
    violations_json STRING COMMENT 'JSON array of violation details',

    -- Execution metadata
    execution_time_ms INT,
    error_message STRING,

    CONSTRAINT pk_compliance_results PRIMARY KEY (id)
)
COMMENT 'Compliance check results history'
TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true');

-- Create index for recent results lookup
CREATE INDEX IF NOT EXISTS idx_compliance_results_rule
ON {catalog}.{schema}.compliance_results (rule_id, check_time);

-- ---------------------------------------------------------------------------
-- Table: data_contracts
-- ---------------------------------------------------------------------------
-- ODCS v3.0.2 data contract definitions.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS {catalog}.{schema}.data_contracts (
    id STRING NOT NULL,
    name STRING NOT NULL COMMENT 'Contract name',
    version STRING NOT NULL COMMENT 'Semantic version',
    description STRING,

    -- Ownership
    owner_team STRING,
    owner_email STRING,
    domain STRING,

    -- Target
    asset_type STRING COMMENT 'table, view, sheet',
    asset_name STRING COMMENT 'Full asset path',

    -- Contract spec (ODCS JSON)
    contract_json STRING COMMENT 'Full ODCS contract as JSON',

    -- Quality summary
    quality_rules_count INT DEFAULT 0,
    sla_availability STRING,
    sla_freshness STRING,

    -- Status
    status STRING DEFAULT 'draft' COMMENT 'draft, active, deprecated',

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),

    CONSTRAINT pk_data_contracts PRIMARY KEY (id)
)
COMMENT 'ODCS v3.0.2 data contract definitions'
TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true');

-- ---------------------------------------------------------------------------
-- Table: governance_audit_log
-- ---------------------------------------------------------------------------
-- Audit trail for all governance actions.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS {catalog}.{schema}.governance_audit_log (
    id STRING NOT NULL,

    -- Action
    action_type STRING NOT NULL COMMENT 'term_created, rule_evaluated, contract_approved, etc.',
    action_status STRING COMMENT 'success, failed',

    -- Actor
    actor STRING NOT NULL COMMENT 'User or system that performed action',
    actor_type STRING COMMENT 'user, system, sync',

    -- Target
    target_type STRING COMMENT 'term, rule, contract, label, etc.',
    target_id STRING,
    target_name STRING,

    -- Details
    details_json STRING COMMENT 'Additional context as JSON',

    -- Timestamp
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),

    CONSTRAINT pk_governance_audit_log PRIMARY KEY (id)
)
COMMENT 'Audit trail for governance actions'
TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true');

-- Create index for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_log_time
ON {catalog}.{schema}.governance_audit_log (timestamp);

CREATE INDEX IF NOT EXISTS idx_audit_log_target
ON {catalog}.{schema}.governance_audit_log (target_type, target_id);
"""


# =============================================================================
# SQL Statements: Shared Views
# =============================================================================

SHARED_VIEWS_SQL = """
-- ============================================================================
-- SHARED VIEWS: VITAL Workbench + Ontos Integration
-- ============================================================================

-- ---------------------------------------------------------------------------
-- View: v_term_usage
-- ---------------------------------------------------------------------------
-- Shows how glossary terms are used across canonical labels.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW {catalog}.{schema}.v_term_usage AS
SELECT
    gt.id as term_id,
    gt.name as term_name,
    gt.domain,
    gt.definition,
    gt.target_slo,
    COUNT(cl.id) as label_count,
    COUNT(DISTINCT cl.sheet_id) as sheet_count,
    AVG(cl.label_confidence) as avg_confidence,
    MAX(cl.updated_at) as last_used,
    CASE
        WHEN gt.target_slo LIKE '>=%' THEN
            CASE WHEN COUNT(cl.id) >= CAST(REGEXP_EXTRACT(gt.target_slo, '([0-9]+)') AS INT)
                 THEN 'meeting_slo' ELSE 'below_slo' END
        ELSE 'no_slo'
    END as slo_status
FROM {catalog}.{schema}.glossary_terms gt
LEFT JOIN {catalog}.{schema}.canonical_labels cl
    ON cl.label_data:defect_type::STRING = gt.name
    OR cl.label_type = gt.name
GROUP BY gt.id, gt.name, gt.domain, gt.definition, gt.target_slo;

-- ---------------------------------------------------------------------------
-- View: v_compliance_dashboard
-- ---------------------------------------------------------------------------
-- Current compliance status for all rules.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW {catalog}.{schema}.v_compliance_dashboard AS
WITH latest_results AS (
    SELECT
        rule_id,
        status,
        violations_count,
        check_time,
        ROW_NUMBER() OVER (PARTITION BY rule_id ORDER BY check_time DESC) as rn
    FROM {catalog}.{schema}.compliance_results
)
SELECT
    cr.id as rule_id,
    cr.name as rule_name,
    cr.domain,
    cr.severity,
    cr.enabled,
    lr.status as latest_status,
    lr.violations_count as latest_violations,
    lr.check_time as last_check_time,
    CASE
        WHEN lr.status = 'pass' THEN 'compliant'
        WHEN lr.status = 'fail' AND cr.severity = 'critical' THEN 'critical_violation'
        WHEN lr.status = 'fail' THEN 'violation'
        WHEN lr.status = 'error' THEN 'check_error'
        ELSE 'not_checked'
    END as compliance_status
FROM {catalog}.{schema}.compliance_rules cr
LEFT JOIN latest_results lr ON lr.rule_id = cr.id AND lr.rn = 1;

-- ---------------------------------------------------------------------------
-- View: v_lineage_graph
-- ---------------------------------------------------------------------------
-- Full data lineage from sheets to models.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW {catalog}.{schema}.v_lineage_graph AS
SELECT
    -- Source data
    s.id as sheet_id,
    s.name as sheet_name,
    s.source_table,
    s.item_count as sheet_item_count,

    -- Canonical labels
    cl.id as canonical_label_id,
    cl.label_type,
    cl.label_data:defect_type::STRING as defect_type,
    cl.label_confidence,

    -- Training sheets
    ts.id as training_sheet_id,
    ts.name as training_sheet_name,
    ts.total_rows as training_rows,

    -- Training jobs
    tj.id as training_job_id,
    tj.model_name,
    tj.base_model,
    tj.status as training_status,
    tj.uc_model_version as model_version,

    -- Timestamps for lineage
    s.created_at as sheet_created,
    cl.created_at as label_created,
    ts.created_at as training_sheet_created,
    tj.created_at as job_created,
    tj.completed_at as job_completed

FROM {catalog}.{schema}.sheets s
LEFT JOIN {catalog}.{schema}.canonical_labels cl
    ON cl.sheet_id = s.id
LEFT JOIN {catalog}.{schema}.qa_pairs qp
    ON qp.canonical_label_id = cl.id
LEFT JOIN {catalog}.{schema}.training_sheets ts
    ON qp.training_sheet_id = ts.id
LEFT JOIN {catalog}.{schema}.training_jobs tj
    ON tj.training_sheet_id = ts.id;

-- ---------------------------------------------------------------------------
-- View: v_defect_analytics
-- ---------------------------------------------------------------------------
-- Analytics view for defect patterns (feeds glossary term insights).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW {catalog}.{schema}.v_defect_analytics AS
SELECT
    label_data:defect_type::STRING as defect_type,
    label_data:location::STRING as location,
    label_data:severity::STRING as severity,
    label_data:component::STRING as component,
    COUNT(*) as occurrence_count,
    COUNT(DISTINCT sheet_id) as affected_sheets,
    AVG(label_confidence) as avg_confidence,
    COUNT(CASE WHEN label_confidence >= 0.8 THEN 1 END) as high_confidence_count,
    MIN(created_at) as first_seen,
    MAX(created_at) as last_seen
FROM {catalog}.{schema}.canonical_labels
WHERE label_data:defect_type IS NOT NULL
GROUP BY
    label_data:defect_type::STRING,
    label_data:location::STRING,
    label_data:severity::STRING,
    label_data:component::STRING;
"""


# =============================================================================
# SQL Statements: Seed Data
# =============================================================================

SEED_GLOSSARY_TERMS_SQL = """
-- ============================================================================
-- SEED: Initial Glossary Terms
-- ============================================================================
-- These are the core domain terms from VITAL Workbench's defect detection model.
-- ============================================================================

-- Clear existing terms (for idempotent re-runs)
DELETE FROM {catalog}.{schema}.glossary_terms WHERE source = 'vital_seed';

-- Insert domain hierarchy and terms
INSERT INTO {catalog}.{schema}.glossary_terms
(id, name, domain, definition, aliases, measurement_rule, target_slo, source, created_by, updated_by)
VALUES
-- Defect Types
('{uuid1}', 'Solder Bridge', 'Quality Control > Defect Classification',
 'Unintended solder connection between adjacent pads or pins, creating electrical short',
 ARRAY('short', 'bridge', 'solder short'),
 "label_data:defect_type::STRING = 'solder_bridge'",
 NULL, 'vital_seed', 'setup_script', 'setup_script'),

('{uuid2}', 'Cold Joint', 'Quality Control > Defect Classification',
 'Solder joint formed with insufficient heat, resulting in poor mechanical/electrical bond characterized by dull, grainy appearance',
 ARRAY('cold solder', 'dull joint', 'grainy joint'),
 "label_data:defect_type::STRING = 'cold_joint'",
 NULL, 'vital_seed', 'setup_script', 'setup_script'),

('{uuid3}', 'Missing Component', 'Quality Control > Defect Classification',
 'Component absent from designated PCB location due to pick-and-place failure',
 ARRAY('absent component', 'pick failure'),
 "label_data:defect_type::STRING = 'missing_component'",
 NULL, 'vital_seed', 'setup_script', 'setup_script'),

('{uuid4}', 'Discoloration', 'Quality Control > Defect Classification',
 'Color change on PCB surface indicating thermal stress, oxidation, or contamination',
 ARRAY('thermal damage', 'oxidation', 'burn mark'),
 "label_data:defect_type::STRING = 'discoloration'",
 NULL, 'vital_seed', 'setup_script', 'setup_script'),

('{uuid5}', 'Scratch', 'Quality Control > Defect Classification',
 'Physical damage to PCB surface, traces, or solder mask',
 ARRAY('surface damage', 'trace damage'),
 "label_data:defect_type::STRING = 'scratch'",
 NULL, 'vital_seed', 'setup_script', 'setup_script'),

('{uuid6}', 'Pass', 'Quality Control > Defect Classification',
 'No defects detected; all quality criteria met',
 ARRAY('no defect', 'clean', 'good'),
 "label_data:defect_type::STRING = 'pass'",
 NULL, 'vital_seed', 'setup_script', 'setup_script'),

-- Quality Metrics
('{uuid7}', 'Label Coverage', 'Model Lifecycle > Data Quality',
 'Percentage of items in a Sheet with expert-validated canonical labels',
 ARRAY('coverage rate', 'labeling progress'),
 'COUNT(canonical_labels) / sheet.item_count * 100',
 '>= 30%', 'vital_seed', 'setup_script', 'setup_script'),

('{uuid8}', 'Label Reuse Rate', 'Model Lifecycle > Data Quality',
 'Average number of times canonical labels are automatically reused across Training Sheets',
 ARRAY('reuse efficiency'),
 'AVG(canonical_labels.reuse_count)',
 NULL, 'vital_seed', 'setup_script', 'setup_script'),

('{uuid9}', 'First Pass Yield', 'Manufacturing Process > Quality Metrics',
 'Percentage of inspected units passing QC without rework',
 ARRAY('FPY', 'yield rate'),
 "COUNT(pass) / COUNT(total) * 100",
 '>= 95%', 'vital_seed', 'setup_script', 'setup_script'),

('{uuid10}', 'Human-AI Agreement', 'Model Lifecycle > Training Metrics',
 'Rate at which AI predictions match expert labels',
 ARRAY('agreement rate', 'model accuracy'),
 'COUNT(matching) / COUNT(compared) * 100',
 '>= 90%', 'vital_seed', 'setup_script', 'setup_script'),

-- Severity Levels
('{uuid11}', 'Low Severity', 'Quality Control > Severity Levels',
 'Minor defect, cosmetic only, no functional impact',
 ARRAY('minor', 'cosmetic'),
 "label_data:severity::STRING = 'low'",
 NULL, 'vital_seed', 'setup_script', 'setup_script'),

('{uuid12}', 'Medium Severity', 'Quality Control > Severity Levels',
 'Defect with potential reliability impact requiring review',
 ARRAY('moderate'),
 "label_data:severity::STRING = 'medium'",
 NULL, 'vital_seed', 'setup_script', 'setup_script'),

('{uuid13}', 'High Severity', 'Quality Control > Severity Levels',
 'Defect likely causing functional failure, mandatory rework required',
 ARRAY('major', 'critical defect'),
 "label_data:severity::STRING = 'high'",
 NULL, 'vital_seed', 'setup_script', 'setup_script'),

('{uuid14}', 'Critical Severity', 'Quality Control > Severity Levels',
 'Safety-critical defect requiring production halt and immediate escalation',
 ARRAY('safety critical', 'stop ship'),
 "label_data:severity::STRING = 'critical'",
 NULL, 'vital_seed', 'setup_script', 'setup_script');
"""


SEED_COMPLIANCE_RULES_SQL = """
-- ============================================================================
-- SEED: Compliance Rules
-- ============================================================================
-- Baseline governance rules for VITAL Workbench data quality.
-- ============================================================================

-- Clear existing rules (for idempotent re-runs)
DELETE FROM {catalog}.{schema}.compliance_rules WHERE id LIKE 'vital_%';

-- Insert compliance rules
INSERT INTO {catalog}.{schema}.compliance_rules
(id, name, description, domain, severity, rule_sql, schedule, trigger_events, enabled, created_by)
VALUES
-- Rule 1: High-severity labels require dual review
('vital_rule_001', 'high_severity_dual_review',
 'All high-severity defect labels must be reviewed by at least 2 experts before production use',
 'Quality Control',
 'critical',
 '
 SELECT
     cl.id as label_id,
     cl.item_ref,
     cl.label_data:defect_type::STRING as defect_type,
     cl.label_data:severity::STRING as severity,
     cl.reviewed_by,
     ''HIGH_SEVERITY_SINGLE_REVIEW'' as violation_type,
     ''Label requires dual review for production use'' as violation_message
 FROM {catalog}.{schema}.canonical_labels cl
 WHERE cl.label_data:severity::STRING = ''high''
   AND (cl.reviewed_by IS NULL OR SIZE(SPLIT(cl.reviewed_by, '','')) < 2)
 ',
 'daily',
 ARRAY('label_created', 'label_updated'),
 true,
 'setup_script'),

-- Rule 2: Minimum label coverage for training
('vital_rule_002', 'minimum_label_coverage',
 'Sheets intended for training must have at least 30% label coverage',
 'Model Lifecycle',
 'warning',
 '
 SELECT
     s.id as sheet_id,
     s.name as sheet_name,
     s.item_count,
     COUNT(cl.id) as label_count,
     ROUND(COUNT(cl.id) * 100.0 / NULLIF(s.item_count, 0), 1) as coverage_pct,
     ''INSUFFICIENT_LABEL_COVERAGE'' as violation_type,
     CONCAT(''Coverage is '', ROUND(COUNT(cl.id) * 100.0 / NULLIF(s.item_count, 0), 1), ''% (required: 30%)'') as violation_message
 FROM {catalog}.{schema}.sheets s
 LEFT JOIN {catalog}.{schema}.canonical_labels cl ON s.id = cl.sheet_id
 WHERE s.status = ''active''
 GROUP BY s.id, s.name, s.item_count
 HAVING COUNT(cl.id) * 100.0 / NULLIF(s.item_count, 0) < 30
 ',
 'daily',
 ARRAY('sheet_created', 'training_job_created'),
 true,
 'setup_script'),

-- Rule 3: Production models require high-confidence training data
('vital_rule_003', 'production_confidence_threshold',
 'Training jobs for production models must use labels with >= 80% high confidence',
 'Model Lifecycle',
 'error',
 '
 SELECT
     tj.id as training_job_id,
     tj.model_name,
     COUNT(CASE WHEN cl.label_confidence >= 0.8 THEN 1 END) as high_conf_count,
     COUNT(cl.id) as total_labels,
     ROUND(COUNT(CASE WHEN cl.label_confidence >= 0.8 THEN 1 END) * 100.0 / NULLIF(COUNT(cl.id), 0), 1) as high_conf_pct,
     ''LOW_CONFIDENCE_TRAINING_DATA'' as violation_type,
     CONCAT(''High-confidence labels: '', ROUND(COUNT(CASE WHEN cl.label_confidence >= 0.8 THEN 1 END) * 100.0 / NULLIF(COUNT(cl.id), 0), 1), ''% (required: 80%)'') as violation_message
 FROM {catalog}.{schema}.training_jobs tj
 JOIN {catalog}.{schema}.training_sheets ts ON tj.training_sheet_id = ts.id
 LEFT JOIN {catalog}.{schema}.qa_pairs qp ON ts.id = qp.training_sheet_id
 LEFT JOIN {catalog}.{schema}.canonical_labels cl ON qp.canonical_label_id = cl.id
 WHERE tj.register_to_uc = true
 GROUP BY tj.id, tj.model_name
 HAVING COUNT(CASE WHEN cl.label_confidence >= 0.8 THEN 1 END) * 100.0 / NULLIF(COUNT(cl.id), 0) < 80
 ',
 'on_event',
 ARRAY('training_job_created'),
 true,
 'setup_script'),

-- Rule 4: Stale labels need re-review
('vital_rule_004', 'stale_label_review',
 'Labels older than 90 days should be reviewed for continued accuracy',
 'Quality Control',
 'warning',
 '
 SELECT
     cl.id as label_id,
     cl.item_ref,
     cl.label_type,
     cl.updated_at,
     DATEDIFF(CURRENT_DATE(), cl.updated_at) as days_since_update,
     ''STALE_LABEL'' as violation_type,
     CONCAT(''Label last updated '', DATEDIFF(CURRENT_DATE(), cl.updated_at), '' days ago'') as violation_message
 FROM {catalog}.{schema}.canonical_labels cl
 WHERE cl.updated_at < DATEADD(DAY, -90, CURRENT_DATE())
   AND cl.reuse_count > 0
 ',
 'weekly',
 NULL,
 true,
 'setup_script'),

-- Rule 5: Training data diversity
('vital_rule_005', 'training_data_diversity',
 'Training sheets should include examples from multiple defect types',
 'Model Lifecycle',
 'warning',
 '
 SELECT
     ts.id as training_sheet_id,
     ts.name as training_sheet_name,
     COUNT(DISTINCT cl.label_data:defect_type::STRING) as defect_type_count,
     ''LOW_TRAINING_DIVERSITY'' as violation_type,
     CONCAT(''Only '', COUNT(DISTINCT cl.label_data:defect_type::STRING), '' defect types (recommend 3+)'') as violation_message
 FROM {catalog}.{schema}.training_sheets ts
 LEFT JOIN {catalog}.{schema}.qa_pairs qp ON ts.id = qp.training_sheet_id
 LEFT JOIN {catalog}.{schema}.canonical_labels cl ON qp.canonical_label_id = cl.id
 GROUP BY ts.id, ts.name
 HAVING COUNT(DISTINCT cl.label_data:defect_type::STRING) < 3
 ',
 'daily',
 ARRAY('training_sheet_created'),
 true,
 'setup_script');
"""


SEED_DATA_CONTRACTS_SQL = """
-- ============================================================================
-- SEED: Data Contracts
-- ============================================================================
-- ODCS v3.0.2 contracts for core VITAL Workbench tables.
-- ============================================================================

-- Clear existing contracts (for idempotent re-runs)
DELETE FROM {catalog}.{schema}.data_contracts WHERE id LIKE 'vital_contract_%';

-- Insert data contracts
INSERT INTO {catalog}.{schema}.data_contracts
(id, name, version, description, owner_team, owner_email, domain, asset_type, asset_name,
 quality_rules_count, sla_availability, sla_freshness, status)
VALUES
('vital_contract_001', 'Canonical Labels Contract', '1.0.0',
 'Expert-validated ground truth labels for ML training',
 'QA Team', 'qa-engineering@mirion.com', 'Quality Control',
 'table', '{catalog}.{schema}.canonical_labels',
 4, '99.9%', '24 hours', 'active'),

('vital_contract_002', 'Training Sheets Contract', '1.0.0',
 'Materialized Q&A pairs for model fine-tuning',
 'ML Engineering', 'ml-engineering@mirion.com', 'Model Lifecycle',
 'table', '{catalog}.{schema}.training_sheets',
 3, '99.5%', '48 hours', 'active'),

('vital_contract_003', 'Sheets Contract', '1.0.0',
 'Dataset definitions pointing to Unity Catalog sources',
 'Data Engineering', 'data-engineering@mirion.com', 'Data Management',
 'table', '{catalog}.{schema}.sheets',
 2, '99.9%', '1 hour', 'active');
"""


# =============================================================================
# SQL Statements: Sync from Existing Data
# =============================================================================

SYNC_TERMS_FROM_LABELS_SQL = """
-- ============================================================================
-- SYNC: Update glossary term usage from canonical_labels
-- ============================================================================
-- This query updates term statistics based on actual label data.
-- ============================================================================

MERGE INTO {catalog}.{schema}.glossary_terms AS target
USING (
    SELECT
        label_data:defect_type::STRING as term_name,
        COUNT(*) as usage_count,
        AVG(label_confidence) as avg_confidence,
        MAX(updated_at) as last_used_at
    FROM {catalog}.{schema}.canonical_labels
    WHERE label_data:defect_type IS NOT NULL
    GROUP BY label_data:defect_type::STRING
) AS source
ON target.name = source.term_name
WHEN MATCHED THEN
    UPDATE SET
        target.usage_count = source.usage_count,
        target.avg_confidence = source.avg_confidence,
        target.last_used_at = source.last_used_at,
        target.updated_at = CURRENT_TIMESTAMP();
"""


BUILD_SEMANTIC_RELATIONSHIPS_SQL = """
-- ============================================================================
-- BUILD: Semantic relationships from canonical labels
-- ============================================================================
-- Creates instance_of relationships between labels and glossary terms.
-- ============================================================================

-- Clear existing auto-generated relationships
DELETE FROM {catalog}.{schema}.semantic_relationships
WHERE created_by = 'sync_script';

-- Insert label -> term relationships
INSERT INTO {catalog}.{schema}.semantic_relationships
(id, source_type, source_id, source_name, relationship_type, target_type, target_id, target_name, confidence, evidence, created_by)
SELECT
    UUID() as id,
    'canonical_label' as source_type,
    cl.id as source_id,
    cl.item_ref as source_name,
    'instance_of' as relationship_type,
    'glossary_term' as target_type,
    gt.id as target_id,
    gt.name as target_name,
    cl.label_confidence as confidence,
    CONCAT('Defect type: ', cl.label_data:defect_type::STRING) as evidence,
    'sync_script' as created_by
FROM {catalog}.{schema}.canonical_labels cl
JOIN {catalog}.{schema}.glossary_terms gt
    ON cl.label_data:defect_type::STRING = gt.name
WHERE gt.domain LIKE '%Defect Classification%';
"""


# =============================================================================
# Main Execution
# =============================================================================

class OntosGovernanceSetup:
    """Sets up Ontos governance tables and seeds initial data."""

    def __init__(self, catalog: str, schema: str, warehouse_id: str, profile: str = None):
        self.catalog = catalog
        self.schema = schema
        self.warehouse_id = warehouse_id

        # Initialize Databricks client
        if profile:
            self.client = WorkspaceClient(profile=profile)
        else:
            self.client = WorkspaceClient()

        print(f"Connected to Databricks workspace")
        print(f"Catalog: {catalog}")
        print(f"Schema: {schema}")
        print(f"Warehouse: {warehouse_id}")

    def execute_sql(self, sql: str, description: str = "SQL") -> bool:
        """Execute SQL statement and wait for completion."""
        # Format SQL with catalog/schema
        formatted_sql = sql.format(
            catalog=self.catalog,
            schema=self.schema,
            uuid1=str(uuid.uuid4()),
            uuid2=str(uuid.uuid4()),
            uuid3=str(uuid.uuid4()),
            uuid4=str(uuid.uuid4()),
            uuid5=str(uuid.uuid4()),
            uuid6=str(uuid.uuid4()),
            uuid7=str(uuid.uuid4()),
            uuid8=str(uuid.uuid4()),
            uuid9=str(uuid.uuid4()),
            uuid10=str(uuid.uuid4()),
            uuid11=str(uuid.uuid4()),
            uuid12=str(uuid.uuid4()),
            uuid13=str(uuid.uuid4()),
            uuid14=str(uuid.uuid4()),
        )

        # Split into individual statements
        statements = [s.strip() for s in formatted_sql.split(';') if s.strip()]

        for i, stmt in enumerate(statements):
            if not stmt or stmt.startswith('--'):
                continue

            try:
                response = self.client.statement_execution.execute_statement(
                    warehouse_id=self.warehouse_id,
                    statement=stmt,
                    wait_timeout="45s"
                )

                if response.status.state == StatementState.FAILED:
                    print(f"  [WARN] Statement {i+1} failed: {response.status.error}")
                    # Continue on non-critical errors
                    if "already exists" not in str(response.status.error).lower():
                        continue

            except Exception as e:
                print(f"  [WARN] Statement {i+1} error: {e}")
                # Continue on non-critical errors
                if "already exists" not in str(e).lower():
                    continue

        return True

    def setup_tables(self):
        """Create governance tables."""
        print("\n[1/5] Creating governance tables...")
        self.execute_sql(GOVERNANCE_TABLES_SQL, "Governance tables")
        print("  Done.")

    def setup_views(self):
        """Create shared views."""
        print("\n[2/5] Creating shared views...")
        self.execute_sql(SHARED_VIEWS_SQL, "Shared views")
        print("  Done.")

    def seed_glossary_terms(self):
        """Seed initial glossary terms."""
        print("\n[3/5] Seeding glossary terms...")
        self.execute_sql(SEED_GLOSSARY_TERMS_SQL, "Glossary terms")
        print("  Done. Seeded 14 terms across 3 domains.")

    def seed_compliance_rules(self):
        """Seed compliance rules."""
        print("\n[4/5] Seeding compliance rules...")
        self.execute_sql(SEED_COMPLIANCE_RULES_SQL, "Compliance rules")
        print("  Done. Created 5 compliance rules.")

    def seed_data_contracts(self):
        """Seed data contracts."""
        print("\n[5/5] Seeding data contracts...")
        self.execute_sql(SEED_DATA_CONTRACTS_SQL, "Data contracts")
        print("  Done. Created 3 data contracts.")

    def sync_from_existing_labels(self):
        """Sync glossary terms from existing canonical labels."""
        print("\n[SYNC] Updating term usage from existing labels...")
        self.execute_sql(SYNC_TERMS_FROM_LABELS_SQL, "Sync terms")
        print("  Done.")

    def build_semantic_relationships(self):
        """Build semantic relationships from labels."""
        print("\n[SYNC] Building semantic relationships...")
        self.execute_sql(BUILD_SEMANTIC_RELATIONSHIPS_SQL, "Semantic relationships")
        print("  Done.")

    def run_full_setup(self):
        """Run complete setup process."""
        print("=" * 60)
        print("ONTOS GOVERNANCE LAYER SETUP")
        print("=" * 60)

        start_time = datetime.now()

        # Create tables and views
        self.setup_tables()
        self.setup_views()

        # Seed initial data
        self.seed_glossary_terms()
        self.seed_compliance_rules()
        self.seed_data_contracts()

        # Sync from existing data
        self.sync_from_existing_labels()
        self.build_semantic_relationships()

        elapsed = (datetime.now() - start_time).total_seconds()

        print("\n" + "=" * 60)
        print("SETUP COMPLETE")
        print("=" * 60)
        print(f"Time elapsed: {elapsed:.1f}s")
        print(f"\nCreated in {self.catalog}.{self.schema}:")
        print("  Tables:")
        print("    - glossary_terms")
        print("    - semantic_relationships")
        print("    - compliance_rules")
        print("    - compliance_results")
        print("    - data_contracts")
        print("    - governance_audit_log")
        print("  Views:")
        print("    - v_term_usage")
        print("    - v_compliance_dashboard")
        print("    - v_lineage_graph")
        print("    - v_defect_analytics")
        print("\nNext steps:")
        print("  1. Review glossary terms: SELECT * FROM glossary_terms")
        print("  2. Check compliance status: SELECT * FROM v_compliance_dashboard")
        print("  3. Explore lineage: SELECT * FROM v_lineage_graph LIMIT 10")
        print("  4. Deploy Ontos app to view governance UI")


def main():
    parser = argparse.ArgumentParser(
        description="Set up Ontos governance tables for VITAL Workbench integration"
    )
    parser.add_argument(
        "--profile",
        default=DEFAULT_PROFILE,
        help=f"Databricks CLI profile (default: {DEFAULT_PROFILE})"
    )
    parser.add_argument(
        "--catalog",
        default=DEFAULT_CATALOG,
        help=f"Unity Catalog name (default: {DEFAULT_CATALOG})"
    )
    parser.add_argument(
        "--schema",
        default=DEFAULT_SCHEMA,
        help=f"Schema name (default: {DEFAULT_SCHEMA})"
    )
    parser.add_argument(
        "--warehouse",
        default=DEFAULT_WAREHOUSE_ID,
        help=f"SQL Warehouse ID (default: {DEFAULT_WAREHOUSE_ID})"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print SQL statements without executing"
    )

    args = parser.parse_args()

    if args.dry_run:
        print("DRY RUN - SQL statements that would be executed:\n")
        print("=" * 60)
        print("GOVERNANCE TABLES")
        print("=" * 60)
        print(GOVERNANCE_TABLES_SQL.format(catalog=args.catalog, schema=args.schema))
        print("\n" + "=" * 60)
        print("SHARED VIEWS")
        print("=" * 60)
        print(SHARED_VIEWS_SQL.format(catalog=args.catalog, schema=args.schema))
        return

    setup = OntosGovernanceSetup(
        catalog=args.catalog,
        schema=args.schema,
        warehouse_id=args.warehouse,
        profile=args.profile
    )

    setup.run_full_setup()


if __name__ == "__main__":
    main()
