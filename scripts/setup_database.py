#!/usr/bin/env python3
"""
Database Setup Script for Ontos ML Workbench

Initializes all required Delta tables in Unity Catalog with proper error handling
and idempotent execution.

Usage:
    python scripts/setup_database.py --catalog your_catalog --schema ontos_ml_workbench
    python scripts/setup_database.py --catalog your_catalog --schema ontos_ml_workbench --warehouse-id your_warehouse_id
    python scripts/setup_database.py --profile dev --reset  # Reset all tables
"""

import argparse
import logging
import sys
import time
from pathlib import Path
from typing import List, Dict, Any, Optional

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementState

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DatabaseSetup:
    """Handles database initialization for Ontos ML Workbench"""

    def __init__(self, catalog: str, schema: str, warehouse_id: Optional[str] = None, profile: Optional[str] = None):
        """
        Initialize database setup

        Args:
            catalog: Unity Catalog name
            schema: Schema name within catalog
            warehouse_id: SQL warehouse ID (optional, will auto-detect if not provided)
            profile: Databricks CLI profile name (optional)
        """
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
                logger.info(f"Using SQL warehouse: {warehouses[0].name} ({self.warehouse_id})")
            else:
                raise ValueError("No SQL warehouse found. Please provide --warehouse-id")

        # Schema file locations
        self.schemas_dir = Path(__file__).parent.parent / "schemas"

    def execute_sql(self, sql: str, description: str = "SQL statement") -> Dict[str, Any]:
        """
        Execute SQL statement and wait for completion

        Args:
            sql: SQL statement to execute
            description: Human-readable description for logging

        Returns:
            Result dictionary with status and data
        """
        logger.info(f"Executing: {description}")
        logger.debug(f"SQL: {sql[:200]}...")

        try:
            result = self.client.statement_execution.execute_statement(
                statement=sql,
                warehouse_id=self.warehouse_id
            )

            # Poll for completion
            for attempt in range(60):  # 60 second timeout
                status = self.client.statement_execution.get_statement(result.statement_id)

                if status.status.state == StatementState.SUCCEEDED:
                    logger.info(f"✓ {description} - SUCCESS")
                    return {
                        'status': 'success',
                        'data': status.result.data_array if status.result else None,
                        'schema': status.result.manifest.schema if status.result and status.result.manifest else None
                    }
                elif status.status.state in [StatementState.FAILED, StatementState.CANCELED]:
                    error_msg = status.status.error.message if status.status.error else "Unknown error"
                    logger.error(f"✗ {description} - FAILED: {error_msg}")
                    return {
                        'status': 'failed',
                        'error': error_msg
                    }

                time.sleep(1)

            raise TimeoutError(f"Timeout waiting for: {description}")

        except Exception as e:
            logger.error(f"✗ {description} - ERROR: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }

    def create_catalog_and_schema(self) -> bool:
        """Create catalog and schema if they don't exist"""
        logger.info("=" * 80)
        logger.info("STEP 1: Create Catalog and Schema")
        logger.info("=" * 80)

        # Create catalog
        result = self.execute_sql(
            f"CREATE CATALOG IF NOT EXISTS `{self.catalog}`",
            f"Create catalog: {self.catalog}"
        )
        if result['status'] == 'failed':
            return False

        # Create schema
        result = self.execute_sql(
            f"CREATE SCHEMA IF NOT EXISTS `{self.catalog}`.`{self.schema}`",
            f"Create schema: {self.catalog}.{self.schema}"
        )
        if result['status'] == 'failed':
            return False

        logger.info("")
        return True

    def table_exists(self, table_name: str) -> bool:
        """Check if a table exists"""
        result = self.execute_sql(
            f"SHOW TABLES IN `{self.catalog}`.`{self.schema}` LIKE '{table_name}'",
            f"Check if table exists: {table_name}"
        )
        return result['status'] == 'success' and result['data'] and len(result['data']) > 0

    def drop_table(self, table_name: str) -> bool:
        """Drop a table if it exists"""
        result = self.execute_sql(
            f"DROP TABLE IF EXISTS `{self.catalog}`.`{self.schema}`.`{table_name}`",
            f"Drop table: {table_name}"
        )
        return result['status'] == 'success'

    def create_table_from_sql(self, sql_content: str, table_name: str) -> bool:
        """
        Create table from SQL file content

        Args:
            sql_content: SQL DDL content
            table_name: Table name for logging

        Returns:
            True if successful
        """
        # Replace catalog/schema placeholders
        sql_content = sql_content.replace(
            'your_catalog.ontos_ml_workbench',
            f'`{self.catalog}`.`{self.schema}`'
        )
        sql_content = sql_content.replace('${catalog}', f'`{self.catalog}`')
        sql_content = sql_content.replace('${schema}', f'`{self.schema}`')

        # Execute each statement (split by semicolon for files with multiple statements)
        statements = [s.strip() for s in sql_content.split(';') if s.strip() and not s.strip().startswith('--')]

        for i, stmt in enumerate(statements):
            if not stmt:
                continue

            # Skip comments-only lines
            if all(line.strip().startswith('--') for line in stmt.split('\n') if line.strip()):
                continue

            desc = f"Create {table_name} (statement {i+1}/{len(statements)})"
            result = self.execute_sql(stmt, desc)

            if result['status'] == 'failed':
                return False

        return True

    def create_core_tables(self, reset: bool = False) -> Dict[str, bool]:
        """
        Create all core tables

        Args:
            reset: If True, drop existing tables before creating

        Returns:
            Dictionary mapping table names to success status
        """
        logger.info("=" * 80)
        logger.info("STEP 2: Create Core Tables")
        logger.info("=" * 80)

        # Define tables in dependency order
        tables = [
            ('sheets', '02_sheets.sql'),
            ('templates', '03_templates.sql'),
            ('canonical_labels', '04_canonical_labels.sql'),
            ('training_sheets', '05_training_sheets.sql'),
            ('qa_pairs', '06_qa_pairs.sql'),
            ('model_training_lineage', '07_model_training_lineage.sql'),
            ('example_store', '08_example_store.sql'),
        ]

        results = {}

        for table_name, sql_file in tables:
            logger.info(f"\nProcessing table: {table_name}")

            # Check if table exists
            exists = self.table_exists(table_name)

            if exists and not reset:
                logger.info(f"  ↪ Table already exists, skipping: {table_name}")
                results[table_name] = True
                continue

            if exists and reset:
                logger.warning(f"  ⚠ Dropping existing table: {table_name}")
                if not self.drop_table(table_name):
                    logger.error(f"  ✗ Failed to drop table: {table_name}")
                    results[table_name] = False
                    continue

            # Read SQL file
            sql_path = self.schemas_dir / sql_file
            if not sql_path.exists():
                logger.error(f"  ✗ SQL file not found: {sql_path}")
                results[table_name] = False
                continue

            with open(sql_path, 'r') as f:
                sql_content = f.read()

            # Create table
            success = self.create_table_from_sql(sql_content, table_name)
            results[table_name] = success

        logger.info("")
        return results

    def create_monitoring_tables(self, reset: bool = False) -> Dict[str, bool]:
        """Create monitoring and registry tables"""
        logger.info("=" * 80)
        logger.info("STEP 3: Create Monitoring & Registry Tables")
        logger.info("=" * 80)

        tables = [
            ('monitor_alerts', 'create_monitor_alerts.sql'),
        ]

        # Also create endpoints_registry and feedback_items from init.sql
        additional_tables = [
            ('endpoints_registry', None),
            ('feedback_items', None),
            ('job_runs', None),
        ]

        results = {}

        # Create tables from dedicated SQL files
        for table_name, sql_file in tables:
            logger.info(f"\nProcessing table: {table_name}")

            exists = self.table_exists(table_name)

            if exists and not reset:
                logger.info(f"  ↪ Table already exists, skipping: {table_name}")
                results[table_name] = True
                continue

            if exists and reset:
                logger.warning(f"  ⚠ Dropping existing table: {table_name}")
                if not self.drop_table(table_name):
                    logger.error(f"  ✗ Failed to drop table: {table_name}")
                    results[table_name] = False
                    continue

            sql_path = self.schemas_dir / sql_file
            if not sql_path.exists():
                logger.error(f"  ✗ SQL file not found: {sql_path}")
                results[table_name] = False
                continue

            with open(sql_path, 'r') as f:
                sql_content = f.read()

            success = self.create_table_from_sql(sql_content, table_name)
            results[table_name] = success

        # Create tables from init.sql
        init_sql_path = self.schemas_dir / 'init.sql'
        if init_sql_path.exists():
            with open(init_sql_path, 'r') as f:
                init_sql = f.read()

            for table_name, _ in additional_tables:
                logger.info(f"\nProcessing table: {table_name}")

                exists = self.table_exists(table_name)

                if exists and not reset:
                    logger.info(f"  ↪ Table already exists, skipping: {table_name}")
                    results[table_name] = True
                    continue

                if exists and reset:
                    logger.warning(f"  ⚠ Dropping existing table: {table_name}")
                    if not self.drop_table(table_name):
                        logger.error(f"  ✗ Failed to drop table: {table_name}")
                        results[table_name] = False
                        continue

                # Extract table creation SQL from init.sql
                # Look for CREATE TABLE ... {table_name}
                start_marker = f"CREATE TABLE IF NOT EXISTS ${{catalog}}.${{schema}}.{table_name}"
                if start_marker in init_sql:
                    # Find the section
                    start_idx = init_sql.find(start_marker)
                    # Find the next CREATE TABLE or end of file
                    next_create = init_sql.find("CREATE TABLE IF NOT EXISTS", start_idx + len(start_marker))
                    if next_create == -1:
                        table_sql = init_sql[start_idx:]
                    else:
                        table_sql = init_sql[start_idx:next_create]

                    success = self.create_table_from_sql(table_sql, table_name)
                    results[table_name] = success
                else:
                    logger.warning(f"  ⚠ Table definition not found in init.sql: {table_name}")
                    results[table_name] = False

        logger.info("")
        return results

    def verify_setup(self) -> Dict[str, Any]:
        """Verify all tables were created successfully"""
        logger.info("=" * 80)
        logger.info("STEP 4: Verify Database Setup")
        logger.info("=" * 80)

        required_tables = [
            'sheets',
            'templates',
            'canonical_labels',
            'training_sheets',
            'qa_pairs',
            'model_training_lineage',
            'example_store',
            'monitor_alerts',
            'endpoints_registry',
            'feedback_items',
            'job_runs',
        ]

        results = {
            'total': len(required_tables),
            'success': 0,
            'missing': []
        }

        for table_name in required_tables:
            exists = self.table_exists(table_name)
            if exists:
                results['success'] += 1
                logger.info(f"  ✓ {table_name}")
            else:
                results['missing'].append(table_name)
                logger.error(f"  ✗ {table_name} - MISSING")

        logger.info("")
        logger.info(f"Tables created: {results['success']}/{results['total']}")

        if results['missing']:
            logger.error(f"Missing tables: {', '.join(results['missing'])}")

        return results

    def run(self, reset: bool = False) -> bool:
        """
        Run complete database setup

        Args:
            reset: If True, drop and recreate all tables

        Returns:
            True if setup was successful
        """
        logger.info("=" * 80)
        logger.info("Ontos ML Workbench Database Setup")
        logger.info("=" * 80)
        logger.info(f"Catalog: {self.catalog}")
        logger.info(f"Schema: {self.schema}")
        logger.info(f"Warehouse: {self.warehouse_id}")
        logger.info(f"Reset mode: {reset}")
        logger.info("=" * 80)
        logger.info("")

        # Step 1: Create catalog and schema
        if not self.create_catalog_and_schema():
            logger.error("Failed to create catalog and schema")
            return False

        # Step 2: Create core tables
        core_results = self.create_core_tables(reset=reset)

        # Step 3: Create monitoring tables
        monitoring_results = self.create_monitoring_tables(reset=reset)

        # Step 4: Verify
        verification = self.verify_setup()

        # Summary
        logger.info("=" * 80)
        logger.info("SETUP SUMMARY")
        logger.info("=" * 80)

        all_results = {**core_results, **monitoring_results}
        success_count = sum(1 for v in all_results.values() if v)
        total_count = len(all_results)

        logger.info(f"Tables processed: {success_count}/{total_count}")

        if verification['missing']:
            logger.error(f"SETUP INCOMPLETE - Missing tables: {', '.join(verification['missing'])}")
            return False
        else:
            logger.info("SETUP COMPLETE ✓")
            logger.info("")
            logger.info("Next steps:")
            logger.info("  1. Run: python scripts/seed_test_data.py")
            logger.info("  2. Run: python scripts/verify_database.py")
            return True


def main():
    parser = argparse.ArgumentParser(
        description='Initialize Ontos ML Workbench database',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Setup with auto-detected warehouse
  python scripts/setup_database.py --catalog your_catalog --schema ontos_ml_workbench

  # Setup with specific warehouse
  python scripts/setup_database.py --catalog your_catalog --schema ontos_ml_workbench --warehouse-id your_warehouse_id

  # Setup using CLI profile
  python scripts/setup_database.py --profile dev --catalog your_catalog --schema ontos_ml_workbench

  # Reset and recreate all tables (⚠️  DESTRUCTIVE)
  python scripts/setup_database.py --catalog your_catalog --schema ontos_ml_workbench --reset
        """
    )

    parser.add_argument('--catalog', required=True, help='Unity Catalog name')
    parser.add_argument('--schema', required=True, help='Schema name within catalog')
    parser.add_argument('--warehouse-id', help='SQL warehouse ID (optional, will auto-detect)')
    parser.add_argument('--profile', help='Databricks CLI profile name (optional)')
    parser.add_argument('--reset', action='store_true', help='Drop and recreate all tables (⚠️  DESTRUCTIVE)')
    parser.add_argument('--debug', action='store_true', help='Enable debug logging')

    args = parser.parse_args()

    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)

    if args.reset:
        logger.warning("⚠️  RESET MODE ENABLED - All existing tables will be dropped!")
        response = input("Are you sure you want to continue? (yes/no): ")
        if response.lower() != 'yes':
            logger.info("Aborted by user")
            sys.exit(0)

    try:
        setup = DatabaseSetup(
            catalog=args.catalog,
            schema=args.schema,
            warehouse_id=args.warehouse_id,
            profile=args.profile
        )

        success = setup.run(reset=args.reset)
        sys.exit(0 if success else 1)

    except Exception as e:
        logger.exception(f"Setup failed with error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
