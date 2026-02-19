"""Settings API - Global configuration including label classes.

Uses Lakebase for fast reads when available, falls back to hardcoded defaults.
"""

import json
import logging
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.models.sheet import LabelClass
from app.services.lakebase_service import get_lakebase_service
from app.services.sql_service import get_sql_service
from app.services.inference_service import get_inference_service
from app.core.config import get_settings

router = APIRouter(prefix="/settings", tags=["settings"])
logger = logging.getLogger(__name__)

# Lakebase service for fast reads
_lakebase = get_lakebase_service()


# ============================================================================
# Debug / Diagnostic Endpoints
# ============================================================================


class DataFlowDiagnostic(BaseModel):
    """Diagnostic info about the data flow pipeline."""

    lakebase_available: bool
    lakebase_initialized: bool
    sheets_count: int
    sheets_with_templates: int
    training_sheets_count: int
    training_sheets_by_status: dict[str, int]
    qa_pairs_by_review_status: dict[str, int]
    data_flow_issues: list[str]
    recommendations: list[str]


class CacheBustResult(BaseModel):
    """Result of cache bust operation."""

    lakebase_reset: bool
    previous_state: dict[str, Any]
    new_state: dict[str, Any]
    message: str


@router.post("/debug/bust-cache", response_model=CacheBustResult)
async def bust_cache():
    """Reset all caches to force fresh data reads.

    This resets:
    - Lakebase service initialization state
    - Forces re-check of Lakebase availability
    """
    global _lakebase

    # Capture previous state
    previous_state = {
        "lakebase_initialized": _lakebase._initialized,
        "lakebase_available": _lakebase._available if _lakebase._initialized else None,
    }

    # Reset Lakebase singleton
    from app.services import lakebase_service

    lakebase_service._lakebase_service = None
    _lakebase = get_lakebase_service()

    # Force re-initialization
    _lakebase._ensure_initialized()

    new_state = {
        "lakebase_initialized": _lakebase._initialized,
        "lakebase_available": _lakebase._available,
    }

    logger.info(f"Cache busted: {previous_state} -> {new_state}")

    return CacheBustResult(
        lakebase_reset=True,
        previous_state=previous_state,
        new_state=new_state,
        message="Cache reset complete. Lakebase availability re-checked.",
    )


@router.get("/debug/data-flow", response_model=DataFlowDiagnostic)
async def diagnose_data_flow():
    """Diagnose the data flow from sheets -> assemblies -> training.

    Returns counts, status breakdowns, and identified issues.
    """
    sql_service = get_sql_service()
    settings = get_settings()

    issues = []
    recommendations = []

    # Check Lakebase
    lakebase_available = _lakebase.is_available
    lakebase_initialized = _lakebase._initialized

    if not lakebase_available:
        issues.append("Lakebase not available - using slower Delta Lake reads")
        recommendations.append("Run Lakebase schema setup for sub-10ms reads")

    # Count sheets
    sheets_table = settings.get_table("sheets")
    try:
        sheets_result = sql_service.execute(f"SELECT COUNT(*) as cnt FROM {sheets_table}")
        sheets_count = int(sheets_result[0]["cnt"]) if sheets_result else 0
    except Exception as e:
        sheets_count = 0
        issues.append(f"Cannot query sheets table: {e}")

    # Count sheets with templates
    try:
        templates_result = sql_service.execute(
            f"SELECT COUNT(*) as cnt FROM {sheets_table} WHERE template_config IS NOT NULL"
        )
        sheets_with_templates = int(templates_result[0]["cnt"]) if templates_result else 0
    except Exception:
        sheets_with_templates = 0

    if sheets_count > 0 and sheets_with_templates == 0:
        issues.append("No sheets have templates attached")
        recommendations.append("Attach templates to sheets before assembling")

    # Count training sheets (formerly assemblies)
    training_sheets_table = settings.get_table("training_sheets")
    try:
        assemblies_result = sql_service.execute(f"SELECT COUNT(*) as cnt FROM {training_sheets_table}")
        assemblies_count = int(assemblies_result[0]["cnt"]) if assemblies_result else 0
    except Exception as e:
        assemblies_count = 0
        issues.append(f"Cannot query training_sheets table: {e}")

    # Training sheets by status
    assemblies_by_status = {}
    try:
        status_result = sql_service.execute(
            f"SELECT status, COUNT(*) as cnt FROM {training_sheets_table} GROUP BY status"
        )
        for row in status_result:
            assemblies_by_status[row["status"]] = int(row["cnt"])
    except Exception:
        pass

    if assemblies_by_status.get("assembling", 0) > 0:
        issues.append(f"{assemblies_by_status['assembling']} assemblies stuck in 'assembling' status")
        recommendations.append("Check assembly jobs for errors")

    if sheets_with_templates > 0 and assemblies_count == 0:
        issues.append("Sheets have templates but no assemblies created")
        recommendations.append("Run assemble on sheets to create training datasets")

    # Q&A pairs by review status (formerly assembly_rows by response_source)
    qa_pairs_table = settings.get_table("qa_pairs")
    qa_pairs_by_status = {}
    try:
        source_result = sql_service.execute(
            f"SELECT review_status, COUNT(*) as cnt FROM {qa_pairs_table} GROUP BY review_status"
        )
        for row in source_result:
            qa_pairs_by_status[row["review_status"]] = int(row["cnt"])
    except Exception:
        pass

    # Map new status names to old for compatibility
    pending_count = qa_pairs_by_status.get("pending", 0)
    approved_count = qa_pairs_by_status.get("approved", 0)
    total_rows = sum(qa_pairs_by_status.values())

    if total_rows > 0 and pending_count == total_rows:
        issues.append("All Q&A pairs are pending review - no approved responses yet")
        recommendations.append("Review and approve Q&A pairs in the Label stage")

    if total_rows > 0 and approved_count < 10:
        issues.append(f"Only {approved_count} approved Q&A pairs - need 10+ for training")
        recommendations.append("Approve more Q&A pairs in Label stage before training")

    # Check if training can proceed
    if assemblies_by_status.get("review", 0) > 0 and approved_count >= 10:
        recommendations.append("Ready to train! Go to Train stage to configure fine-tuning")

    return DataFlowDiagnostic(
        lakebase_available=lakebase_available,
        lakebase_initialized=lakebase_initialized,
        sheets_count=sheets_count,
        sheets_with_templates=sheets_with_templates,
        training_sheets_count=assemblies_count,
        training_sheets_by_status=assemblies_by_status,
        qa_pairs_by_review_status=qa_pairs_by_status,
        data_flow_issues=issues,
        recommendations=recommendations,
    )


