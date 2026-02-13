#!/usr/bin/env python3
"""
Test Data Seeding Script for VITAL Workbench

Seeds the database with realistic test data for Mirion use cases.

Usage:
    python scripts/seed_test_data.py --catalog home_stuart_gano --schema mirion_vital_workbench
    python scripts/seed_test_data.py --profile dev --catalog home_stuart_gano --schema mirion_vital_workbench
"""

import argparse
import json
import logging
import sys
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from uuid import uuid4

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementState

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DataSeeder:
    """Seeds test data for VITAL Workbench"""

    def __init__(self, catalog: str, schema: str, warehouse_id: Optional[str] = None, profile: Optional[str] = None):
        self.catalog = catalog
        self.schema = schema

        # Initialize Databricks client
        if profile:
            self.client = WorkspaceClient(profile=profile)
        else:
            self.client = WorkspaceClient()

        # Get SQL warehouse
        self.warehouse_id = warehouse_id
        if not self.warehouse_id:
            warehouses = list(self.client.warehouses.list())
            if warehouses:
                self.warehouse_id = warehouses[0].id
                logger.info(f"Using SQL warehouse: {warehouses[0].name}")
            else:
                raise ValueError("No SQL warehouse found. Please provide --warehouse-id")

        # Get current user
        me = self.client.current_user.me()
        self.current_user = me.user_name or "system"

    def execute_sql(self, sql: str, description: str = "SQL statement") -> Dict[str, Any]:
        """Execute SQL and wait for completion"""
        logger.info(f"Executing: {description}")
        logger.debug(f"SQL: {sql[:300]}...")

        try:
            result = self.client.statement_execution.execute_statement(
                statement=sql,
                warehouse_id=self.warehouse_id
            )

            for attempt in range(60):
                status = self.client.statement_execution.get_statement(result.statement_id)

                if status.status.state == StatementState.SUCCEEDED:
                    logger.info(f"✓ {description}")
                    return {'status': 'success'}
                elif status.status.state in [StatementState.FAILED, StatementState.CANCELED]:
                    error_msg = status.status.error.message if status.status.error else "Unknown error"
                    logger.error(f"✗ {description} - FAILED: {error_msg}")
                    return {'status': 'failed', 'error': error_msg}

                time.sleep(1)

            raise TimeoutError(f"Timeout: {description}")

        except Exception as e:
            logger.error(f"✗ {description} - ERROR: {e}")
            return {'status': 'error', 'error': str(e)}

    def seed_sheets(self) -> bool:
        """Seed sample sheets for Mirion use cases"""
        logger.info("=" * 80)
        logger.info("Seeding Sheets")
        logger.info("=" * 80)

        sheets = [
            {
                'id': 'sheet-defect-detection-001',
                'name': 'Radiation Detector Defect Images',
                'description': 'Microscope images of radiation detector components with defect labels',
                'source_type': 'uc_volume',
                'source_table': None,
                'source_volume': f'/Volumes/{self.catalog}/{self.schema}/sample_images',
                'source_path': 'defect_detection/',
                'item_id_column': 'image_id',
                'text_columns': [],
                'image_columns': ['image_path'],
                'metadata_columns': ['detector_type', 'inspection_date', 'facility'],
                'sampling_strategy': 'all',
                'sample_size': None,
                'filter_expression': None,
                'status': 'active',
                'item_count': 150,
            },
            {
                'id': 'sheet-predictive-maintenance-001',
                'name': 'Equipment Sensor Telemetry',
                'description': 'Time-series telemetry data from radiation detection equipment',
                'source_type': 'uc_table',
                'source_table': f'{self.catalog}.{self.schema}.equipment_telemetry',
                'source_volume': None,
                'source_path': None,
                'item_id_column': 'reading_id',
                'text_columns': ['technician_notes', 'alert_message'],
                'image_columns': [],
                'metadata_columns': ['equipment_id', 'timestamp', 'temperature', 'voltage', 'current'],
                'sampling_strategy': 'random',
                'sample_size': 1000,
                'filter_expression': 'status = "active" AND reading_value IS NOT NULL',
                'status': 'active',
                'item_count': 5000,
            },
            {
                'id': 'sheet-calibration-insights-001',
                'name': 'Monte Carlo Calibration Results',
                'description': 'Monte Carlo simulation outputs for detector calibration analysis',
                'source_type': 'uc_table',
                'source_table': f'{self.catalog}.{self.schema}.mc_calibration_runs',
                'source_volume': None,
                'source_path': None,
                'item_id_column': 'simulation_id',
                'text_columns': ['simulation_notes', 'recommendations'],
                'image_columns': [],
                'metadata_columns': ['detector_model', 'energy_level', 'geometry', 'efficiency'],
                'sampling_strategy': 'stratified',
                'sample_size': 500,
                'filter_expression': 'status = "completed" AND quality_score > 0.8',
                'status': 'active',
                'item_count': 2000,
            }
        ]

        for sheet in sheets:
            # Convert arrays to SQL format
            text_cols = f"ARRAY({', '.join([repr(c) for c in sheet['text_columns']])})" if sheet['text_columns'] else "ARRAY()"
            image_cols = f"ARRAY({', '.join([repr(c) for c in sheet['image_columns']])})" if sheet['image_columns'] else "ARRAY()"
            metadata_cols = f"ARRAY({', '.join([repr(c) for c in sheet['metadata_columns']])})" if sheet['metadata_columns'] else "ARRAY()"

            sql = f"""
            INSERT INTO `{self.catalog}`.`{self.schema}`.sheets (
                id, name, description, source_type, source_table, source_volume, source_path,
                item_id_column, text_columns, image_columns, metadata_columns,
                sampling_strategy, sample_size, filter_expression, status, item_count,
                created_at, created_by, updated_at, updated_by
            ) VALUES (
                '{sheet['id']}',
                '{sheet['name']}',
                '{sheet['description']}',
                '{sheet['source_type']}',
                {f"'{sheet['source_table']}'" if sheet['source_table'] else 'NULL'},
                {f"'{sheet['source_volume']}'" if sheet['source_volume'] else 'NULL'},
                {f"'{sheet['source_path']}'" if sheet['source_path'] else 'NULL'},
                '{sheet['item_id_column']}',
                {text_cols},
                {image_cols},
                {metadata_cols},
                '{sheet['sampling_strategy']}',
                {sheet['sample_size'] if sheet['sample_size'] else 'NULL'},
                {f"'{sheet['filter_expression']}'" if sheet['filter_expression'] else 'NULL'},
                '{sheet['status']}',
                {sheet['item_count']},
                CURRENT_TIMESTAMP(),
                '{self.current_user}',
                CURRENT_TIMESTAMP(),
                '{self.current_user}'
            )
            """

            result = self.execute_sql(sql, f"Insert sheet: {sheet['name']}")
            if result['status'] != 'success':
                return False

        logger.info("")
        return True

    def seed_templates(self) -> bool:
        """Seed sample prompt templates"""
        logger.info("=" * 80)
        logger.info("Seeding Templates")
        logger.info("=" * 80)

        templates = [
            {
                'id': 'template-defect-classification-001',
                'name': 'Defect Classification - Vision',
                'description': 'Classify defects in radiation detector component images',
                'system_prompt': 'You are an expert in radiation detector quality control. Analyze images and classify defects accurately.',
                'user_prompt_template': 'Analyze this image of a {{detector_type}} component. Identify any defects and classify them by type and severity.',
                'label_type': 'defect_classification',
                'label_schema': json.dumps({
                    'type': 'object',
                    'properties': {
                        'has_defect': {'type': 'boolean'},
                        'defect_type': {'type': 'string', 'enum': ['crack', 'contamination', 'deformation', 'none']},
                        'severity': {'type': 'string', 'enum': ['critical', 'major', 'minor', 'none']},
                        'confidence': {'type': 'number', 'minimum': 0, 'maximum': 1}
                    }
                }),
                'model_name': 'databricks-meta-llama-3-1-70b-instruct',
                'temperature': 0.0,
                'max_tokens': 512,
                'output_format': 'json',
                'allowed_uses': ['quality_control', 'training', 'validation'],
                'prohibited_uses': ['regulatory_reporting'],
                'version': 1,
                'status': 'active',
            },
            {
                'id': 'template-failure-prediction-001',
                'name': 'Equipment Failure Prediction',
                'description': 'Predict equipment failures from telemetry data',
                'system_prompt': 'You are an expert in predictive maintenance for radiation detection equipment. Analyze sensor data to predict potential failures.',
                'user_prompt_template': 'Based on this telemetry data for equipment {{equipment_id}}: Temperature={{temperature}}°C, Voltage={{voltage}}V, Current={{current}}A, Notes={{technician_notes}}. Predict likelihood of failure in the next 30 days.',
                'label_type': 'failure_prediction',
                'label_schema': json.dumps({
                    'type': 'object',
                    'properties': {
                        'failure_risk': {'type': 'string', 'enum': ['low', 'medium', 'high', 'critical']},
                        'failure_probability': {'type': 'number', 'minimum': 0, 'maximum': 1},
                        'predicted_failure_days': {'type': 'integer', 'minimum': 0, 'maximum': 90},
                        'recommended_action': {'type': 'string'},
                        'confidence': {'type': 'number', 'minimum': 0, 'maximum': 1}
                    }
                }),
                'model_name': 'databricks-meta-llama-3-1-70b-instruct',
                'temperature': 0.1,
                'max_tokens': 1024,
                'output_format': 'json',
                'allowed_uses': ['maintenance_planning', 'training'],
                'prohibited_uses': ['warranty_claims'],
                'version': 1,
                'status': 'active',
            },
            {
                'id': 'template-calibration-recommendations-001',
                'name': 'Calibration Recommendations',
                'description': 'Generate calibration recommendations from Monte Carlo simulations',
                'system_prompt': 'You are an expert radiation physicist. Analyze Monte Carlo simulation results and provide calibration recommendations.',
                'user_prompt_template': 'Monte Carlo simulation for {{detector_model}} at {{energy_level}} keV with efficiency={{efficiency}}%. Geometry: {{geometry}}. Notes: {{simulation_notes}}. Provide calibration recommendations.',
                'label_type': 'calibration_recommendation',
                'label_schema': json.dumps({
                    'type': 'object',
                    'properties': {
                        'calibration_needed': {'type': 'boolean'},
                        'recommended_adjustment': {'type': 'number'},
                        'confidence_level': {'type': 'string', 'enum': ['high', 'medium', 'low']},
                        'technical_rationale': {'type': 'string'},
                        'validation_required': {'type': 'boolean'}
                    }
                }),
                'model_name': 'databricks-meta-llama-3-1-70b-instruct',
                'temperature': 0.2,
                'max_tokens': 2048,
                'output_format': 'json',
                'allowed_uses': ['calibration_planning', 'training', 'technical_review'],
                'prohibited_uses': [],
                'version': 1,
                'status': 'active',
            }
        ]

        for template in templates:
            # Escape single quotes
            def escape_str(s):
                return s.replace("'", "''") if s else s

            allowed_uses_sql = f"ARRAY({', '.join([repr(u) for u in template['allowed_uses']])})"
            prohibited_uses_sql = f"ARRAY({', '.join([repr(u) for u in template['prohibited_uses']])})" if template['prohibited_uses'] else "ARRAY()"

            sql = f"""
            INSERT INTO `{self.catalog}`.`{self.schema}`.templates (
                id, name, description, system_prompt, user_prompt_template,
                label_type, label_schema, model_name, temperature, max_tokens,
                output_format, allowed_uses, prohibited_uses, version, status,
                is_latest, created_at, created_by, updated_at, updated_by
            ) VALUES (
                '{template['id']}',
                '{escape_str(template['name'])}',
                '{escape_str(template['description'])}',
                '{escape_str(template['system_prompt'])}',
                '{escape_str(template['user_prompt_template'])}',
                '{template['label_type']}',
                '{escape_str(template['label_schema'])}',
                '{template['model_name']}',
                {template['temperature']},
                {template['max_tokens']},
                '{template['output_format']}',
                {allowed_uses_sql},
                {prohibited_uses_sql},
                {template['version']},
                '{template['status']}',
                true,
                CURRENT_TIMESTAMP(),
                '{self.current_user}',
                CURRENT_TIMESTAMP(),
                '{self.current_user}'
            )
            """

            result = self.execute_sql(sql, f"Insert template: {template['name']}")
            if result['status'] != 'success':
                return False

        logger.info("")
        return True

    def seed_endpoints(self) -> bool:
        """Seed sample model endpoints"""
        logger.info("=" * 80)
        logger.info("Seeding Endpoints")
        logger.info("=" * 80)

        endpoints = [
            {
                'id': 'endpoint-defect-classifier-prod',
                'name': 'Defect Classifier - Production',
                'description': 'Production endpoint for defect classification in detector components',
                'endpoint_name': 'vital-defect-classifier-prod',
                'endpoint_type': 'model',
                'model_name': 'defect_classifier_v1',
                'model_version': '1.2.0',
                'status': 'ready',
            },
            {
                'id': 'endpoint-maintenance-predictor-prod',
                'name': 'Maintenance Predictor - Production',
                'description': 'Production endpoint for equipment failure prediction',
                'endpoint_name': 'vital-maintenance-predictor-prod',
                'endpoint_type': 'model',
                'model_name': 'maintenance_predictor_v2',
                'model_version': '2.1.0',
                'status': 'ready',
            },
            {
                'id': 'endpoint-calibration-advisor-staging',
                'name': 'Calibration Advisor - Staging',
                'description': 'Staging endpoint for calibration recommendations',
                'endpoint_name': 'vital-calibration-advisor-staging',
                'endpoint_type': 'agent',
                'model_name': 'calibration_advisor_v1',
                'model_version': '1.0.0',
                'status': 'ready',
            }
        ]

        for endpoint in endpoints:
            sql = f"""
            INSERT INTO `{self.catalog}`.`{self.schema}`.endpoints_registry (
                id, name, description, endpoint_name, endpoint_type,
                model_name, model_version, status,
                created_at, created_by, updated_at, updated_by
            ) VALUES (
                '{endpoint['id']}',
                '{endpoint['name']}',
                '{endpoint['description']}',
                '{endpoint['endpoint_name']}',
                '{endpoint['endpoint_type']}',
                '{endpoint['model_name']}',
                '{endpoint['model_version']}',
                '{endpoint['status']}',
                CURRENT_TIMESTAMP(),
                '{self.current_user}',
                CURRENT_TIMESTAMP(),
                '{self.current_user}'
            )
            """

            result = self.execute_sql(sql, f"Insert endpoint: {endpoint['name']}")
            if result['status'] != 'success':
                return False

        logger.info("")
        return True

    def seed_feedback(self) -> bool:
        """Seed sample feedback items"""
        logger.info("=" * 80)
        logger.info("Seeding Feedback Items")
        logger.info("=" * 80)

        feedback_items = [
            {
                'id': f'feedback-{uuid4()}',
                'endpoint_id': 'endpoint-defect-classifier-prod',
                'request_id': f'req-{uuid4()}',
                'rating': 5,
                'feedback_text': 'Perfect classification! Caught a critical defect that saved us from a bad batch.',
                'flagged': False,
            },
            {
                'id': f'feedback-{uuid4()}',
                'endpoint_id': 'endpoint-defect-classifier-prod',
                'request_id': f'req-{uuid4()}',
                'rating': 3,
                'feedback_text': 'Model was uncertain on this edge case. Consider adding more training examples.',
                'flagged': True,
            },
            {
                'id': f'feedback-{uuid4()}',
                'endpoint_id': 'endpoint-maintenance-predictor-prod',
                'request_id': f'req-{uuid4()}',
                'rating': 4,
                'feedback_text': 'Good prediction. Equipment failed within predicted timeframe.',
                'flagged': False,
            },
            {
                'id': f'feedback-{uuid4()}',
                'endpoint_id': 'endpoint-maintenance-predictor-prod',
                'request_id': f'req-{uuid4()}',
                'rating': 2,
                'feedback_text': 'False alarm - equipment is still running fine after 60 days.',
                'flagged': True,
            }
        ]

        for feedback in feedback_items:
            sql = f"""
            INSERT INTO `{self.catalog}`.`{self.schema}`.feedback_items (
                id, endpoint_id, request_id, rating, feedback_text, flagged,
                created_at
            ) VALUES (
                '{feedback['id']}',
                '{feedback['endpoint_id']}',
                '{feedback['request_id']}',
                {feedback['rating']},
                '{feedback['feedback_text'].replace("'", "''")}',
                {str(feedback['flagged']).lower()},
                CURRENT_TIMESTAMP()
            )
            """

            result = self.execute_sql(sql, f"Insert feedback: {feedback['id'][:20]}...")
            if result['status'] != 'success':
                return False

        logger.info("")
        return True

    def seed_alerts(self) -> bool:
        """Seed sample monitoring alerts"""
        logger.info("=" * 80)
        logger.info("Seeding Monitor Alerts")
        logger.info("=" * 80)

        now = datetime.now()
        alerts = [
            {
                'id': f'alert-{uuid4()}',
                'endpoint_id': 'endpoint-defect-classifier-prod',
                'alert_type': 'drift',
                'threshold': 0.15,
                'condition': 'gt',
                'status': 'active',
                'current_value': 0.18,
                'message': 'Data drift detected: Input distribution has shifted significantly',
                'triggered_at': now - timedelta(hours=2),
            },
            {
                'id': f'alert-{uuid4()}',
                'endpoint_id': 'endpoint-maintenance-predictor-prod',
                'alert_type': 'latency',
                'threshold': 500.0,
                'condition': 'gt',
                'status': 'resolved',
                'current_value': 520.0,
                'message': 'Response latency exceeded threshold (520ms > 500ms)',
                'triggered_at': now - timedelta(days=1),
                'resolved_at': now - timedelta(hours=12),
            },
            {
                'id': f'alert-{uuid4()}',
                'endpoint_id': 'endpoint-defect-classifier-prod',
                'alert_type': 'error_rate',
                'threshold': 0.05,
                'condition': 'gt',
                'status': 'acknowledged',
                'current_value': 0.07,
                'message': 'Error rate increased to 7% (threshold: 5%)',
                'triggered_at': now - timedelta(hours=6),
                'acknowledged_at': now - timedelta(hours=3),
                'acknowledged_by': self.current_user,
            }
        ]

        for alert in alerts:
            sql = f"""
            INSERT INTO `{self.catalog}`.`{self.schema}`.monitor_alerts (
                id, endpoint_id, alert_type, threshold, condition, status,
                current_value, message, triggered_at,
                {f"acknowledged_at, acknowledged_by," if alert.get('acknowledged_at') else ""}
                {f"resolved_at," if alert.get('resolved_at') else ""}
                created_at
            ) VALUES (
                '{alert['id']}',
                '{alert['endpoint_id']}',
                '{alert['alert_type']}',
                {alert['threshold']},
                '{alert['condition']}',
                '{alert['status']}',
                {alert['current_value']},
                '{alert['message'].replace("'", "''")}',
                TIMESTAMP'{alert['triggered_at'].strftime("%Y-%m-%d %H:%M:%S")}',
                {f"TIMESTAMP'{alert['acknowledged_at'].strftime('%Y-%m-%d %H:%M:%S')}', '{alert['acknowledged_by']}'," if alert.get('acknowledged_at') else ""}
                {f"TIMESTAMP'{alert['resolved_at'].strftime('%Y-%m-%d %H:%M:%S')}', " if alert.get('resolved_at') else ""}
                CURRENT_TIMESTAMP()
            )
            """

            result = self.execute_sql(sql, f"Insert alert: {alert['alert_type']} on {alert['endpoint_id']}")
            if result['status'] != 'success':
                return False

        logger.info("")
        return True

    def run(self) -> bool:
        """Run complete data seeding"""
        logger.info("=" * 80)
        logger.info("VITAL Workbench Test Data Seeding")
        logger.info("=" * 80)
        logger.info(f"Catalog: {self.catalog}")
        logger.info(f"Schema: {self.schema}")
        logger.info(f"User: {self.current_user}")
        logger.info("=" * 80)
        logger.info("")

        # Seed all tables
        if not self.seed_sheets():
            logger.error("Failed to seed sheets")
            return False

        if not self.seed_templates():
            logger.error("Failed to seed templates")
            return False

        if not self.seed_endpoints():
            logger.error("Failed to seed endpoints")
            return False

        if not self.seed_feedback():
            logger.error("Failed to seed feedback")
            return False

        if not self.seed_alerts():
            logger.error("Failed to seed alerts")
            return False

        # Summary
        logger.info("=" * 80)
        logger.info("SEEDING COMPLETE ✓")
        logger.info("=" * 80)
        logger.info("Sample data created:")
        logger.info("  • 3 Sheets (Mirion use cases)")
        logger.info("  • 3 Templates (Defect, Maintenance, Calibration)")
        logger.info("  • 3 Endpoints (Production + Staging)")
        logger.info("  • 4 Feedback items")
        logger.info("  • 3 Monitor alerts")
        logger.info("")
        logger.info("Next steps:")
        logger.info("  1. Run: python scripts/verify_database.py")
        logger.info("  2. Start the app and explore the sample data")
        return True


def main():
    parser = argparse.ArgumentParser(
        description='Seed VITAL Workbench with test data',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument('--catalog', required=True, help='Unity Catalog name')
    parser.add_argument('--schema', required=True, help='Schema name within catalog')
    parser.add_argument('--warehouse-id', help='SQL warehouse ID (optional)')
    parser.add_argument('--profile', help='Databricks CLI profile name (optional)')
    parser.add_argument('--debug', action='store_true', help='Enable debug logging')

    args = parser.parse_args()

    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)

    try:
        seeder = DataSeeder(
            catalog=args.catalog,
            schema=args.schema,
            warehouse_id=args.warehouse_id,
            profile=args.profile
        )

        success = seeder.run()
        sys.exit(0 if success else 1)

    except Exception as e:
        logger.exception(f"Seeding failed with error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
