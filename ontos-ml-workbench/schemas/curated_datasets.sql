-- Curated Datasets Schema
-- Training-ready QA pairs selected from reviewed assemblies

CREATE TABLE IF NOT EXISTS lakebase_db.curated_datasets (
    -- Identity
    id STRING PRIMARY KEY,
    name STRING NOT NULL,
    description STRING,

    -- Source tracking
    labelset_id STRING,  -- Associated labelset
    assembly_ids STRING,  -- JSON array of source assembly IDs

    -- Configuration
    split_config STRING,  -- JSON object: {train_pct, val_pct, test_pct, stratify_by}
    quality_threshold DOUBLE DEFAULT 0.7,  -- Minimum confidence/quality score

    -- Metadata
    status STRING DEFAULT 'draft',  -- draft, approved, in_use, archived
    version STRING DEFAULT '1.0.0',
    example_count INT DEFAULT 0,
    quality_metrics STRING,  -- JSON object: QualityMetrics

    -- Timestamps
    created_at TIMESTAMP,
    created_by STRING,
    approved_at TIMESTAMP,
    approved_by STRING,
    last_used_at TIMESTAMP,

    -- Governance
    tags STRING,  -- JSON array
    use_case STRING,
    intended_models STRING,  -- JSON array of target model types
    prohibited_uses STRING  -- JSON array
) USING DELTA;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_curated_datasets_status
ON lakebase_db.curated_datasets (status);

CREATE INDEX IF NOT EXISTS idx_curated_datasets_labelset
ON lakebase_db.curated_datasets (labelset_id);

CREATE INDEX IF NOT EXISTS idx_curated_datasets_created
ON lakebase_db.curated_datasets (created_at);

-- Seed data: Example curated datasets
INSERT INTO lakebase_db.curated_datasets (
    id, name, description, labelset_id, assembly_ids,
    split_config, quality_threshold, status, version,
    example_count, quality_metrics, created_at, created_by,
    tags, use_case, intended_models
) VALUES
(
    'cd-defect-detection-v1',
    'Defect Detection Training Set v1',
    'High-quality labeled examples for defect detection model training',
    'ls-defect-detection',
    '["asm-001", "asm-002", "asm-003"]',
    '{"train_pct": 0.8, "val_pct": 0.1, "test_pct": 0.1, "stratify_by": "label"}',
    0.85,
    'approved',
    '1.0.0',
    1250,
    '{"total_examples": 1250, "avg_confidence": 0.92, "label_distribution": {"defect": 625, "no_defect": 625}, "response_length_avg": 50.0, "response_length_std": 15.0, "human_verified_count": 1250, "ai_generated_count": 0, "pre_labeled_count": 0}',
    CURRENT_TIMESTAMP(),
    'data-science-team',
    '["manufacturing", "quality-control", "computer-vision"]',
    'Defect detection in manufacturing',
    '["llama-3-70b", "gpt-4"]'
),
(
    'cd-classification-starter',
    'Classification Starter Dataset',
    'Curated examples for initial classification model',
    'ls-multi-class',
    '["asm-004"]',
    '{"train_pct": 0.7, "val_pct": 0.15, "test_pct": 0.15, "stratify_by": "label"}',
    0.75,
    'draft',
    '1.0.0',
    500,
    '{"total_examples": 500, "avg_confidence": 0.78, "label_distribution": {"class_a": 200, "class_b": 150, "class_c": 150}, "response_length_avg": 35.0, "response_length_std": 12.0, "human_verified_count": 250, "ai_generated_count": 250, "pre_labeled_count": 0}',
    CURRENT_TIMESTAMP(),
    'ml-team',
    '["classification", "supervised-learning"]',
    'Multi-class classification',
    '["llama-3-8b"]'
),
(
    'cd-qa-production',
    'Q&A Production Dataset',
    'Production-ready Q&A pairs with human verification',
    'ls-qa-pairs',
    '["asm-005", "asm-006"]',
    '{"train_pct": 0.8, "val_pct": 0.1, "test_pct": 0.1, "stratify_by": null}',
    0.90,
    'in_use',
    '2.0.0',
    3000,
    '{"total_examples": 3000, "avg_confidence": 0.94, "label_distribution": {}, "response_length_avg": 120.0, "response_length_std": 45.0, "human_verified_count": 3000, "ai_generated_count": 1500, "pre_labeled_count": 1500}',
    CURRENT_TIMESTAMP(),
    'production-team',
    '["question-answering", "production", "customer-facing"]',
    'Customer support Q&A',
    '["gpt-4-turbo", "claude-3-sonnet"]'
);

-- View for dataset statistics
CREATE OR REPLACE VIEW lakebase_db.curated_dataset_stats AS
SELECT
    status,
    COUNT(*) as dataset_count,
    SUM(example_count) as total_examples,
    AVG(example_count) as avg_examples_per_dataset,
    AVG(quality_threshold) as avg_quality_threshold
FROM lakebase_db.curated_datasets
GROUP BY status;

-- Query examples:

-- List all approved datasets
-- SELECT * FROM lakebase_db.curated_datasets WHERE status = 'approved';

-- Find datasets by labelset
-- SELECT * FROM lakebase_db.curated_datasets WHERE labelset_id = 'ls-defect-detection';

-- Get dataset statistics by status
-- SELECT * FROM lakebase_db.curated_dataset_stats;

-- Find large datasets (>1000 examples)
-- SELECT name, example_count, status FROM lakebase_db.curated_datasets WHERE example_count > 1000;