@router.get("/debug/assembly/{assembly_id}/trace")
async def trace_assembly(assembly_id: str):
    """Trace a specific assembly's data flow.

    Shows the complete path from sheet -> template -> assembly rows.
    """
    sql_service = get_sql_service()
    settings = get_settings()

    training_sheets_table = settings.get_table("training_sheets")
    qa_pairs_table = settings.get_table("qa_pairs")
    sheets_table = settings.get_table("sheets")

    # Get training sheet
    ts_result = sql_service.execute(
        f"SELECT * FROM {training_sheets_table} WHERE id = '{assembly_id}'"
    )
    if not ts_result:
        return {"error": f"Training Sheet {assembly_id} not found"}

    training_sheet = ts_result[0]

    # Get source sheet
    sheet_id = training_sheet["sheet_id"]
    sheet_result = sql_service.execute(
        f"SELECT * FROM {sheets_table} WHERE id = '{sheet_id}'"
    )
    sheet = sheet_result[0] if sheet_result else None

    # Get Q&A pair stats by review status
    row_stats = sql_service.execute(f"""
        SELECT
            review_status,
            COUNT(*) as count,
            SUM(CASE WHEN quality_flags IS NOT NULL AND SIZE(quality_flags) > 0 THEN 1 ELSE 0 END) as flagged
        FROM {qa_pairs_table}
        WHERE training_sheet_id = '{assembly_id}'
        GROUP BY review_status
    """)

    # Get sample Q&A pairs
    sample_rows = sql_service.execute(f"""
        SELECT sequence_number, SUBSTRING(CAST(messages AS STRING), 1, 100) as messages_preview,
               review_status, quality_flags, quality_score
        FROM {qa_pairs_table}
        WHERE training_sheet_id = '{assembly_id}'
        ORDER BY sequence_number
        LIMIT 5
    """)

    return {
        "training_sheet": {
            "id": assembly_id,
            "status": training_sheet.get("status"),
            "generated_count": training_sheet.get("generated_count"),
            "created_at": str(training_sheet.get("created_at")),
        },
        "source_sheet": {
            "id": sheet_id,
            "name": sheet.get("name") if sheet else "NOT FOUND",
            "status": sheet.get("status") if sheet else None,
            "has_template": sheet.get("template_config") is not None if sheet else False,
        },
        "row_stats": [
            {
                "review_status": r["review_status"],
                "count": r["count"],
                "flagged": r["flagged"],
            }
            for r in row_stats
        ],
        "sample_rows": [
            {
                "sequence_number": r["sequence_number"],
                "messages_preview": r["messages_preview"],
                "review_status": r["review_status"],
                "quality_flags": r["quality_flags"],
                "quality_score": r["quality_score"],
            }
            for r in sample_rows
        ],
        "training_readiness": {
            "approved_count": sum(
                r["count"]
                for r in row_stats
                if r["review_status"] == "approved"
            ),
            "ready_for_training": training_sheet.get("status") in ("review", "approved")
            and sum(
                r["count"]
                for r in row_stats
                if r["review_status"] == "approved"
            )
            >= 10,
        },
    }


