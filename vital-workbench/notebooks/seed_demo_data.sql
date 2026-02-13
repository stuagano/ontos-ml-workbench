-- Seed Demo Data for VITAL Workbench
-- Run this notebook in the workspace to populate sample data

-- Use the correct catalog/schema
USE CATALOG `erp-demonstrations`;
USE SCHEMA vital_workbench;

-- ============================================================================
-- TEMPLATES
-- ============================================================================

-- Sensor Anomaly Detection Template
INSERT INTO templates (id, name, description, version, status, system_prompt, prompt_template, input_schema, output_schema, base_model, temperature, max_tokens, created_by, created_at, updated_at)
SELECT
    'tpl-sensor-anomaly-001',
    'Sensor Anomaly Detection',
    'Classify sensor readings as normal, warning, or critical based on temperature and humidity patterns',
    '1.0.0',
    'published',
    'You are an expert industrial IoT analyst specializing in sensor anomaly detection for radiation safety equipment.\n\nAnalyze sensor readings and classify the equipment status. Consider:\n- Temperature: Normal range is 65-85F. Warning at 90-100F. Critical above 100F or below 50F.\n- Humidity: Normal range is 40-60%. Warning outside 30-70%. Critical outside 20-80%.\n\nRespond in JSON format with your classification and reasoning.',
    'Analyze this sensor reading:\n\nSensor ID: {{sensor_id}}\nTemperature: {{temperature}}F\nHumidity: {{humidity}}%\nCurrent Status: {{status}}\n\nProvide your analysis in JSON format with: classification, confidence, anomaly_detected, reasoning, recommended_action',
    '[{"name":"sensor_id","type":"string","required":true},{"name":"temperature","type":"number","required":true},{"name":"humidity","type":"number","required":true},{"name":"status","type":"string","required":true}]',
    '[{"name":"classification","type":"string","required":true},{"name":"confidence","type":"number","required":true},{"name":"anomaly_detected","type":"boolean","required":true},{"name":"reasoning","type":"string","required":true},{"name":"recommended_action","type":"string","required":false}]',
    'databricks-meta-llama-3-1-70b-instruct',
    0.3,
    512,
    'bootstrap',
    current_timestamp(),
    current_timestamp()
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE id = 'tpl-sensor-anomaly-001');

-- Defect Classification Template
INSERT INTO templates (id, name, description, version, status, system_prompt, prompt_template, input_schema, output_schema, base_model, temperature, max_tokens, created_by, created_at, updated_at)
SELECT
    'tpl-defect-class-001',
    'Defect Classification',
    'Classify manufacturing defects by type and severity from inspection notes',
    '1.0.0',
    'published',
    'You are a quality control expert for manufacturing inspection. Classify defects found during product inspection.\n\nDefect Categories:\n- cosmetic: Visual imperfections (scratches, paint issues, minor dents)\n- structural: Issues affecting physical integrity (cracks, incomplete welds)\n- dimensional: Size/alignment issues affecting fit or assembly\n- functional: Issues affecting product operation\n- none: No defect found\n\nSeverity Levels: none, minor, major, critical\n\nBe precise and consistent in your classifications.',
    'Classify this inspection finding:\n\nProduct ID: {{product_id}}\nInspection Notes: {{inspection_notes}}\n\nProvide classification in JSON format with: defect_type, severity, confidence, reasoning, rework_required, estimated_repair_time_hours',
    '[{"name":"product_id","type":"string","required":true},{"name":"inspection_notes","type":"string","required":true}]',
    '[{"name":"defect_type","type":"string","required":true},{"name":"severity","type":"string","required":true},{"name":"confidence","type":"number","required":true},{"name":"reasoning","type":"string","required":true},{"name":"rework_required","type":"boolean","required":true}]',
    'databricks-meta-llama-3-1-70b-instruct',
    0.2,
    512,
    'bootstrap',
    current_timestamp(),
    current_timestamp()
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE id = 'tpl-defect-class-001');

