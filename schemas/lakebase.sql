-- Lakebase Schema for Real-Time Agent Collaboration
-- PostgreSQL-compatible OLTP tables for sub-10ms reads
--
-- These tables live in Lakebase (Databricks OLTP) for:
-- - Instant agent handoffs via Context Pool
-- - Real-time example retrieval cache
-- - Live effectiveness tracking before batch sync to Delta

-- ============================================================================
-- CONTEXT POOL - Agent Session State for Instant Handoffs
-- ============================================================================

-- Agent sessions for real-time context sharing
CREATE TABLE IF NOT EXISTS context_pool_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Session identification
    customer_id VARCHAR(255) NOT NULL,
    agent_id VARCHAR(255) NOT NULL,
    agent_type VARCHAR(100),  -- support, sales, ops, etc.

    -- Session state
    status VARCHAR(50) NOT NULL DEFAULT 'active',  -- active, paused, closed, handed_off
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,

    -- Handoff tracking
    handed_off_from_session UUID REFERENCES context_pool_sessions(session_id),
    handed_off_to_session UUID,
    handoff_reason VARCHAR(500),

    -- Metadata
    workspace_id VARCHAR(255),
    created_by VARCHAR(255),

    -- Indexes for fast lookups
    CONSTRAINT valid_status CHECK (status IN ('active', 'paused', 'closed', 'handed_off'))
);

CREATE INDEX idx_context_sessions_customer ON context_pool_sessions(customer_id, status);
CREATE INDEX idx_context_sessions_agent ON context_pool_sessions(agent_id, status);
CREATE INDEX idx_context_sessions_active ON context_pool_sessions(status) WHERE status = 'active';

-- Session context entries (conversation turns, decisions, tool calls)
CREATE TABLE IF NOT EXISTS context_pool_entries (
    entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES context_pool_sessions(session_id) ON DELETE CASCADE,

    -- Entry type and content
    entry_type VARCHAR(50) NOT NULL,  -- user_message, agent_response, tool_call, decision, handoff_note
    content JSONB NOT NULL,

    -- Ordering and timing
    sequence_num INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Optional: which examples were used for this turn
    examples_used UUID[],  -- References to active_examples

    -- For tool calls: track outcomes
    tool_name VARCHAR(255),
    tool_result JSONB,
    tool_success BOOLEAN,

    CONSTRAINT valid_entry_type CHECK (entry_type IN (
        'user_message', 'agent_response', 'tool_call',
        'decision', 'handoff_note', 'context_summary'
    ))
);

CREATE INDEX idx_context_entries_session ON context_pool_entries(session_id, sequence_num);
CREATE INDEX idx_context_entries_recent ON context_pool_entries(created_at DESC);

-- ============================================================================
-- ACTIVE EXAMPLES - Hot Cache for Dynamic Few-Shot Retrieval
-- ============================================================================

-- Cached top examples per domain for instant retrieval
-- Synced from Delta Lake Example Store periodically
CREATE TABLE IF NOT EXISTS active_examples (
    cache_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Reference to source Example Store
    example_id VARCHAR(255) NOT NULL,
    example_version INTEGER NOT NULL DEFAULT 1,

    -- Domain and function targeting
    domain VARCHAR(100) NOT NULL,
    function_name VARCHAR(255),
    databit_id VARCHAR(255),

    -- The actual example content (denormalized for speed)
    input_json JSONB NOT NULL,
    expected_output_json JSONB NOT NULL,
    explanation TEXT,

    -- Effectiveness metrics (updated in real-time)
    effectiveness_score DOUBLE PRECISION DEFAULT 0.5,
    usage_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,

    -- Cache management
    cache_priority INTEGER DEFAULT 100,  -- Higher = more likely to be retrieved
    cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,

    -- For fast semantic matching (pre-computed embedding summary)
    capability_tags TEXT[],
    search_keys TEXT[],

    CONSTRAINT unique_example_cache UNIQUE (example_id, domain)
);

CREATE INDEX idx_active_examples_domain ON active_examples(domain, effectiveness_score DESC);
CREATE INDEX idx_active_examples_function ON active_examples(function_name) WHERE function_name IS NOT NULL;
CREATE INDEX idx_active_examples_databit ON active_examples(databit_id) WHERE databit_id IS NOT NULL;
CREATE INDEX idx_active_examples_priority ON active_examples(cache_priority DESC, effectiveness_score DESC);