class SeedTestDataResponse(BaseModel):
    """Response from seeding test data."""

    success: bool = True
    sheets_created: int = 1
    templates_created: int = 1
    assemblies_created: int = 1
    message: str = "Test data seeded successfully!"
    errors: list[str] = []

    model_config = {
        "json_schema_extra": {
            "example": {
                "success": True,
                "sheets_created": 1,
                "templates_created": 1,
                "assemblies_created": 1,
                "message": "Test data seeded successfully!",
                "errors": []
            }
        }
    }


@router.post("/debug/seed-test-data", response_model=SeedTestDataResponse)
async def seed_test_data():
    """Seed sample data for testing the full workflow.

    Creates:
    - 1 sample sheet pointing to a synthetic defect detection table
    - 1 sample template for defect classification
    - 1 sample assembly (training sheet) with Q&A pairs

    Use this to quickly test the DATA → GENERATE → LABEL workflow.
    """
    import uuid
    from datetime import datetime
    from app.core.databricks import get_current_user

    sql_service = get_sql_service()
    settings = get_settings()
    user = get_current_user()
    errors = []

    sheets_created = 0
    templates_created = 0
    assemblies_created = 0

    # 1. Create sample sheet
    sheet_id = f"sheet-test-{uuid.uuid4().hex[:8]}"
    sheets_table = settings.get_table("sheets")

    try:
        sheet_sql = f"""
        INSERT INTO {sheets_table} (
            id, name, description, source_type, source_table,
            text_columns, image_columns, metadata_columns, item_id_column,
            status, created_by, created_at, updated_by, updated_at
        ) VALUES (
            '{sheet_id}',
            'Test Defect Detection Sheet',
            'Sample sheet for testing - created by debug endpoint',
            'uc_table',
            '{settings.databricks_catalog}.{settings.databricks_schema}.defect_detections',
            ARRAY('defect_type', 'severity', 'description'),
            ARRAY('image_path'),
            ARRAY('component_id', 'inspection_date'),
            'component_id',
            'active',
            '{user}',
            CURRENT_TIMESTAMP(),
            '{user}',
            CURRENT_TIMESTAMP()
        )
        """
        sql_service.execute_update(sheet_sql)
        sheets_created = 1
        logger.info(f"✓ Created test sheet: {sheet_id}")
    except Exception as e:
        errors.append(f"Sheet creation failed: {str(e)}")
        logger.error(f"Failed to create test sheet: {e}")

    # 2. Create sample template (matching actual schema)
    template_id = f"tmpl-test-{uuid.uuid4().hex[:8]}"
    templates_table = settings.get_table("templates")

    try:
        user_prompt = "Analyze this component inspection:\\n\\nComponent: {{component_id}}\\nDefect Type: {{defect_type}}\\nSeverity: {{severity}}\\nDescription: {{description}}\\n\\nProvide a classification and recommended action."
        user_prompt_escaped = user_prompt.replace("'", "''")
        system_prompt = "You are a quality control expert specializing in radiation safety equipment inspection."

        template_sql = f"""
        INSERT INTO {templates_table} (
            id, name, description, system_prompt, user_prompt_template,
            output_schema, label_type, few_shot_examples, version, status,
            parent_template_id, created_by, created_at, updated_by, updated_at,
            feature_columns, target_column
        ) VALUES (
            '{template_id}',
            'Test Defect Classification Template',
            'Sample template for defect classification testing',
            '{system_prompt}',
            '{user_prompt_escaped}',
            NULL,
            'defect_classification',
            NULL,
            '1',
            'active',
            NULL,
            '{user}',
            CURRENT_TIMESTAMP(),
            '{user}',
            CURRENT_TIMESTAMP(),
            ARRAY('defect_type', 'severity', 'description'),
            'classification'
        )
        """
        sql_service.execute_update(template_sql)
        templates_created = 1
        logger.info(f"✓ Created test template: {template_id}")
    except Exception as e:
        errors.append(f"Template creation failed: {str(e)}")
        logger.error(f"Failed to create test template: {e}")

    # 3. Create sample training sheet (assembly) - matching actual schema
    training_sheet_id = f"ts-test-{uuid.uuid4().hex[:8]}"
    training_sheets_table = settings.get_table("training_sheets")
    qa_pairs_table = settings.get_table("qa_pairs")

    try:
        ts_sql = f"""
        INSERT INTO {training_sheets_table} (
            id, name, description, sheet_id, template_id, template_version,
            generation_mode, model_used, generation_params, status,
            generation_started_at, generation_completed_at, generation_error,
            total_items, generated_count, approved_count, rejected_count, auto_approved_count,
            reviewed_by, reviewed_at, approval_rate,
            exported_at, exported_by, export_path, export_format,
            created_by, created_at, updated_by, updated_at,
            feature_columns, target_column
        ) VALUES (
            '{training_sheet_id}',
            'Test Training Dataset',
            'Sample training sheet for workflow testing',
            '{sheet_id}',
            '{template_id}',
            1,
            'template_based',
            NULL,
            NULL,
            'review',
            CURRENT_TIMESTAMP(),
            NULL,
            NULL,
            3,
            3,
            0,
            0,
            0,
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            '{user}',
            CURRENT_TIMESTAMP(),
            '{user}',
            CURRENT_TIMESTAMP(),
            ARRAY('defect_type', 'severity', 'description'),
            'classification'
        )
        """
        sql_service.execute_update(ts_sql)

        # Create sample Q&A pairs
        sample_qa = [
            {
                "item_ref": "COMP-001",
                "user_msg": "Analyze this component inspection:\\n\\nComponent: COMP-001\\nDefect Type: Scratch\\nSeverity: Minor\\nDescription: Surface scratch on casing\\n\\nProvide a classification and recommended action.",
                "assistant_msg": ""
            },
            {
                "item_ref": "COMP-002",
                "user_msg": "Analyze this component inspection:\\n\\nComponent: COMP-002\\nDefect Type: Crack\\nSeverity: Critical\\nDescription: Hairline crack in sensor housing\\n\\nProvide a classification and recommended action.",
                "assistant_msg": ""
            },
            {
                "item_ref": "COMP-003",
                "user_msg": "Analyze this component inspection:\\n\\nComponent: COMP-003\\nDefect Type: None\\nSeverity: None\\nDescription: No defects found\\n\\nProvide a classification and recommended action.",
                "assistant_msg": ""
            },
        ]

        for idx, qa in enumerate(sample_qa):
            qa_id = f"{training_sheet_id}-{idx}"
            messages = json.dumps([
                {"role": "user", "content": qa["user_msg"]},
                {"role": "assistant", "content": qa["assistant_msg"]}
            ]).replace("'", "''")

            qa_sql = f"""
            INSERT INTO {qa_pairs_table} (
                id, training_sheet_id, sheet_id, item_ref, messages,
                review_status, sequence_number,
                created_by, created_at, updated_by, updated_at
            ) VALUES (
                '{qa_id}',
                '{training_sheet_id}',
                '{sheet_id}',
                '{qa["item_ref"]}',
                '{messages}',
                'pending',
                {idx},
                '{user}',
                CURRENT_TIMESTAMP(),
                '{user}',
                CURRENT_TIMESTAMP()
            )
            """
            sql_service.execute_update(qa_sql)

        assemblies_created = 1
        logger.info(f"✓ Created test training sheet with 3 Q&A pairs: {training_sheet_id}")

    except Exception as e:
        errors.append(f"Training sheet creation failed: {str(e)}")
        logger.error(f"Failed to create test training sheet: {e}")

    success = len(errors) == 0
    message = "Test data seeded successfully!" if success else f"Partial success with {len(errors)} errors"

    return SeedTestDataResponse(
        success=success,
        sheets_created=sheets_created,
        templates_created=templates_created,
        assemblies_created=assemblies_created,
        message=message,
        errors=errors,
    )


