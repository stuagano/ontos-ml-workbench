"""
Migration script: Add ML column configuration to templates table
"""
import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from dotenv import load_dotenv
from databricks.sdk import WorkspaceClient
from app.core.config import Settings

def main():
    """Add feature_columns and target_column to templates table."""
    print("=" * 80)
    print("Migration: Add ML column configuration to templates table")
    print("=" * 80)

    # Load environment variables
    env_path = Path(__file__).parent.parent / "backend" / ".env"
    load_dotenv(env_path)

    # Initialize settings
    settings = Settings()

    # Initialize Databricks client
    client = WorkspaceClient(profile=settings.databricks_config_profile)

    # SQL statements
    sql_statements = [
        f"""
        ALTER TABLE {settings.get_table("templates")}
        ADD COLUMN feature_columns ARRAY<STRING> COMMENT 'Independent variables (input features) - columns used to make predictions'
        """,
        f"""
        ALTER TABLE {settings.get_table("templates")}
        ADD COLUMN target_column STRING COMMENT 'Dependent variable (output/target) - the column we are trying to predict'
        """
    ]

    for i, sql in enumerate(sql_statements, 1):
        print(f"\n[{i}/{len(sql_statements)}] Executing: {sql.strip()[:100]}...")
        try:
            result = client.statement_execution.execute_statement(
                warehouse_id=settings.databricks_warehouse_id,
                statement=sql,
                wait_timeout="30s"
            )

            if result.status.state == "SUCCEEDED":
                print(f"✓ Success")
            else:
                print(f"✗ Failed: {result.status.state}")
                if result.status.error:
                    print(f"  Error: {result.status.error.message}")
        except Exception as e:
            print(f"✗ Error: {e}")
            # Continue with next statement even if this one fails

    print("\n" + "=" * 80)
    print("Migration complete!")
    print("=" * 80)

if __name__ == "__main__":
    main()