-- ============================================================================
-- EFFECTIVENESS EVENTS - Real-Time Usage Tracking
-- ============================================================================

-- Stream of example usage events (batched to Delta Lake periodically)
CREATE TABLE IF NOT EXISTS effectiveness_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What example was used
    example_id VARCHAR(255) NOT NULL,
    cache_id UUID REFERENCES active_examples(cache_id),

    -- Context of usage
    session_id UUID REFERENCES context_pool_sessions(session_id),
    agent_id VARCHAR(255) NOT NULL,

    -- Outcome tracking
    event_type VARCHAR(50) NOT NULL,  -- retrieved, used, successful, failed, feedback
    outcome_positive BOOLEAN,
    confidence_score DOUBLE PRECISION,

    -- User/expert feedback
    feedback_type VARCHAR(50),  -- thumbs_up, thumbs_down, correction, expert_review
    feedback_notes TEXT,
    corrected_output JSONB,

    -- Timing
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Batch sync tracking
    synced_to_delta BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMPTZ,

    CONSTRAINT valid_event_type CHECK (event_type IN (
        'retrieved', 'used', 'successful', 'failed', 'feedback', 'correction'
    ))
);

CREATE INDEX idx_effectiveness_events_example ON effectiveness_events(example_id, occurred_at DESC);
CREATE INDEX idx_effectiveness_events_unsync ON effectiveness_events(synced_to_delta) WHERE synced_to_delta = FALSE;
CREATE INDEX idx_effectiveness_events_session ON effectiveness_events(session_id) WHERE session_id IS NOT NULL;

-- ============================================================================
-- AGENT REGISTRY - Live Agent State
-- ============================================================================