class InferenceTestRequest(BaseModel):
    """Request to test AI inference."""

    prompt: str = "Say hello in exactly 5 words."
    model: str | None = None
    temperature: float = 0.7
    max_tokens: int = 100


class InferenceTestResponse(BaseModel):
    """Response from AI inference test."""

    success: bool
    response: str | None
    model_used: str
    error: str | None = None


@router.post("/debug/test-inference", response_model=InferenceTestResponse)
async def test_inference(request: InferenceTestRequest):
    """Test AI inference directly.

    Useful for debugging why AI generation fails during assembly.
    """
    inference_service = get_inference_service()

    model_used = request.model or inference_service.DEFAULT_TEXT_MODEL

    try:
        messages = [{"role": "user", "content": request.prompt}]
        result = await inference_service.chat_completion(
            messages=messages,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
        )
        return InferenceTestResponse(
            success=True,
            response=result.get("content"),
            model_used=model_used,
        )
    except Exception as e:
        logger.error(f"Inference test failed: {e}")
        return InferenceTestResponse(
            success=False,
            response=None,
            model_used=model_used,
            error=str(e),
        )


# Default global label library (fallback when Lakebase not configured)
DEFAULT_LABEL_CLASSES = [
    LabelClass(name="Defect", color="#ef4444", description="Identified defect or anomaly", hotkey="1"),
    LabelClass(name="Normal", color="#22c55e", description="Normal/expected condition", hotkey="2"),
    LabelClass(name="Warning", color="#f59e0b", description="Potential issue requiring attention", hotkey="3"),
    LabelClass(name="Critical", color="#dc2626", description="Critical issue requiring immediate action", hotkey="4"),
    LabelClass(name="Minor", color="#8b5cf6", description="Minor issue or cosmetic defect", hotkey="5"),
    LabelClass(name="Unknown", color="#6b7280", description="Unable to classify", hotkey="0"),
]


