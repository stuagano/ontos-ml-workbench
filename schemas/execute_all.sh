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
    # Infrastructure
    "00_create_catalog.sql"
    # Core ML pipeline
    "01_sheets.sql"
    "02_templates.sql"
    "03_canonical_labels.sql"
    "04_training_sheets.sql"
    "05_qa_pairs.sql"
    "06_model_training_lineage.sql"
    "07_example_store.sql"
    # Labeling workflow
    "08_labeling_jobs.sql"
    "09_labeling_tasks.sql"
    "10_labeled_items.sql"
    # Quality & monitoring
    "11_model_evaluations.sql"
    "12_identified_gaps.sql"
    "13_annotation_tasks.sql"
    "14_bit_attribution.sql"
    "15_dqx_quality_results.sql"
    "16_endpoint_metrics.sql"
    # RBAC & organization
    "17_app_roles.sql"
    "18_user_role_assignments.sql"
    "19_teams.sql"
    "20_team_members.sql"
    "21_data_domains.sql"
    "22_asset_reviews.sql"
    "23_projects.sql"
    "24_project_members.sql"
    # Contracts & workflows
    "25_data_contracts.sql"
    "26_compliance_policies.sql"
    "27_workflows.sql"
    # Data products & semantic models
    "28_data_products.sql"
    "29_semantic_models.sql"
    # Governance configuration
    "30_naming_conventions.sql"
    "31_delivery_modes.sql"
    # Platform integration
    "32_mcp_integration.sql"
    "33_platform_connectors.sql"
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
echo "Verify with:"
echo "  databricks sql -e 'SHOW TABLES IN \${CATALOG}.\${SCHEMA}'"
