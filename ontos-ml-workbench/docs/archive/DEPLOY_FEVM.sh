#!/bin/bash
# Deploy VITAL Workbench to FE VM Serverless Workspace

set -e

echo "🚀 VITAL Workbench - Deploying to FE VM Workspace"
echo "=================================================="
echo ""
echo "Target: fevm-serverless-dxukih.cloud.databricks.com"
echo "Catalog: erp-demonstrations"
echo "Schema: vital_workbench"
echo "Warehouse: 387bcda0f2ece20c"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v databricks &> /dev/null; then
    echo "❌ Databricks CLI not found. Install with: pip install databricks-cli"
    exit 1
fi

if ! command -v apx &> /dev/null; then
    echo "❌ APX not found. Install with: pip install apx"
    exit 1
fi

# Verify workspace profile exists
if ! databricks auth profiles 2>/dev/null | grep -q "fe-vm-serverless-dxukih"; then
    echo "⚠️  Warning: Profile 'fe-vm-serverless-dxukih' not found in ~/.databrickscfg"
    echo ""
    echo "To configure, run:"
    echo "  databricks configure --profile fe-vm-serverless-dxukih"
    echo ""
    echo "Then enter:"
    echo "  Host: https://fevm-serverless-dxukih.cloud.databricks.com"
    echo "  Token: [your-personal-access-token]"
    echo ""
    exit 1
fi

echo "✅ Prerequisites met"
echo ""

# Build frontend
echo "🔨 Building frontend with APX..."
apx build

if [ ! -f "backend/static/index.html" ]; then
    echo "❌ Frontend build failed - backend/static/index.html not found"
    exit 1
fi

echo "✅ Frontend built successfully"
echo ""

# Validate bundle
echo "🔍 Validating Databricks bundle..."
databricks bundle validate -t fevm

echo "✅ Bundle validation passed"
echo ""

# Show what will be deployed
echo "📦 Deployment preview:"
databricks bundle deploy -t fevm --dry-run | head -20

echo ""
read -p "Proceed with deployment? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Deploy
echo ""
echo "🚀 Deploying to Databricks..."
databricks bundle deploy -t fevm

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📱 Access your app:"
echo "   https://fevm-serverless-dxukih.cloud.databricks.com/apps/vital-workbench-fevm"
echo ""
echo "📊 View logs:"
echo "   databricks apps logs vital-workbench-fevm -t fevm"
echo ""
echo "🔍 Check app status:"
echo "   databricks apps list --profile fe-vm-serverless-dxukih"
echo ""