-- Active agents and their subscriptions
CREATE TABLE IF NOT EXISTS agent_registry (
    agent_id VARCHAR(255) PRIMARY KEY,

    -- Agent identity
    agent_name VARCHAR(255) NOT NULL,
    agent_type VARCHAR(100) NOT NULL,  -- support, sales, ops, specialist
    agent_version VARCHAR(50),

    -- What domains/examples this agent subscribes to
    subscribed_domains TEXT[] NOT NULL DEFAULT '{}',
    subscribed_functions TEXT[] DEFAULT '{}',

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    last_heartbeat_at TIMESTAMPTZ DEFAULT NOW(),

    -- Configuration
    config JSONB DEFAULT '{}',

    -- UC reference
    uc_function_name VARCHAR(500),  -- Unity Catalog function path
    workspace_id VARCHAR(255),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_registry_domains ON agent_registry USING GIN(subscribed_domains);
CREATE INDEX idx_agent_registry_status ON agent_registry(status) WHERE status = 'active';

-- ============================================================================
-- TOOL SKILL REGISTRY - Learned Tool Patterns
-- ============================================================================

-- Shared tool usage patterns that propagate across agents
CREATE TABLE IF NOT EXISTS tool_skill_registry (
    skill_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tool identification
    tool_name VARCHAR(255) NOT NULL,
    tool_version VARCHAR(50),

    -- Pattern
    pattern_name VARCHAR(255) NOT NULL,
    pattern_description TEXT,

    -- When to use this pattern
    trigger_conditions JSONB NOT NULL,  -- Conditions that suggest this pattern

    -- How to use it
    parameter_template JSONB,
    example_invocations JSONB[],

    -- Effectiveness
    success_rate DOUBLE PRECISION DEFAULT 0.5,
    usage_count INTEGER DEFAULT 0,

    -- Which agents contributed/use this
    contributed_by VARCHAR(255)[],
    used_by VARCHAR(255)[],

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_tool_pattern UNIQUE (tool_name, pattern_name)
);

CREATE INDEX idx_tool_skills_tool ON tool_skill_registry(tool_name);
CREATE INDEX idx_tool_skills_success ON tool_skill_registry(success_rate DESC);

-- ============================================================================
-- AGENT RETRIEVAL EVENTS - Track Agent Example Retrievals
-- ============================================================================

-- Tracks when agents retrieve examples for prompt injection
-- Links retrieval to outcome for effectiveness feedback loop
CREATE TABLE IF NOT EXISTS agent_retrieval_events (
    retrieval_id VARCHAR(255) PRIMARY KEY,  -- e.g., "ret_abc123"

    -- Agent identification
    agent_id VARCHAR(255) NOT NULL,
    session_id UUID,  -- Optional link to context_pool_sessions

    -- What was requested
    query_text TEXT NOT NULL,
    domain VARCHAR(100),
    function_name VARCHAR(255),
    databit_id VARCHAR(255),

    -- What was retrieved
    example_ids TEXT[] NOT NULL,  -- List of example IDs returned
    example_count INTEGER NOT NULL DEFAULT 0,
    format_style VARCHAR(50) DEFAULT 'xml',

    -- Retrieval metadata
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    search_type VARCHAR(50),  -- semantic, metadata, hybrid
    total_candidates INTEGER,  -- How many examples were considered

    -- Outcome tracking (updated later via /outcome endpoint)
    outcome VARCHAR(50),  -- success, failure, partial
    outcome_confidence DOUBLE PRECISION,
    outcome_notes TEXT,
    outcome_recorded_at TIMESTAMPTZ,

    -- Sync tracking
    synced_to_delta BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMPTZ
);

CREATE INDEX idx_agent_retrieval_agent ON agent_retrieval_events(agent_id, retrieved_at DESC);
CREATE INDEX idx_agent_retrieval_session ON agent_retrieval_events(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_agent_retrieval_outcome ON agent_retrieval_events(outcome) WHERE outcome IS NOT NULL;
CREATE INDEX idx_agent_retrieval_unsync ON agent_retrieval_events(synced_to_delta) WHERE synced_to_delta = FALSE;

-- ============================================================================
-- OPERATIONAL STATE - Application Data for Sub-10ms Reads
-- ============================================================================

-- Global label library (settings/label-classes endpoint)
CREATE TABLE IF NOT EXISTS label_classes (
    label_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Label definition
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) DEFAULT '#6b7280',
    description TEXT,
    hotkey VARCHAR(10),

    -- Scope: NULL means global, otherwise scoped to a preset
    preset_name VARCHAR(100),  -- defect_detection, quality_inspection, etc.

    -- Ordering
    display_order INTEGER DEFAULT 0,

    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_label_name_preset UNIQUE (name, preset_name)
);

CREATE INDEX idx_label_classes_preset ON label_classes(preset_name) WHERE preset_name IS NOT NULL;
CREATE INDEX idx_label_classes_active ON label_classes(is_active) WHERE is_active = TRUE;

-- Sheets (AI datasets with imported columns)
-- PRD v2.3: Lightweight pointers to Unity Catalog data sources
CREATE TABLE IF NOT EXISTS sheets (
    sheet_id VARCHAR(255) PRIMARY KEY,

    -- Sheet metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) DEFAULT '1.0.0',
    status VARCHAR(50) DEFAULT 'draft',  -- draft, published, archived

    -- Unity Catalog source references (multimodal)
    primary_table VARCHAR(500),  -- e.g., 'ontos_ml.raw.pcb_inspections'
    secondary_sources JSONB DEFAULT '[]',  -- Array of {type, path, join_key}
    join_keys TEXT[] DEFAULT '{}',
    filter_condition TEXT,
    sample_size INTEGER,

    -- Column definitions (JSON array of ColumnDefinition)
    columns JSONB NOT NULL DEFAULT '[]',

    -- Attached template config (frozen snapshot)
    template_config JSONB,
    has_template BOOLEAN DEFAULT FALSE,

    -- Statistics
    row_count INTEGER DEFAULT 0,
    canonical_label_count INTEGER DEFAULT 0,  -- v2.3: Count of canonical labels

    -- Metadata
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_sheet_status CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE INDEX idx_sheets_status ON sheets(status);
CREATE INDEX idx_sheets_updated ON sheets(updated_at DESC);
CREATE INDEX idx_sheets_table ON sheets(primary_table) WHERE primary_table IS NOT NULL;

-- ============================================================================
-- CANONICAL LABELS - Ground Truth Layer (PRD v2.3)
-- ============================================================================

-- Canonical labels enable "label once, reuse everywhere"
-- Expert-validated ground truth labels independent of Q&A pairs
-- Supports multiple labelsets per item via composite key
CREATE TABLE IF NOT EXISTS canonical_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Links to source data
    sheet_id VARCHAR(255) NOT NULL REFERENCES sheets(sheet_id) ON DELETE CASCADE,
    item_ref VARCHAR(500) NOT NULL,  -- Reference to source item (e.g., inspection_id, invoice_id)

    -- Label type (enables multiple labelsets per item)
    label_type VARCHAR(100) NOT NULL,  -- entity_extraction, classification, localization, etc.

    -- Expert's ground truth label (flexible JSON)
    label_data JSONB NOT NULL,  -- Entities, bounding boxes, classifications, etc.

    -- Quality metadata
    confidence VARCHAR(20) DEFAULT 'high',  -- high, medium, low
    notes TEXT,

    -- Governance constraints (PRD v2.2)
    allowed_uses TEXT[] DEFAULT '{training,validation,evaluation,few_shot,testing}',
    prohibited_uses TEXT[] DEFAULT '{}',
    usage_reason TEXT,
    data_classification VARCHAR(50) DEFAULT 'internal',  -- public, internal, confidential, restricted

    -- Audit trail
    labeled_by VARCHAR(255) NOT NULL,
    labeled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_modified_by VARCHAR(255),
    last_modified_at TIMESTAMPTZ,

    -- Version control
    version INTEGER DEFAULT 1,

    -- Statistics
    reuse_count INTEGER DEFAULT 0,  -- How many Training Sheets use this label
    last_used_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Composite unique key: one label per (sheet_id, item_ref, label_type)
    CONSTRAINT unique_canonical_label UNIQUE (sheet_id, item_ref, label_type),
    CONSTRAINT valid_confidence CHECK (confidence IN ('high', 'medium', 'low')),
    CONSTRAINT valid_data_classification CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted'))
);

