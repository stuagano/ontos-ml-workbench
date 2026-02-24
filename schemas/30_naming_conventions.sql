-- ============================================================================
-- Naming Conventions - Enforced naming rules per entity type (G15)
-- ============================================================================
-- Naming conventions define regex patterns that entity names must match.
-- Each convention targets a specific entity type (sheet, template,
-- training_sheet, domain, team, project, contract, product, model, etc.)
-- and is validated on create/update operations.
--
-- Examples:
--   Entity: sheet     Pattern: ^[a-z][a-z0-9_]{2,63}$
--   Entity: template  Pattern: ^[A-Z][A-Za-z0-9_\- ]{2,127}$
-- ============================================================================

CREATE TABLE IF NOT EXISTS ${CATALOG}.${SCHEMA}.naming_conventions (
  id STRING NOT NULL,
  entity_type STRING NOT NULL COMMENT 'Entity type: sheet, template, training_sheet, domain, team, project, contract, product, semantic_model, role',
  name STRING NOT NULL COMMENT 'Human-readable convention name',
  description STRING COMMENT 'Explanation of the convention and rationale',
  pattern STRING NOT NULL COMMENT 'Regex pattern that names must match',
  example_valid STRING COMMENT 'Example of a valid name',
  example_invalid STRING COMMENT 'Example of an invalid name',
  error_message STRING COMMENT 'Custom error message shown on validation failure',
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 0 COMMENT 'Higher priority conventions checked first',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  created_by STRING NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_by STRING NOT NULL,
  CONSTRAINT pk_naming_conventions PRIMARY KEY (id)
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);

-- Seed default conventions for radiation safety domain
INSERT INTO ${CATALOG}.${SCHEMA}.naming_conventions
(id, entity_type, name, description, pattern, example_valid, example_invalid, error_message, is_active, priority, created_at, created_by, updated_at, updated_by)
VALUES
  ('nc-sheet-snake', 'sheet', 'Snake Case Sheets', 'Sheet names must use lowercase snake_case (letters, digits, underscores)', '^[a-z][a-z0-9_]{2,63}$', 'defect_images_2024', 'Defect Images', 'Sheet names must be lowercase snake_case (3-64 chars)', true, 10, current_timestamp(), 'system', current_timestamp(), 'system'),
  ('nc-template-title', 'template', 'Title Case Templates', 'Template names should start with uppercase and allow spaces', '^[A-Z][A-Za-z0-9_ \\-]{2,127}$', 'Defect Classification Prompt', 'defect_classification_prompt', 'Template names must start with uppercase (3-128 chars)', true, 10, current_timestamp(), 'system', current_timestamp(), 'system'),
  ('nc-ts-prefix', 'training_sheet', 'Prefixed Training Sheets', 'Training sheet names must start with ts_ prefix', '^ts_[a-z][a-z0-9_]{1,59}$', 'ts_defect_v2', 'defect_training', 'Training sheet names must start with ts_ prefix', true, 10, current_timestamp(), 'system', current_timestamp(), 'system'),
  ('nc-domain-title', 'domain', 'Title Case Domains', 'Domain names use title case for readability', '^[A-Z][A-Za-z0-9 \\-&]{1,63}$', 'Radiation Safety', 'radiation_safety', 'Domain names must start with uppercase (2-64 chars)', true, 10, current_timestamp(), 'system', current_timestamp(), 'system'),
  ('nc-team-title', 'team', 'Title Case Teams', 'Team names use title case', '^[A-Z][A-Za-z0-9 \\-&]{1,63}$', 'Physics Analysis Team', 'physics_team', 'Team names must start with uppercase (2-64 chars)', true, 10, current_timestamp(), 'system', current_timestamp(), 'system'),
  ('nc-no-pii', 'sheet', 'No PII in Names', 'Sheet names must not contain email-like patterns', '^(?!.*@)(?!.*\\.(com|org|net)).*$', 'sensor_readings', 'john@company.com_data', 'Names must not contain email addresses or domain names', true, 20, current_timestamp(), 'system', current_timestamp(), 'system');
