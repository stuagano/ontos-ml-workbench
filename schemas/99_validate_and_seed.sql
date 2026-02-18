-- ============================================================================
-- Validation and Seed Data Script
-- ============================================================================
-- Run this after creating all tables to validate schema and add test data
-- ============================================================================

-- ============================================================================
-- VALIDATION: Check all tables exist
-- ============================================================================

SHOW TABLES IN ${CATALOG}.${SCHEMA};

-- Expected output: 7 tables
-- sheets, templates, canonical_labels, training_sheets, qa_pairs,
-- model_training_lineage, example_store

-- ============================================================================
-- VALIDATION: Verify schemas
-- ============================================================================

DESCRIBE EXTENDED ${CATALOG}.${SCHEMA}.canonical_labels;

-- Verify composite key constraint exists
SHOW CREATE TABLE ${CATALOG}.${SCHEMA}.canonical_labels;

-- ============================================================================
-- SEED DATA: Insert test records
-- ============================================================================

-- 1. Sample Sheet (PCB defect detection)
INSERT INTO ${CATALOG}.${SCHEMA}.sheets
  (id, name, description, source_type, source_table, item_id_column,
   text_columns, image_columns, status, created_by, updated_by)
VALUES
  (
    'sheet-pcb-001',
    'PCB Defect Images',
    'Sample PCB board images for defect detection training',
    'uc_table',
    'ontos_ml.source_data.pcb_images',
    'image_id',
    ARRAY('defect_notes', 'inspection_comment'),
    ARRAY('image_path'),
    'active',
    'seed_script',
    'seed_script'
  );

-- 2. Sample Template (PCB defect classification)
INSERT INTO ${CATALOG}.${SCHEMA}.templates
  (id, name, description, system_prompt, user_prompt_template, label_type,
   model_name, temperature, status, version, is_latest, created_by, updated_by)
VALUES
  (
    'template-pcb-defect-001',
    'PCB Defect Classifier',
    'Classifies PCB defects into categories: short, open, misalignment, contamination',
    'You are an expert in PCB quality inspection. Classify defects accurately based on images and descriptions.',
    'Analyze this PCB image and description. Classify the defect type.\n\nImage: {{image_path}}\nNotes: {{defect_notes}}\n\nProvide a JSON response with: {"defect_type": "short|open|misalignment|contamination", "confidence": 0.0-1.0, "reasoning": "explanation"}',
    'pcb_defect_type',
    'databricks-meta-llama-3-1-70b-instruct',
    0.0,
    'active',
    1,
    true,
    'seed_script',
    'seed_script'
  );

-- 3. Sample Canonical Label
INSERT INTO ${CATALOG}.${SCHEMA}.canonical_labels
  (id, sheet_id, item_ref, label_type, label_data, labeling_mode,
   label_confidence, version, created_by, updated_by)
VALUES
  (
    'label-pcb-001',
    'sheet-pcb-001',
    'pcb_img_00042',
    'pcb_defect_type',
    '{"defect_type": "short", "confidence": 0.95, "reasoning": "Clear solder bridge between adjacent pins"}',
    'standalone_tool',
    0.95,
    1,
    'expert_alice',
    'expert_alice'
  );

-- 4. Sample Training Sheet
INSERT INTO ${CATALOG}.${SCHEMA}.training_sheets
  (id, name, description, sheet_id, template_id, template_version,
   generation_mode, model_used, status, total_items, generated_count,
   approved_count, auto_approved_count, created_by, updated_by)
VALUES
  (
    'training-sheet-001',
    'PCB Defects - Initial Training Set',
    'First batch of labeled PCB defect images',
    'sheet-pcb-001',
    'template-pcb-defect-001',
    1,
    'ai_generated',
    'databricks-meta-llama-3-1-70b-instruct',
    'review',
    100,
    85,
    12,
    5,
    'seed_script',
    'seed_script'
  );

-- 5. Sample Q&A Pair (auto-approved via canonical label)
INSERT INTO ${CATALOG}.${SCHEMA}.qa_pairs
  (id, training_sheet_id, sheet_id, item_ref, messages, canonical_label_id,
   was_auto_approved, review_status, sequence_number, created_by, updated_by)
VALUES
  (
    'qa-pair-001',
    'training-sheet-001',
    'sheet-pcb-001',
    'pcb_img_00042',
    '[
      {"role": "system", "content": "You are an expert in PCB quality inspection. Classify defects accurately based on images and descriptions."},
      {"role": "user", "content": "Analyze this PCB image and description. Classify the defect type.\\n\\nImage: /Volumes/ontos_ml/images/pcb_img_00042.jpg\\nNotes: Visible bridge between pins\\n\\nProvide a JSON response with: {\\"defect_type\\": \\"short|open|misalignment|contamination\\", \\"confidence\\": 0.0-1.0, \\"reasoning\\": \\"explanation\\"}"},
      {"role": "assistant", "content": "{\\"defect_type\\": \\"short\\", \\"confidence\\": 0.95, \\"reasoning\\": \\"Clear solder bridge between adjacent pins\\"}"}
    ]',
    'label-pcb-001',
    true,
    'approved',
    1,
    'seed_script',
    'seed_script'
  );

