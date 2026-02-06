#!/bin/bash
# Quick deployment script for VITAL Workbench

set -e

echo "🚀 VITAL Workbench - Databricks Apps Deployment"
echo "================================================"
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
databricks bundle validate -t dev

echo "✅ Bundle validation passed"
echo ""

# Deploy
echo "🚀 Deploying to Databricks..."
databricks bundle deploy -t dev

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📱 Access your app:"
echo "   1. Go to Databricks Workspace → Apps"
echo "   2. Click 'vital-workbench-dev'"
echo "   3. Or run: databricks apps list"
echo ""
echo "📊 View logs:"
echo "   databricks apps logs vital-workbench-dev -t dev"
echo ""
