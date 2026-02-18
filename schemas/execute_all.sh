#!/bin/bash
# ============================================================================
# Execute All Schema Scripts
# ============================================================================
# Run this script to create all Delta tables in Unity Catalog
# Requires: databricks CLI configured with workspace authentication
# ============================================================================

set -e  # Exit on error

SCHEMA_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Creating VITAL Platform Workbench schema in Unity Catalog..."
echo ""

# Check if databricks CLI is available
if ! command -v databricks &> /dev/null; then
    echo "❌ Error: databricks CLI not found"
    echo "   Install: pip install databricks-cli"
    exit 1
fi

# Array of SQL files in execution order
SQL_FILES=(
    "01_create_catalog.sql"
    "02_sheets.sql"
    "03_templates.sql"
    "04_canonical_labels.sql"
    "05_training_sheets.sql"
    "06_qa_pairs.sql"
    "07_model_training_lineage.sql"
    "08_example_store.sql"
    "99_validate_and_seed.sql"
)

# Execute each file
for sql_file in "${SQL_FILES[@]}"; do
    echo "📄 Executing: $sql_file"

    if databricks sql --file "$SCHEMA_DIR/$sql_file"; then
        echo "   ✅ Success"
    else
        echo "   ❌ Failed"
        exit 1
    fi

    echo ""
done

echo "🎉 All schemas created successfully!"
echo ""
echo "Next steps:"
echo "  1. Verify tables: databricks sql -e 'SHOW TABLES IN ontos_ml.workbench'"
echo "  2. Check seed data: databricks sql -e 'SELECT * FROM ontos_ml.workbench.sheets'"
echo "  3. Start Task #3: Sheet Management API"
