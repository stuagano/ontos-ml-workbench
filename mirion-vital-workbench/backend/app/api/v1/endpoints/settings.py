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
    assemblies_count: int
    assemblies_by_status: dict[str, int]
    assembly_rows_by_source: dict[str, int]
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

    # Count assemblies
    assemblies_table = settings.get_table("assemblies")
    try:
        assemblies_result = sql_service.execute(f"SELECT COUNT(*) as cnt FROM {assemblies_table}")
        assemblies_count = int(assemblies_result[0]["cnt"]) if assemblies_result else 0
    except Exception as e:
        assemblies_count = 0
        issues.append(f"Cannot query assemblies table: {e}")

    # Assemblies by status
    assemblies_by_status = {}
    try:
        status_result = sql_service.execute(
            f"SELECT status, COUNT(*) as cnt FROM {assemblies_table} GROUP BY status"
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

    # Assembly rows by response source
    assembly_rows_table = settings.get_table("assembly_rows")
    assembly_rows_by_source = {}
    try:
        source_result = sql_service.execute(
            f"SELECT response_source, COUNT(*) as cnt FROM {assembly_rows_table} GROUP BY response_source"
        )
        for row in source_result:
            assembly_rows_by_source[row["response_source"]] = int(row["cnt"])
    except Exception:
        pass

    empty_count = assembly_rows_by_source.get("empty", 0)
    labeled_count = (
        assembly_rows_by_source.get("human_labeled", 0)
        + assembly_rows_by_source.get("human_verified", 0)
    )
    total_rows = sum(assembly_rows_by_source.values())

    if total_rows > 0 and empty_count == total_rows:
        issues.append("All assembly rows are empty - no responses yet")
        recommendations.append("Generate AI responses or label manually in Curate stage")

    if total_rows > 0 and labeled_count < 10:
        issues.append(f"Only {labeled_count} labeled rows - need 10+ for training")
        recommendations.append("Label more rows in Curate stage before training")

    # Check if training can proceed
    if assemblies_by_status.get("ready", 0) > 0 and labeled_count >= 10:
        recommendations.append("Ready to train! Go to Train stage to configure fine-tuning")

    return DataFlowDiagnostic(
        lakebase_available=lakebase_available,
        lakebase_initialized=lakebase_initialized,
        sheets_count=sheets_count,
        sheets_with_templates=sheets_with_templates,
        assemblies_count=assemblies_count,
        assemblies_by_status=assemblies_by_status,
        assembly_rows_by_source=assembly_rows_by_source,
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

    assemblies_table = settings.get_table("assemblies")
    assembly_rows_table = settings.get_table("assembly_rows")
    sheets_table = settings.get_table("sheets")

    # Get assembly (try both column names for Delta vs Lakebase compatibility)
    assembly_result = sql_service.execute(
        f"SELECT * FROM {assemblies_table} WHERE id = '{assembly_id}'"
    )
    if not assembly_result:
        return {"error": f"Assembly {assembly_id} not found"}

    assembly = assembly_result[0]

    # Get source sheet
    sheet_id = assembly["sheet_id"]
    sheet_result = sql_service.execute(
        f"SELECT * FROM {sheets_table} WHERE id = '{sheet_id}'"
    )
    sheet = sheet_result[0] if sheet_result else None

    # Get row stats (use Databricks SQL compatible syntax)
    row_stats = sql_service.execute(f"""
        SELECT
            response_source,
            COUNT(*) as count,
            SUM(CASE WHEN is_flagged = TRUE THEN 1 ELSE 0 END) as flagged
        FROM {assembly_rows_table}
        WHERE assembly_id = '{assembly_id}'
        GROUP BY response_source
    """)

    # Get sample rows (use SUBSTRING instead of LEFT for Databricks SQL)
    sample_rows = sql_service.execute(f"""
        SELECT row_index, SUBSTRING(prompt, 1, 100) as prompt_preview,
               response_source, is_flagged, confidence_score
        FROM {assembly_rows_table}
        WHERE assembly_id = '{assembly_id}'
        ORDER BY row_index
        LIMIT 5
    """)

    # Parse template config
    template_config = json.loads(assembly.get("template_config", "{}"))

    return {
        "assembly": {
            "id": assembly_id,
            "status": assembly.get("status"),
            "total_rows": assembly.get("total_rows"),
            "created_at": str(assembly.get("created_at")),
        },
        "source_sheet": {
            "id": sheet_id,
            "name": sheet.get("name") if sheet else "NOT FOUND",
            "status": sheet.get("status") if sheet else None,
            "has_template": sheet.get("template_config") is not None if sheet else False,
        },
        "template_config": {
            "name": template_config.get("name"),
            "response_source_mode": template_config.get("response_source_mode"),
            "response_column": template_config.get("response_column"),
            "prompt_template_preview": template_config.get("prompt_template", "")[:200],
        },
        "row_stats": [
            {
                "source": r["response_source"],
                "count": r["count"],
                "flagged": r["flagged"],
            }
            for r in row_stats
        ],
        "sample_rows": [
            {
                "row_index": r["row_index"],
                "prompt_preview": r["prompt_preview"],
                "source": r["response_source"],
                "flagged": r["is_flagged"],
                "confidence": r["confidence_score"],
            }
            for r in sample_rows
        ],
        "training_readiness": {
            "labeled_count": sum(
                r["count"]
                for r in row_stats
                if r["response_source"] in ("human_labeled", "human_verified")
            ),
            "ready_for_training": assembly.get("status") == "ready"
            and sum(
                r["count"]
                for r in row_stats
                if r["response_source"] in ("human_labeled", "human_verified")
            )
            >= 10,
        },
    }


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
