-- Quick Start: Seed Demo Templates
-- Run this in Databricks SQL Editor
-- Warehouse: 387bcda0f2ece20c
-- Schema: erp-demonstrations.ontos_ml_workbench (ID: 8c866643-2b1e-4b8d-8497-8a009badfae3)

-- Template 1: Document Classifier
INSERT INTO erp_demonstrations.ontos_ml_workbench.templates (
  id, name, description, version, status,
  prompt_template, system_prompt,
  input_schema, output_schema, examples,
  base_model, temperature, max_tokens,
  created_by, created_at, updated_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Document Classifier',
  'Classify documents into predefined categories based on content analysis',
  '1.0.0',
  'published',
  'Classify the following document into one of these categories: {categories}\n\nDocument:\n{document}\n\nRespond with a JSON object containing:\n- category: the most appropriate category\n- confidence: a score from 0 to 1\n- reasoning: brief explanation',
  'You are a document classification expert. Analyze documents carefully and provide accurate classifications.',
  '[{"name":"document","type":"string","description":"The document text to classify","required":true},{"name":"categories","type":"string","description":"Comma-separated list of categories","required":true}]',
  '[{"name":"category","type":"string","description":"The assigned category","required":true},{"name":"confidence","type":"number","description":"Confidence score 0-1","required":true},{"name":"reasoning","type":"string","description":"Explanation","required":false}]',
  '[{"input":{"document":"Q3 revenue increased by 15%...","categories":"Financial,Legal,Technical,HR"},"output":{"category":"Financial","confidence":0.95,"reasoning":"Contains revenue metrics"}}]',
  'databricks-meta-llama-3-1-70b-instruct',
  0.7,
  1024,
  'admin',
  current_timestamp(),
  current_timestamp()
);

-- Template 2: Sentiment Analyzer
INSERT INTO erp_demonstrations.ontos_ml_workbench.templates (
  id, name, description, version, status,
  prompt_template, system_prompt,
  input_schema, output_schema, examples,
  base_model, temperature, max_tokens,
  created_by, created_at, updated_at
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Sentiment Analyzer',
  'Analyze sentiment in customer feedback and reviews',
  '1.0.0',
  'published',
  'Analyze the sentiment of the following text:\n\n{text}\n\nProvide a sentiment analysis with:\n- sentiment: positive, negative, or neutral\n- score: -1 (very negative) to 1 (very positive)\n- key_phrases: list of phrases that influenced the sentiment',
  'You are a sentiment analysis expert. Be objective and thorough in your analysis.',
  '[{"name":"text","type":"string","description":"Text to analyze","required":true}]',
  '[{"name":"sentiment","type":"string","description":"positive/negative/neutral","required":true},{"name":"score","type":"number","description":"Score from -1 to 1","required":true},{"name":"key_phrases","type":"array","description":"Influential phrases","required":false}]',
  '[{"input":{"text":"Great product! Fast shipping and excellent quality."},"output":{"sentiment":"positive","score":0.9,"key_phrases":["Great product","excellent quality"]}}]',
  'databricks-meta-llama-3-1-8b-instruct',
  0.7,
  512,
  'admin',
  current_timestamp(),
  current_timestamp()
);

-- Template 3: Entity Extractor
INSERT INTO erp_demonstrations.ontos_ml_workbench.templates (
  id, name, description, version, status,
  prompt_template, system_prompt,
  input_schema, output_schema, examples,
  base_model, temperature, max_tokens,
  created_by, created_at, updated_at
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'Entity Extractor',
  'Extract named entities (people, organizations, locations) from text',
  '1.0.0',
  'draft',
  'Extract all named entities from the following text:\n\n{text}\n\nIdentify and categorize:\n- PERSON: Names of people\n- ORG: Organizations and companies\n- LOC: Locations and places\n- DATE: Dates and times\n- MONEY: Monetary values',
  'You are an expert at named entity recognition. Be thorough and accurate.',
  '[{"name":"text","type":"string","description":"Text to extract entities from","required":true}]',
  '[{"name":"entities","type":"array","description":"List of extracted entities","required":true}]',
  '[]',
  'databricks-meta-llama-3-1-70b-instruct',
  0.5,
  1024,
  'admin',
  current_timestamp(),
  current_timestamp()
);

-- Template 4: Radiation Equipment Defect Classifier
INSERT INTO erp_demonstrations.ontos_ml_workbench.templates (
  id, name, description, version, status,
  prompt_template, system_prompt,
  input_schema, output_schema, examples,
  base_model, temperature, max_tokens,
  created_by, created_at, updated_at
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  'Radiation Equipment Defect Classifier',
  'Classify radiation equipment defects from inspection images and sensor data',
  '1.0.0',
  'published',
  'Analyze this radiation equipment inspection:\n\nEquipment ID: {equipment_id}\nInspection Date: {inspection_date}\nSensor Readings: {sensor_readings}\nImage: {image_url}\n\nClassify the equipment condition into: NORMAL, MINOR_WEAR, CONTAMINATION, STRUCTURAL_DAMAGE, CALIBRATION_DRIFT, or CRITICAL_FAILURE.\n\nProvide classification, severity, and reasoning.',
  'You are a radiation safety expert analyzing equipment inspection data. Classify defects accurately based on visual inspection images and sensor readings.',
  '[{"name":"equipment_id","type":"string","required":true},{"name":"inspection_date","type":"string","required":true},{"name":"sensor_readings","type":"string","required":true},{"name":"image_url","type":"string","required":true}]',
  '[{"name":"classification","type":"string","required":true},{"name":"severity","type":"string","required":true},{"name":"reasoning","type":"string","required":true}]',
  '[{"input":{"equipment_id":"RAD-001","inspection_date":"2024-01-15","sensor_readings":"Gamma: 0.12 mSv/h","image_url":"/img/001.jpg"},"output":{"classification":"NORMAL","severity":"none","reasoning":"Readings within normal parameters"}}]',
  'databricks-meta-llama-3-1-70b-instruct',
  0.3,
  512,
  'admin',
  current_timestamp(),
  current_timestamp()
);

-- Verify templates were created
SELECT id, name, status, base_model, created_at
FROM erp_demonstrations.ontos_ml_workbench.templates
ORDER BY created_at DESC;
