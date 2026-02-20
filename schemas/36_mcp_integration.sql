-- ============================================================================
-- 36: MCP Integration (G11)
-- ============================================================================
-- Model Context Protocol tokens, tool registrations, and invocation logging
-- for AI assistant access governance.
-- ============================================================================

-- MCP tokens: scoped access tokens for AI assistants
CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.mcp_tokens (
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,
  token_hash STRING NOT NULL COMMENT 'SHA-256 hash of the token value',
  token_prefix STRING NOT NULL COMMENT 'First 8 chars for identification',
  scope STRING NOT NULL DEFAULT 'read' COMMENT 'read | read_write | admin',
  allowed_tools STRING COMMENT 'JSON array of tool IDs this token can invoke (null = all)',
  allowed_resources STRING COMMENT 'JSON array of resource patterns (e.g., sheets/*, templates/*)',
  owner_email STRING NOT NULL,
  team_id STRING COMMENT 'FK to teams.id — team-scoped token',
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  usage_count BIGINT DEFAULT 0,
  rate_limit_per_minute INT DEFAULT 60,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,
  CONSTRAINT pk_mcp_tokens PRIMARY KEY (id)
)
USING DELTA
TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true');

-- MCP tools: registered tools exposed to AI assistants
CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.mcp_tools (
  id STRING NOT NULL,
  name STRING NOT NULL,
  description STRING,
  category STRING NOT NULL DEFAULT 'general' COMMENT 'data | training | deployment | monitoring | governance | general',
  input_schema STRING COMMENT 'JSON Schema for tool input parameters',
  required_scope STRING NOT NULL DEFAULT 'read' COMMENT 'Minimum scope needed: read | read_write | admin',
  required_permission STRING COMMENT 'Feature permission required (e.g., sheets:read)',
  is_active BOOLEAN DEFAULT true,
  version STRING DEFAULT '1.0',
  endpoint_path STRING COMMENT 'Backend API path this tool maps to',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,
  CONSTRAINT pk_mcp_tools PRIMARY KEY (id),
  CONSTRAINT uq_mcp_tools_name UNIQUE (name)
)
USING DELTA
TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true');

-- MCP invocations: audit log of tool invocations by AI assistants
CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.mcp_invocations (
  id STRING NOT NULL,
  token_id STRING NOT NULL COMMENT 'FK to mcp_tokens.id',
  tool_id STRING NOT NULL COMMENT 'FK to mcp_tools.id',
  input_params STRING COMMENT 'JSON — sanitized input parameters',
  output_summary STRING COMMENT 'Brief summary of result',
  status STRING NOT NULL DEFAULT 'success' COMMENT 'success | error | denied | rate_limited',
  error_message STRING,
  duration_ms INT,
  invoked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  CONSTRAINT pk_mcp_invocations PRIMARY KEY (id)
)
USING DELTA
TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true');

-- Seed default MCP tools (mapping to existing workbench API endpoints)
INSERT INTO ${CATALOG}.${SCHEMA}.mcp_tools (id, name, description, category, input_schema, required_scope, required_permission, is_active, version, endpoint_path, created_at, created_by, updated_at, updated_by)
VALUES
  -- Data tools
  ('mcp-tool-001', 'list_sheets', 'List all dataset sheets', 'data', '{"type":"object","properties":{"stage":{"type":"string"}}}', 'read', 'sheets:read', true, '1.0', '/api/v1/sheets/', CURRENT_TIMESTAMP(), 'system', CURRENT_TIMESTAMP(), 'system'),
  ('mcp-tool-002', 'get_sheet', 'Get sheet details by ID', 'data', '{"type":"object","properties":{"sheet_id":{"type":"string"}},"required":["sheet_id"]}', 'read', 'sheets:read', true, '1.0', '/api/v1/sheets/{id}', CURRENT_TIMESTAMP(), 'system', CURRENT_TIMESTAMP(), 'system'),
  ('mcp-tool-003', 'list_templates', 'List prompt templates', 'data', '{"type":"object","properties":{}}', 'read', 'templates:read', true, '1.0', '/api/v1/templates/', CURRENT_TIMESTAMP(), 'system', CURRENT_TIMESTAMP(), 'system'),
  ('mcp-tool-004', 'list_training_sheets', 'List training sheets', 'training', '{"type":"object","properties":{"stage":{"type":"string"}}}', 'read', 'training:read', true, '1.0', '/api/v1/training-sheets/', CURRENT_TIMESTAMP(), 'system', CURRENT_TIMESTAMP(), 'system'),
  -- Deployment tools
  ('mcp-tool-005', 'list_endpoints', 'List serving endpoints', 'deployment', '{"type":"object","properties":{}}', 'read', 'deploy:read', true, '1.0', '/api/v1/deploy/endpoints', CURRENT_TIMESTAMP(), 'system', CURRENT_TIMESTAMP(), 'system'),
  ('mcp-tool-006', 'get_endpoint_metrics', 'Get endpoint performance metrics', 'monitoring', '{"type":"object","properties":{"endpoint_name":{"type":"string"}},"required":["endpoint_name"]}', 'read', 'monitor:read', true, '1.0', '/api/v1/monitor/endpoints/{name}/metrics', CURRENT_TIMESTAMP(), 'system', CURRENT_TIMESTAMP(), 'system'),
  -- Governance tools
  ('mcp-tool-007', 'search_marketplace', 'Search the dataset marketplace', 'governance', '{"type":"object","properties":{"query":{"type":"string"},"product_type":{"type":"string"}}}', 'read', 'governance:read', true, '1.0', '/api/v1/governance/marketplace/search', CURRENT_TIMESTAMP(), 'system', CURRENT_TIMESTAMP(), 'system'),
  ('mcp-tool-008', 'validate_name', 'Validate entity name against naming conventions', 'governance', '{"type":"object","properties":{"entity_type":{"type":"string"},"name":{"type":"string"}},"required":["entity_type","name"]}', 'read', 'governance:read', true, '1.0', '/api/v1/governance/naming/validate', CURRENT_TIMESTAMP(), 'system', CURRENT_TIMESTAMP(), 'system');
