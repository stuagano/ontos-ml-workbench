#!/usr/bin/env python3
"""
Execute all Ontos ML Workbench schemas in Unity Catalog.

Uses Databricks SDK to run SQL files in order.
Reads DATABRICKS_CATALOG and DATABRICKS_SCHEMA from environment (or backend/.env)
and substitutes ${CATALOG} / ${SCHEMA} placeholders in SQL files.

Usage:
    # Set env vars directly:
    export DATABRICKS_CATALOG=my_catalog
    export DATABRICKS_SCHEMA=ontos_ml_workbench
    python schemas/execute_schemas.py

    # Or use backend/.env file (auto-loaded if present)
"""
import os
import sys
from pathlib import Path


# SQL files in execution order
SQL_FILES = [
    "01_create_catalog.sql",
    "02_sheets.sql",
    "03_templates.sql",
    "04_canonical_labels.sql",
    "05_training_sheets.sql",
    "06_qa_pairs.sql",
    "07_model_training_lineage.sql",
    "08_example_store.sql",
    "99_validate_and_seed.sql",
]


def load_env_file():
    """Load backend/.env if it exists (simple key=value parsing)."""
    project_root = Path(__file__).parent.parent
    env_file = project_root / "backend" / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            # Only set if not already in environment (env vars take precedence)
            if key not in os.environ:
                os.environ[key] = value


def get_config():
    """Get catalog, schema, and lakebase_schema from environment."""
    catalog = os.getenv("DATABRICKS_CATALOG")
    schema = os.getenv("DATABRICKS_SCHEMA", "ontos_ml_workbench")
    lakebase_schema = os.getenv("LAKEBASE_SCHEMA", "ontos_ml_lakebase")

    if not catalog:
        print("ERROR: DATABRICKS_CATALOG is not set.")
        print("  Set it in backend/.env or export DATABRICKS_CATALOG=your_catalog")
        sys.exit(1)

    return catalog, schema, lakebase_schema


def substitute_placeholders(sql_content: str, catalog: str, schema: str, lakebase_schema: str) -> str:
    """Replace ${CATALOG}, ${SCHEMA}, and ${LAKEBASE_SCHEMA} placeholders."""
    return (
        sql_content
        .replace("${CATALOG}", catalog)
        .replace("${SCHEMA}", schema)
        .replace("${LAKEBASE_SCHEMA}", lakebase_schema)
    )


def execute_sql_file(w, warehouse_id: str, sql_file: Path, catalog: str, schema: str, lakebase_schema: str) -> None:
    """Execute a SQL file using Databricks SQL Warehouse."""
    print(f"  Executing: {sql_file.name}")

    sql_content = sql_file.read_text()
    sql_content = substitute_placeholders(sql_content, catalog, schema, lakebase_schema)

    # Split by semicolon and execute each statement
    statements = [s.strip() for s in sql_content.split(";") if s.strip() and not s.strip().startswith("--")]

    for i, statement in enumerate(statements, 1):
        if not statement or statement.isspace():
            continue
        try:
            result = w.statement_execution.execute_statement(
                statement=statement,
                warehouse_id=warehouse_id,
            )
            if result.status.state == "FAILED":
                print(f"    Statement {i} failed: {result.status.error}")
                sys.exit(1)
        except Exception as e:
            print(f"    Error executing statement {i}: {e}")
            print(f"    Statement: {statement[:100]}...")
            sys.exit(1)

    print(f"    Done ({len(statements)} statements)")


def main():
    load_env_file()
    catalog, schema, lakebase_schema = get_config()

    print("Ontos ML Workbench - Schema Setup")
    print(f"  Catalog: {catalog}")
    print(f"  Schema:  {schema}")
    print(f"  Lakebase Schema: {lakebase_schema}")
    print()

    # Import here so env vars are set first
    from databricks.sdk import WorkspaceClient

    try:
        w = WorkspaceClient()
        print("Connected to Databricks workspace")
    except Exception as e:
        print(f"Failed to connect: {e}")
        print("  Run: databricks auth login")
        sys.exit(1)

    warehouse_id = os.getenv("DATABRICKS_WAREHOUSE_ID")
    if not warehouse_id:
        warehouses = list(w.warehouses.list())
        if not warehouses:
            print("No SQL warehouses found. Set DATABRICKS_WAREHOUSE_ID.")
            sys.exit(1)
        warehouse_id = warehouses[0].id
        print(f"Using warehouse: {warehouses[0].name} ({warehouse_id})")

    print()
    schemas_dir = Path(__file__).parent

    for sql_file_name in SQL_FILES:
        sql_file = schemas_dir / sql_file_name
        if not sql_file.exists():
            print(f"File not found: {sql_file_name}")
            sys.exit(1)
        execute_sql_file(w, warehouse_id, sql_file, catalog, schema, lakebase_schema)

    print()
    print("All schemas created successfully!")
    print()
    print(f"Verify: SHOW TABLES IN {catalog}.{schema}")


if __name__ == "__main__":
    main()