CREATE INDEX idx_canonical_labels_sheet ON canonical_labels(sheet_id);
CREATE INDEX idx_canonical_labels_item ON canonical_labels(sheet_id, item_ref);
CREATE INDEX idx_canonical_labels_type ON canonical_labels(label_type);
CREATE INDEX idx_canonical_labels_composite ON canonical_labels(sheet_id, item_ref, label_type);
CREATE INDEX idx_canonical_labels_reuse ON canonical_labels(reuse_count DESC) WHERE reuse_count > 0;
CREATE INDEX idx_canonical_labels_created ON canonical_labels(created_at DESC);

-- Sheet data rows (actual cell values for imported data)
-- For large datasets, consider partitioning by sheet_id
CREATE TABLE IF NOT EXISTS sheet_rows (
    row_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sheet_id VARCHAR(255) NOT NULL REFERENCES sheets(sheet_id) ON DELETE CASCADE,

    -- Row position
    row_index INTEGER NOT NULL,

    -- Cell values as JSON object (column_id -> CellValue)
    cells JSONB NOT NULL DEFAULT '{}',

    -- Sync tracking (for Delta Lake sync)
    synced_to_delta BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_sheet_row UNIQUE (sheet_id, row_index)
);

CREATE INDEX idx_sheet_rows_sheet ON sheet_rows(sheet_id, row_index);
CREATE INDEX idx_sheet_rows_unsync ON sheet_rows(synced_to_delta) WHERE synced_to_delta = FALSE;

-- Training Sheets (materialized Q&A pairs from Sheets + Templates)
-- PRD v2.3: Formerly "Assemblies", renamed for clarity
CREATE TABLE IF NOT EXISTS assemblies (
    assembly_id VARCHAR(255) PRIMARY KEY,

    -- Source references
    sheet_id VARCHAR(255) NOT NULL REFERENCES sheets(sheet_id),
    sheet_name VARCHAR(255),

    -- Frozen template config (snapshot at assembly time)
    template_config JSONB NOT NULL,
    template_label_type VARCHAR(100),  -- v2.3: Links to canonical label label_type

    -- Assembly metadata
    status VARCHAR(50) DEFAULT 'assembling',  -- assembling, ready, failed, archived
    total_rows INTEGER DEFAULT 0,

    -- Statistics (v2.3: includes canonical label reuse)
    ai_generated_count INTEGER DEFAULT 0,
    human_labeled_count INTEGER DEFAULT 0,
    human_verified_count INTEGER DEFAULT 0,
    canonical_reused_count INTEGER DEFAULT 0,  -- v2.3: Pre-approved via canonical labels
    flagged_count INTEGER DEFAULT 0,

    -- Error info (if status == failed)
    error_message TEXT,

    -- Metadata
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    CONSTRAINT valid_assembly_status CHECK (status IN ('assembling', 'ready', 'failed', 'archived'))
);

