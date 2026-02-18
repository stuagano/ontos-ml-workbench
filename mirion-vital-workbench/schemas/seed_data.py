#!/usr/bin/env python3
"""
Seed data for Ontos ML Workbench
Creates sample data for testing and validation
"""
from databricks.sdk import WorkspaceClient
from datetime import datetime
import json
import uuid

w = WorkspaceClient()
warehouse_id = '071969b1ec9a91ca'
schema = 'home_stuart_gano.ontos_ml_workbench'
user = 'stuart.gano@databricks.com'

print('🌱 Seeding Ontos ML Workbench with sample data...\n')

# =============================================================================
# 1. SHEETS - Dataset Definitions
# =============================================================================
print('📄 Seeding sheets...')

sheet_1_id = str(uuid.uuid4())
sheet_2_id = str(uuid.uuid4())

sql = f"""
INSERT INTO {schema}.sheets (
    id, name, description, source_type, source_volume, source_path,
    item_id_column, text_columns, image_columns, metadata_columns,
    sampling_strategy, status, item_count,
    created_at, created_by, updated_at, updated_by
) VALUES (
    '{sheet_1_id}',
    'PCB Defect Detection Dataset',
    'Microscope images of PCBs with labeled defects',
    'uc_volume',
    '/Volumes/home_stuart_gano/ontos_ml_workbench/pcb_images',
    'defect_images/',
    'image_filename',
    ARRAY(),
    ARRAY('image_path'),
    ARRAY('sensor_reading', 'timestamp', 'station_id'),
    'all',
    'active',
    150,
    CURRENT_TIMESTAMP(),
    '{user}',
    CURRENT_TIMESTAMP(),
    '{user}'
)
"""

result = w.statement_execution.execute_statement(statement=sql, warehouse_id=warehouse_id)
if result.status.state == 'SUCCEEDED':
    print(f'   ✅ PCB Defect Detection Dataset')

sql = f"""
INSERT INTO {schema}.sheets (
    id, name, description, source_type, source_table,
    item_id_column, text_columns, metadata_columns,
    sampling_strategy, sample_size, filter_expression, status, item_count,
    created_at, created_by, updated_at, updated_by
) VALUES (
    '{sheet_2_id}',
    'Radiation Sensor Telemetry',
    'Time-series sensor data from radiation detectors',
    'uc_table',
    'home_stuart_gano.ontos_ml_workbench.sensor_readings',
    'reading_id',
    ARRAY('notes', 'alert_message'),
    ARRAY('sensor_id', 'location', 'timestamp'),
    'random',
    1000,
    'status = "active" AND reading_value > 0',
    'active',
    5000,
    CURRENT_TIMESTAMP(),
    '{user}',
    CURRENT_TIMESTAMP(),
    '{user}'
)
"""

result = w.statement_execution.execute_statement(statement=sql, warehouse_id=warehouse_id)
if result.status.state == 'SUCCEEDED':
    print(f'   ✅ Radiation Sensor Telemetry')

# =============================================================================
# 2. TEMPLATES - Prompt Templates
# =============================================================================
print('\n📝 Seeding templates...')

template_1_id = str(uuid.uuid4())
template_2_id = str(uuid.uuid4())

label_schema = json.dumps({
    'type': 'object',
    'properties': {
        'defect_type': {'type': 'string'},
        'severity': {'type': 'string'},
        'location': {'type': 'object'}
    }
})

sql = f"""
INSERT INTO {schema}.templates (
    id, name, description, system_prompt, user_prompt_template,
    label_type, label_schema, model_name, temperature, max_tokens,
    output_format, validation_rules, examples, allowed_uses, prohibited_uses,
    version, is_latest, status, created_at, created_by, updated_at, updated_by
) VALUES (
    '{template_1_id}',
    'PCB Defect Classification',
    'Classify defects in PCB images',
    'You are an expert in PCB quality inspection. Classify defects accurately.',
    'Analyze this PCB image and identify any defects. Image: {{{{image_path}}}}. Sensor reading: {{{{sensor_reading}}}}',
    'defect_classification',
    '{label_schema}',
    'databricks-meta-llama-3-1-70b-instruct',
    0.0,
    1024,
    'json',
    '{json.dumps({"required": ["defect_type", "severity"]})}',
    '[]',
    ARRAY('quality_inspection', 'training'),
    ARRAY('medical', 'safety_critical_decisions'),
    1,
    true,
    'active',
    CURRENT_TIMESTAMP(),
    '{user}',
    CURRENT_TIMESTAMP(),
    '{user}'
)
"""

