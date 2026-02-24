#!/usr/bin/env python3
"""Seed Ontos ML Workbench with realistic demo data.

Populates ~20 key tables with ~162 records covering Acme Instruments'
radiation safety use cases so every stage of the UI has meaningful data.

All inserts use MERGE INTO ... WHEN NOT MATCHED so re-running is safe.
All IDs use a 'demo-' prefix for easy cleanup with --reset.

Usage:
    python scripts/seed_demo_data.py --catalog my_catalog --schema ontos_ml_dev
    python scripts/seed_demo_data.py --catalog my_catalog --schema ontos_ml_dev --profile dev
    python scripts/seed_demo_data.py --catalog my_catalog --schema ontos_ml_dev --reset
    python scripts/seed_demo_data.py --catalog my_catalog --schema ontos_ml_dev --verify
"""

import argparse
import json
import logging
import sys
import time
from typing import Any, Dict, List, Optional

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementState

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class DemoSeeder:
    """Seeds demo data into Ontos ML Workbench Delta tables."""

    def __init__(
        self,
        catalog: str,
        schema: str,
        warehouse_id: Optional[str] = None,
        profile: Optional[str] = None,
    ):
        self.catalog = catalog
        self.schema = schema

        self.client = WorkspaceClient(profile=profile) if profile else WorkspaceClient()

        self.warehouse_id = warehouse_id
        if not self.warehouse_id:
            warehouses = list(self.client.warehouses.list())
            if warehouses:
                self.warehouse_id = warehouses[0].id
                logger.info(f"Using SQL warehouse: {warehouses[0].name} ({self.warehouse_id})")
            else:
                raise ValueError("No SQL warehouse found. Please provide --warehouse-id")

    def tbl(self, name: str) -> str:
        """Fully-qualified table reference."""
        return f"`{self.catalog}`.`{self.schema}`.`{name}`"

    def execute_sql(self, sql: str, description: str = "SQL") -> Dict[str, Any]:
        """Execute a SQL statement with polling (reuses setup_database.py pattern)."""
        logger.info(f"  Executing: {description}")
        logger.debug(f"  SQL: {sql[:200]}...")
        try:
            result = self.client.statement_execution.execute_statement(
                statement=sql, warehouse_id=self.warehouse_id
            )
            for _ in range(120):
                status = self.client.statement_execution.get_statement(result.statement_id)
                if status.status.state == StatementState.SUCCEEDED:
                    logger.info(f"  ✓ {description}")
                    return {
                        "status": "success",
                        "data": status.result.data_array if status.result else None,
                    }
                if status.status.state in (StatementState.FAILED, StatementState.CANCELED):
                    err = status.status.error.message if status.status.error else "Unknown"
                    logger.error(f"  ✗ {description}: {err}")
                    return {"status": "failed", "error": err}
                time.sleep(1)
            raise TimeoutError(f"Timeout: {description}")
        except Exception as e:
            logger.error(f"  ✗ {description}: {e}")
            return {"status": "error", "error": str(e)}

    # ------------------------------------------------------------------
    # Tier 1: Core ML Pipeline
    # ------------------------------------------------------------------

    def seed_domains_and_teams(self) -> None:
        """Seed data_domains (3) and teams (2)."""
        logger.info("── Tier 1a: Data Domains & Teams ──")

        self.execute_sql(f"""
MERGE INTO {self.tbl('data_domains')} AS t
USING (
  SELECT * FROM (VALUES
    ('demo-domain-qa', 'Quality Assurance',
     'PCB inspection, defect detection, and quality control processes',
     NULL, 'qa-lead@acme-instruments.com', 'shield', '#2563EB', true, 'demo_seed', 'demo_seed'),
    ('demo-domain-pm', 'Predictive Maintenance',
     'Equipment health monitoring, failure prediction, and maintenance scheduling',
     NULL, 'pm-lead@acme-instruments.com', 'activity', '#059669', true, 'demo_seed', 'demo_seed'),
    ('demo-domain-rc', 'Regulatory Compliance',
     'Radiation safety standards, ALARA compliance, and regulatory documentation',
     NULL, 'compliance@acme-instruments.com', 'file-check', '#7C3AED', true, 'demo_seed', 'demo_seed')
  ) AS v(id, name, description, parent_id, owner_email, icon, color, is_active, created_by, updated_by)
) AS s ON t.id = s.id
WHEN NOT MATCHED THEN INSERT (
  id, name, description, parent_id, owner_email, icon, color, is_active,
  created_at, created_by, updated_at, updated_by
) VALUES (
  s.id, s.name, s.description, s.parent_id, s.owner_email, s.icon, s.color, s.is_active,
  current_timestamp(), s.created_by, current_timestamp(), s.updated_by
)
""", "Seed data_domains (3)")

        self.execute_sql(f"""
MERGE INTO {self.tbl('teams')} AS t
USING (
  SELECT * FROM (VALUES
    ('demo-team-qa', 'QA Inspection Team',
     'PCB defect detection and quality assurance specialists',
     'demo-domain-qa',
     '{json.dumps(["alice@acme-instruments.com"])}',
     '{json.dumps({"shift": "day", "facility": "Building 7"})}',
     true, 'demo_seed', 'demo_seed'),
    ('demo-team-maint', 'Maintenance Analytics Team',
     'Predictive maintenance and equipment health monitoring engineers',
     'demo-domain-pm',
     '{json.dumps(["bob@acme-instruments.com"])}',
     '{json.dumps({"shift": "rotating", "facility": "Building 3"})}',
     true, 'demo_seed', 'demo_seed')
  ) AS v(id, name, description, domain_id, leads, metadata, is_active, created_by, updated_by)
) AS s ON t.id = s.id
WHEN NOT MATCHED THEN INSERT (
  id, name, description, domain_id, leads, metadata, is_active,
  created_at, created_by, updated_at, updated_by
) VALUES (
  s.id, s.name, s.description, s.domain_id, s.leads, s.metadata, s.is_active,
  current_timestamp(), s.created_by, current_timestamp(), s.updated_by
)
""", "Seed teams (2)")

    def seed_sheets(self) -> None:
        """Seed sheets (5) — the 5 Acme Instruments use cases."""
        logger.info("── Tier 1b: Sheets ──")

        self.execute_sql(f"""
MERGE INTO {self.tbl('sheets')} AS t
USING (
  SELECT * FROM (VALUES
    ('demo-sheet-pcb', 'PCB Defect Images',
     'High-resolution PCB board images for automated defect detection. Includes solder joint close-ups, component alignment views, and trace inspection imagery.',
     'uc_table', 'ontos_ml.source_data.pcb_images', 'image_id',
     ARRAY('defect_notes', 'inspection_comment'), ARRAY('image_path'),
     'active', 'demo_seed', 'demo_seed'),
    ('demo-sheet-telemetry', 'Equipment Telemetry',
     'Real-time sensor readings from radiation monitoring equipment. Covers temperature, pressure, vibration, and dose-rate measurements at 1-second intervals.',
     'uc_table', 'ontos_ml.source_data.equipment_telemetry', 'reading_id',
     ARRAY('sensor_notes', 'maintenance_log'), ARRAY(),
     'active', 'demo_seed', 'demo_seed'),
    ('demo-sheet-anomaly', 'Sensor Anomalies',
     'Time-series anomaly candidates flagged by threshold monitors. Each record includes a 60-second window of sensor data surrounding the anomaly event.',
     'uc_table', 'ontos_ml.source_data.sensor_anomalies', 'anomaly_id',
     ARRAY('anomaly_description', 'operator_notes'), ARRAY(),
     'active', 'demo_seed', 'demo_seed'),
    ('demo-sheet-cal', 'Calibration Records',
     'Monte Carlo simulation outputs for detector calibration. Contains energy spectra, efficiency curves, and uncertainty estimates from MCNP6 transport calculations.',
     'uc_volume', 'ontos_ml.volumes.calibration_records', 'record_id',
     ARRAY('simulation_params', 'calibration_notes'), ARRAY('spectrum_plot_path'),
     'active', 'demo_seed', 'demo_seed'),
    ('demo-sheet-compliance', 'Compliance Documents',
     'Regulatory filings, ALARA reports, and NRC correspondence. Scanned PDFs and structured forms requiring field extraction for compliance tracking.',
     'uc_volume', 'ontos_ml.volumes.compliance_docs', 'document_id',
     ARRAY('doc_title', 'filing_notes'), ARRAY('document_path'),
     'active', 'demo_seed', 'demo_seed')
  ) AS v(id, name, description, source_type, source_table, item_id_column,
         text_columns, image_columns, status, created_by, updated_by)
) AS s ON t.id = s.id
WHEN NOT MATCHED THEN INSERT (
  id, name, description, source_type, source_table, item_id_column,
  text_columns, image_columns, status,
  created_at, created_by, updated_at, updated_by
) VALUES (
  s.id, s.name, s.description, s.source_type, s.source_table, s.item_id_column,
  s.text_columns, s.image_columns, s.status,
  current_timestamp(), s.created_by, current_timestamp(), s.updated_by
)
""", "Seed sheets (5)")

    def seed_templates(self) -> None:
        """Seed templates (5) — one per use case.

        Table columns: id, name, description, system_prompt, user_prompt_template,
        output_schema, label_type, feature_columns, target_column, few_shot_examples,
        domain_id, version (STRING), parent_template_id, status,
        created_at, created_by, updated_at, updated_by
        """
        logger.info("── Tier 1c: Templates ──")

        # (id, name, desc, system_prompt, user_prompt_template, output_schema,
        #  label_type, feature_columns, target_column, domain_id, version, status)
        templates = [
            ("demo-tpl-defect", "PCB Defect Classifier",
             "Classifies PCB defects into categories based on visual inspection imagery and technician notes. Trained on 60+ years of Acme Instruments QA expertise.",
             "You are a senior PCB quality inspector at Acme Instruments with expertise in radiation-hardened electronics. Classify defects precisely using IPC-A-610 standards. Always justify your classification with observed evidence.",
             "Inspect the following PCB image and technician notes. Classify the defect type and severity.\\n\\nImage: {{image_path}}\\nTechnician Notes: {{defect_notes}}\\nInspection Comment: {{inspection_comment}}\\n\\nRespond with JSON: {\"defect_type\": \"short|open|misalignment|contamination|none\", \"severity\": \"critical|major|minor|cosmetic\", \"confidence\": 0.0-1.0, \"evidence\": \"description of observed indicators\"}",
             '{"type":"object","properties":{"defect_type":{"type":"string"},"severity":{"type":"string"},"confidence":{"type":"number"},"evidence":{"type":"string"}}}',
             "pcb_defect_type", "image_path,defect_notes,inspection_comment", "defect_type",
             "demo-domain-qa", "1.0", "active"),
            ("demo-tpl-failure", "Equipment Failure Predictor",
             "Predicts equipment failure probability from sensor telemetry patterns. Uses domain knowledge of radiation monitoring equipment degradation signatures.",
             "You are a predictive maintenance engineer specializing in radiation monitoring equipment at Acme Instruments. Analyze sensor telemetry to predict failures before they occur. Consider thermal cycling stress, vibration fatigue, and radiation-induced degradation.",
             "Analyze the following equipment telemetry data and predict failure risk.\\n\\nSensor Notes: {{sensor_notes}}\\nMaintenance Log: {{maintenance_log}}\\n\\nRespond with JSON: {\"failure_probability\": 0.0-1.0, \"failure_mode\": \"thermal|vibration|radiation_damage|wear|electrical\", \"time_to_failure_hours\": number, \"recommended_action\": \"description\"}",
             '{"type":"object","properties":{"failure_probability":{"type":"number"},"failure_mode":{"type":"string"},"time_to_failure_hours":{"type":"number"},"recommended_action":{"type":"string"}}}',
             "failure_prediction", "sensor_notes,maintenance_log", "failure_probability",
             "demo-domain-pm", "1.0", "active"),
            ("demo-tpl-anomaly", "Sensor Anomaly Detector",
             "Classifies sensor anomaly events into root-cause categories. Distinguishes genuine radiation events from equipment artifacts and environmental noise.",
             "You are a radiation safety physicist at Acme Instruments. Analyze sensor anomaly events to determine root cause. Distinguish between genuine radiation events, equipment malfunctions, and environmental interference. Follow ANSI N42.17A standards for spectral analysis.",
             "Classify the following sensor anomaly event.\\n\\nAnomaly Description: {{anomaly_description}}\\nOperator Notes: {{operator_notes}}\\n\\nRespond with JSON: {\"anomaly_class\": \"radiation_event|equipment_fault|environmental|calibration_drift|false_positive\", \"confidence\": 0.0-1.0, \"severity\": \"critical|elevated|routine|negligible\", \"reasoning\": \"explanation referencing spectral or temporal patterns\"}",
             '{"type":"object","properties":{"anomaly_class":{"type":"string"},"confidence":{"type":"number"},"severity":{"type":"string"},"reasoning":{"type":"string"}}}',
             "anomaly_classification", "anomaly_description,operator_notes", "anomaly_class",
             "demo-domain-qa", "1.0", "active"),
            ("demo-tpl-calibration", "Calibration Advisor",
             "Recommends calibration adjustments based on Monte Carlo simulation results and efficiency measurements. Ensures detector response stays within NRC-specified tolerances.",
             "You are a health physics calibration specialist at Acme Instruments. Analyze Monte Carlo simulation outputs and recommend calibration adjustments. Ensure compliance with ANSI N323AB and 10 CFR 20 dose limits. Apply ALARA principles in all recommendations.",
             "Review the following calibration data and recommend adjustments.\\n\\nSimulation Parameters: {{simulation_params}}\\nCalibration Notes: {{calibration_notes}}\\nSpectrum Plot: {{spectrum_plot_path}}\\n\\nRespond with JSON: {\"adjustment_needed\": true|false, \"correction_factor\": number, \"energy_range_keV\": [min, max], \"recommendation\": \"description\", \"regulatory_reference\": \"applicable standard\"}",
             '{"type":"object","properties":{"adjustment_needed":{"type":"boolean"},"correction_factor":{"type":"number"},"energy_range_keV":{"type":"array"},"recommendation":{"type":"string"},"regulatory_reference":{"type":"string"}}}',
             "calibration_recommendation", "simulation_params,calibration_notes,spectrum_plot_path", "correction_factor",
             "demo-domain-rc", "1.0", "active"),
            ("demo-tpl-compliance", "Compliance Document Extractor",
             "Extracts structured data from regulatory compliance documents including ALARA reports, NRC filings, and radiation safety plans.",
             "You are a regulatory compliance analyst at Acme Instruments specializing in NRC documentation. Extract structured data from compliance documents with high precision. Flag any fields that may require manual verification.",
             "Extract structured information from the following compliance document.\\n\\nDocument Title: {{doc_title}}\\nFiling Notes: {{filing_notes}}\\nDocument: {{document_path}}\\n\\nRespond with JSON: {\"document_type\": \"ALARA_report|NRC_filing|safety_plan|inspection_report|license_amendment\", \"key_fields\": {}, \"compliance_status\": \"compliant|deficient|pending_review\", \"action_items\": [], \"confidence\": 0.0-1.0}",
             '{"type":"object","properties":{"document_type":{"type":"string"},"key_fields":{"type":"object"},"compliance_status":{"type":"string"},"action_items":{"type":"array"},"confidence":{"type":"number"}}}',
             "compliance_extraction", "doc_title,filing_notes,document_path", "document_type",
             "demo-domain-rc", "1.0", "active"),
        ]

        values_rows = []
        for t in templates:
            escaped = tuple(v.replace("'", "''") if isinstance(v, str) else v for v in t)
            fc = escaped[7].split(",")
            fc_arr = "ARRAY(" + ",".join(f"'{c}'" for c in fc) + ")"
            values_rows.append(
                f"('{escaped[0]}', '{escaped[1]}', '{escaped[2]}', "
                f"'{escaped[3]}', '{escaped[4]}', '{escaped[5]}', "
                f"'{escaped[6]}', {fc_arr}, '{escaped[8]}', "
                f"'{escaped[9]}', '{escaped[10]}', '{escaped[11]}', 'demo_seed', 'demo_seed')"
            )

        values_sql = ",\n    ".join(values_rows)

        self.execute_sql(f"""
MERGE INTO {self.tbl('templates')} AS t
USING (
  SELECT * FROM (VALUES
    {values_sql}
  ) AS v(id, name, description, system_prompt, user_prompt_template, output_schema,
         label_type, feature_columns, target_column,
         domain_id, version, status, created_by, updated_by)
) AS s ON t.id = s.id
WHEN NOT MATCHED THEN INSERT (
  id, name, description, system_prompt, user_prompt_template, output_schema,
  label_type, feature_columns, target_column,
  domain_id, version, status,
  created_at, created_by, updated_at, updated_by
) VALUES (
  s.id, s.name, s.description, s.system_prompt, s.user_prompt_template, s.output_schema,
  s.label_type, s.feature_columns, s.target_column,
  s.domain_id, s.version, s.status,
  current_timestamp(), s.created_by, current_timestamp(), s.updated_by
)
""", "Seed templates (5)")

    def seed_canonical_labels(self) -> None:
        """Seed canonical_labels (20) — 4 per sheet."""
        logger.info("── Tier 1d: Canonical Labels ──")

        labels = [
            # PCB Defect labels (4)
            ("demo-lbl-pcb-01", "demo-sheet-pcb", "pcb_img_00101", "pcb_defect_type",
             '{"defect_type":"short","severity":"critical","evidence":"Solder bridge between pins 14-15 on U3"}',
             "standalone_tool", 0.97),
            ("demo-lbl-pcb-02", "demo-sheet-pcb", "pcb_img_00102", "pcb_defect_type",
             '{"defect_type":"open","severity":"major","evidence":"Incomplete solder joint on C12 pad"}',
             "standalone_tool", 0.93),
            ("demo-lbl-pcb-03", "demo-sheet-pcb", "pcb_img_00103", "pcb_defect_type",
             '{"defect_type":"misalignment","severity":"minor","evidence":"R7 rotated 15 degrees from footprint"}',
             "standalone_tool", 0.89),
            ("demo-lbl-pcb-04", "demo-sheet-pcb", "pcb_img_00104", "pcb_defect_type",
             '{"defect_type":"contamination","severity":"major","evidence":"Flux residue across J2 connector pins"}',
             "standalone_tool", 0.91),
            # Equipment Telemetry labels (4)
            ("demo-lbl-tel-01", "demo-sheet-telemetry", "reading_50201", "failure_prediction",
             '{"failure_probability":0.85,"failure_mode":"thermal","time_to_failure_hours":72}',
             "standalone_tool", 0.88),
            ("demo-lbl-tel-02", "demo-sheet-telemetry", "reading_50202", "failure_prediction",
             '{"failure_probability":0.12,"failure_mode":"wear","time_to_failure_hours":2400}',
             "standalone_tool", 0.92),
            ("demo-lbl-tel-03", "demo-sheet-telemetry", "reading_50203", "failure_prediction",
             '{"failure_probability":0.67,"failure_mode":"vibration","time_to_failure_hours":168}',
             "standalone_tool", 0.85),
            ("demo-lbl-tel-04", "demo-sheet-telemetry", "reading_50204", "failure_prediction",
             '{"failure_probability":0.03,"failure_mode":"electrical","time_to_failure_hours":8760}',
             "standalone_tool", 0.95),
            # Sensor Anomaly labels (4)
            ("demo-lbl-ano-01", "demo-sheet-anomaly", "anomaly_30001", "anomaly_classification",
             '{"anomaly_class":"radiation_event","severity":"elevated","reasoning":"Coincident gamma peak at 662 keV (Cs-137 signature)"}',
             "standalone_tool", 0.94),
            ("demo-lbl-ano-02", "demo-sheet-anomaly", "anomaly_30002", "anomaly_classification",
             '{"anomaly_class":"equipment_fault","severity":"routine","reasoning":"Periodic noise at 60 Hz indicates grounding issue"}',
             "standalone_tool", 0.91),
            ("demo-lbl-ano-03", "demo-sheet-anomaly", "anomaly_30003", "anomaly_classification",
             '{"anomaly_class":"environmental","severity":"negligible","reasoning":"Radon washout event correlated with precipitation"}',
             "standalone_tool", 0.87),
            ("demo-lbl-ano-04", "demo-sheet-anomaly", "anomaly_30004", "anomaly_classification",
             '{"anomaly_class":"false_positive","severity":"negligible","reasoning":"Single-channel spike, no corroborating detector response"}',
             "standalone_tool", 0.96),
            # Calibration labels (4)
            ("demo-lbl-cal-01", "demo-sheet-cal", "cal_rec_001", "calibration_recommendation",
             '{"adjustment_needed":true,"correction_factor":1.023,"energy_range_keV":[50,3000],"recommendation":"Apply +2.3% gain correction"}',
             "standalone_tool", 0.90),
            ("demo-lbl-cal-02", "demo-sheet-cal", "cal_rec_002", "calibration_recommendation",
             '{"adjustment_needed":false,"correction_factor":1.001,"energy_range_keV":[100,1500],"recommendation":"Within tolerance, no action needed"}',
             "standalone_tool", 0.95),
            ("demo-lbl-cal-03", "demo-sheet-cal", "cal_rec_003", "calibration_recommendation",
             '{"adjustment_needed":true,"correction_factor":0.971,"energy_range_keV":[30,200],"recommendation":"Low-energy efficiency degraded; replace entrance window"}',
             "standalone_tool", 0.82),
            ("demo-lbl-cal-04", "demo-sheet-cal", "cal_rec_004", "calibration_recommendation",
             '{"adjustment_needed":true,"correction_factor":1.045,"energy_range_keV":[1000,5000],"recommendation":"High-energy gain shift; recalibrate with Co-60 source"}',
             "standalone_tool", 0.88),
            # Compliance labels (4)
            ("demo-lbl-comp-01", "demo-sheet-compliance", "doc_70001", "compliance_extraction",
             '{"document_type":"ALARA_report","compliance_status":"compliant","key_fields":{"report_period":"Q3-2025","total_dose_mSv":0.42}}',
             "standalone_tool", 0.93),
            ("demo-lbl-comp-02", "demo-sheet-compliance", "doc_70002", "compliance_extraction",
             '{"document_type":"NRC_filing","compliance_status":"pending_review","key_fields":{"filing_number":"NRC-2025-0147","license":"SNM-1234"}}',
             "standalone_tool", 0.88),
            ("demo-lbl-comp-03", "demo-sheet-compliance", "doc_70003", "compliance_extraction",
             '{"document_type":"inspection_report","compliance_status":"deficient","key_fields":{"finding":"Area monitor calibration overdue by 15 days"}}',
             "standalone_tool", 0.91),
            ("demo-lbl-comp-04", "demo-sheet-compliance", "doc_70004", "compliance_extraction",
             '{"document_type":"safety_plan","compliance_status":"compliant","key_fields":{"plan_version":"4.2","effective_date":"2025-01-15"}}',
             "standalone_tool", 0.90),
        ]

        values_rows = []
        for lbl in labels:
            ld = lbl[4].replace("'", "''")
            values_rows.append(
                f"('{lbl[0]}', '{lbl[1]}', '{lbl[2]}', '{lbl[3]}', "
                f"'{ld}', '{lbl[5]}', {lbl[6]}, 1, 'demo_seed', 'demo_seed')"
            )
        values_sql = ",\n    ".join(values_rows)

        self.execute_sql(f"""
MERGE INTO {self.tbl('canonical_labels')} AS t
USING (
  SELECT * FROM (VALUES
    {values_sql}
  ) AS v(id, sheet_id, item_ref, label_type, label_data, labeling_mode,
         label_confidence, version, created_by, updated_by)
) AS s ON t.id = s.id
WHEN NOT MATCHED THEN INSERT (
  id, sheet_id, item_ref, label_type, label_data, labeling_mode,
  label_confidence, version,
  created_at, created_by, updated_at, updated_by
) VALUES (
  s.id, s.sheet_id, s.item_ref, s.label_type, s.label_data, s.labeling_mode,
  s.label_confidence, s.version,
  current_timestamp(), s.created_by, current_timestamp(), s.updated_by
)
""", "Seed canonical_labels (20)")

    def seed_training_sheets(self) -> None:
        """Seed training_sheets (5) — one per sheet+template pair."""
        logger.info("── Tier 1e: Training Sheets ──")

        self.execute_sql(f"""
MERGE INTO {self.tbl('training_sheets')} AS t
USING (
  SELECT * FROM (VALUES
    ('demo-ts-pcb', 'PCB Defects - Training Set v1',
     'Initial defect classification training set from Building 7 QA imagery',
     'demo-sheet-pcb', 'demo-tpl-defect', 1,
     'ai_generated', 'databricks-meta-llama-3-1-70b-instruct',
     'approved', 200, 192, 168, 24, 'demo_seed', 'demo_seed'),
    ('demo-ts-telemetry', 'Equipment Failure Predictions v1',
     'Predictive maintenance training set from 6 months of sensor telemetry',
     'demo-sheet-telemetry', 'demo-tpl-failure', 1,
     'ai_generated', 'databricks-meta-llama-3-1-70b-instruct',
     'review', 150, 145, 89, 12, 'demo_seed', 'demo_seed'),
    ('demo-ts-anomaly', 'Sensor Anomaly Classification v1',
     'Anomaly detection training data from environmental monitoring network',
     'demo-sheet-anomaly', 'demo-tpl-anomaly', 1,
     'ai_generated', 'databricks-meta-llama-3-1-70b-instruct',
     'approved', 180, 175, 160, 35, 'demo_seed', 'demo_seed'),
    ('demo-ts-cal', 'Calibration Recommendations v1',
     'Calibration advisor training from 3 years of MCNP6 simulation results',
     'demo-sheet-cal', 'demo-tpl-calibration', 1,
     'ai_generated', 'databricks-meta-llama-3-1-70b-instruct',
     'exported', 120, 118, 115, 42, 'demo_seed', 'demo_seed'),
    ('demo-ts-compliance', 'Compliance Extraction v1',
     'Document extraction training from NRC filings and ALARA quarterly reports',
     'demo-sheet-compliance', 'demo-tpl-compliance', 1,
     'ai_generated', 'databricks-meta-llama-3-1-70b-instruct',
     'review', 100, 88, 52, 8, 'demo_seed', 'demo_seed')
  ) AS v(id, name, description, sheet_id, template_id, template_version,
         generation_mode, model_used, status, total_items, generated_count,
         approved_count, auto_approved_count, created_by, updated_by)
) AS s ON t.id = s.id
WHEN NOT MATCHED THEN INSERT (
  id, name, description, sheet_id, template_id, template_version,
  generation_mode, model_used, status, total_items, generated_count,
  approved_count, auto_approved_count,
  created_at, created_by, updated_at, updated_by
) VALUES (
  s.id, s.name, s.description, s.sheet_id, s.template_id, s.template_version,
  s.generation_mode, s.model_used, s.status, s.total_items, s.generated_count,
  s.approved_count, s.auto_approved_count,
  current_timestamp(), s.created_by, current_timestamp(), s.updated_by
)
""", "Seed training_sheets (5)")

    def seed_qa_pairs(self) -> None:
        """Seed qa_pairs (40) — 8 per training sheet."""
        logger.info("── Tier 1f: QA Pairs ──")

        # Build all 40 QA pairs
        qa_pairs = []

        # --- PCB Defects (8 pairs) ---
        pcb_items = [
            ("pcb_img_00101", "demo-lbl-pcb-01", True, "approved",
             "Solder bridge between pins 14-15 on U3 IC package",
             '{"defect_type":"short","severity":"critical","confidence":0.97,"evidence":"Solder bridge between pins 14-15 on U3"}'),
            ("pcb_img_00102", "demo-lbl-pcb-02", True, "approved",
             "Incomplete solder joint visible on C12 capacitor pad",
             '{"defect_type":"open","severity":"major","confidence":0.93,"evidence":"Incomplete solder joint on C12 pad"}'),
            ("pcb_img_00103", "demo-lbl-pcb-03", True, "approved",
             "Resistor R7 appears rotated approximately 15 degrees",
             '{"defect_type":"misalignment","severity":"minor","confidence":0.89,"evidence":"R7 rotated 15 degrees from footprint"}'),
            ("pcb_img_00104", "demo-lbl-pcb-04", True, "approved",
             "White residue across J2 connector area",
             '{"defect_type":"contamination","severity":"major","confidence":0.91,"evidence":"Flux residue across J2 connector pins"}'),
            ("pcb_img_00105", None, False, "approved",
             "Hairline crack visible in solder on Q1 drain pin",
             '{"defect_type":"open","severity":"critical","confidence":0.86,"evidence":"Thermal fatigue crack on Q1 drain solder joint"}'),
            ("pcb_img_00106", None, False, "pending",
             "Slight offset on U7 BGA package, possible head-in-pillow",
             '{"defect_type":"misalignment","severity":"major","confidence":0.74,"evidence":"BGA ball deformation pattern suggests head-in-pillow defect"}'),
            ("pcb_img_00107", None, False, "pending",
             "Dark spot near via between layers 2 and 3",
             '{"defect_type":"contamination","severity":"minor","confidence":0.68,"evidence":"Possible moisture ingress near via, requires cross-section"}'),
            ("pcb_img_00108", None, False, "rejected",
             "Board looks clean, no visible defects on this section",
             '{"defect_type":"none","severity":"cosmetic","confidence":0.45,"evidence":"Minor discoloration but within IPC-A-610 Class 2 limits"}'),
        ]
        for i, (item, lbl, auto, status, user_note, assistant_resp) in enumerate(pcb_items):
            qa_pairs.append(self._make_qa(
                f"demo-qa-pcb-{i+1:02d}", "demo-ts-pcb", "demo-sheet-pcb", item,
                "You are a senior PCB quality inspector at Acme Instruments.",
                f"Inspect the following PCB image and notes.\\n\\nImage: /Volumes/ontos_ml/images/{item}.jpg\\nNotes: {user_note}",
                assistant_resp, lbl, auto, status, i + 1,
            ))

        # --- Equipment Telemetry (8 pairs) ---
        tel_items = [
            ("reading_50201", "demo-lbl-tel-01", True, "approved",
             "Temperature sensor T-14 reading 89C, 12C above baseline. Vibration sensor V-14 shows 2.3g peak",
             '{"failure_probability":0.85,"failure_mode":"thermal","time_to_failure_hours":72,"recommended_action":"Schedule immediate inspection of cooling system"}'),
            ("reading_50202", "demo-lbl-tel-02", True, "approved",
             "All sensors nominal. Bearing wear indicator at 0.15mm, within tolerance",
             '{"failure_probability":0.12,"failure_mode":"wear","time_to_failure_hours":2400,"recommended_action":"Schedule bearing replacement at next planned outage"}'),
            ("reading_50203", "demo-lbl-tel-03", True, "approved",
             "Vibration amplitude increased 340% in axial direction over 48 hours",
             '{"failure_probability":0.67,"failure_mode":"vibration","time_to_failure_hours":168,"recommended_action":"Check rotor balance and bearing condition within 7 days"}'),
            ("reading_50204", "demo-lbl-tel-04", True, "approved",
             "Power supply voltage stable at 24.01V, current draw 2.3A nominal",
             '{"failure_probability":0.03,"failure_mode":"electrical","time_to_failure_hours":8760,"recommended_action":"No action needed, continue routine monitoring"}'),
            ("reading_50205", None, False, "approved",
             "Intermittent pressure fluctuations detected, +/- 8 PSI swings every 45 seconds",
             '{"failure_probability":0.55,"failure_mode":"wear","time_to_failure_hours":336,"recommended_action":"Check pressure relief valve and pump seals"}'),
            ("reading_50206", None, False, "pending",
             "Humidity sensor H-7 reading 92% RH in normally dry zone",
             '{"failure_probability":0.42,"failure_mode":"environmental","time_to_failure_hours":720,"recommended_action":"Investigate water ingress, check HVAC and seals"}'),
            ("reading_50207", None, False, "pending",
             "Motor current draw increased from 5.2A to 6.8A over 30 days",
             '{"failure_probability":0.71,"failure_mode":"electrical","time_to_failure_hours":240,"recommended_action":"Check motor windings and mechanical load, possible bearing failure"}'),
            ("reading_50208", None, False, "rejected",
             "Brief 0.5-second voltage dip to 23.2V during grid switching event",
             '{"failure_probability":0.01,"failure_mode":"electrical","time_to_failure_hours":87600,"recommended_action":"Known grid event, no equipment issue"}'),
        ]
        for i, (item, lbl, auto, status, user_note, assistant_resp) in enumerate(tel_items):
            qa_pairs.append(self._make_qa(
                f"demo-qa-tel-{i+1:02d}", "demo-ts-telemetry", "demo-sheet-telemetry", item,
                "You are a predictive maintenance engineer at Acme Instruments.",
                f"Analyze the following telemetry data.\\n\\nSensor Notes: {user_note}",
                assistant_resp, lbl, auto, status, i + 1,
            ))

        # --- Sensor Anomaly (8 pairs) ---
        ano_items = [
            ("anomaly_30001", "demo-lbl-ano-01", True, "approved",
             "Sharp count-rate spike at 14:32:07, peak 4200 cps, baseline 120 cps. Duration 3.2 seconds",
             '{"anomaly_class":"radiation_event","severity":"elevated","confidence":0.94,"reasoning":"Coincident gamma peak at 662 keV (Cs-137 signature)"}'),
            ("anomaly_30002", "demo-lbl-ano-02", True, "approved",
             "Periodic oscillation at 60 Hz detected on channel 3, amplitude modulated",
             '{"anomaly_class":"equipment_fault","severity":"routine","confidence":0.91,"reasoning":"Periodic noise at 60 Hz indicates grounding issue"}'),
            ("anomaly_30003", "demo-lbl-ano-03", True, "approved",
             "Gradual count-rate increase from 85 to 210 cps over 4 hours during rainstorm",
             '{"anomaly_class":"environmental","severity":"negligible","confidence":0.87,"reasoning":"Radon washout event correlated with precipitation"}'),
            ("anomaly_30004", "demo-lbl-ano-04", True, "approved",
             "Single 12000 cps spike on channel 7 only, no corroboration from adjacent detectors",
             '{"anomaly_class":"false_positive","severity":"negligible","confidence":0.96,"reasoning":"Single-channel spike, no corroborating detector response"}'),
            ("anomaly_30005", None, False, "approved",
             "Simultaneous 3x baseline increase on all detectors in Zone B, duration 12 minutes",
             '{"anomaly_class":"radiation_event","severity":"critical","confidence":0.98,"reasoning":"Multi-detector coincidence rules out equipment fault"}'),
            ("anomaly_30006", None, False, "pending",
             "Slow drift upward on detector D-12, +5% per week for 3 weeks",
             '{"anomaly_class":"calibration_drift","severity":"routine","confidence":0.82,"reasoning":"Linear gain drift pattern consistent with PMT aging"}'),
            ("anomaly_30007", None, False, "pending",
             "Intermittent dead-time corrections exceeding 15% on high-rate channel",
             '{"anomaly_class":"equipment_fault","severity":"elevated","confidence":0.79,"reasoning":"Dead-time saturation suggests ADC timing issue"}'),
            ("anomaly_30008", None, False, "rejected",
             "Background level within 2-sigma of historical mean, operator flagged by mistake",
             '{"anomaly_class":"false_positive","severity":"negligible","confidence":0.38,"reasoning":"All readings within normal statistical variation"}'),
        ]
        for i, (item, lbl, auto, status, user_note, assistant_resp) in enumerate(ano_items):
            qa_pairs.append(self._make_qa(
                f"demo-qa-ano-{i+1:02d}", "demo-ts-anomaly", "demo-sheet-anomaly", item,
                "You are a radiation safety physicist at Acme Instruments.",
                f"Classify the following sensor anomaly.\\n\\nAnomaly Description: {user_note}",
                assistant_resp, lbl, auto, status, i + 1,
            ))

        # --- Calibration (8 pairs) ---
        cal_items = [
            ("cal_rec_001", "demo-lbl-cal-01", True, "approved",
             "MCNP6 run #4521: Efficiency at 122 keV measured 2.3% below simulated",
             '{"adjustment_needed":true,"correction_factor":1.023,"energy_range_keV":[50,3000],"recommendation":"Apply +2.3% gain correction","regulatory_reference":"ANSI N323AB"}'),
            ("cal_rec_002", "demo-lbl-cal-02", True, "approved",
             "Annual calibration check: all points within 0.1% of reference standard",
             '{"adjustment_needed":false,"correction_factor":1.001,"energy_range_keV":[100,1500],"recommendation":"Within tolerance, no action needed","regulatory_reference":"10 CFR 20"}'),
            ("cal_rec_003", "demo-lbl-cal-03", True, "approved",
             "Low-energy efficiency dropped 3.1% compared to last calibration. Window may be degraded",
             '{"adjustment_needed":true,"correction_factor":0.971,"energy_range_keV":[30,200],"recommendation":"Low-energy efficiency degraded; replace entrance window","regulatory_reference":"ANSI N42.17A"}'),
            ("cal_rec_004", "demo-lbl-cal-04", True, "approved",
             "High-energy gain shifted +4.5% after 18 months of operation",
             '{"adjustment_needed":true,"correction_factor":1.045,"energy_range_keV":[1000,5000],"recommendation":"Recalibrate with Co-60 source","regulatory_reference":"ANSI N323AB"}'),
            ("cal_rec_005", None, False, "approved",
             "Background subtraction verification: measured 18.2 cps vs expected 18.5 cps",
             '{"adjustment_needed":false,"correction_factor":0.998,"energy_range_keV":[50,3000],"recommendation":"Background within statistical uncertainty","regulatory_reference":"ANSI N42.17A"}'),
            ("cal_rec_006", None, False, "pending",
             "Temperature coefficient test: 0.02%/C gain drift measured at 35C ambient",
             '{"adjustment_needed":true,"correction_factor":1.008,"energy_range_keV":[100,2000],"recommendation":"Apply temperature compensation in firmware","regulatory_reference":"IEC 62706"}'),
            ("cal_rec_007", None, False, "pending",
             "Linearity check at high count rates shows 1.8% deviation above 50000 cps",
             '{"adjustment_needed":true,"correction_factor":1.018,"energy_range_keV":[200,1500],"recommendation":"Update dead-time correction coefficient","regulatory_reference":"ANSI N42.17A"}'),
            ("cal_rec_008", None, False, "rejected",
             "Duplicate of cal_rec_001, entered in error during shift change",
             '{"adjustment_needed":false,"correction_factor":1.0,"energy_range_keV":[0,0],"recommendation":"Duplicate entry, discard","regulatory_reference":"N/A"}'),
        ]
        for i, (item, lbl, auto, status, user_note, assistant_resp) in enumerate(cal_items):
            qa_pairs.append(self._make_qa(
                f"demo-qa-cal-{i+1:02d}", "demo-ts-cal", "demo-sheet-cal", item,
                "You are a health physics calibration specialist at Acme Instruments.",
                f"Review the following calibration data.\\n\\nCalibration Notes: {user_note}",
                assistant_resp, lbl, auto, status, i + 1,
            ))

        # --- Compliance (8 pairs) ---
        comp_items = [
            ("doc_70001", "demo-lbl-comp-01", True, "approved",
             "Q3 2025 ALARA Report, Facility License SNM-1234",
             '{"document_type":"ALARA_report","compliance_status":"compliant","key_fields":{"report_period":"Q3-2025","total_dose_mSv":0.42,"max_individual_mSv":0.18},"action_items":[],"confidence":0.93}'),
            ("doc_70002", "demo-lbl-comp-02", True, "approved",
             "License Amendment Request for new calibration facility wing",
             '{"document_type":"NRC_filing","compliance_status":"pending_review","key_fields":{"filing_number":"NRC-2025-0147","license":"SNM-1234","amendment_type":"facility_modification"},"action_items":["Await NRC reviewer assignment"],"confidence":0.88}'),
            ("doc_70003", "demo-lbl-comp-03", True, "approved",
             "Annual NRC inspection report, Building 7 radiological controls",
             '{"document_type":"inspection_report","compliance_status":"deficient","key_fields":{"finding":"Area monitor calibration overdue by 15 days","severity":"minor"},"action_items":["Complete calibration by Oct 15","Submit corrective action report"],"confidence":0.91}'),
            ("doc_70004", "demo-lbl-comp-04", True, "approved",
             "Radiation Safety Plan v4.2 — updated emergency procedures",
             '{"document_type":"safety_plan","compliance_status":"compliant","key_fields":{"plan_version":"4.2","effective_date":"2025-01-15","next_review":"2026-01-15"},"action_items":[],"confidence":0.90}'),
            ("doc_70005", None, False, "approved",
             "Waste disposal manifest WM-2025-089, low-level radioactive waste shipment",
             '{"document_type":"NRC_filing","compliance_status":"compliant","key_fields":{"manifest_number":"WM-2025-089","waste_class":"A","volume_ft3":12.5},"action_items":[],"confidence":0.92}'),
            ("doc_70006", None, False, "pending",
             "Personnel dosimetry quarterly report, 47 monitored workers",
             '{"document_type":"ALARA_report","compliance_status":"compliant","key_fields":{"quarter":"Q2-2025","workers_monitored":47,"max_dose_mSv":1.2},"action_items":["Review elevated dose for worker #23"],"confidence":0.85}'),
            ("doc_70007", None, False, "pending",
             "Decommissioning cost estimate update for legacy hot cells",
             '{"document_type":"NRC_filing","compliance_status":"pending_review","key_fields":{"estimate_total":"$4.2M","timeline_years":3},"action_items":["Update financial assurance letter"],"confidence":0.72}'),
            ("doc_70008", None, False, "rejected",
             "Draft memo, not a regulatory document. Filed incorrectly",
             '{"document_type":"ALARA_report","compliance_status":"compliant","key_fields":{},"action_items":[],"confidence":0.31}'),
        ]
        for i, (item, lbl, auto, status, user_note, assistant_resp) in enumerate(comp_items):
            qa_pairs.append(self._make_qa(
                f"demo-qa-comp-{i+1:02d}", "demo-ts-compliance", "demo-sheet-compliance", item,
                "You are a regulatory compliance analyst at Acme Instruments.",
                f"Extract information from the following compliance document.\\n\\nDocument Title: {user_note}",
                assistant_resp, lbl, auto, status, i + 1,
            ))

        # Execute in batches of 10 to stay under SQL size limits
        batch_size = 10
        for batch_start in range(0, len(qa_pairs), batch_size):
            batch = qa_pairs[batch_start:batch_start + batch_size]
            values_sql = ",\n    ".join(batch)
            batch_num = batch_start // batch_size + 1
            self.execute_sql(f"""
MERGE INTO {self.tbl('qa_pairs')} AS t
USING (
  SELECT * FROM (VALUES
    {values_sql}
  ) AS v(id, training_sheet_id, sheet_id, item_ref, messages,
         canonical_label_id, was_auto_approved, review_status,
         sequence_number, created_by, updated_by)
) AS s ON t.id = s.id
WHEN NOT MATCHED THEN INSERT (
  id, training_sheet_id, sheet_id, item_ref, messages,
  canonical_label_id, was_auto_approved, review_status,
  sequence_number,
  created_at, created_by, updated_at, updated_by
) VALUES (
  s.id, s.training_sheet_id, s.sheet_id, s.item_ref, s.messages,
  s.canonical_label_id, s.was_auto_approved, s.review_status,
  s.sequence_number,
  current_timestamp(), s.created_by, current_timestamp(), s.updated_by
)
""", f"Seed qa_pairs batch {batch_num} ({len(batch)} rows)")

    def _make_qa(
        self, qa_id: str, ts_id: str, sheet_id: str, item_ref: str,
        system_msg: str, user_msg: str, assistant_msg: str,
        label_id: Optional[str], auto_approved: bool, review_status: str, seq: int,
    ) -> str:
        """Build a VALUES row for a qa_pair."""
        messages = json.dumps([
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg},
            {"role": "assistant", "content": assistant_msg},
        ]).replace("'", "''")

        label_sql = f"'{label_id}'" if label_id else "NULL"
        return (
            f"('{qa_id}', '{ts_id}', '{sheet_id}', '{item_ref}', "
            f"'{messages}', {label_sql}, {str(auto_approved).lower()}, "
            f"'{review_status}', {seq}, 'demo_seed', 'demo_seed')"
        )

    # ------------------------------------------------------------------
    # Tier 2: Model Lifecycle
    # ------------------------------------------------------------------

    def seed_models_and_lineage(self) -> None:
        """Seed model_training_lineage (3)."""
        logger.info("── Tier 2a: Model Training Lineage ──")

        self.execute_sql(f"""
MERGE INTO {self.tbl('model_training_lineage')} AS t
USING (
  SELECT * FROM (VALUES
    ('demo-lineage-pcb', 'pcb_defect_classifier_v1', '1.0.0',
     'demo-ts-pcb', 'PCB Defects - Training Set v1',
     'databricks-meta-llama-3-1-70b-instruct', 168,
     'deployed', 'demo_seed', 'demo_seed'),
    ('demo-lineage-failure', 'equipment_failure_predictor_v1', '1.0.0',
     'demo-ts-telemetry', 'Equipment Failure Predictions v1',
     'databricks-meta-llama-3-1-70b-instruct', 89,
     'training', 'demo_seed', 'demo_seed'),
    ('demo-lineage-anomaly', 'sensor_anomaly_detector_v1', '1.0.0',
     'demo-ts-anomaly', 'Sensor Anomaly Classification v1',
     'databricks-meta-llama-3-1-70b-instruct', 160,
     'deployed', 'demo_seed', 'demo_seed')
  ) AS v(id, model_name, model_version, training_sheet_id, training_sheet_name,
         base_model, training_examples_count, deployment_status, created_by, updated_by)
) AS s ON t.id = s.id
WHEN NOT MATCHED THEN INSERT (
  id, model_name, model_version, training_sheet_id, training_sheet_name,
  base_model, training_examples_count, deployment_status,
  created_at, created_by, updated_at, updated_by
) VALUES (
  s.id, s.model_name, s.model_version, s.training_sheet_id, s.training_sheet_name,
  s.base_model, s.training_examples_count, s.deployment_status,
  current_timestamp(), s.created_by, current_timestamp(), s.updated_by
)
""", "Seed model_training_lineage (3)")

    def seed_evaluations(self) -> None:
        """Seed model_evaluations (12) — 4 metrics per model."""
        logger.info("── Tier 2b: Model Evaluations ──")

        evals = [
            # PCB defect classifier
            ("demo-eval-pcb-acc", None, "pcb_defect_classifier_v1", "1.0.0", "demo-ts-pcb", "post_training", "mlflow_evaluate", "accuracy", 0.942),
            ("demo-eval-pcb-f1", None, "pcb_defect_classifier_v1", "1.0.0", "demo-ts-pcb", "post_training", "mlflow_evaluate", "f1_score", 0.928),
            ("demo-eval-pcb-prec", None, "pcb_defect_classifier_v1", "1.0.0", "demo-ts-pcb", "post_training", "mlflow_evaluate", "precision", 0.951),
            ("demo-eval-pcb-rec", None, "pcb_defect_classifier_v1", "1.0.0", "demo-ts-pcb", "post_training", "mlflow_evaluate", "recall", 0.906),
            # Failure predictor
            ("demo-eval-fail-acc", None, "equipment_failure_predictor_v1", "1.0.0", "demo-ts-telemetry", "post_training", "mlflow_evaluate", "accuracy", 0.871),
            ("demo-eval-fail-f1", None, "equipment_failure_predictor_v1", "1.0.0", "demo-ts-telemetry", "post_training", "mlflow_evaluate", "f1_score", 0.854),
            ("demo-eval-fail-prec", None, "equipment_failure_predictor_v1", "1.0.0", "demo-ts-telemetry", "post_training", "mlflow_evaluate", "precision", 0.892),
            ("demo-eval-fail-rec", None, "equipment_failure_predictor_v1", "1.0.0", "demo-ts-telemetry", "post_training", "mlflow_evaluate", "recall", 0.819),
            # Anomaly detector
            ("demo-eval-ano-acc", None, "sensor_anomaly_detector_v1", "1.0.0", "demo-ts-anomaly", "post_training", "mlflow_evaluate", "accuracy", 0.913),
            ("demo-eval-ano-f1", None, "sensor_anomaly_detector_v1", "1.0.0", "demo-ts-anomaly", "post_training", "mlflow_evaluate", "f1_score", 0.897),
            ("demo-eval-ano-prec", None, "sensor_anomaly_detector_v1", "1.0.0", "demo-ts-anomaly", "post_training", "mlflow_evaluate", "precision", 0.923),
            ("demo-eval-ano-rec", None, "sensor_anomaly_detector_v1", "1.0.0", "demo-ts-anomaly", "post_training", "mlflow_evaluate", "recall", 0.872),
        ]

        values_rows = []
        for e in evals:
            job_id_sql = f"'{e[1]}'" if e[1] else "NULL"
            values_rows.append(
                f"('{e[0]}', {job_id_sql}, '{e[2]}', '{e[3]}', '{e[4]}', "
                f"'{e[5]}', '{e[6]}', '{e[7]}', {e[8]}, 'demo_seed')"
            )
        values_sql = ",\n    ".join(values_rows)

        self.execute_sql(f"""
MERGE INTO {self.tbl('model_evaluations')} AS t
USING (
  SELECT * FROM (VALUES
    {values_sql}
  ) AS v(id, job_id, model_name, model_version, eval_dataset_id,
         eval_type, evaluator, metric_name, metric_value, created_by)
) AS s ON t.id = s.id
WHEN NOT MATCHED THEN INSERT (
  id, job_id, model_name, model_version, eval_dataset_id,
  eval_type, evaluator, metric_name, metric_value,
  created_at, created_by
) VALUES (
  s.id, s.job_id, s.model_name, s.model_version, s.eval_dataset_id,
  s.eval_type, s.evaluator, s.metric_name, s.metric_value,
  current_timestamp(), s.created_by
)
""", "Seed model_evaluations (12)")

    def seed_endpoints_and_metrics(self) -> None:
        """Seed endpoints_registry (3) and endpoint_metrics (30)."""
        logger.info("── Tier 2c: Endpoints & Metrics ──")

        # Endpoints registry (needed for feedback_items FK and endpoint_metrics)
        self.execute_sql(f"""
MERGE INTO {self.tbl('endpoints_registry')} AS t
USING (
  SELECT * FROM (VALUES
    ('demo-ep-pcb', 'PCB Defect Classifier', 'Production endpoint for PCB defect classification',
     'serving', 'pcb-defect-classifier-ep', 'pcb_defect_classifier_v1', '1.0.0',
     'active', NULL, 'demo_seed'),
    ('demo-ep-failure', 'Equipment Failure Predictor', 'Production endpoint for equipment failure prediction',
     'serving', 'failure-predictor-ep', 'equipment_failure_predictor_v1', '1.0.0',
     'active', NULL, 'demo_seed'),
    ('demo-ep-anomaly', 'Sensor Anomaly Detector', 'Production endpoint for sensor anomaly detection',
     'serving', 'anomaly-detector-ep', 'sensor_anomaly_detector_v1', '1.0.0',
     'active', NULL, 'demo_seed')
  ) AS v(id, name, description, endpoint_type, endpoint_name, model_name, model_version,
         status, config, created_by)
) AS s ON t.id = s.id
WHEN NOT MATCHED THEN INSERT (
  id, name, description, endpoint_type, endpoint_name, model_name, model_version,
  status, config, created_by, created_at, updated_at
) VALUES (
  s.id, s.name, s.description, s.endpoint_type, s.endpoint_name, s.model_name, s.model_version,
  s.status, s.config, s.created_by, current_timestamp(), current_timestamp()
)
""", "Seed endpoints_registry (3)")

        # Endpoint metrics — 10 per endpoint
        import random
        random.seed(42)  # Deterministic for reproducibility

        metrics = []
        endpoints = [
            ("demo-ep-pcb", "pcb-defect-classifier-ep", "pcb_defect_classifier_v1", "1.0.0"),
            ("demo-ep-failure", "failure-predictor-ep", "equipment_failure_predictor_v1", "1.0.0"),
            ("demo-ep-anomaly", "anomaly-detector-ep", "sensor_anomaly_detector_v1", "1.0.0"),
        ]

        for ep_id, ep_name, model, version in endpoints:
            for j in range(10):
                mid = f"demo-metric-{ep_id.split('-')[-1]}-{j+1:02d}"
                latency = round(random.uniform(120, 850), 1)
                in_tok = random.randint(200, 1200)
                out_tok = random.randint(50, 400)
                total = in_tok + out_tok
                cost = round(total * 0.000003, 6)
                status_code = 200 if random.random() > 0.1 else 500
                err = "NULL" if status_code == 200 else "'Model timeout'"
                metrics.append(
                    f"('{mid}', '{ep_id}', '{ep_name}', '{mid}', '{model}', '{version}', "
                    f"{latency}, {status_code}, {err}, {in_tok}, {out_tok}, {total}, {cost})"
                )

        values_sql = ",\n    ".join(metrics)
        self.execute_sql(f"""
MERGE INTO {self.tbl('endpoint_metrics')} AS t
USING (
  SELECT * FROM (VALUES
    {values_sql}
  ) AS v(id, endpoint_id, endpoint_name, request_id, model_name, model_version,
         latency_ms, status_code, error_message, input_tokens, output_tokens, total_tokens, cost_dollars)
) AS s ON t.id = s.id
WHEN NOT MATCHED THEN INSERT (
  id, endpoint_id, endpoint_name, request_id, model_name, model_version,
  latency_ms, status_code, error_message, input_tokens, output_tokens, total_tokens, cost_dollars,
  created_at
) VALUES (
  s.id, s.endpoint_id, s.endpoint_name, s.request_id, s.model_name, s.model_version,
  s.latency_ms, s.status_code, s.error_message, s.input_tokens, s.output_tokens, s.total_tokens, s.cost_dollars,
  current_timestamp()
)
""", "Seed endpoint_metrics (30)")

    # ------------------------------------------------------------------
    # Tier 3: Labeling Workflow
    # ------------------------------------------------------------------

    def seed_labeling_workflow(self) -> None:
        """Seed labeling_jobs (2), labeling_tasks (4), labeled_items (16)."""
        logger.info("── Tier 3: Labeling Workflow ──")

        # Labeling jobs
        pcb_label_schema = json.dumps({
            "fields": [
                {"name": "defect_type", "type": "enum", "values": ["short", "open", "misalignment", "contamination", "none"]},
                {"name": "severity", "type": "enum", "values": ["critical", "major", "minor", "cosmetic"]},
                {"name": "confidence", "type": "float", "min": 0, "max": 1},
            ]
        }).replace("'", "''")

        anomaly_label_schema = json.dumps({
            "fields": [
                {"name": "anomaly_class", "type": "enum", "values": ["radiation_event", "equipment_fault", "environmental", "calibration_drift", "false_positive"]},
                {"name": "severity", "type": "enum", "values": ["critical", "elevated", "routine", "negligible"]},
                {"name": "reasoning", "type": "text"},
            ]
        }).replace("'", "''")

        self.execute_sql(f"""
MERGE INTO {self.tbl('labeling_jobs')} AS t
USING (
  SELECT * FROM (VALUES
    ('demo-lj-pcb', 'PCB Defect Labeling Campaign',
     'Expert labeling of PCB inspection images for defect detection model training. IPC-A-610 Class 2 standards.',
     'demo-sheet-pcb', ARRAY('defect_type', 'severity'),
     PARSE_JSON('{pcb_label_schema}'),
     'Inspect each PCB image carefully. Classify the primary defect per IPC-A-610 Class 2. Mark severity based on functional impact.',
     true, 'databricks-meta-llama-3-1-70b-instruct', 'round_robin', 25,
     'active', 200, 142, 98, 87, 'demo_seed', 'demo_seed'),
    ('demo-lj-anomaly', 'Sensor Anomaly Classification',
     'Classification of flagged sensor anomaly events. Distinguish real radiation events from equipment artifacts.',
     'demo-sheet-anomaly', ARRAY('anomaly_class', 'severity'),
     PARSE_JSON('{anomaly_label_schema}'),
     'Review the 60-second sensor data window. Classify the anomaly root cause. Provide reasoning citing spectral or temporal evidence.',
     true, 'databricks-meta-llama-3-1-70b-instruct', 'manual', 20,
     'active', 180, 96, 72, 65, 'demo_seed', 'demo_seed')
  ) AS v(id, name, description, sheet_id, target_columns, label_schema, instructions,
         ai_assist_enabled, ai_model, assignment_strategy, default_batch_size,
         status, total_items, labeled_items, reviewed_items, approved_items, created_by, updated_by)
) AS s ON t.id = s.id
WHEN NOT MATCHED THEN INSERT (
  id, name, description, sheet_id, target_columns, label_schema, instructions,
  ai_assist_enabled, ai_model, assignment_strategy, default_batch_size,
  status, total_items, labeled_items, reviewed_items, approved_items,
  created_at, created_by, updated_at, updated_by
) VALUES (
  s.id, s.name, s.description, s.sheet_id, s.target_columns, s.label_schema, s.instructions,
  s.ai_assist_enabled, s.ai_model, s.assignment_strategy, s.default_batch_size,
  s.status, s.total_items, s.labeled_items, s.reviewed_items, s.approved_items,
  current_timestamp(), s.created_by, current_timestamp(), s.updated_by
)
""", "Seed labeling_jobs (2)")

        # Labeling tasks (2 per job)
        self.execute_sql(f"""
MERGE INTO {self.tbl('labeling_tasks')} AS t
USING (
  SELECT * FROM (VALUES
    ('demo-lt-pcb-1', 'demo-lj-pcb', 'PCB Batch 1 (Items 1-25)',
     PARSE_JSON('[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25]'), 25,
     'alice@acme-instruments.com', 'approved', 25, 'normal', 'demo_seed', 'demo_seed'),
    ('demo-lt-pcb-2', 'demo-lj-pcb', 'PCB Batch 2 (Items 26-50)',
     PARSE_JSON('[26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50]'), 25,
     'charlie@acme-instruments.com', 'in_progress', 18, 'normal', 'demo_seed', 'demo_seed'),
    ('demo-lt-ano-1', 'demo-lj-anomaly', 'Anomaly Batch 1 (Items 1-20)',
     PARSE_JSON('[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]'), 20,
     'bob@acme-instruments.com', 'submitted', 20, 'high', 'demo_seed', 'demo_seed'),
    ('demo-lt-ano-2', 'demo-lj-anomaly', 'Anomaly Batch 2 (Items 21-40)',
     PARSE_JSON('[21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40]'), 20,
     'dave@acme-instruments.com', 'assigned', 0, 'normal', 'demo_seed', 'demo_seed')
  ) AS v(id, job_id, name, item_indices, item_count, assigned_to, status, labeled_count, priority, created_by, updated_by)
) AS s ON t.id = s.id
WHEN NOT MATCHED THEN INSERT (
  id, job_id, name, item_indices, item_count, assigned_to, status, labeled_count, priority,
  created_at, created_by, updated_at, updated_by
) VALUES (
  s.id, s.job_id, s.name, s.item_indices, s.item_count, s.assigned_to, s.status, s.labeled_count, s.priority,
  current_timestamp(), s.created_by, current_timestamp(), s.updated_by
)
""", "Seed labeling_tasks (4)")

        # Labeled items (4 per task = 16 total)
        items = []
        # PCB Batch 1 items (completed)
        pcb1_labels = [
            (1, '{"defect_type":"short","severity":"critical"}', 0.94,
             '{"defect_type":"short","severity":"critical","notes":"Confirmed solder bridge"}',
             "alice@acme-instruments.com", "human_labeled", "approved", "bob@acme-instruments.com"),
            (2, '{"defect_type":"open","severity":"major"}', 0.88,
             '{"defect_type":"open","severity":"major","notes":"Verified cold joint"}',
             "alice@acme-instruments.com", "human_labeled", "approved", "bob@acme-instruments.com"),
            (3, '{"defect_type":"none","severity":"cosmetic"}', 0.72,
             '{"defect_type":"misalignment","severity":"minor","notes":"AI missed slight component rotation"}',
             "alice@acme-instruments.com", "human_labeled", "approved", "bob@acme-instruments.com"),
            (4, '{"defect_type":"contamination","severity":"minor"}', 0.81,
             '{"defect_type":"contamination","severity":"major","notes":"Upgraded severity: flux near high-voltage trace"}',
             "alice@acme-instruments.com", "human_labeled", "needs_correction", None),
        ]
        for i, (idx, ai, conf, human, labeler, status, review, reviewer) in enumerate(pcb1_labels):
            rev_sql = f"'{reviewer}'" if reviewer else "NULL"
            items.append(
                f"('demo-li-pcb1-{i+1}', 'demo-lt-pcb-1', 'demo-lj-pcb', {idx}, "
                f"PARSE_JSON('{ai}'), {conf}, PARSE_JSON('{human}'), '{labeler}', "
                f"'{status}', '{review}', {rev_sql}, false, false, 'demo_seed', 'demo_seed')"
            )

        # PCB Batch 2 items (in progress)
        pcb2_labels = [
            (26, '{"defect_type":"short","severity":"major"}', 0.91,
             '{"defect_type":"short","severity":"major"}',
             "charlie@acme-instruments.com", "human_labeled", "approved", "alice@acme-instruments.com"),
            (27, '{"defect_type":"open","severity":"critical"}', 0.86,
             None, None, "ai_labeled", None, None),
            (28, '{"defect_type":"misalignment","severity":"minor"}', 0.79,
             None, None, "ai_labeled", None, None),
            (29, '{"defect_type":"none","severity":"cosmetic"}', 0.65,
             None, None, "pending", None, None),
        ]
        for i, (idx, ai, conf, human, labeler, status, review, reviewer) in enumerate(pcb2_labels):
            human_sql = f"PARSE_JSON('{human}')" if human else "NULL"
            labeler_sql = f"'{labeler}'" if labeler else "NULL"
            review_sql = f"'{review}'" if review else "NULL"
            rev_sql = f"'{reviewer}'" if reviewer else "NULL"
            items.append(
                f"('demo-li-pcb2-{i+1}', 'demo-lt-pcb-2', 'demo-lj-pcb', {idx}, "
                f"PARSE_JSON('{ai}'), {conf}, {human_sql}, {labeler_sql}, "
                f"'{status}', {review_sql}, {rev_sql}, false, false, 'demo_seed', 'demo_seed')"
            )

        # Anomaly Batch 1 items (submitted for review)
        ano1_labels = [
            (1, '{"anomaly_class":"radiation_event","severity":"elevated"}', 0.93,
             '{"anomaly_class":"radiation_event","severity":"elevated","reasoning":"Cs-137 peak confirmed"}',
             "bob@acme-instruments.com", "human_labeled", "approved", "alice@acme-instruments.com"),
            (2, '{"anomaly_class":"equipment_fault","severity":"routine"}', 0.87,
             '{"anomaly_class":"equipment_fault","severity":"routine","reasoning":"60 Hz noise confirmed"}',
             "bob@acme-instruments.com", "human_labeled", "approved", "alice@acme-instruments.com"),
            (3, '{"anomaly_class":"environmental","severity":"negligible"}', 0.84,
             '{"anomaly_class":"environmental","severity":"negligible","reasoning":"Correlated with weather data"}',
             "bob@acme-instruments.com", "human_labeled", None, None),
            (4, '{"anomaly_class":"radiation_event","severity":"critical"}', 0.78,
             '{"anomaly_class":"false_positive","severity":"negligible","reasoning":"Single channel, no coincidence"}',
             "bob@acme-instruments.com", "human_labeled", None, None),
        ]
        for i, (idx, ai, conf, human, labeler, status, review, reviewer) in enumerate(ano1_labels):
            review_sql = f"'{review}'" if review else "NULL"
            rev_sql = f"'{reviewer}'" if reviewer else "NULL"
            items.append(
                f"('demo-li-ano1-{i+1}', 'demo-lt-ano-1', 'demo-lj-anomaly', {idx}, "
                f"PARSE_JSON('{ai}'), {conf}, PARSE_JSON('{human}'), '{labeler}', "
                f"'{status}', {review_sql}, {rev_sql}, "
                f"{'true' if i == 3 else 'false'}, {'true' if i == 3 else 'false'}, 'demo_seed', 'demo_seed')"
            )

        # Anomaly Batch 2 items (assigned but not started)
        for i in range(4):
            idx = 21 + i
            items.append(
                f"('demo-li-ano2-{i+1}', 'demo-lt-ano-2', 'demo-lj-anomaly', {idx}, "
                f"NULL, NULL, NULL, NULL, 'pending', NULL, NULL, false, false, 'demo_seed', 'demo_seed')"
            )

        values_sql = ",\n    ".join(items)
        self.execute_sql(f"""
MERGE INTO {self.tbl('labeled_items')} AS t
USING (
  SELECT * FROM (VALUES
    {values_sql}
  ) AS v(id, task_id, job_id, row_index, ai_labels, ai_confidence, human_labels,
         labeled_by, status, review_status, reviewed_by,
         is_difficult, needs_discussion, created_by, updated_by)
) AS s ON t.id = s.id
WHEN NOT MATCHED THEN INSERT (
  id, task_id, job_id, row_index, ai_labels, ai_confidence, human_labels,
  labeled_by, status, review_status, reviewed_by,
  is_difficult, needs_discussion,
  created_at, created_by, updated_at, updated_by
) VALUES (
  s.id, s.task_id, s.job_id, s.row_index, s.ai_labels, s.ai_confidence, s.human_labels,
  s.labeled_by, s.status, s.review_status, s.reviewed_by,
  s.is_difficult, s.needs_discussion,
  current_timestamp(), s.created_by, current_timestamp(), s.updated_by
)
""", "Seed labeled_items (16)")

    # ------------------------------------------------------------------
    # Tier 4: Governance
    # ------------------------------------------------------------------

    def seed_governance(self) -> None:
        """Seed identified_gaps (4), data_contracts (2), data_products (2), data_product_ports (4)."""
        logger.info("── Tier 4a: Identified Gaps ──")

        self.execute_sql(f"""
MERGE INTO {self.tbl('identified_gaps')} AS t
USING (
  SELECT * FROM (VALUES
    ('demo-gap-01', 'pcb_defect_classifier_v1', 'demo-tpl-defect', 'coverage',
     'high', 'Tombstone defect type missing from training data — 0 examples in current dataset',
     'data_analysis', 'No tombstone defect examples found in qa_pairs',
     12, 0.15, 'Add tombstone defect examples to PCB training sheet',
     'Tombstone Defect Examples', 30, 'identified', 80, 'demo_seed'),
    ('demo-gap-02', 'pcb_defect_classifier_v1', 'demo-tpl-defect', 'quality',
     'medium', 'Contamination classification confusion with cosmetic defects in low-contrast images',
     'eval_metrics', 'F1 for contamination class dropped to 0.71 on low-contrast subset',
     8, 0.08, 'Add more low-contrast contamination examples with clear labeling guidance',
     NULL, 15, 'task_created', 60, 'demo_seed'),
    ('demo-gap-03', 'sensor_anomaly_detector_v1', 'demo-tpl-anomaly', 'distribution',
     'medium', 'Underrepresentation of calibration_drift class — only 3% of training data vs 12% of production events',
     'data_analysis', 'Class distribution: radiation_event 35%, equipment_fault 28%, environmental 22%, cal_drift 3%, false_positive 12%',
     0, 0.0, 'Augment calibration drift examples by targeted labeling campaign',
     NULL, 25, 'identified', 50, 'demo_seed'),
    ('demo-gap-04', 'equipment_failure_predictor_v1', 'demo-tpl-failure', 'edge_case',
     'critical', 'Model fails on simultaneous multi-sensor anomalies — predicts single failure mode when cascading failure occurs',
     'user_feedback', '3 incidents where cascading failures were misclassified as single-mode',
     3, 0.33, 'Add multi-failure-mode training examples from incident database',
     NULL, 10, 'in_progress', 95, 'demo_seed')
  ) AS v(gap_id, model_name, template_id, gap_type, severity, description,
         evidence_type, evidence_summary, affected_queries_count, error_rate,
         suggested_action, suggested_bit_name, estimated_records_needed,
         status, priority, identified_by)
) AS s ON t.gap_id = s.gap_id
WHEN NOT MATCHED THEN INSERT (
  gap_id, model_name, template_id, gap_type, severity, description,
  evidence_type, evidence_summary, affected_queries_count, error_rate,
  suggested_action, suggested_bit_name, estimated_records_needed,
  status, priority, identified_at, identified_by
) VALUES (
  s.gap_id, s.model_name, s.template_id, s.gap_type, s.severity, s.description,
  s.evidence_type, s.evidence_summary, s.affected_queries_count, s.error_rate,
  s.suggested_action, s.suggested_bit_name, s.estimated_records_needed,
  s.status, s.priority, current_timestamp(), s.identified_by
)
""", "Seed identified_gaps (4)")

        logger.info("── Tier 4b: Data Contracts ──")

        qa_schema = json.dumps([
            {"name": "image_id", "type": "STRING", "nullable": False, "description": "Unique image identifier"},
            {"name": "image_path", "type": "STRING", "nullable": False, "description": "UC Volume path to image"},
            {"name": "defect_notes", "type": "STRING", "nullable": True, "description": "Technician inspection notes"},
        ]).replace("'", "''")
        qa_rules = json.dumps([
            {"metric": "completeness", "column": "image_path", "threshold": 1.0, "description": "All rows must have image path"},
            {"metric": "freshness", "max_age_hours": 168, "description": "Data must be less than 7 days old"},
        ]).replace("'", "''")

        pm_schema = json.dumps([
            {"name": "reading_id", "type": "STRING", "nullable": False},
            {"name": "sensor_type", "type": "STRING", "nullable": False},
            {"name": "value", "type": "DOUBLE", "nullable": False},
            {"name": "unit", "type": "STRING", "nullable": False},
        ]).replace("'", "''")
        pm_rules = json.dumps([
            {"metric": "completeness", "column": "value", "threshold": 0.99},
            {"metric": "validity", "column": "value", "min": -1000, "max": 10000},
        ]).replace("'", "''")

        self.execute_sql(f"""
MERGE INTO {self.tbl('data_contracts')} AS t
USING (
  SELECT * FROM (VALUES
    ('demo-contract-qa', 'QA Inspection Data Contract',
     'SLO contract for PCB inspection image datasets. Guarantees image availability, metadata completeness, and freshness.',
     '1.0.0', 'active', 'demo-sheet-pcb', 'PCB Defect Images', 'demo-domain-qa',
     'qa-lead@acme-instruments.com',
     '{qa_schema}', '{qa_rules}',
     '{json.dumps({"retention_days": 365, "access": "team_qa"}).replace("'", "''")}',
     'demo_seed', 'demo_seed'),
    ('demo-contract-pm', 'Predictive Maintenance Telemetry Contract',
     'SLO contract for equipment telemetry data. Guarantees sensor reading validity and timeliness.',
     '1.0.0', 'active', 'demo-sheet-telemetry', 'Equipment Telemetry', 'demo-domain-pm',
     'pm-lead@acme-instruments.com',
     '{pm_schema}', '{pm_rules}',
     '{json.dumps({"retention_days": 730, "access": "team_maint"}).replace("'", "''")}',
     'demo_seed', 'demo_seed')
  ) AS v(id, name, description, version, status, dataset_id, dataset_name, domain_id,
         owner_email, schema_definition, quality_rules, terms, created_by, updated_by)
) AS s ON t.id = s.id
WHEN NOT MATCHED THEN INSERT (
  id, name, description, version, status, dataset_id, dataset_name, domain_id,
  owner_email, schema_definition, quality_rules, terms,
  created_at, created_by, updated_at, updated_by, activated_at
) VALUES (
  s.id, s.name, s.description, s.version, s.status, s.dataset_id, s.dataset_name, s.domain_id,
  s.owner_email, s.schema_definition, s.quality_rules, s.terms,
  current_timestamp(), s.created_by, current_timestamp(), s.updated_by, current_timestamp()
)
""", "Seed data_contracts (2)")

        logger.info("── Tier 4c: Data Products ──")

        self.execute_sql(f"""
MERGE INTO {self.tbl('data_products')} AS t
USING (
  SELECT * FROM (VALUES
    ('demo-dp-qa-source', 'QA Inspection Data Product',
     'Source-aligned data product providing PCB inspection data for defect detection models.',
     'source_aligned', 'published', 'demo-domain-qa',
     'qa-lead@acme-instruments.com', 'demo-team-qa',
     '{json.dumps(["pcb","defect","inspection","quality"]).replace("'", "''")}',
     '{json.dumps({"update_frequency": "daily", "sla": "99.5%"}).replace("'", "''")}',
     'demo_seed', 'demo_seed'),
    ('demo-dp-safety-consumer', 'Radiation Safety Insights',
     'Consumer-aligned data product aggregating safety metrics across QA, maintenance, and compliance domains.',
     'consumer_aligned', 'published', 'demo-domain-rc',
     'compliance@acme-instruments.com', NULL,
     '{json.dumps(["safety","radiation","compliance","dashboard"]).replace("'", "''")}',
     '{json.dumps({"update_frequency": "weekly", "audience": "management"}).replace("'", "''")}',
     'demo_seed', 'demo_seed')
  ) AS v(id, name, description, product_type, status, domain_id,
         owner_email, team_id, tags, metadata, created_by, updated_by)
) AS s ON t.id = s.id
WHEN NOT MATCHED THEN INSERT (
  id, name, description, product_type, status, domain_id,
  owner_email, team_id, tags, metadata,
  created_at, created_by, updated_at, updated_by, published_at
) VALUES (
  s.id, s.name, s.description, s.product_type, s.status, s.domain_id,
  s.owner_email, s.team_id, s.tags, s.metadata,
  current_timestamp(), s.created_by, current_timestamp(), s.updated_by, current_timestamp()
)
""", "Seed data_products (2)")

        self.execute_sql(f"""
MERGE INTO {self.tbl('data_product_ports')} AS t
USING (
  SELECT * FROM (VALUES
    ('demo-port-qa-in', 'demo-dp-qa-source', 'PCB Images Input',
     'Raw PCB inspection images from Unity Catalog volume', 'input',
     'dataset', 'demo-sheet-pcb', 'PCB Defect Images', NULL, 'demo_seed'),
    ('demo-port-qa-out', 'demo-dp-qa-source', 'Labeled Defects Output',
     'Expert-labeled defect classifications ready for model training', 'output',
     'dataset', 'demo-ts-pcb', 'PCB Defects - Training Set v1', NULL, 'demo_seed'),
    ('demo-port-safety-in1', 'demo-dp-safety-consumer', 'Model Metrics Input',
     'Aggregated model evaluation metrics from all deployed endpoints', 'input',
     'endpoint', 'demo-ep-pcb', 'PCB Defect Classifier', NULL, 'demo_seed'),
    ('demo-port-safety-out', 'demo-dp-safety-consumer', 'Safety Dashboard Output',
     'Curated safety metrics for executive reporting dashboard', 'output',
     'contract', 'demo-contract-qa', 'QA Inspection Data Contract', NULL, 'demo_seed')
  ) AS v(id, product_id, name, description, port_type, entity_type, entity_id, entity_name, config, created_by)
) AS s ON t.id = s.id
WHEN NOT MATCHED THEN INSERT (
  id, product_id, name, description, port_type, entity_type, entity_id, entity_name, config,
  created_at, created_by
) VALUES (
  s.id, s.product_id, s.name, s.description, s.port_type, s.entity_type, s.entity_id, s.entity_name, s.config,
  current_timestamp(), s.created_by
)
""", "Seed data_product_ports (4)")

    def seed_feedback(self) -> None:
        """Seed feedback_items (10)."""
        logger.info("── Tier 4d: Feedback ──")

        feedback = [
            ("demo-fb-01", "demo-ep-pcb", "Inspect PCB image pcb_img_00501", "Defect: short, severity: critical", 5, None, False, "operator1@acme-instruments.com"),
            ("demo-fb-02", "demo-ep-pcb", "Classify defect on board SN-44821", "Defect: none, no issues found", 1, "Missed obvious open circuit on J3 connector", True, "alice@acme-instruments.com"),
            ("demo-fb-03", "demo-ep-pcb", "Check solder quality on U12 package", "Defect: contamination, severity: minor", 5, "Correct identification of flux residue", False, "operator2@acme-instruments.com"),
            ("demo-fb-04", "demo-ep-failure", "Analyze telemetry for pump P-14", "Failure probability: 0.72, mode: vibration", 5, "Caught the bearing issue early, saved $12K in downtime", False, "bob@acme-instruments.com"),
            ("demo-fb-05", "demo-ep-failure", "Predict maintenance for compressor C-7", "Failure probability: 0.05, no action needed", 1, "Compressor failed 2 days later — model missed thermal stress", True, "maintenance-tech@acme-instruments.com"),
            ("demo-fb-06", "demo-ep-failure", "Equipment health check for detector D-3", "Failure probability: 0.31, mode: wear", 4, None, False, "bob@acme-instruments.com"),
            ("demo-fb-07", "demo-ep-anomaly", "Classify anomaly event at 09:14:33", "Class: radiation_event, severity: elevated", 5, "Quick and accurate, helped us respond in under 5 minutes", False, "physicist1@acme-instruments.com"),
            ("demo-fb-08", "demo-ep-anomaly", "Evaluate sensor spike on channel 12", "Class: equipment_fault, severity: routine", 1, "Was actually a real Cs-137 source passing nearby, not equipment", True, "physicist2@acme-instruments.com"),
            ("demo-fb-09", "demo-ep-anomaly", "Check background increase in Zone A", "Class: environmental, severity: negligible", 5, None, False, "operator1@acme-instruments.com"),
            ("demo-fb-10", "demo-ep-pcb", "Inspect rework area on board SN-44903", "Defect: misalignment, severity: minor", 4, "Good catch but severity should be major — near high-voltage trace", False, "alice@acme-instruments.com"),
        ]

        values_rows = []
        for fb in feedback:
            text_sql = f"'{fb[5].replace(chr(39), chr(39)+chr(39))}'" if fb[5] else "NULL"
            values_rows.append(
                f"('{fb[0]}', '{fb[1]}', '{fb[2].replace(chr(39), chr(39)+chr(39))}', "
                f"'{fb[3].replace(chr(39), chr(39)+chr(39))}', {fb[4]}, {text_sql}, "
                f"{str(fb[6]).upper()}, '{fb[7]}', NULL, NULL)"
            )
        values_sql = ",\n    ".join(values_rows)

        self.execute_sql(f"""
MERGE INTO {self.tbl('feedback_items')} AS t
USING (
  SELECT * FROM (VALUES
    {values_sql}
  ) AS v(id, endpoint_id, input_data, output_data, rating, feedback_text,
         flagged, user_id, session_id, request_id)
) AS s ON t.id = s.id
WHEN NOT MATCHED THEN INSERT (
  id, endpoint_id, input_data, output_data, rating, feedback_text,
  flagged, user_id, session_id, request_id, created_at
) VALUES (
  s.id, s.endpoint_id, s.input_data, s.output_data, s.rating, s.feedback_text,
  s.flagged, s.user_id, s.session_id, s.request_id, current_timestamp()
)
""", "Seed feedback_items (10)")

    # ------------------------------------------------------------------
    # Orchestration
    # ------------------------------------------------------------------

    def seed_all(self) -> None:
        """Run all seed functions in dependency order."""
        logger.info("=" * 70)
        logger.info("  Ontos ML Workbench — Demo Data Seeder")
        logger.info("=" * 70)
        logger.info(f"  Catalog:   {self.catalog}")
        logger.info(f"  Schema:    {self.schema}")
        logger.info(f"  Warehouse: {self.warehouse_id}")
        logger.info("=" * 70)
        logger.info("")

        # Tier 1: Core ML Pipeline
        self.seed_domains_and_teams()
        self.seed_sheets()
        self.seed_templates()
        self.seed_canonical_labels()
        self.seed_training_sheets()
        self.seed_qa_pairs()

        # Tier 2: Model Lifecycle
        self.seed_models_and_lineage()
        self.seed_evaluations()
        self.seed_endpoints_and_metrics()

        # Tier 3: Labeling
        self.seed_labeling_workflow()

        # Tier 4: Governance
        self.seed_governance()
        self.seed_feedback()

        logger.info("")
        logger.info("=" * 70)
        logger.info("  Demo seeding complete!")
        logger.info("  Run with --verify to check row counts.")
        logger.info("=" * 70)

    def verify(self) -> None:
        """Count demo rows per table and print summary."""
        logger.info("=" * 70)
        logger.info("  Verifying demo data row counts")
        logger.info("=" * 70)

        tables = [
            ("data_domains", "id"),
            ("teams", "id"),
            ("sheets", "id"),
            ("templates", "id"),
            ("canonical_labels", "id"),
            ("training_sheets", "id"),
            ("qa_pairs", "id"),
            ("model_training_lineage", "id"),
            ("model_evaluations", "id"),
            ("endpoints_registry", "id"),
            ("endpoint_metrics", "id"),
            ("labeling_jobs", "id"),
            ("labeling_tasks", "id"),
            ("labeled_items", "id"),
            ("identified_gaps", "gap_id"),
            ("data_contracts", "id"),
            ("data_products", "id"),
            ("data_product_ports", "id"),
            ("feedback_items", "id"),
        ]

        total = 0
        for table_name, pk_col in tables:
            result = self.execute_sql(
                f"SELECT COUNT(*) AS cnt FROM {self.tbl(table_name)} WHERE {pk_col} LIKE 'demo-%'",
                f"Count {table_name}",
            )
            if result["status"] == "success" and result["data"]:
                count = int(result["data"][0][0])
            else:
                count = -1
            total += max(count, 0)
            marker = "✓" if count > 0 else ("?" if count < 0 else "·")
            logger.info(f"  {marker} {table_name:30s} {count:>5} demo rows")

        logger.info("")
        logger.info(f"  Total demo records: {total}")

    def reset(self) -> None:
        """Delete all demo- prefixed rows from seeded tables."""
        logger.info("=" * 70)
        logger.info("  Resetting demo data (DELETE WHERE id LIKE 'demo-%')")
        logger.info("=" * 70)

        # Reverse dependency order for safe deletion
        tables = [
            ("feedback_items", "id"),
            ("data_product_ports", "id"),
            ("data_products", "id"),
            ("data_contracts", "id"),
            ("identified_gaps", "gap_id"),
            ("labeled_items", "id"),
            ("labeling_tasks", "id"),
            ("labeling_jobs", "id"),
            ("endpoint_metrics", "id"),
            ("endpoints_registry", "id"),
            ("model_evaluations", "id"),
            ("model_training_lineage", "id"),
            ("qa_pairs", "id"),
            ("training_sheets", "id"),
            ("canonical_labels", "id"),
            ("templates", "id"),
            ("sheets", "id"),
            ("teams", "id"),
            ("data_domains", "id"),
        ]

        for table_name, pk_col in tables:
            self.execute_sql(
                f"DELETE FROM {self.tbl(table_name)} WHERE {pk_col} LIKE 'demo-%'",
                f"Reset {table_name}",
            )

        logger.info("")
        logger.info("  Demo data reset complete.")


