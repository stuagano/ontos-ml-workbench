#!/bin/bash
# Verify FE VM workspace configuration and access

set -e

echo "🔍 VITAL Workbench - FE VM Configuration Verification"
echo "====================================================="
echo ""

PROFILE="fe-vm-serverless-dxukih"
WAREHOUSE_ID="387bcda0f2ece20c"

# Check if profile exists
echo "1️⃣  Checking Databricks CLI profile..."
if ! databricks auth profiles 2>/dev/null | grep -q "$PROFILE"; then
    echo "❌ Profile '$PROFILE' not found"
    echo ""
    echo "Configure it with:"
    echo "  databricks configure --profile $PROFILE"
    echo ""
    echo "Then enter:"
    echo "  Host: https://fevm-serverless-dxukih.cloud.databricks.com"
    echo "  Token: [your-personal-access-token]"
    exit 1
fi
echo "✅ Profile configured"
echo ""

# Test authentication
echo "2️⃣  Testing authentication..."
if ! databricks current-user me --profile $PROFILE &>/dev/null; then
    echo "❌ Authentication failed"
    echo "   Re-run: databricks configure --profile $PROFILE --force"
    exit 1
fi

USER=$(databricks current-user me --profile $PROFILE --output json | jq -r '.userName // .emails[0].value // "unknown"')
echo "✅ Authenticated as: $USER"
echo ""

# Check warehouse
echo "3️⃣  Checking SQL Warehouse access..."
if ! databricks warehouses get $WAREHOUSE_ID --profile $PROFILE &>/dev/null; then
    echo "❌ Cannot access warehouse $WAREHOUSE_ID"
    echo "   List available warehouses:"
    echo "   databricks warehouses list --profile $PROFILE"
    exit 1
fi

WAREHOUSE_NAME=$(databricks warehouses get $WAREHOUSE_ID --profile $PROFILE --output json | jq -r '.name')
WAREHOUSE_STATE=$(databricks warehouses get $WAREHOUSE_ID --profile $PROFILE --output json | jq -r '.state')
echo "✅ Warehouse: $WAREHOUSE_NAME (state: $WAREHOUSE_STATE)"
echo ""

# Check catalog access
echo "4️⃣  Checking Unity Catalog access..."
echo "   Running SQL query to check current catalog and schema..."

QUERY_RESULT=$(databricks sql --profile $PROFILE \
  --warehouse-id $WAREHOUSE_ID \
  -e "SELECT current_catalog() as catalog, current_schema() as schema" 2>&1 || echo "FAILED")

if echo "$QUERY_RESULT" | grep -q "FAILED"; then
    echo "❌ SQL query failed"
    echo "   Warehouse might be stopped. Start it in the UI."
    exit 1
fi

echo "$QUERY_RESULT"
echo ""

# List available catalogs
echo "5️⃣  Checking available catalogs..."
CATALOGS=$(databricks sql --profile $PROFILE \
  --warehouse-id $WAREHOUSE_ID \
  -e "SHOW CATALOGS" 2>&1 || echo "FAILED")

if echo "$CATALOGS" | grep -q "erp-demonstrations\|erp_demonstrations"; then
    echo "✅ Found 'erp-demonstrations' catalog"
else
    echo "⚠️  'erp-demonstrations' catalog not found"
    echo ""
    echo "Available catalogs:"
    echo "$CATALOGS"
    echo ""
    echo "You may need to update databricks.yml with the correct catalog name"
fi
echo ""

# Check if schema exists
echo "6️⃣  Checking if vital_workbench schema exists..."
SCHEMA_CHECK=$(databricks sql --profile $PROFILE \
  --warehouse-id $WAREHOUSE_ID \
  -e "SHOW SCHEMAS IN erp_demonstrations" 2>&1 || echo "CATALOG_NOT_FOUND")

if echo "$SCHEMA_CHECK" | grep -q "vital_workbench"; then
    echo "✅ Schema 'vital_workbench' exists in erp_demonstrations catalog"
elif echo "$SCHEMA_CHECK" | grep -q "CATALOG_NOT_FOUND"; then
    echo "⚠️  Catalog 'erp_demonstrations' not found. Trying with underscore..."
    SCHEMA_CHECK=$(databricks sql --profile $PROFILE \
      --warehouse-id $WAREHOUSE_ID \
      -e "SHOW SCHEMAS IN erp_demonstrations" 2>&1 || echo "FAILED")

    if echo "$SCHEMA_CHECK" | grep -q "vital_workbench"; then
        echo "✅ Found schema, but catalog name uses underscores"
        echo "   Update databricks.yml: catalog: erp_demonstrations"
    else
        echo "❌ Schema not found. Create it with:"
        echo "   databricks sql --profile $PROFILE \\"
        echo "     --warehouse-id $WAREHOUSE_ID \\"
        echo "     -e \"CREATE SCHEMA IF NOT EXISTS erp_demonstrations.vital_workbench\""
    fi
else
    echo "⚠️  Schema 'vital_workbench' not found in erp_demonstrations"
    echo ""
    echo "Create it with:"
    echo "  databricks sql --profile $PROFILE \\"
    echo "    --warehouse-id $WAREHOUSE_ID \\"
    echo "    -e \"CREATE SCHEMA IF NOT EXISTS erp_demonstrations.vital_workbench\""
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Configuration Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Profile:   $PROFILE"
echo "User:      $USER"
echo "Workspace: https://fevm-serverless-dxukih.cloud.databricks.com"
echo "Warehouse: $WAREHOUSE_NAME ($WAREHOUSE_ID)"
echo "Catalog:   erp_demonstrations"
echo "Schema:    vital_workbench"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Ready to deploy!"
echo ""
echo "Next steps:"
echo "  1. Create schema (if needed): See command above"
echo "  2. Deploy app: ./DEPLOY_FEVM.sh"
echo ""