-- 6. Sample Q&A Pair (needs review - no canonical label)
INSERT INTO ${CATALOG}.${SCHEMA}.qa_pairs
  (id, training_sheet_id, sheet_id, item_ref, messages, canonical_label_id,
   was_auto_approved, review_status, sequence_number, created_by, updated_by)
VALUES
  (
    'qa-pair-002',
    'training-sheet-001',
    'sheet-pcb-001',
    'pcb_img_00043',
    '[
      {"role": "system", "content": "You are an expert in PCB quality inspection. Classify defects accurately based on images and descriptions."},
      {"role": "user", "content": "Analyze this PCB image and description. Classify the defect type.\\n\\nImage: /Volumes/ontos_ml/images/pcb_img_00043.jpg\\nNotes: Component appears misaligned\\n\\nProvide a JSON response with: {\\"defect_type\\": \\"short|open|misalignment|contamination\\", \\"confidence\\": 0.0-1.0, \\"reasoning\\": \\"explanation\\"}"},
      {"role": "assistant", "content": "{\\"defect_type\\": \\"misalignment\\", \\"confidence\\": 0.82, \\"reasoning\\": \\"Component appears offset from footprint by approximately 0.5mm\\"}"}
    ]',
    NULL,
    false,
    'pending',
    2,
    'seed_script',
    'seed_script'
  );

-- 7. Sample Model Training Lineage
INSERT INTO ${CATALOG}.${SCHEMA}.model_training_lineage
  (id, model_name, model_version, training_sheet_id, training_sheet_name,
   base_model, training_examples_count, deployment_status, created_by, updated_by)
VALUES
  (
    'lineage-001',
    'pcb_defect_classifier_v1',
    '1.0.0',
    'training-sheet-001',
    'PCB Defects - Initial Training Set',
    'databricks-meta-llama-3-1-70b-instruct',
    85,
    'training',
    'seed_script',
    'seed_script'
  );

-- ============================================================================
-- VALIDATION: Test composite key constraint
-- ============================================================================

-- This should succeed (different item_ref)
INSERT INTO ${CATALOG}.${SCHEMA}.canonical_labels
  (id, sheet_id, item_ref, label_type, label_data, labeling_mode,
   version, created_by, updated_by)
VALUES
  (
    'label-pcb-002',
    'sheet-pcb-001',
    'pcb_img_00043',
    'pcb_defect_type',
    '{"defect_type": "misalignment", "confidence": 0.82}',
    'standalone_tool',
    1,
    'expert_bob',
    'expert_bob'
  );

-- This should succeed (different label_type for same item)
INSERT INTO ${CATALOG}.${SCHEMA}.canonical_labels
  (id, sheet_id, item_ref, label_type, label_data, labeling_mode,
   version, created_by, updated_by)
VALUES
  (
    'label-pcb-003',
    'sheet-pcb-001',
    'pcb_img_00042',
    'severity_level',
    '{"severity": "critical", "urgency": "high"}',
    'standalone_tool',
    1,
    'expert_alice',
    'expert_alice'
  );

-- This SHOULD FAIL with UNIQUE constraint violation
-- (same sheet_id + item_ref + label_type as label-pcb-001)
/*
INSERT INTO ${CATALOG}.${SCHEMA}.canonical_labels
  (id, sheet_id, item_ref, label_type, label_data, labeling_mode,
   version, created_by, updated_by)
VALUES
  (
    'label-pcb-DUPLICATE',
    'sheet-pcb-001',
    'pcb_img_00042',
    'pcb_defect_type',
    '{"defect_type": "open", "confidence": 0.70}',
    'standalone_tool',
    1,
    'expert_charlie',
    'expert_charlie'
  );
*/
-- ^ Uncomment to test constraint violation

-- ============================================================================
-- VALIDATION: Query seed data
-- ============================================================================

-- Check all seed data was inserted
SELECT 'sheets' as table_name, COUNT(*) as row_count FROM ${CATALOG}.${SCHEMA}.sheets
UNION ALL
SELECT 'templates', COUNT(*) FROM ${CATALOG}.${SCHEMA}.templates
UNION ALL
SELECT 'canonical_labels', COUNT(*) FROM ${CATALOG}.${SCHEMA}.canonical_labels
UNION ALL
SELECT 'training_sheets', COUNT(*) FROM ${CATALOG}.${SCHEMA}.training_sheets
UNION ALL
SELECT 'qa_pairs', COUNT(*) FROM ${CATALOG}.${SCHEMA}.qa_pairs
UNION ALL
SELECT 'model_training_lineage', COUNT(*) FROM ${CATALOG}.${SCHEMA}.model_training_lineage;

-- Verify canonical label reuse pattern
SELECT
  cl.item_ref,
  cl.label_type,
  cl.label_data,
  qa.id as qa_pair_id,
  qa.was_auto_approved
FROM ${CATALOG}.${SCHEMA}.canonical_labels cl
LEFT JOIN ${CATALOG}.${SCHEMA}.qa_pairs qa
  ON qa.canonical_label_id = cl.id
ORDER BY cl.item_ref;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT '✅ Schema validation complete! All tables created and seeded.' as status;