result = w.statement_execution.execute_statement(statement=sql, warehouse_id=warehouse_id)
if result.status.state == 'SUCCEEDED':
    print(f'   ✅ PCB Defect Classification')

alert_schema = json.dumps({
    'type': 'object',
    'properties': {
        'alert_level': {'type': 'string', 'enum': ['info', 'warning', 'critical']},
        'requires_action': {'type': 'boolean'}
    }
})

sql = f"""
INSERT INTO {schema}.templates (
    id, name, description, system_prompt, user_prompt_template,
    label_type, label_schema, model_name, temperature, max_tokens,
    output_format, validation_rules, examples, allowed_uses, prohibited_uses,
    version, is_latest, status, created_at, created_by, updated_at, updated_by
) VALUES (
    '{template_2_id}',
    'Radiation Alert Classification',
    'Classify radiation sensor alerts',
    'You are a radiation safety expert. Classify sensor alerts based on readings and context.',
    'Classify this radiation alert. Reading: {{{{reading_value}}}} {{{{unit}}}}. Location: {{{{location}}}}. Notes: {{{{notes}}}}',
    'alert_classification',
    '{alert_schema}',
    'databricks-meta-llama-3-1-70b-instruct',
    0.0,
    512,
    'json',
    '{json.dumps({"required": ["alert_level", "requires_action"]})}',
    '[]',
    ARRAY('safety_monitoring', 'training'),
    ARRAY(),
    1,
    true,
    'active',
    CURRENT_TIMESTAMP(),
    '{user}',
    CURRENT_TIMESTAMP(),
    '{user}'
)
"""

result = w.statement_execution.execute_statement(statement=sql, warehouse_id=warehouse_id)
if result.status.state == 'SUCCEEDED':
    print(f'   ✅ Radiation Alert Classification')

# =============================================================================
# 3. CANONICAL LABELS - Ground Truth
# =============================================================================
print('\n🏷️  Seeding canonical_labels...')

label_1_id = str(uuid.uuid4())
label_2_id = str(uuid.uuid4())

label_data_1 = json.dumps({
    'defect_type': 'cold_solder',
    'severity': 'medium',
    'location': {'x': 120, 'y': 340}
})

sql = f"""
INSERT INTO {schema}.canonical_labels (
    id, sheet_id, item_ref, label_type, label_data, label_confidence,
    labeling_mode, version, reviewed_by, reviewed_at, quality_score,
    flags, reuse_count, created_at, created_by, updated_at, updated_by
) VALUES (
    '{label_1_id}',
    '{sheet_1_id}',
    'pcb_001.jpg',
    'defect_classification',
    '{label_data_1}',
    0.95,
    'standalone_tool',
    1,
    '{user}',
    CURRENT_TIMESTAMP(),
    0.9,
    ARRAY(),
    0,
    CURRENT_TIMESTAMP(),
    '{user}',
    CURRENT_TIMESTAMP(),
    '{user}'
)
"""

result = w.statement_execution.execute_statement(statement=sql, warehouse_id=warehouse_id)
if result.status.state == 'SUCCEEDED':
    print(f'   ✅ Label: pcb_001.jpg')

label_data_2 = json.dumps({
    'defect_type': 'short_circuit',
    'severity': 'critical',
    'location': {'x': 200, 'y': 150}
})

sql = f"""
INSERT INTO {schema}.canonical_labels (
    id, sheet_id, item_ref, label_type, label_data, label_confidence,
    labeling_mode, version, reviewed_by, reviewed_at, quality_score,
    flags, reuse_count, created_at, created_by, updated_at, updated_by
) VALUES (
    '{label_2_id}',
    '{sheet_1_id}',
    'pcb_002.jpg',
    'defect_classification',
    '{label_data_2}',
    1.0,
    'standalone_tool',
    1,
    '{user}',
    CURRENT_TIMESTAMP(),
    1.0,
    ARRAY(),
    0,
    CURRENT_TIMESTAMP(),
    '{user}',
    CURRENT_TIMESTAMP(),
    '{user}'
)
"""

