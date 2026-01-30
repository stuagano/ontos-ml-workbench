#!/bin/bash
# Teardown script for VITAL Workbench
# Usage: ./scripts/teardown.sh <workspace-name>
#
# This removes the app and optionally the data

set -e

WORKSPACE_NAME="${1:-}"
APP_NAME="vital-workbench"

if [ -z "$WORKSPACE_NAME" ]; then
    echo "Usage: $0 <workspace-name>"
    exit 1
fi

PROFILE_NAME="fe-vm-${WORKSPACE_NAME}"

echo "Deleting app $APP_NAME..."
databricks apps delete "$APP_NAME" --profile="$PROFILE_NAME" 2>/dev/null || echo "App may not exist"

echo ""
echo "App deleted. To also remove the data, run:"
echo "  databricks sql exec --warehouse-id <ID> --profile=$PROFILE_NAME <<"EOF"
echo "  DROP SCHEMA IF EXISTS main.vital_workbench CASCADE;"
echo "EOF"
echo ""
echo "Teardown complete."