@router.get("/label-classes", response_model=list[LabelClass])
async def get_global_label_classes():
    """Get the global label class library.

    These are the default labels available for annotation tasks.
    Templates can use these or define their own custom labels.

    Uses Lakebase for sub-10ms reads when available, falls back to defaults.
    """
    # Try Lakebase first for customizable labels
    if _lakebase.is_available:
        rows = _lakebase.get_label_classes(preset_name=None)
        if rows:
            return [
                LabelClass(
                    name=row["name"],
                    color=row.get("color", "#6b7280"),
                    description=row.get("description"),
                    hotkey=row.get("hotkey"),
                )
                for row in rows
            ]

    # Fallback to hardcoded defaults
    return DEFAULT_LABEL_CLASSES


# Hardcoded preset configurations (fallback)
DEFAULT_PRESETS = {
    "defect_detection": [
        LabelClass(name="Defect", color="#ef4444", hotkey="1"),
        LabelClass(name="Normal", color="#22c55e", hotkey="2"),
        LabelClass(name="Scratch", color="#f59e0b", hotkey="3"),
        LabelClass(name="Crack", color="#dc2626", hotkey="4"),
        LabelClass(name="Stain", color="#8b5cf6", hotkey="5"),
    ],
    "quality_inspection": [
        LabelClass(name="Pass", color="#22c55e", hotkey="1"),
        LabelClass(name="Fail", color="#ef4444", hotkey="2"),
        LabelClass(name="Review", color="#f59e0b", hotkey="3"),
    ],
    "anomaly_detection": [
        LabelClass(name="Normal", color="#22c55e", hotkey="1"),
        LabelClass(name="Anomaly", color="#ef4444", hotkey="2"),
        LabelClass(name="Warning", color="#f59e0b", hotkey="3"),
    ],
    "radiation_safety": [
        LabelClass(name="Safe", color="#22c55e", hotkey="1"),
        LabelClass(name="Elevated", color="#f59e0b", hotkey="2"),
        LabelClass(name="High", color="#ef4444", hotkey="3"),
        LabelClass(name="Critical", color="#dc2626", hotkey="4"),
    ],
}


@router.get("/label-classes/presets")
async def get_label_presets():
    """Get preset label configurations for common use cases.

    Uses Lakebase for sub-10ms reads when available, falls back to defaults.
    """
    # Try Lakebase first for customizable presets
    if _lakebase.is_available:
        presets = {}
        for preset_name in DEFAULT_PRESETS.keys():
            rows = _lakebase.get_label_classes(preset_name=preset_name)
            if rows:
                presets[preset_name] = [
                    LabelClass(
                        name=row["name"],
                        color=row.get("color", "#6b7280"),
                        description=row.get("description"),
                        hotkey=row.get("hotkey"),
                    )
                    for row in rows
                ]
            else:
                # Use default for this preset
                presets[preset_name] = DEFAULT_PRESETS[preset_name]
        return presets

    # Fallback to hardcoded defaults
    return DEFAULT_PRESETS
