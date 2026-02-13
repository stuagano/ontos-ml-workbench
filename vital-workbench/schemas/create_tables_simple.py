#!/usr/bin/env python3
"""
Create simplified table schemas that work with standard Databricks SQL
Removes: DEFAULT values, UNIQUE constraints, CREATE INDEX (not needed for Delta)
"""
from databricks.sdk import WorkspaceClient

w = WorkspaceClient()
warehouse_id = '071969b1ec9a91ca'

# Simplified table definitions (remove DEFAULT, UNIQUE, INDEX)
tables = {
    'sheets': '''
        CREATE TABLE IF NOT EXISTS home_stuart_gano.mirion_vital_workbench.sheets (
          id STRING NOT NULL,
          name STRING NOT NULL,
          description STRING,
          source_type STRING NOT NULL COMMENT 'Type: uc_table, uc_volume, or external',
          source_table STRING COMMENT 'Unity Catalog table reference',
          source_volume STRING COMMENT 'Unity Catalog volume path',
          source_path STRING COMMENT 'Path within volume',
          item_id_column STRING COMMENT 'Column name for item_ref',
          text_columns ARRAY<STRING>,
          image_columns ARRAY<STRING>,
          metadata_columns ARRAY<STRING>,
          sampling_strategy STRING COMMENT 'Options: all, random, stratified',
          sample_size INT,
          filter_expression STRING COMMENT 'SQL WHERE clause',
          status STRING COMMENT 'Status: active, archived, deleted',
          item_count INT,
          last_validated_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL,
          created_by STRING NOT NULL,
          updated_at TIMESTAMP NOT NULL,
          updated_by STRING NOT NULL
        ) COMMENT 'Dataset definitions'
        TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true')
    ''',

    'templates': '''
        CREATE TABLE IF NOT EXISTS home_stuart_gano.mirion_vital_workbench.templates (
          id STRING NOT NULL,
          name STRING NOT NULL,
          description STRING,
          system_prompt STRING NOT NULL,
          user_prompt_template STRING NOT NULL,
          label_type STRING NOT NULL COMMENT 'Type of label produced',
          label_schema STRING COMMENT 'JSON schema for labels',
          model_name STRING COMMENT 'Foundation Model to use',
          temperature DOUBLE COMMENT 'Generation temperature',
          max_tokens INT COMMENT 'Maximum tokens to generate',
          output_format STRING COMMENT 'Expected format: json, text',
          validation_rules STRING COMMENT 'JSON validation rules',
          examples STRING COMMENT 'JSON array of examples',
          allowed_uses ARRAY<STRING>,
          prohibited_uses ARRAY<STRING>,
          version INT NOT NULL,
          parent_template_id STRING,
          is_latest BOOLEAN,
          status STRING COMMENT 'Status: draft, active, archived',
          created_at TIMESTAMP NOT NULL,
          created_by STRING NOT NULL,
          updated_at TIMESTAMP NOT NULL,
          updated_by STRING NOT NULL
        ) COMMENT 'Prompt templates'
        TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true')
    ''',

    'canonical_labels': '''
        CREATE TABLE IF NOT EXISTS home_stuart_gano.mirion_vital_workbench.canonical_labels (
          id STRING NOT NULL,
          sheet_id STRING NOT NULL,
          item_ref STRING NOT NULL,
          label_type STRING NOT NULL,
          label_data STRING NOT NULL COMMENT 'JSON label content',
          label_confidence DOUBLE,
          labeling_mode STRING NOT NULL,
          template_id STRING,
          training_sheet_id STRING,
          version INT NOT NULL,
          supersedes_label_id STRING,
          reviewed_by STRING,
          reviewed_at TIMESTAMP,
          quality_score DOUBLE,
          flags ARRAY<STRING>,
          reuse_count INT,
          last_reused_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL,
          created_by STRING NOT NULL,
          updated_at TIMESTAMP NOT NULL,
          updated_by STRING NOT NULL
        ) COMMENT 'Canonical ground truth labels - composite key (sheet_id, item_ref, label_type)'
        TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true')
    ''',

    'training_sheets': '''
        CREATE TABLE IF NOT EXISTS home_stuart_gano.mirion_vital_workbench.training_sheets (
          id STRING NOT NULL,
          name STRING NOT NULL,
          description STRING,
          sheet_id STRING NOT NULL,
          template_id STRING NOT NULL,
          template_version INT,
          generation_mode STRING NOT NULL,
          model_used STRING,
          generation_params STRING COMMENT 'JSON parameters',
          status STRING,
          generation_started_at TIMESTAMP,
          generation_completed_at TIMESTAMP,
          generation_error STRING,
          total_items INT,
          generated_count INT,
          approved_count INT,
          rejected_count INT,
          auto_approved_count INT,
          reviewed_by STRING,
          reviewed_at TIMESTAMP,
          approval_rate DOUBLE,
          exported_at TIMESTAMP,
          exported_by STRING,
          export_path STRING,
          export_format STRING,
          created_at TIMESTAMP NOT NULL,
          created_by STRING NOT NULL,
          updated_at TIMESTAMP NOT NULL,
          updated_by STRING NOT NULL
        ) COMMENT 'Q&A datasets'
        TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true')
    ''',

    'qa_pairs': '''
        CREATE TABLE IF NOT EXISTS home_stuart_gano.mirion_vital_workbench.qa_pairs (
          id STRING NOT NULL,
          training_sheet_id STRING NOT NULL,
          sheet_id STRING NOT NULL,
          item_ref STRING NOT NULL,
          messages STRING NOT NULL COMMENT 'JSON array of {role, content}',
          canonical_label_id STRING,
          was_auto_approved BOOLEAN,
          review_status STRING,
          review_action STRING,
          reviewed_by STRING,
          reviewed_at TIMESTAMP,
          original_messages STRING COMMENT 'Original before editing',
          edit_reason STRING,
          quality_flags ARRAY<STRING>,
          quality_score DOUBLE,
          generation_metadata STRING COMMENT 'JSON metadata',
          sequence_number INT,
          created_at TIMESTAMP NOT NULL,
          created_by STRING NOT NULL,
          updated_at TIMESTAMP NOT NULL,
          updated_by STRING NOT NULL
        ) COMMENT 'Individual Q&A pairs'
        TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true')
    ''',

    'model_training_lineage': '''
        CREATE TABLE IF NOT EXISTS home_stuart_gano.mirion_vital_workbench.model_training_lineage (
          id STRING NOT NULL,
          model_name STRING NOT NULL,
          model_version STRING,
          model_registry_path STRING,
          training_sheet_id STRING NOT NULL,
          training_sheet_name STRING,
          training_job_id STRING,
          training_run_id STRING,
          training_started_at TIMESTAMP,
          training_completed_at TIMESTAMP,
          training_duration_seconds INT,
          base_model STRING,
          training_params STRING COMMENT 'JSON parameters',
          final_loss DOUBLE,
          final_accuracy DOUBLE,
          training_metrics STRING COMMENT 'JSON metrics',
          training_examples_count INT,
          validation_examples_count INT,
          deployment_status STRING,
          deployed_at TIMESTAMP,
          deployed_by STRING,
          deployment_endpoint STRING,
          data_lineage STRING COMMENT 'JSON lineage',
          compliance_notes STRING,
          created_at TIMESTAMP NOT NULL,
          created_by STRING NOT NULL,
          updated_at TIMESTAMP NOT NULL,
          updated_by STRING NOT NULL
        ) COMMENT 'Model training lineage'
        TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true')
    ''',

    'example_store': '''
        CREATE TABLE IF NOT EXISTS home_stuart_gano.mirion_vital_workbench.example_store (
          id STRING NOT NULL,
          input STRING NOT NULL COMMENT 'JSON input',
          expected_output STRING NOT NULL COMMENT 'JSON output',
          search_keys ARRAY<STRING>,
          embedding_text STRING,
          embedding ARRAY<DOUBLE> COMMENT 'Vector embedding',
          function_name STRING,
          domain STRING,
          difficulty STRING,
          quality_score DOUBLE,
          is_verified BOOLEAN,
          verified_by STRING,
          verified_at TIMESTAMP,
          usage_count INT,
          last_used_at TIMESTAMP,
          effectiveness_score DOUBLE,
          source STRING,
          source_training_sheet_id STRING,
          source_canonical_label_id STRING,
          metadata STRING COMMENT 'JSON metadata',
          created_at TIMESTAMP NOT NULL,
          created_by STRING NOT NULL,
          updated_at TIMESTAMP NOT NULL,
          updated_by STRING NOT NULL
        ) COMMENT 'Few-shot examples (P1)'
        TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true')
    '''
}

print('🚀 Creating VITAL Platform Workbench tables...\n')

for table_name, ddl in tables.items():
    print(f'📄 Creating {table_name}...')
    try:
        result = w.statement_execution.execute_statement(
            statement=ddl,
            warehouse_id=warehouse_id
        )

        if result.status.state == 'SUCCEEDED':
            print(f'   ✅ Created successfully')
        else:
            print(f'   ❌ Failed: {result.status.state}')
            if result.status.error:
                msg = getattr(result.status.error, 'message', str(result.status.error))
                print(f'      {msg[:200]}')
    except Exception as e:
        print(f'   ❌ Exception: {str(e)[:200]}')

# Verify
print('\n' + '='*60)
print('🔍 Verifying tables...')
tables_list = list(w.tables.list('home_stuart_gano', 'mirion_vital_workbench'))
print(f'   ✅ Total tables: {len(tables_list)}')
for t in sorted(tables_list, key=lambda x: x.name):
    print(f'      - {t.name}')

print('\n🎉 Schema creation complete!')
print('\nNote: Simplified schema without:')
print('  - DEFAULT values (handle in application code)')
print('  - UNIQUE constraints (enforce in application layer)')
print('  - CREATE INDEX (Delta Lake uses automatic data skipping)')
