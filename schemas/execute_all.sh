#!/bin/bash
# ============================================================================
# Execute All Schema Scripts
# ============================================================================
# Run this script to create all Delta tables in Unity Catalog
# Requires: databricks CLI configured with workspace authentication
# ============================================================================

set -e  # Exit on error

SCHEMA_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Creating Ontos ML Workbench schema in Unity Catalog..."
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
    "09_labeling_jobs.sql"
    "10_labeling_tasks.sql"
    "11_labeled_items.sql"
    "12_workspace_users.sql"
    "13_model_evaluations.sql"
    "14_identified_gaps.sql"
    "15_annotation_tasks.sql"
    "16_bit_attribution.sql"
    "17_dqx_quality_results.sql"
    "18_endpoint_metrics.sql"
    "19_app_roles.sql"
    "20_user_role_assignments.sql"
    "21_teams.sql"
    "22_team_members.sql"
    "23_data_domains.sql"
    "24_seed_default_roles.sql"
    "25_add_domain_id_columns.sql"
    "26_asset_reviews.sql"
    "27_projects.sql"
    "28_project_members.sql"
    "29_data_contracts.sql"
    "30_compliance_policies.sql"
    "31_workflows.sql"
    "32_data_products.sql"
    "33_semantic_models.sql"
    "34_naming_conventions.sql"
    "35_delivery_modes.sql"
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