result = w.statement_execution.execute_statement(statement=sql, warehouse_id=warehouse_id)
if result.status.state == 'SUCCEEDED':
    print(f'   ✅ Label: pcb_002.jpg')

# =============================================================================
# 4. TRAINING SHEETS - Q&A Datasets
# =============================================================================
print('\n📊 Seeding training_sheets...')

training_sheet_id = str(uuid.uuid4())

sql = f"""
INSERT INTO {schema}.training_sheets (
    id, name, description, sheet_id, template_id, template_version,
    generation_mode, model_used, status, total_items, generated_count,
    approved_count, rejected_count, auto_approved_count,
    created_at, created_by, updated_at, updated_by
) VALUES (
    '{training_sheet_id}',
    'PCB Defect Training Set v1',
    'Initial training set for PCB defect detection',
    '{sheet_1_id}',
    '{template_1_id}',
    1,
    'ai_generated',
    'databricks-meta-llama-3-1-70b-instruct',
    'review',
    5,
    3,
    2,
    1,
    2,
    CURRENT_TIMESTAMP(),
    '{user}',
    CURRENT_TIMESTAMP(),
    '{user}'
)
"""

result = w.statement_execution.execute_statement(statement=sql, warehouse_id=warehouse_id)
if result.status.state == 'SUCCEEDED':
    print(f'   ✅ Training Sheet created')

# =============================================================================
# 5. QA PAIRS - Individual Q&A Pairs
# =============================================================================
print('\n💬 Seeding qa_pairs...')

messages_1 = json.dumps([
    {'role': 'system', 'content': 'You are an expert in PCB quality inspection.'},
    {'role': 'user', 'content': 'Analyze this PCB image. Sensor reading: 2.4V'},
    {'role': 'assistant', 'content': label_data_1}
])

sql = f"""
INSERT INTO {schema}.qa_pairs (
    id, training_sheet_id, sheet_id, item_ref, messages,
    canonical_label_id, was_auto_approved, review_status, reviewed_by,
    sequence_number, created_at, created_by, updated_at, updated_by
) VALUES (
    '{str(uuid.uuid4())}',
    '{training_sheet_id}',
    '{sheet_1_id}',
    'pcb_001.jpg',
    '{messages_1}',
    '{label_1_id}',
    true,
    'approved',
    '{user}',
    1,
    CURRENT_TIMESTAMP(),
    '{user}',
    CURRENT_TIMESTAMP(),
    '{user}'
)
"""

result = w.statement_execution.execute_statement(statement=sql, warehouse_id=warehouse_id)
if result.status.state == 'SUCCEEDED':
    print(f'   ✅ Q&A Pair: pcb_001.jpg (auto-approved via canonical label)')

messages_2 = json.dumps([
    {'role': 'system', 'content': 'You are an expert in PCB quality inspection.'},
    {'role': 'user', 'content': 'Analyze this PCB image. Sensor reading: 1.8V'},
    {'role': 'assistant', 'content': label_data_2}
])

sql = f"""
INSERT INTO {schema}.qa_pairs (
    id, training_sheet_id, sheet_id, item_ref, messages,
    canonical_label_id, was_auto_approved, review_status, reviewed_by,
    sequence_number, created_at, created_by, updated_at, updated_by
) VALUES (
    '{str(uuid.uuid4())}',
    '{training_sheet_id}',
    '{sheet_1_id}',
    'pcb_002.jpg',
    '{messages_2}',
    '{label_2_id}',
    true,
    'approved',
    '{user}',
    2,
    CURRENT_TIMESTAMP(),
    '{user}',
    CURRENT_TIMESTAMP(),
    '{user}'
)
"""

result = w.statement_execution.execute_statement(statement=sql, warehouse_id=warehouse_id)
if result.status.state == 'SUCCEEDED':
    print(f'   ✅ Q&A Pair: pcb_002.jpg (auto-approved via canonical label)')

messages_3 = json.dumps([
    {'role': 'system', 'content': 'You are an expert in PCB quality inspection.'},
    {'role': 'user', 'content': 'Analyze this PCB image. Sensor reading: 3.1V'},
    {'role': 'assistant', 'content': json.dumps({'defect_type': 'no_defect', 'severity': 'none', 'location': None})}
])

