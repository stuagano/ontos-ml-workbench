-- Simple seed data for testing Ontos ML Workbench schema
-- Run this with: python3 run_sql.py seed_simple.sql

-- 1. SHEETS
INSERT INTO ${CATALOG}.${SCHEMA}.sheets VALUES (
  'sheet-pcb-001',
  'PCB Defect Detection Dataset',
  'Microscope images of PCBs with labeled defects',
  'uc_volume',
  NULL,
  '/Volumes/your_catalog/ontos_ml_workbench/pcb_images',
  'defect_images/',
  'image_filename',
  ARRAY(),
  ARRAY('image_path'),
  ARRAY('sensor_reading', 'timestamp'),
  'all',
  NULL,
  NULL,
  'active',
  150,
  NULL,
  CURRENT_TIMESTAMP(),
  'admin@example.com',
  CURRENT_TIMESTAMP(),
  'admin@example.com'
);

INSERT INTO ${CATALOG}.${SCHEMA}.sheets VALUES (
  'sheet-sensor-001',
  'Radiation Sensor Telemetry',
  'Time-series sensor data from radiation detectors',
  'uc_table',
  '${CATALOG}.${SCHEMA}.sensor_readings',
  NULL,
  NULL,
  'reading_id',
  ARRAY('notes', 'alert_message'),
  ARRAY(),
  ARRAY('sensor_id', 'location'),
  'random',
  1000,
  'status = "active"',
  'active',
  5000,
  NULL,
  CURRENT_TIMESTAMP(),
  'admin@example.com',
  CURRENT_TIMESTAMP(),
  'admin@example.com'
);

-- 2. TEMPLATES
INSERT INTO ${CATALOG}.${SCHEMA}.templates VALUES (
  'template-pcb-001',
  'PCB Defect Classification',
  'Classify defects in PCB images',
  'You are an expert in PCB quality inspection.',
  'Analyze this PCB image. Image: {{image_path}}',
  'defect_classification',
  '{"type": "object"}',
  'databricks-meta-llama-3-1-70b-instruct',
  0.0,
  1024,
  'json',
  '{"required": ["defect_type"]}',
  '[]',
  ARRAY('quality_inspection'),
  ARRAY(),
  1,
  NULL,
  TRUE,
  'active',
  CURRENT_TIMESTAMP(),
  'admin@example.com',
  CURRENT_TIMESTAMP(),
  'admin@example.com'
);

-- 3. CANONICAL LABELS
INSERT INTO ${CATALOG}.${SCHEMA}.canonical_labels VALUES (
  'label-001',
  'sheet-pcb-001',
  'pcb_001.jpg',
  'defect_classification',
  '{"defect_type": "cold_solder", "severity": "medium"}',
  0.95,
  'standalone_tool',
  NULL,
  NULL,
  1,
  NULL,
  'admin@example.com',
  CURRENT_TIMESTAMP(),
  0.9,
  ARRAY(),
  0,
  NULL,
  CURRENT_TIMESTAMP(),
  'admin@example.com',
  CURRENT_TIMESTAMP(),
  'admin@example.com'
);

-- Verification queries
SELECT 'sheets' as table_name, COUNT(*) as row_count FROM ${CATALOG}.${SCHEMA}.sheets
UNION ALL
SELECT 'templates', COUNT(*) FROM ${CATALOG}.${SCHEMA}.templates
UNION ALL
SELECT 'canonical_labels', COUNT(*) FROM ${CATALOG}.${SCHEMA}.canonical_labels;
