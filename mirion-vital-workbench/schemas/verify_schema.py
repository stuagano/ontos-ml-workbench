#!/usr/bin/env python3
"""
Schema Verification Script

Verifies that critical tables exist and have expected columns.
Run this before deploying to catch schema mismatches early.

Usage:
    python schemas/verify_schema.py
    # or
    cd backend && python ../schemas/verify_schema.py
"""

import sys
import os
from typing import Dict, List, Set

# Add backend directory to path if needed
backend_dir = os.path.join(os.path.dirname(__file__), "..", "backend")
if os.path.exists(backend_dir):
    sys.path.insert(0, backend_dir)

# Expected schemas (minimal critical fields only)
EXPECTED_SCHEMAS: Dict[str, Set[str]] = {
    "templates": {
        "id",
        "name",
        "description",
        "system_prompt",
        "user_prompt_template",  # NOT prompt_template
        "output_schema",
        "label_type",
        "few_shot_examples",
        "version",
        "status",
        "created_at",
        "created_by",
        "updated_at",
        "updated_by",
    },
    "sheets": {
        "id",
        "name",
        "description",
        "source_type",
        "source_table",
        "source_volume",
        "item_id_column",
        "text_columns",
        "image_columns",
        "metadata_columns",
        "status",
        "created_at",
        "created_by",
    },
    "training_sheets": {
        "id",
        "name",
        "description",
        "sheet_id",
        "template_id",
        "generation_method",
        "model_used",
        "total_pairs",
        "approved_pairs",
        "status",
        "created_at",
        "created_by",
    },
    "canonical_labels": {
        "id",
        "sheet_id",
        "item_ref",
        "label_type",
        "label_data",          # JSON string, not label_value
        "confidence",
        "review_status",
        "allowed_uses",
        "prohibited_uses",
        "labeled_at",          # NOT created_at
        "labeled_by",          # NOT created_by
    },
}


def verify_schema():
    """Verify database schema matches expectations."""
    try:
        from app.services.sql_service import get_sql_service
    except ImportError:
        print("❌ Error: Could not import sql_service")
        print("   Make sure you're running from the backend/ directory")
        return False

    sql_service = get_sql_service()
    all_passed = True

    for table_name, expected_columns in EXPECTED_SCHEMAS.items():
        print(f"\n{'=' * 70}")
        print(f"Verifying table: {table_name}")
        print(f"{'=' * 70}")

        # Check if table exists
        try:
            result = sql_service.execute(f"SHOW TABLES LIKE '{table_name}'")
            if not result:
                print(f"❌ FAIL: Table '{table_name}' does not exist")
                all_passed = False
                continue
            print(f"✅ Table exists")
        except Exception as e:
            print(f"❌ FAIL: Error checking table: {e}")
            all_passed = False
            continue

        # Get actual columns
        try:
            result = sql_service.execute(f"DESCRIBE {table_name}")
            actual_columns = {row["col_name"] for row in result}
            print(f"   Found {len(actual_columns)} columns")
        except Exception as e:
            print(f"❌ FAIL: Error describing table: {e}")
            all_passed = False
            continue

        # Check for missing columns
        missing = expected_columns - actual_columns
        if missing:
            print(f"\n❌ FAIL: Missing columns:")
            for col in sorted(missing):
                print(f"   - {col}")
            all_passed = False
        else:
            print(f"✅ All expected columns present")

        # Show extra columns (might be deprecated or new)
        extra = actual_columns - expected_columns
        if extra:
            print(f"\nℹ️  Extra columns in database (not verified):")
            for col in sorted(extra):
                print(f"   - {col}")

    # Overall result
    print(f"\n{'=' * 70}")
    if all_passed:
        print("✅ PASS: All schema checks passed")
        print("=" * 70)
        return True
    else:
        print("❌ FAIL: Some schema checks failed")
        print("=" * 70)
        print("\nSee schemas/SCHEMA_REFERENCE.md for expected schema")
        return False


if __name__ == "__main__":
    success = verify_schema()
    sys.exit(0 if success else 1)