sql = f"""
INSERT INTO {schema}.qa_pairs (
    id, training_sheet_id, sheet_id, item_ref, messages,
    was_auto_approved, review_status,
    sequence_number, created_at, created_by, updated_at, updated_by
) VALUES (
    '{str(uuid.uuid4())}',
    '{training_sheet_id}',
    '{sheet_1_id}',
    'pcb_003.jpg',
    '{messages_3}',
    false,
    'pending',
    3,
    CURRENT_TIMESTAMP(),
    '{user}',
    CURRENT_TIMESTAMP(),
    '{user}'
)
"""

result = w.statement_execution.execute_statement(statement=sql, warehouse_id=warehouse_id)
if result.status.state == 'SUCCEEDED':
    print(f'   ✅ Q&A Pair: pcb_003.jpg (pending review)')

# =============================================================================
# 6. MODEL TRAINING LINEAGE - Model Tracking
# =============================================================================
print('\n🤖 Seeding model_training_lineage...')

sql = f"""
INSERT INTO {schema}.model_training_lineage (
    id, model_name, model_version, training_sheet_id, training_sheet_name,
    base_model, training_examples_count, deployment_status,
    created_at, created_by, updated_at, updated_by
) VALUES (
    '{str(uuid.uuid4())}',
    'pcb_defect_classifier_v1',
    '1.0',
    '{training_sheet_id}',
    'PCB Defect Training Set v1',
    'databricks-meta-llama-3-1-70b-instruct',
    3,
    'training',
    CURRENT_TIMESTAMP(),
    '{user}',
    CURRENT_TIMESTAMP(),
    '{user}'
)
"""

result = w.statement_execution.execute_statement(statement=sql, warehouse_id=warehouse_id)
if result.status.state == 'SUCCEEDED':
    print(f'   ✅ Model lineage created')

# =============================================================================
# 7. EXAMPLE STORE - Few-shot Examples
# =============================================================================
print('\n📚 Seeding example_store...')

example_input = json.dumps({'image': 'pcb_example.jpg', 'sensor_reading': '2.4V'})
example_output = json.dumps({'defect_type': 'cold_solder', 'severity': 'medium'})

sql = f"""
INSERT INTO {schema}.example_store (
    id, input, expected_output, search_keys, function_name, domain,
    difficulty, quality_score, is_verified, source,
    created_at, created_by, updated_at, updated_by
) VALUES (
    '{str(uuid.uuid4())}',
    '{example_input}',
    '{example_output}',
    ARRAY('cold_solder', 'pcb', 'defect'),
    'classify_pcb_defect',
    'quality_inspection',
    'moderate',
    0.9,
    true,
    'curated',
    CURRENT_TIMESTAMP(),
    '{user}',
    CURRENT_TIMESTAMP(),
    '{user}'
)
"""

result = w.statement_execution.execute_statement(statement=sql, warehouse_id=warehouse_id)
if result.status.state == 'SUCCEEDED':
    print(f'   ✅ Example created')

# =============================================================================
# VERIFICATION
# =============================================================================
print('\n' + '='*60)
print('🔍 Verifying seed data...\n')

tables_to_check = [
    'sheets',
    'templates',
    'canonical_labels',
    'training_sheets',
    'qa_pairs',
    'model_training_lineage',
    'example_store'
]

for table in tables_to_check:
    sql = f"SELECT COUNT(*) as count FROM {schema}.{table}"
    result = w.statement_execution.execute_statement(statement=sql, warehouse_id=warehouse_id)

    if result.result and result.result.data_array:
        count = result.result.data_array[0][0]
        print(f'   ✅ {table:25} {count} rows')
    else:
        print(f'   ❌ {table:25} Could not verify')

print('\n🎉 Seed data creation complete!')
print('\n' + '='*60)
print('Key Data Relationships:')
print('  - 2 Sheets (PCB images + Sensor data)')
print('  - 2 Templates (PCB defect + Alert classification)')
print('  - 2 Canonical Labels (demonstrating "label once, reuse everywhere")')
print('  - 1 Training Sheet (linking Sheet + Template)')
print('  - 3 Q&A Pairs (2 auto-approved via canonical labels, 1 pending)')
print('  - 1 Model lineage entry')
print('  - 1 Few-shot example')
print('\nNext: Verify with queries or start Task #3 (Sheet Management API)')
