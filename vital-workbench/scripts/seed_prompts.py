#!/usr/bin/env python3
"""Seed MLflow Prompt Registry with sample prompt templates.

This script registers sample prompts for the VITAL Workbench demo.
Run after bootstrap.sh has set up the workspace.

Usage:
    DATABRICKS_CONFIG_PROFILE=fe-vm-<workspace> python scripts/seed_prompts.py
"""

import os

import mlflow

# Configure MLflow for Databricks Unity Catalog
profile = os.environ.get("DATABRICKS_CONFIG_PROFILE", "DEFAULT")
mlflow.set_tracking_uri("databricks")
mlflow.set_registry_uri(f"databricks-uc://{profile}")


def seed_prompts():
    """Register sample prompts in MLflow Prompt Registry."""

    # 1. Sensor Anomaly Detection Template
    print("Registering: Sensor Anomaly Detection...")
    mlflow.genai.register_prompt(
        name="sensor-anomaly-detection",
        template=[
            {
                "role": "system",
                "content": """You are an expert industrial IoT analyst specializing in sensor anomaly detection for radiation safety equipment.

Analyze sensor readings and classify the equipment status. Consider:
- Temperature: Normal range is 65-85°F. Warning at 90-100°F. Critical above 100°F or below 50°F.
- Humidity: Normal range is 40-60%. Warning outside 30-70%. Critical outside 20-80%.
- Correlations between readings that indicate systemic issues.

Respond in JSON format with your classification and reasoning.""",
            },
            {
                "role": "user",
                "content": """Analyze this sensor reading:

Sensor ID: {{sensor_id}}
Temperature: {{temperature}}°F
Humidity: {{humidity}}%
Current Status: {{status}}

Provide your analysis in this JSON format:
{
    "classification": "normal|warning|critical",
    "confidence": 0.0-1.0,
    "anomaly_detected": true|false,
    "reasoning": "explanation",
    "recommended_action": "action if needed"
}""",
            },
        ],
        commit_message="Initial sensor anomaly detection template",
        tags={
            "app": "vital-workbench",
            "use_case": "anomaly_detection",
            "status": "published",
            "author": "bootstrap",
            "base_model": "databricks-meta-llama-3-1-70b-instruct",
            "temperature": "0.3",
            "max_tokens": "512",
            "description": "Classify sensor readings as normal, warning, or critical based on temperature and humidity patterns",
            "input_schema": '[{"name":"sensor_id","type":"string","required":true},{"name":"temperature","type":"number","required":true},{"name":"humidity","type":"number","required":true},{"name":"status","type":"string","required":true}]',
            "output_schema": '[{"name":"classification","type":"string","required":true},{"name":"confidence","type":"number","required":true},{"name":"anomaly_detected","type":"boolean","required":true},{"name":"reasoning","type":"string","required":true},{"name":"recommended_action","type":"string","required":false}]',
        },
    )
    print("  ✓ Registered sensor-anomaly-detection")

    # 2. Defect Classification Template
    print("Registering: Defect Classification...")
    mlflow.genai.register_prompt(
        name="defect-classification",
        template=[
            {
                "role": "system",
                "content": """You are a quality control expert for manufacturing inspection. Your role is to classify defects found during product inspection.

Defect Categories:
- cosmetic: Visual imperfections that don't affect function (scratches, paint issues, minor dents)
- structural: Issues affecting physical integrity (cracks, incomplete welds, material defects)
- dimensional: Size/alignment issues affecting fit or assembly (misalignment, incorrect dimensions)
- functional: Issues affecting product operation (electrical faults, mechanical failures)
- none: No defect found, product passes inspection

Severity Levels:
- none: No defect
- minor: Cosmetic only, acceptable for shipment
- major: Requires rework before shipment
- critical: Safety concern or complete failure, requires immediate attention

Be precise and consistent in your classifications.""",
            },
            {
                "role": "user",
                "content": """Classify this inspection finding:

Product ID: {{product_id}}
Inspection Notes: {{inspection_notes}}

Provide classification in this JSON format:
{
    "defect_type": "cosmetic|structural|dimensional|functional|none",
    "severity": "none|minor|major|critical",
    "confidence": 0.0-1.0,
    "reasoning": "explanation of classification",
    "rework_required": true|false,
    "estimated_repair_time_hours": number or null
}""",
            },
        ],
        commit_message="Initial defect classification template",
        tags={
            "app": "vital-workbench",
            "use_case": "defect_detection",
            "status": "published",
            "author": "bootstrap",
            "base_model": "databricks-meta-llama-3-1-70b-instruct",
            "temperature": "0.2",
            "max_tokens": "512",
            "description": "Classify manufacturing defects by type and severity from inspection notes",
            "input_schema": '[{"name":"product_id","type":"string","required":true},{"name":"inspection_notes","type":"string","required":true}]',
            "output_schema": '[{"name":"defect_type","type":"string","required":true},{"name":"severity","type":"string","required":true},{"name":"confidence","type":"number","required":true},{"name":"reasoning","type":"string","required":true},{"name":"rework_required","type":"boolean","required":true},{"name":"estimated_repair_time_hours","type":"number","required":false}]',
        },
    )
    print("  ✓ Registered defect-classification")

    # 3. Predictive Maintenance Template
    print("Registering: Predictive Maintenance...")
    mlflow.genai.register_prompt(
        name="predictive-maintenance",
        template=[
            {
                "role": "system",
                "content": """You are a predictive maintenance AI for industrial radiation detection equipment. Analyze equipment telemetry and maintenance history to predict potential failures.

Consider these factors:
- Operating hours since last maintenance
- Temperature trends (rising temps often indicate wear)
- Vibration patterns
- Historical failure modes for similar equipment
- Seasonal/environmental factors

Your goal is to predict failures BEFORE they occur to prevent unplanned downtime.""",
            },
            {
                "role": "user",
                "content": """Analyze this equipment for maintenance needs:

Equipment ID: {{equipment_id}}
Equipment Type: {{equipment_type}}
Operating Hours: {{operating_hours}}
Last Maintenance: {{last_maintenance_date}}
Current Temperature: {{current_temp}}°F
Avg Temperature (30d): {{avg_temp_30d}}°F
Recent Alerts: {{recent_alerts}}

Provide your maintenance prediction:
{
    "failure_probability_30d": 0.0-1.0,
    "failure_probability_90d": 0.0-1.0,
    "recommended_action": "none|monitor|schedule_maintenance|immediate_attention",
    "predicted_failure_mode": "description or null",
    "confidence": 0.0-1.0,
    "reasoning": "explanation",
    "suggested_maintenance_date": "YYYY-MM-DD or null"
}""",
            },
        ],
        commit_message="Initial predictive maintenance template",
        tags={
            "app": "vital-workbench",
            "use_case": "predictive_maintenance",
            "status": "draft",
            "author": "bootstrap",
            "base_model": "databricks-meta-llama-3-1-70b-instruct",
            "temperature": "0.4",
            "max_tokens": "768",
            "description": "Predict equipment failures and recommend maintenance actions based on telemetry data",
            "input_schema": '[{"name":"equipment_id","type":"string","required":true},{"name":"equipment_type","type":"string","required":true},{"name":"operating_hours","type":"number","required":true},{"name":"last_maintenance_date","type":"string","required":true},{"name":"current_temp","type":"number","required":true},{"name":"avg_temp_30d","type":"number","required":true},{"name":"recent_alerts","type":"string","required":false}]',
            "output_schema": '[{"name":"failure_probability_30d","type":"number","required":true},{"name":"failure_probability_90d","type":"number","required":true},{"name":"recommended_action","type":"string","required":true},{"name":"predicted_failure_mode","type":"string","required":false},{"name":"confidence","type":"number","required":true},{"name":"reasoning","type":"string","required":true},{"name":"suggested_maintenance_date","type":"string","required":false}]',
        },
    )
    print("  ✓ Registered predictive-maintenance")

    # 4. Calibration Insights Template
    print("Registering: Calibration Insights...")
    mlflow.genai.register_prompt(
        name="calibration-insights",
        template=[
            {
                "role": "system",
                "content": """You are a radiation physics expert specializing in detector calibration. Analyze Monte Carlo simulation results and provide calibration recommendations.

Your expertise includes:
- Interpreting MC simulation outputs for radiation detectors
- Identifying calibration drift and correction factors
- Recommending recalibration schedules
- Ensuring compliance with regulatory standards (NRC, ISO)

Be precise with numerical recommendations as they affect measurement accuracy.""",
            },
            {
                "role": "user",
                "content": """Analyze these calibration results:

Detector ID: {{detector_id}}
Detector Type: {{detector_type}}
MC Simulation Energy (keV): {{mc_energy}}
Expected Response: {{expected_response}}
Measured Response: {{measured_response}}
Last Calibration: {{last_calibration_date}}
Calibration Factor (current): {{current_cal_factor}}

Provide calibration analysis:
{
    "response_deviation_percent": number,
    "new_calibration_factor": number,
    "calibration_status": "valid|needs_adjustment|requires_recalibration",
    "drift_detected": true|false,
    "drift_rate_per_month": number or null,
    "recommended_action": "description",
    "next_calibration_date": "YYYY-MM-DD",
    "compliance_status": "compliant|warning|non_compliant",
    "reasoning": "explanation"
}""",
            },
        ],
        commit_message="Initial calibration insights template",
        tags={
            "app": "vital-workbench",
            "use_case": "calibration",
            "status": "draft",
            "author": "bootstrap",
            "base_model": "databricks-meta-llama-3-1-70b-instruct",
            "temperature": "0.2",
            "max_tokens": "768",
            "description": "Analyze Monte Carlo simulation results and provide detector calibration recommendations",
            "input_schema": '[{"name":"detector_id","type":"string","required":true},{"name":"detector_type","type":"string","required":true},{"name":"mc_energy","type":"number","required":true},{"name":"expected_response","type":"number","required":true},{"name":"measured_response","type":"number","required":true},{"name":"last_calibration_date","type":"string","required":true},{"name":"current_cal_factor","type":"number","required":true}]',
            "output_schema": '[{"name":"response_deviation_percent","type":"number","required":true},{"name":"new_calibration_factor","type":"number","required":true},{"name":"calibration_status","type":"string","required":true},{"name":"drift_detected","type":"boolean","required":true},{"name":"recommended_action","type":"string","required":true},{"name":"next_calibration_date","type":"string","required":true},{"name":"compliance_status","type":"string","required":true},{"name":"reasoning","type":"string","required":true}]',
        },
    )
    print("  ✓ Registered calibration-insights")

    print("\n✅ All prompt templates registered successfully!")
    print("\nRegistered templates:")
    print("  - sensor-anomaly-detection (published)")
    print("  - defect-classification (published)")
    print("  - predictive-maintenance (draft)")
    print("  - calibration-insights (draft)")


if __name__ == "__main__":
    seed_prompts()
