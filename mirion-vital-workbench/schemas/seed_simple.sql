-- Simple seed data for testing VITAL Platform Workbench schema
-- Run this with: python3 run_sql.py seed_simple.sql

-- 1. SHEETS
INSERT INTO home_stuart_gano.mirion_vital_workbench.sheets VALUES (
  'sheet-pcb-001',
  'PCB Defect Detection Dataset',
  'Microscope images of PCBs with labeled defects',
  'uc_volume',
  NULL,
  '/Volumes/home_stuart_gano/mirion_vital_workbench/pcb_images',
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
  'stuart.gano@databricks.com',
  CURRENT_TIMESTAMP(),
  'stuart.gano@databricks.com'
);

INSERT INTO home_stuart_gano.mirion_vital_workbench.sheets VALUES (
  'sheet-sensor-001',
  'Radiation Sensor Telemetry',
  'Time-series sensor data from radiation detectors',
  'uc_table',
  'home_stuart_gano.mirion_vital_workbench.sensor_readings',
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
  'stuart.gano@databricks.com',
  CURRENT_TIMESTAMP(),
  'stuart.gano@databricks.com'
);

-- 2. TEMPLATES
INSERT INTO home_stuart_gano.mirion_vital_workbench.templates VALUES (
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
  'stuart.gano@databricks.com',
  CURRENT_TIMESTAMP(),
  'stuart.gano@databricks.com'
);

-- 3. CANONICAL LABELS
INSERT INTO home_stuart_gano.mirion_vital_workbench.canonical_labels VALUES (
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
  'stuart.gano@databricks.com',
  CURRENT_TIMESTAMP(),
  0.9,
  ARRAY(),
  0,
  NULL,
  CURRENT_TIMESTAMP(),
  'stuart.gano@databricks.com',
  CURRENT_TIMESTAMP(),
  'stuart.gano@databricks.com'
);

-- Verification queries
SELECT 'sheets' as table_name, COUNT(*) as row_count FROM home_stuart_gano.mirion_vital_workbench.sheets
UNION ALL
SELECT 'templates', COUNT(*) FROM home_stuart_gano.mirion_vital_workbench.templates
UNION ALL
SELECT 'canonical_labels', COUNT(*) FROM home_stuart_gano.mirion_vital_workbench.canonical_labels;
