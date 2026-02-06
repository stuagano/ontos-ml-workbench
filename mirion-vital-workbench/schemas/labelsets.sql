-- ============================================================================
-- Labelsets Table - Reusable Label Collections
-- ============================================================================
-- Purpose: Store reusable label definitions that can be attached to templates
-- and linked to canonical labels for governance and reusability.
-- ============================================================================

CREATE TABLE IF NOT EXISTS lakebase_db.labelsets (
    -- Primary key
    id STRING PRIMARY KEY,

    -- Basic info
    name STRING NOT NULL,
    description STRING,

    -- Label definitions (JSON)
    label_classes STRING,  -- JSON array of LabelClass objects
    response_schema STRING,  -- JSON object for structured responses

    -- Canonical labels association
    label_type STRING NOT NULL,  -- Links to canonical_labels.label_type
    canonical_label_count INT DEFAULT 0,  -- Cached count

    -- Status and governance
    status STRING DEFAULT 'draft',  -- draft, published, archived
    version STRING DEFAULT '1.0.0',

    -- Usage constraints (JSON)
    allowed_uses STRING,  -- JSON array: ["training", "validation", "testing"]
    prohibited_uses STRING,  -- JSON array

    -- Metadata
    created_by STRING,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    published_by STRING,
    published_at TIMESTAMP,

    -- Tags and organization
    tags STRING,  -- JSON array
    use_case STRING  -- e.g., "pcb_defect_detection", "invoice_processing"
) USING DELTA;

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Index on status for filtering published labelsets
CREATE INDEX IF NOT EXISTS idx_labelsets_status
ON lakebase_db.labelsets (status);

-- Index on label_type for canonical label association
CREATE INDEX IF NOT EXISTS idx_labelsets_label_type
ON lakebase_db.labelsets (label_type);

-- Index on use_case for filtering
CREATE INDEX IF NOT EXISTS idx_labelsets_use_case
ON lakebase_db.labelsets (use_case);

-- ============================================================================
-- Seed Data: Example Labelsets
-- ============================================================================

-- PCB Defect Detection Labelset
INSERT INTO lakebase_db.labelsets VALUES (
    'labelset_pcb_defects',
    'PCB Defect Types',
    'Standard defect classifications for PCB manufacturing quality inspection',
    '[
        {"name": "solder_bridge", "display_name": "Solder Bridge", "color": "#ef4444", "hotkey": "1", "description": "Excess solder creating unintended connection"},
        {"name": "cold_joint", "display_name": "Cold Joint", "color": "#3b82f6", "hotkey": "2", "description": "Insufficient solder creating weak connection"},
        {"name": "missing_component", "display_name": "Missing Component", "color": "#f59e0b", "hotkey": "3", "description": "Expected component is absent"},
        {"name": "scratch", "display_name": "Scratch", "color": "#8b5cf6", "hotkey": "4", "description": "Physical damage to PCB surface"},
        {"name": "discoloration", "display_name": "Discoloration", "color": "#ec4899", "hotkey": "5", "description": "Burnt or oxidized areas"},
        {"name": "pass", "display_name": "Pass", "color": "#10b981", "hotkey": "0", "description": "No defects detected"}
    ]',
    '{
        "type": "object",
        "properties": {
            "defect_type": {"type": "string", "enum": ["solder_bridge", "cold_joint", "missing_component", "scratch", "discoloration", "pass"]},
            "location": {"type": "string", "description": "Component reference or coordinate"},
            "severity": {"type": "string", "enum": ["high", "medium", "low"]},
            "component": {"type": "string", "description": "Affected component"},
            "reasoning": {"type": "string", "description": "Explanation of detection"}
        },
        "required": ["defect_type"]
    }',
    'defect_detection',
    0,
    'published',
    '1.0.0',
    '["training", "validation", "production_inference"]',
    NULL,
    'system',
    CURRENT_TIMESTAMP(),
    CURRENT_TIMESTAMP(),
    'system',
    CURRENT_TIMESTAMP(),
    '["manufacturing", "qa", "pcb"]',
    'pcb_defect_detection'
);

-- Image Classification Labelset
INSERT INTO lakebase_db.labelsets VALUES (
    'labelset_image_classification',
    'General Image Classification',
    'Multi-class image classification labels',
    '[
        {"name": "category_a", "display_name": "Category A", "color": "#3b82f6", "hotkey": "1"},
        {"name": "category_b", "display_name": "Category B", "color": "#10b981", "hotkey": "2"},
        {"name": "category_c", "display_name": "Category C", "color": "#f59e0b", "hotkey": "3"},
        {"name": "category_d", "display_name": "Category D", "color": "#ef4444", "hotkey": "4"}
    ]',
    '{
        "type": "object",
        "properties": {
            "category": {"type": "string", "enum": ["category_a", "category_b", "category_c", "category_d"]},
            "confidence": {"type": "number", "minimum": 0, "maximum": 1}
        },
        "required": ["category"]
    }',
    'classification',
    0,
    'draft',
    '1.0.0',
    '["training", "validation"]',
    NULL,
    'system',
    CURRENT_TIMESTAMP(),
    CURRENT_TIMESTAMP(),
    NULL,
    NULL,
    '["vision", "classification"]',
    'image_classification'
);

-- Sentiment Analysis Labelset
INSERT INTO lakebase_db.labelsets VALUES (
    'labelset_sentiment',
    'Sentiment Analysis',
    'Text sentiment classification (positive, negative, neutral)',
    '[
        {"name": "positive", "display_name": "Positive", "color": "#10b981", "hotkey": "p"},
        {"name": "negative", "display_name": "Negative", "color": "#ef4444", "hotkey": "n"},
        {"name": "neutral", "display_name": "Neutral", "color": "#6b7280", "hotkey": "u"}
    ]',
    '{
        "type": "object",
        "properties": {
            "sentiment": {"type": "string", "enum": ["positive", "negative", "neutral"]},
            "confidence": {"type": "number", "minimum": 0, "maximum": 1},
            "reasoning": {"type": "string"}
        },
        "required": ["sentiment"]
    }',
    'sentiment',
    0,
    'published',
    '1.0.0',
    '["training", "validation", "production_inference"]',
    NULL,
    'system',
    CURRENT_TIMESTAMP(),
    CURRENT_TIMESTAMP(),
    'system',
    CURRENT_TIMESTAMP(),
    '["nlp", "sentiment"]',
    'sentiment_analysis'
);

-- ============================================================================
-- Verification Query
-- ============================================================================

SELECT
    id,
    name,
    label_type,
    status,
    version,
    canonical_label_count,
    use_case,
    created_at
FROM lakebase_db.labelsets
ORDER BY created_at DESC;