-- Predictive Maintenance Template (draft)
INSERT INTO templates (id, name, description, version, status, system_prompt, prompt_template, input_schema, output_schema, base_model, temperature, max_tokens, created_by, created_at, updated_at)
SELECT
    'tpl-pred-maint-001',
    'Predictive Maintenance',
    'Predict equipment failures and recommend maintenance actions based on telemetry data',
    '1.0.0',
    'draft',
    'You are a predictive maintenance AI for industrial radiation detection equipment. Analyze equipment telemetry and maintenance history to predict potential failures.\n\nConsider operating hours, temperature trends, vibration patterns, and historical failure modes.',
    'Analyze this equipment for maintenance needs:\n\nEquipment ID: {{equipment_id}}\nEquipment Type: {{equipment_type}}\nOperating Hours: {{operating_hours}}\nLast Maintenance: {{last_maintenance_date}}\nCurrent Temperature: {{current_temp}}F\n\nProvide your maintenance prediction in JSON format.',
    '[{"name":"equipment_id","type":"string","required":true},{"name":"equipment_type","type":"string","required":true},{"name":"operating_hours","type":"number","required":true},{"name":"last_maintenance_date","type":"string","required":true},{"name":"current_temp","type":"number","required":true}]',
    '[{"name":"failure_probability_30d","type":"number","required":true},{"name":"recommended_action","type":"string","required":true},{"name":"reasoning","type":"string","required":true}]',
    'databricks-meta-llama-3-1-70b-instruct',
    0.4,
    768,
    'bootstrap',
    current_timestamp(),
    current_timestamp()
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE id = 'tpl-pred-maint-001');

-- Calibration Insights Template (draft)
INSERT INTO templates (id, name, description, version, status, system_prompt, prompt_template, input_schema, output_schema, base_model, temperature, max_tokens, created_by, created_at, updated_at)
SELECT
    'tpl-calibration-001',
    'Calibration Insights',
    'Analyze Monte Carlo simulation results and provide detector calibration recommendations',
    '1.0.0',
    'draft',
    'You are a radiation physics expert specializing in detector calibration. Analyze Monte Carlo simulation results and provide calibration recommendations.\n\nBe precise with numerical recommendations as they affect measurement accuracy.',
    'Analyze these calibration results:\n\nDetector ID: {{detector_id}}\nDetector Type: {{detector_type}}\nExpected Response: {{expected_response}}\nMeasured Response: {{measured_response}}\nLast Calibration: {{last_calibration_date}}\n\nProvide calibration analysis in JSON format.',
    '[{"name":"detector_id","type":"string","required":true},{"name":"detector_type","type":"string","required":true},{"name":"expected_response","type":"number","required":true},{"name":"measured_response","type":"number","required":true},{"name":"last_calibration_date","type":"string","required":true}]',
    '[{"name":"calibration_status","type":"string","required":true},{"name":"new_calibration_factor","type":"number","required":true},{"name":"recommended_action","type":"string","required":true}]',
    'databricks-meta-llama-3-1-70b-instruct',
    0.2,
    768,
    'bootstrap',
    current_timestamp(),
    current_timestamp()
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE id = 'tpl-calibration-001');

-- ============================================================================
-- CURATION ITEMS
-- ============================================================================

-- Sensor anomaly curation items
INSERT INTO curation_items (id, template_id, input_data, original_output, curated_output, status, confidence_score, created_by, created_at, updated_at)
SELECT
    'curation-sensor-001',
    'tpl-sensor-anomaly-001',
    '{"sensor_id": "SENSOR-002", "temperature": 185.3, "humidity": 12.1, "status": "critical"}',
    '{"classification": "critical", "confidence": 0.95, "anomaly_detected": true, "reasoning": "Temperature 185.3F significantly exceeds critical threshold of 100F. Humidity 12.1% is critically low.", "recommended_action": "Immediate inspection required"}',
    NULL,
    'pending',
    0.95,
    'bootstrap',
    current_timestamp(),
    current_timestamp()
