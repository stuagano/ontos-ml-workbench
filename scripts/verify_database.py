#!/usr/bin/env python3
"""
Database Verification Script for Ontos ML Workbench

Verifies all required tables exist, checks schemas, and reports status.

Usage:
    python scripts/verify_database.py --catalog your_catalog --schema ontos_ml_workbench
    python scripts/verify_database.py --profile dev --catalog your_catalog --schema ontos_ml_workbench
"""

import argparse
import logging
import sys
import time
from typing import Dict, Any, List, Optional

from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementState

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DatabaseVerifier:
    """Verifies Ontos ML Workbench database setup"""

    # Required tables with their expected key columns
    REQUIRED_TABLES = {
        'sheets': ['id', 'name', 'source_type', 'status'],
        'templates': ['id', 'name', 'label_type', 'status'],
        'canonical_labels': ['id', 'sheet_id', 'item_ref', 'label_type'],
        'training_sheets': ['id', 'name', 'sheet_id', 'template_id', 'status'],
        'qa_pairs': ['id', 'training_sheet_id', 'sheet_id', 'item_ref'],
        'model_training_lineage': ['id', 'model_name', 'training_sheet_id'],
        'example_store': ['example_id', 'version', 'input', 'expected_output'],
        'endpoints_registry': ['id', 'name', 'endpoint_name', 'status'],
        'feedback_items': ['id', 'endpoint_id', 'rating'],
        'monitor_alerts': ['id', 'endpoint_id', 'alert_type', 'status'],
        'job_runs': ['id', 'job_type', 'status'],
    }

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

    def execute_sql(self, sql: str, description: str = "SQL statement") -> Dict[str, Any]:
        """Execute SQL and return results"""
        logger.debug(f"Executing: {description}")
        logger.debug(f"SQL: {sql}")

        try:
            result = self.client.statement_execution.execute_statement(
                statement=sql,
                warehouse_id=self.warehouse_id
            )

            for attempt in range(60):
                status = self.client.statement_execution.get_statement(result.statement_id)

                if status.status.state == StatementState.SUCCEEDED:
                    return {
                        'status': 'success',
                        'data': status.result.data_array if status.result else None,
                        'columns': [col.name for col in status.result.manifest.schema.columns] if status.result and status.result.manifest else None
                    }
                elif status.status.state in [StatementState.FAILED, StatementState.CANCELED]:
                    error_msg = status.status.error.message if status.status.error else "Unknown error"
                    return {'status': 'failed', 'error': error_msg}

                time.sleep(1)

            return {'status': 'timeout', 'error': 'Query timed out'}

        except Exception as e:
            return {'status': 'error', 'error': str(e)}

    def verify_catalog_and_schema(self) -> bool:
        """Verify catalog and schema exist"""
        logger.info("=" * 80)
        logger.info("STEP 1: Verify Catalog and Schema")
        logger.info("=" * 80)

        # Check catalog
        result = self.execute_sql(
            f"SHOW CATALOGS LIKE '{self.catalog}'",
            "Check catalog exists"
        )

        if result['status'] != 'success' or not result['data']:
            logger.error(f"✗ Catalog does not exist: {self.catalog}")
            return False

        logger.info(f"✓ Catalog exists: {self.catalog}")

        # Check schema
        result = self.execute_sql(
            f"SHOW SCHEMAS IN `{self.catalog}` LIKE '{self.schema}'",
            "Check schema exists"
        )

        if result['status'] != 'success' or not result['data']:
            logger.error(f"✗ Schema does not exist: {self.catalog}.{self.schema}")
            return False

        logger.info(f"✓ Schema exists: {self.catalog}.{self.schema}")
        logger.info("")
        return True

    def verify_table_exists(self, table_name: str) -> bool:
        """Check if a table exists"""
        result = self.execute_sql(
            f"SHOW TABLES IN `{self.catalog}`.`{self.schema}` LIKE '{table_name}'",
            f"Check table: {table_name}"
        )
        return result['status'] == 'success' and result['data'] and len(result['data']) > 0

    def get_table_schema(self, table_name: str) -> Optional[List[str]]:
        """Get column names for a table"""
        result = self.execute_sql(
            f"DESCRIBE TABLE `{self.catalog}`.`{self.schema}`.`{table_name}`",
            f"Get schema for {table_name}"
        )

        if result['status'] == 'success' and result['data']:
            return [row[0] for row in result['data']]
        return None

    def get_table_row_count(self, table_name: str) -> Optional[int]:
        """Get row count for a table"""
        result = self.execute_sql(
            f"SELECT COUNT(*) FROM `{self.catalog}`.`{self.schema}`.`{table_name}`",
            f"Count rows in {table_name}"
        )

        if result['status'] == 'success' and result['data']:
            return int(result['data'][0][0])
        return None

    def verify_tables(self) -> Dict[str, Any]:
        """Verify all required tables exist with correct schemas"""
        logger.info("=" * 80)
        logger.info("STEP 2: Verify Tables")
        logger.info("=" * 80)

        results = {
            'total': len(self.REQUIRED_TABLES),
            'success': 0,
            'missing': [],
            'schema_issues': [],
            'details': {}
        }

        for table_name, expected_columns in self.REQUIRED_TABLES.items():
            logger.info(f"\nChecking table: {table_name}")

            # Check existence
            if not self.verify_table_exists(table_name):
                logger.error(f"  ✗ Table does not exist: {table_name}")
                results['missing'].append(table_name)
                results['details'][table_name] = {
                    'exists': False,
                    'schema_valid': False,
                    'row_count': 0
                }
                continue

            # Check schema
            actual_columns = self.get_table_schema(table_name)
            if not actual_columns:
                logger.warning(f"  ⚠ Could not retrieve schema for: {table_name}")
                results['schema_issues'].append(table_name)
                results['details'][table_name] = {
                    'exists': True,
                    'schema_valid': False,
                    'row_count': 0
                }
                continue

            # Verify expected columns exist
            missing_columns = [col for col in expected_columns if col not in actual_columns]
            if missing_columns:
                logger.warning(f"  ⚠ Missing columns in {table_name}: {', '.join(missing_columns)}")
                results['schema_issues'].append(table_name)
                results['details'][table_name] = {
                    'exists': True,
                    'schema_valid': False,
                    'missing_columns': missing_columns,
                    'row_count': 0
                }
                continue

            # Get row count
            row_count = self.get_table_row_count(table_name)

            logger.info(f"  ✓ Table exists with correct schema")
            logger.info(f"    Columns: {len(actual_columns)}")
            logger.info(f"    Rows: {row_count if row_count is not None else 'Unknown'}")

            results['success'] += 1
            results['details'][table_name] = {
                'exists': True,
                'schema_valid': True,
                'columns': len(actual_columns),
                'row_count': row_count if row_count is not None else 0
            }

        logger.info("")
        return results

    def test_basic_queries(self) -> Dict[str, Any]:
        """Test basic queries on core tables"""
        logger.info("=" * 80)
        logger.info("STEP 3: Test Basic Queries")
        logger.info("=" * 80)

        test_queries = [
            ("sheets", "SELECT COUNT(*) FROM `{catalog}`.`{schema}`.sheets WHERE status = 'active'"),
            ("templates", "SELECT COUNT(*) FROM `{catalog}`.`{schema}`.templates WHERE status = 'active'"),
            ("endpoints_registry", "SELECT COUNT(*) FROM `{catalog}`.`{schema}`.endpoints_registry"),
            ("feedback_items", "SELECT COUNT(*) FROM `{catalog}`.`{schema}`.feedback_items"),
            ("monitor_alerts", "SELECT COUNT(*) FROM `{catalog}`.`{schema}`.monitor_alerts WHERE status = 'active'"),
        ]

        results = {
            'total': len(test_queries),
            'success': 0,
            'failed': []
        }

        for table_name, query_template in test_queries:
            query = query_template.format(catalog=self.catalog, schema=self.schema)
            result = self.execute_sql(query, f"Query {table_name}")

            if result['status'] == 'success':
                count = result['data'][0][0] if result['data'] else 0
                logger.info(f"  ✓ {table_name}: {count} records")
                results['success'] += 1
            else:
                logger.error(f"  ✗ {table_name}: Query failed")
                results['failed'].append(table_name)

        logger.info("")
        return results

    def run(self) -> bool:
        """Run complete verification"""
        logger.info("=" * 80)
        logger.info("Ontos ML Workbench Database Verification")
        logger.info("=" * 80)
        logger.info(f"Catalog: {self.catalog}")
        logger.info(f"Schema: {self.schema}")
        logger.info(f"Warehouse: {self.warehouse_id}")
        logger.info("=" * 80)
        logger.info("")

        # Step 1: Verify catalog/schema
        if not self.verify_catalog_and_schema():
            logger.error("Catalog/schema verification failed")
            return False

        # Step 2: Verify tables
        table_results = self.verify_tables()

        # Step 3: Test queries
        query_results = self.test_basic_queries()

        # Summary
        logger.info("=" * 80)
        logger.info("VERIFICATION SUMMARY")
        logger.info("=" * 80)

        logger.info(f"\nTables:")
        logger.info(f"  Total required: {table_results['total']}")
        logger.info(f"  Valid: {table_results['success']}")
        logger.info(f"  Missing: {len(table_results['missing'])}")
        logger.info(f"  Schema issues: {len(table_results['schema_issues'])}")

        if table_results['missing']:
            logger.error(f"\n  Missing tables: {', '.join(table_results['missing'])}")

        if table_results['schema_issues']:
            logger.warning(f"\n  Tables with schema issues: {', '.join(table_results['schema_issues'])}")

        logger.info(f"\nQueries:")
        logger.info(f"  Total tested: {query_results['total']}")
        logger.info(f"  Successful: {query_results['success']}")
        logger.info(f"  Failed: {len(query_results['failed'])}")

        if query_results['failed']:
            logger.error(f"\n  Failed queries: {', '.join(query_results['failed'])}")

        # Overall status
        logger.info("")
        if table_results['missing'] or table_results['schema_issues'] or query_results['failed']:
            logger.error("VERIFICATION FAILED ✗")
            logger.error("\nRecommended actions:")
            if table_results['missing']:
                logger.error("  1. Run: python scripts/setup_database.py to create missing tables")
            if table_results['schema_issues']:
                logger.error("  2. Check schema migration scripts")
            if query_results['failed']:
                logger.error("  3. Check table permissions and SQL warehouse access")
            return False
        else:
            logger.info("VERIFICATION PASSED ✓")
            logger.info("\nDatabase is ready to use!")
            logger.info("Row counts:")
            for table_name, details in table_results['details'].items():
                if details.get('row_count', 0) > 0:
                    logger.info(f"  • {table_name}: {details['row_count']} rows")
            return True


def main():
    parser = argparse.ArgumentParser(
        description='Verify Ontos ML Workbench database setup',
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
        verifier = DatabaseVerifier(
            catalog=args.catalog,
            schema=args.schema,
            warehouse_id=args.warehouse_id,
            profile=args.profile
        )

        success = verifier.run()
        sys.exit(0 if success else 1)

    except Exception as e:
        logger.exception(f"Verification failed with error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
