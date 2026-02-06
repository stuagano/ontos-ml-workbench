-- Seed sheets table with sample data
-- Run this in Databricks SQL Editor connected to your warehouse

-- Use the correct catalog/schema
USE CATALOG home_stuart_gano;
USE SCHEMA mirion_vital_workbench;

-- Insert sample sheets
INSERT INTO sheets (
  id,
  name,
  description,
  source_type,
  source_table,
  source_volume,
  source_path,
  item_id_column,
  text_columns,
  image_columns,
  metadata_columns,
  sampling_strategy,
  sample_size,
  filter_expression,
  status,
  item_count,
  last_validated_at,
  created_at,
  created_by,
  updated_at,
  updated_by
) VALUES
-- 1. PCB Defect Detection (Vision AI)
(
  'sheet-pcb-defects-001',
  'PCB Defect Detection Dataset',
  'Microscope images of PCBs with labeled defects for computer vision training',
  'uc_volume',
  NULL,
  '/Volumes/home_stuart_gano/mirion_vital_workbench/pcb_images',
  'defect_images/',
  'image_filename',
  ARRAY(),
  ARRAY('image_path'),
  ARRAY('sensor_reading', 'timestamp', 'station_id', 'shift'),
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
),

-- 2. Radiation Sensor Telemetry (Time Series)
(
  'sheet-sensor-telemetry-001',
  'Radiation Sensor Telemetry',
  'Time-series sensor data from radiation detectors for anomaly detection',
  'uc_table',
  'home_stuart_gano.mirion_vital_workbench.sensor_readings',
  NULL,
  NULL,
  'reading_id',
  ARRAY('notes', 'alert_message'),
  ARRAY(),
  ARRAY('sensor_id', 'location', 'timestamp', 'calibration_date', 'reading_value'),
  'random',
  1000,
  'status = "active" AND reading_value > 0',
  'active',
  5000,
  NULL,
  CURRENT_TIMESTAMP(),
  'stuart.gano@databricks.com',
  CURRENT_TIMESTAMP(),
  'stuart.gano@databricks.com'
),

-- 3. Medical Invoice Entity Extraction (Document AI + Structured)
(
  'sheet-medical-invoices-001',
  'Medical Invoice Entity Extraction',
  'Healthcare billing invoices (PDFs + structured data) for entity extraction',
  'uc_table',
  'home_stuart_gano.mirion_vital_workbench.parsed_invoices',
  NULL,
  NULL,
  'invoice_id',
  ARRAY('invoice_text', 'patient_notes'),
  ARRAY('pdf_path'),
  ARRAY('invoice_date', 'total_amount', 'patient_id', 'provider_id'),
  'stratified',
  500,
  'invoice_date >= "2024-01-01"',
  'active',
  2500,
  NULL,
  CURRENT_TIMESTAMP(),
  'stuart.gano@databricks.com',
  CURRENT_TIMESTAMP(),
  'stuart.gano@databricks.com'
),

-- 4. Equipment Maintenance Logs (Text Classification)
(
  'sheet-maintenance-logs-001',
  'Equipment Maintenance Logs',
  'Service records and maintenance notes for predictive maintenance',
  'uc_table',
  'home_stuart_gano.mirion_vital_workbench.maintenance_logs',
  NULL,
  NULL,
  'log_id',
  ARRAY('technician_notes', 'issue_description', 'resolution'),
  ARRAY(),
  ARRAY('equipment_id', 'service_date', 'downtime_hours', 'parts_replaced'),
  'all',
  NULL,
  NULL,
  'active',
  1200,
  NULL,
  CURRENT_TIMESTAMP(),
  'stuart.gano@databricks.com',
  CURRENT_TIMESTAMP(),
  'stuart.gano@databricks.com'
),

-- 5. Quality Control Inspection Photos (Vision AI)
(
  'sheet-qc-inspections-001',
  'Quality Control Inspection Photos',
  'Final product inspection images from manufacturing line',
  'uc_volume',
  NULL,
  '/Volumes/home_stuart_gano/mirion_vital_workbench/qc_images',
  'inspections/',
  'inspection_id',
  ARRAY(),
  ARRAY('photo_path'),
  ARRAY('product_sku', 'line_number', 'inspector_id', 'timestamp', 'passed'),
  'all',
  NULL,
  NULL,
  'active',
  800,
  NULL,
  CURRENT_TIMESTAMP(),
  'stuart.gano@databricks.com',
  CURRENT_TIMESTAMP(),
  'stuart.gano@databricks.com'
);

-- Verify insertion
SELECT
  id,
  name,
  source_type,
  status,
  item_count,
  created_at
FROM sheets
ORDER BY created_at DESC;

-- Expected: 5 rows
-- If you see 5 sheets, the seed was successful! 🎉
