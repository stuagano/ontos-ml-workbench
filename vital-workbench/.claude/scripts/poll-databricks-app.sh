#!/bin/bash
# Poll Databricks Apps deployment status until ready
# Usage: ./poll-databricks-app.sh <app-name> <profile>

set -e

APP_NAME="${1:-vital-workbench}"
PROFILE="${2:-fe-vm-serverless-dxukih}"
MAX_WAIT=300  # 5 minutes
POLL_INTERVAL=5  # 5 seconds

echo "🔄 Polling deployment status for '$APP_NAME' (profile: $PROFILE)"
echo "   Timeout: ${MAX_WAIT}s | Poll interval: ${POLL_INTERVAL}s"
echo ""

elapsed=0
start_time=$(date +%s)

while [ $elapsed -lt $MAX_WAIT ]; do
    # Get app status as JSON
    status_json=$(databricks apps get "$APP_NAME" --profile="$PROFILE" -o json 2>/dev/null || echo '{}')

    # Extract key fields
    compute_status=$(echo "$status_json" | jq -r '.compute_status // "UNKNOWN"')
    pending_deployment=$(echo "$status_json" | jq -r '.pending_deployment // "null"')
    status_message=$(echo "$status_json" | jq -r '.status_message // ""')
    app_url=$(echo "$status_json" | jq -r '.url // ""')

    # Print current status
    echo "[$elapsed s] Compute: $compute_status | Pending: $pending_deployment"

    # Check if deployment is complete
    if [ "$compute_status" = "ACTIVE" ] && [ "$pending_deployment" = "null" ]; then
        echo ""
        echo "✓ Deployment complete!"
        echo "  Compute status: ACTIVE"
        echo "  App URL: $app_url"

        # Verify endpoints are responding
        if [ -n "$app_url" ]; then
            echo ""
            echo "🔍 Verifying endpoints..."

            # Check health endpoint
            if curl -s -f "$app_url/api/health" > /dev/null 2>&1; then
                echo "✓ Health endpoint responding: ${app_url}/api/health"
            else
                echo "⚠ Health endpoint not responding yet (may take a few more seconds)"
            fi

            # Check Swagger UI docs
            if curl -s -f "$app_url/docs" > /dev/null 2>&1; then
                echo "✓ Swagger UI available: ${app_url}/docs"
            else
                echo "⚠ Swagger UI not responding yet"
            fi
        fi

        exit 0
    fi

    # Check for error states
    if [ "$compute_status" = "ERROR" ] || [ "$compute_status" = "STOPPED" ]; then
        echo ""
        echo "✗ Deployment failed!"
        echo "  Compute status: $compute_status"
        echo "  Status message: $status_message"
        echo ""
        echo "Check logs: databricks apps logs $APP_NAME --profile=$PROFILE"
        exit 1
    fi

    # Wait before next poll
    sleep $POLL_INTERVAL

    # Update elapsed time
    current_time=$(date +%s)
    elapsed=$((current_time - start_time))
done

# Timeout reached
echo ""
echo "✗ Timeout waiting for deployment (${MAX_WAIT}s elapsed)"
echo "  Last compute status: $compute_status"
echo "  Last pending deployment: $pending_deployment"
echo ""
echo "App may still be deploying. Check status manually:"
echo "  databricks apps get $APP_NAME --profile=$PROFILE"
echo ""
echo "Or check logs:"
echo "  databricks apps logs $APP_NAME --profile=$PROFILE"

exit 1