def main():
    parser = argparse.ArgumentParser(
        description="Seed Ontos ML Workbench with realistic demo data",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/seed_demo_data.py --catalog my_catalog --schema ontos_ml_dev
  python scripts/seed_demo_data.py --catalog my_catalog --schema ontos_ml_dev --profile dev
  python scripts/seed_demo_data.py --catalog my_catalog --schema ontos_ml_dev --verify
  python scripts/seed_demo_data.py --catalog my_catalog --schema ontos_ml_dev --reset
        """,
    )
    parser.add_argument("--catalog", required=True, help="Unity Catalog name")
    parser.add_argument("--schema", required=True, help="Schema name within catalog")
    parser.add_argument("--warehouse-id", help="SQL warehouse ID (auto-detects if omitted)")
    parser.add_argument("--profile", help="Databricks CLI profile name")
    parser.add_argument("--verify", action="store_true", help="Count demo rows per table")
    parser.add_argument("--reset", action="store_true", help="Delete all demo- prefixed rows")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")

    args = parser.parse_args()

    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)

    try:
        seeder = DemoSeeder(
            catalog=args.catalog,
            schema=args.schema,
            warehouse_id=args.warehouse_id,
            profile=args.profile,
        )

        if args.reset:
            seeder.reset()
        elif args.verify:
            seeder.verify()
        else:
            seeder.seed_all()

    except Exception as e:
        logger.exception(f"Seeder failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
