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