CREATE INDEX idx_assemblies_sheet ON assemblies(sheet_id);
CREATE INDEX idx_assemblies_status ON assemblies(status);
CREATE INDEX idx_assemblies_updated ON assemblies(updated_at DESC);
CREATE INDEX idx_assemblies_label_type ON assemblies(template_label_type) WHERE template_label_type IS NOT NULL;

-- Assembly rows (Q&A pairs for curation)
-- PRD v2.3: Links to canonical labels for label reuse
CREATE TABLE IF NOT EXISTS assembly_rows (
    row_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assembly_id VARCHAR(255) NOT NULL REFERENCES assemblies(assembly_id) ON DELETE CASCADE,

    -- Row position
    row_index INTEGER NOT NULL,

    -- Rendered prompt
    prompt TEXT NOT NULL,

    -- Source data snapshot (for reference/debugging)
    source_data JSONB DEFAULT '{}',
    item_ref VARCHAR(500),  -- v2.3: Reference to source item for canonical label lookup

    -- Response
    response TEXT,
    response_source VARCHAR(50) DEFAULT 'empty',  -- empty, ai_generated, human_labeled, human_verified, canonical

    -- v2.3: Canonical label linkage
    canonical_label_id UUID REFERENCES canonical_labels(id),  -- Link to ground truth
    labeling_mode VARCHAR(50) DEFAULT 'ai_generated',  -- ai_generated, manual, existing_column, canonical

    -- Generation metadata
    generated_at TIMESTAMPTZ,

    -- Labeling metadata
    labeled_at TIMESTAMPTZ,
    labeled_by VARCHAR(255),
    verified_at TIMESTAMPTZ,
    verified_by VARCHAR(255),

    -- Quality flags
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    confidence_score DOUBLE PRECISION,

    -- v2.3: Usage constraints (from canonical label or set directly)
    allowed_uses TEXT[] DEFAULT '{training,validation,evaluation,few_shot,testing}',
    prohibited_uses TEXT[] DEFAULT '{}',

    -- Sync tracking
    synced_to_delta BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMPTZ,

    CONSTRAINT unique_assembly_row UNIQUE (assembly_id, row_index),
    CONSTRAINT valid_response_source CHECK (response_source IN ('empty', 'ai_generated', 'human_labeled', 'human_verified', 'canonical')),
    CONSTRAINT valid_labeling_mode CHECK (labeling_mode IN ('ai_generated', 'manual', 'existing_column', 'canonical'))
);