WHERE NOT EXISTS (SELECT 1 FROM curation_items WHERE id = 'curation-sensor-001');

INSERT INTO curation_items (id, template_id, input_data, original_output, curated_output, status, confidence_score, created_by, created_at, updated_at)
SELECT
    'curation-sensor-002',
    'tpl-sensor-anomaly-001',
    '{"sensor_id": "SENSOR-004", "temperature": 98.2, "humidity": 78.4, "status": "warning"}',
    '{"classification": "warning", "confidence": 0.82, "anomaly_detected": true, "reasoning": "Temperature 98.2F approaching critical threshold. Humidity 78.4% is elevated.", "recommended_action": "Monitor closely, schedule inspection within 24 hours"}',
    NULL,
    'pending',
    0.82,
    'bootstrap',
    current_timestamp(),
    current_timestamp()
WHERE NOT EXISTS (SELECT 1 FROM curation_items WHERE id = 'curation-sensor-002');

INSERT INTO curation_items (id, template_id, input_data, original_output, curated_output, status, confidence_score, created_by, created_at, updated_at)
SELECT
    'curation-sensor-003',
    'tpl-sensor-anomaly-001',
    '{"sensor_id": "SENSOR-001", "temperature": 72.5, "humidity": 45.2, "status": "normal"}',
    '{"classification": "normal", "confidence": 0.98, "anomaly_detected": false, "reasoning": "All readings within normal operating parameters.", "recommended_action": null}',
    '{"classification": "normal", "confidence": 0.98, "anomaly_detected": false, "reasoning": "All readings within normal operating parameters.", "recommended_action": null}',
    'approved',
    0.98,
    'bootstrap',
    current_timestamp(),
    current_timestamp()
WHERE NOT EXISTS (SELECT 1 FROM curation_items WHERE id = 'curation-sensor-003');

-- Defect classification curation items
INSERT INTO curation_items (id, template_id, input_data, original_output, curated_output, status, confidence_score, created_by, created_at, updated_at)
SELECT
    'curation-defect-001',
    'tpl-defect-class-001',
    '{"product_id": "PRD-2024-002", "inspection_notes": "Weld joint incomplete, structural integrity compromised"}',
    '{"defect_type": "structural", "severity": "critical", "confidence": 0.94, "reasoning": "Incomplete weld joint directly affects structural integrity - safety critical defect", "rework_required": true, "estimated_repair_time_hours": 4}',
    NULL,
    'pending',
    0.94,
    'bootstrap',
    current_timestamp(),
    current_timestamp()
WHERE NOT EXISTS (SELECT 1 FROM curation_items WHERE id = 'curation-defect-001');

INSERT INTO curation_items (id, template_id, input_data, original_output, curated_output, status, confidence_score, created_by, created_at, updated_at)
SELECT
    'curation-defect-002',
    'tpl-defect-class-001',
    '{"product_id": "PRD-2024-001", "inspection_notes": "Surface scratch visible on left panel, 2cm length"}',
    '{"defect_type": "cosmetic", "severity": "minor", "confidence": 0.91, "reasoning": "Surface scratch is purely cosmetic, does not affect function", "rework_required": false, "estimated_repair_time_hours": null}',
    '{"defect_type": "cosmetic", "severity": "minor", "confidence": 0.91, "reasoning": "Surface scratch is purely cosmetic, does not affect function", "rework_required": false, "estimated_repair_time_hours": null}',
    'approved',
    0.91,
    'bootstrap',
    current_timestamp(),
    current_timestamp()
WHERE NOT EXISTS (SELECT 1 FROM curation_items WHERE id = 'curation-defect-002');

-- ============================================================================
-- VERIFY
-- ============================================================================

SELECT 'Templates' as table_name, COUNT(*) as count FROM templates
UNION ALL
SELECT 'Sheets' as table_name, COUNT(*) as count FROM sheets
UNION ALL
SELECT 'Curation Items' as table_name, COUNT(*) as count FROM curation_items;
