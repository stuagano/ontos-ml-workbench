"""VITAL-native data quality endpoints for Sheets.

Translates Sheet source_table references into DQX InputConfig and runs
profiling, check execution, and AI rule generation on behalf of the user.
"""

import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.dqx.dependencies import get_engine, get_generator, get_obo_ws, get_spark
from app.services.sql_service import execute_sql

from databricks.labs.dqx.engine import DQEngine
from databricks.labs.dqx.profiler.generator import DQGenerator
from databricks.sdk import WorkspaceClient
from pyspark.sql import SparkSession

logger = logging.getLogger("data_quality")

router = APIRouter(prefix="/data-quality", tags=["data-quality"])


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class ProfileResult(BaseModel):
    table: str
    row_count: int
    column_count: int
    columns: list[dict[str, Any]] = Field(default_factory=list)
    suggested_checks: list[dict[str, Any]] = Field(default_factory=list)


class RunChecksRequest(BaseModel):
    checks: list[dict[str, Any]] = Field(description="DQX check definitions to run")


class RunChecksResult(BaseModel):
    table: str
    total_rows: int
    passed_rows: int
    failed_rows: int
    pass_rate: float
    column_results: list[dict[str, Any]] = Field(default_factory=list)


class GenerateRulesRequest(BaseModel):
    description: str = Field(description="Natural language description of quality requirements")


class GenerateRulesResult(BaseModel):
    checks: list[dict[str, Any]]
    yaml_output: str


class QualityResults(BaseModel):
    sheet_id: str
    table: str
    last_run_at: str | None = None
    pass_rate: float | None = None
    total_checks: int = 0
    results: list[dict[str, Any]] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_sheet_source_table(sheet_id: str) -> str:
    """Look up the source_table for a sheet by ID."""
    rows = await execute_sql(
        "SELECT source_table FROM sheets WHERE id = :sheet_id",
        {"sheet_id": sheet_id},
    )
    if not rows:
        raise HTTPException(status_code=404, detail=f"Sheet '{sheet_id}' not found")
    source_table = rows[0].get("source_table")
    if not source_table:
        raise HTTPException(status_code=400, detail=f"Sheet '{sheet_id}' has no source table configured")
    return source_table


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/sheets/{sheet_id}/profile", response_model=ProfileResult)
async def profile_sheet(
    sheet_id: str,
    engine: Annotated[DQEngine, Depends(get_engine)],
    spark: Annotated[SparkSession, Depends(get_spark)],
):
    """Profile a sheet's source table and suggest quality rules."""
    source_table = await _get_sheet_source_table(sheet_id)

    try:
        df = spark.read.table(source_table)
        row_count = df.count()
        columns = [
            {"name": f.name, "type": str(f.dataType), "nullable": f.nullable}
            for f in df.schema.fields
        ]

        # Use DQX profiler to generate suggested checks
        suggested = []
        try:
            profiler_checks = engine.profile_summary(df)
            if profiler_checks:
                suggested = profiler_checks
        except Exception as e:
            logger.warning(f"Profiler failed (non-fatal): {e}")

        return ProfileResult(
            table=source_table,
            row_count=row_count,
            column_count=len(columns),
            columns=columns,
            suggested_checks=suggested,
        )
    except Exception as e:
        logger.error(f"Profile failed for {source_table}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to profile table: {e}")


@router.post("/sheets/{sheet_id}/run-checks", response_model=RunChecksResult)
async def run_checks(
    sheet_id: str,
    body: RunChecksRequest,
    engine: Annotated[DQEngine, Depends(get_engine)],
    spark: Annotated[SparkSession, Depends(get_spark)],
):
    """Run data quality checks on a sheet's source table."""
    source_table = await _get_sheet_source_table(sheet_id)

    try:
        df = spark.read.table(source_table)
        total_rows = df.count()

        valid_df, invalid_df = engine.apply_checks(df, body.checks)
        passed = valid_df.count()
        failed = invalid_df.count()

        # Build per-column results from invalid rows
        column_results = []
        if failed > 0:
            # Collect a sample of failures for reporting
            failures_sample = invalid_df.limit(100).toPandas().to_dict("records")
            # Group by check name
            check_failures: dict[str, int] = {}
            for row in failures_sample:
                for check in body.checks:
                    check_name = check.get("name", "unknown")
                    if check_name not in check_failures:
                        check_failures[check_name] = 0
                    check_failures[check_name] += 1

            column_results = [
                {"check": name, "failures": count}
                for name, count in check_failures.items()
            ]

        pass_rate = passed / total_rows if total_rows > 0 else 1.0

        return RunChecksResult(
            table=source_table,
            total_rows=total_rows,
            passed_rows=passed,
            failed_rows=failed,
            pass_rate=round(pass_rate, 4),
            column_results=column_results,
        )
    except Exception as e:
        logger.error(f"Check run failed for {source_table}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to run checks: {e}")


@router.post("/sheets/{sheet_id}/generate-rules", response_model=GenerateRulesResult)
async def generate_rules(
    sheet_id: str,
    body: GenerateRulesRequest,
    generator: Annotated[DQGenerator, Depends(get_generator)],
):
    """AI-assisted rule generation for a sheet."""
    source_table = await _get_sheet_source_table(sheet_id)

    try:
        import yaml
        prompt = f"Table: {source_table}\n{body.description}"
        checks = generator.generate_dq_rules_ai_assisted(user_input=prompt)
        yaml_output = yaml.dump(checks, default_flow_style=False, sort_keys=False)
        return GenerateRulesResult(checks=checks, yaml_output=yaml_output)
    except Exception as e:
        logger.error(f"Rule generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate rules: {e}")


@router.get("/sheets/{sheet_id}/results", response_model=QualityResults)
async def get_results(sheet_id: str):
    """Get the latest quality check results for a sheet."""
    source_table = await _get_sheet_source_table(sheet_id)

    # For now, return empty results — future: store results in Delta table
    return QualityResults(
        sheet_id=sheet_id,
        table=source_table,
    )