CREATE INDEX idx_assembly_rows_assembly ON assembly_rows(assembly_id, row_index);
CREATE INDEX idx_assembly_rows_source ON assembly_rows(response_source);
CREATE INDEX idx_assembly_rows_canonical ON assembly_rows(canonical_label_id) WHERE canonical_label_id IS NOT NULL;
CREATE INDEX idx_assembly_rows_mode ON assembly_rows(labeling_mode);
CREATE INDEX idx_assembly_rows_flagged ON assembly_rows(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX idx_assembly_rows_unsync ON assembly_rows(synced_to_delta) WHERE synced_to_delta = FALSE;

-- Template library (reusable prompt templates)
-- PRD v2.3: Added label_type for canonical label matching
CREATE TABLE IF NOT EXISTS templates (
    template_id VARCHAR(255) PRIMARY KEY,

    -- Template metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) DEFAULT '1.0.0',

    -- Template definition (TemplateConfig as JSON)
    config JSONB NOT NULL,

    -- v2.3: Label type for canonical label matching
    label_type VARCHAR(100),  -- entity_extraction, classification, localization, etc.

    -- Categorization
    category VARCHAR(100),  -- defect_detection, anomaly_detection, etc.
    tags TEXT[] DEFAULT '{}',

    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,

    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_templates_category ON templates(category) WHERE category IS NOT NULL;
CREATE INDEX idx_templates_label_type ON templates(label_type) WHERE label_type IS NOT NULL;
CREATE INDEX idx_templates_tags ON templates USING GIN(tags);
CREATE INDEX idx_templates_active ON templates(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- MODEL TRAINING LINEAGE - Track Training Sheet Usage (PRD v2.1)
-- ============================================================================

-- Tracks which models were trained on which Training Sheets
-- Enables complete provenance: source data → labels → Q&A pairs → models
CREATE TABLE IF NOT EXISTS model_training_lineage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Model identification
    model_id VARCHAR(500) NOT NULL,  -- Unity Catalog model ID
    model_name VARCHAR(500) NOT NULL,
    model_version VARCHAR(100) NOT NULL,

    -- Training Sheet used
    assembly_id VARCHAR(255) NOT NULL REFERENCES assemblies(assembly_id),
    assembly_name VARCHAR(255),

    -- Q&A pairs used (array of row_ids)
    qa_pair_ids UUID[] DEFAULT '{}',
    qa_pair_count INTEGER DEFAULT 0,

    -- Training configuration
    training_config JSONB,  -- Model params, hyperparameters, etc.

    -- MLflow integration
    mlflow_run_id VARCHAR(255),
    mlflow_experiment_id VARCHAR(255),

    -- Training metadata
    training_started_at TIMESTAMPTZ,
    training_completed_at TIMESTAMPTZ,
    training_status VARCHAR(50) DEFAULT 'pending',  -- pending, running, completed, failed

    -- Metadata
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_model_lineage_model ON model_training_lineage(model_id);
CREATE INDEX idx_model_lineage_assembly ON model_training_lineage(assembly_id);
CREATE INDEX idx_model_lineage_mlflow ON model_training_lineage(mlflow_run_id) WHERE mlflow_run_id IS NOT NULL;
CREATE INDEX idx_model_lineage_status ON model_training_lineage(training_status);
CREATE INDEX idx_model_lineage_created ON model_training_lineage(created_at DESC);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get context for agent handoff (sub-10ms target)
CREATE OR REPLACE FUNCTION get_handoff_context(p_customer_id VARCHAR(255))
RETURNS TABLE (
    session_id UUID,
    agent_id VARCHAR(255),
    entry_type VARCHAR(50),
    content JSONB,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.session_id,
        s.agent_id,
        e.entry_type,
        e.content,
        e.created_at
    FROM context_pool_sessions s
    JOIN context_pool_entries e ON s.session_id = e.session_id
    WHERE s.customer_id = p_customer_id
      AND s.status IN ('active', 'paused', 'handed_off')
    ORDER BY s.started_at DESC, e.sequence_num ASC
    LIMIT 100;  -- Last 100 entries across recent sessions
END;
$$ LANGUAGE plpgsql;

-- Function to get top examples for a domain (for few-shot retrieval)
CREATE OR REPLACE FUNCTION get_top_examples_for_domain(
    p_domain VARCHAR(100),
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    example_id VARCHAR(255),
    input_json JSONB,
    expected_output_json JSONB,
    explanation TEXT,
    effectiveness_score DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ae.example_id,
        ae.input_json,
        ae.expected_output_json,
        ae.explanation,
        ae.effectiveness_score
    FROM active_examples ae
    WHERE ae.domain = p_domain
      AND (ae.expires_at IS NULL OR ae.expires_at > NOW())
    ORDER BY ae.cache_priority DESC, ae.effectiveness_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to record example usage and update effectiveness
CREATE OR REPLACE FUNCTION record_example_usage(
    p_example_id VARCHAR(255),
    p_agent_id VARCHAR(255),
    p_session_id UUID,
    p_outcome_positive BOOLEAN,
    p_confidence DOUBLE PRECISION DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
    v_cache_id UUID;
BEGIN
    -- Get cache ID
    SELECT cache_id INTO v_cache_id
    FROM active_examples
    WHERE example_id = p_example_id
    LIMIT 1;

    -- Insert event
    INSERT INTO effectiveness_events (
        example_id, cache_id, session_id, agent_id,
        event_type, outcome_positive, confidence_score
    ) VALUES (
        p_example_id, v_cache_id, p_session_id, p_agent_id,
        CASE WHEN p_outcome_positive THEN 'successful' ELSE 'failed' END,
        p_outcome_positive, p_confidence
    ) RETURNING event_id INTO v_event_id;

    -- Update cache counters
    UPDATE active_examples
    SET
        usage_count = usage_count + 1,
        success_count = success_count + CASE WHEN p_outcome_positive THEN 1 ELSE 0 END,
        last_used_at = NOW(),
        effectiveness_score = (success_count + CASE WHEN p_outcome_positive THEN 1 ELSE 0 END)::DOUBLE PRECISION
                             / (usage_count + 1)::DOUBLE PRECISION
    WHERE example_id = p_example_id;

    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;
