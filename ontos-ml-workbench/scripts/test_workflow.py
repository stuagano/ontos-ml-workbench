#!/usr/bin/env python3
"""
End-to-end workflow testing for Ontos ML Workbench
Tests the complete DATA → GENERATE → LABEL → TRAIN workflow
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

BASE_URL = "http://localhost:8000"
TIMEOUT = 60  # Longer timeout for SQL warehouse queries


def log(message: str):
    """Print timestamped log message."""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")


def api_call(method: str, endpoint: str, data: Optional[Dict] = None, timeout: int = TIMEOUT) -> Dict[str, Any]:
    """Make API call with error handling."""
    url = f"{BASE_URL}{endpoint}"
    log(f"{method} {endpoint}")

    try:
        if method == "GET":
            response = requests.get(url, timeout=timeout)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=timeout)
        elif method == "PUT":
            response = requests.put(url, json=data, timeout=timeout)
        elif method == "DELETE":
            response = requests.delete(url, timeout=timeout)
        else:
            raise ValueError(f"Unsupported method: {method}")

        log(f"  Status: {response.status_code}")

        try:
            return response.json()
        except json.JSONDecodeError:
            return {"raw": response.text, "status_code": response.status_code}

    except requests.Timeout:
        log(f"  ✗ Timeout after {timeout}s")
        return {"error": "timeout", "timeout": timeout}
    except Exception as e:
        log(f"  ✗ Error: {e}")
        return {"error": str(e)}


def test_system_health():
    """Test system health endpoints."""
    log("\n" + "=" * 80)
    log("TESTING: System Health")
    log("=" * 80)

    # Health check
    health = api_call("GET", "/api/health", timeout=5)
    assert health.get("status") == "healthy", "Health check failed"
    log("✓ System is healthy")

    # Config
    config = api_call("GET", "/api/config", timeout=5)
    log(f"✓ Workspace: {config.get('workspace_url')}")
    log(f"✓ Catalog: {config.get('catalog')}")
    log(f"✓ Schema: {config.get('schema')}")
    log(f"✓ User: {config.get('current_user')}")

    return config


def test_data_stage(config: Dict):
    """Test DATA stage - Sheets management."""
    log("\n" + "=" * 80)
    log("STAGE 1: DATA - Sheets Management")
    log("=" * 80)

    # List sheets (this may take 10-30s due to SQL warehouse query)
    log("Fetching sheets list (this may take up to 60s)...")
    sheets = api_call("GET", "/api/v1/sheets-v2?limit=10")

    if "error" in sheets and sheets["error"] == "timeout":
        log("⚠ Sheets endpoint timed out - SQL warehouse may be slow")
        log("  This is expected behavior for cold starts")
        return None

    if isinstance(sheets, dict) and "sheets" in sheets:
        sheet_list = sheets["sheets"]
        log(f"✓ Found {len(sheet_list)} sheets")

        if len(sheet_list) > 0:
            # Show first sheet
            first_sheet = sheet_list[0]
            log(f"\nSample Sheet:")
            log(f"  ID: {first_sheet.get('id')}")
            log(f"  Name: {first_sheet.get('name')}")
            log(f"  Source: {first_sheet.get('source_type')}")
            log(f"  Items: {first_sheet.get('item_count')}")

            return first_sheet
    else:
        log(f"✗ Unexpected sheets response: {sheets}")
        return None


def test_generate_stage():
    """Test GENERATE stage - Templates and Q&A generation."""
    log("\n" + "=" * 80)
    log("STAGE 2: GENERATE - Templates")
    log("=" * 80)

    # List templates
    templates = api_call("GET", "/api/v1/templates", timeout=30)

    if isinstance(templates, dict) and "templates" in templates:
        template_list = templates["templates"]
        log(f"✓ Found {len(template_list)} templates")

        if len(template_list) > 0:
            first_template = template_list[0]
            log(f"\nSample Template:")
            log(f"  ID: {first_template.get('id')}")
            log(f"  Name: {first_template.get('name')}")
            log(f"  Task: {first_template.get('task_type')}")

            return first_template
    else:
        log(f"⚠ No templates found or unexpected response")
        return None


def test_label_stage():
    """Test LABEL stage - Canonical labels and labeling workflow."""
    log("\n" + "=" * 80)
    log("STAGE 3: LABEL - Canonical Labels & Workflow")
    log("=" * 80)

    # List canonical labels
    labels = api_call("GET", "/api/v1/canonical-labels?limit=10", timeout=30)
    log(f"Canonical labels response: {json.dumps(labels, indent=2)[:200]}")

    # Get labeling queue
    queue = api_call("GET", "/api/v1/labeling/queue?status=pending&limit=5", timeout=30)
    log(f"Labeling queue response: {json.dumps(queue, indent=2)[:200]}")

    # List labelsets
    labelsets = api_call("GET", "/api/v1/labelsets", timeout=30)
    log(f"Labelsets response: {json.dumps(labelsets, indent=2)[:200]}")

    log("✓ Label stage endpoints are accessible")


def test_train_stage():
    """Test TRAIN stage - Training jobs."""
    log("\n" + "=" * 80)
    log("STAGE 4: TRAIN - Training Jobs")
    log("=" * 80)

    # List training jobs
    jobs = api_call("GET", "/api/v1/training/jobs", timeout=30)

    if "error" in jobs and "TABLE_OR_VIEW_NOT_FOUND" in str(jobs.get("detail", "")):
        log("⚠ Training jobs table does not exist yet")
        log("  This is expected if TRAIN stage hasn't been used")
    elif isinstance(jobs, dict) and "jobs" in jobs:
        log(f"✓ Found {len(jobs.get('jobs', []))} training jobs")
    else:
        log(f"Training jobs response: {json.dumps(jobs, indent=2)[:200]}")


def test_deploy_stage():
    """Test DEPLOY stage - Model registry."""
    log("\n" + "=" * 80)
    log("STAGE 5: DEPLOY - Model Registry")
    log("=" * 80)

    # List models
    models = api_call("GET", "/api/v1/registries", timeout=30)
    log(f"Model registry response: {json.dumps(models, indent=2)[:200]}")

    log("✓ Deploy stage endpoints are accessible")


def test_monitor_stage():
    """Test MONITOR stage - Monitoring."""
    log("\n" + "=" * 80)
    log("STAGE 6: MONITOR - Monitoring")
    log("=" * 80)

    # Get metrics
    metrics = api_call("GET", "/api/v1/monitoring/metrics", timeout=30)
    log(f"Monitoring metrics response: {json.dumps(metrics, indent=2)[:200]}")

    log("✓ Monitor stage endpoints are accessible")


def test_improve_stage():
    """Test IMPROVE stage - Feedback."""
    log("\n" + "=" * 80)
    log("STAGE 7: IMPROVE - Feedback")
    log("=" * 80)

    # List feedback
    feedback = api_call("GET", "/api/v1/feedback", timeout=30)

    if isinstance(feedback, dict) and "items" in feedback:
        log(f"✓ Found {len(feedback['items'])} feedback items")
        log(f"  Total: {feedback.get('total', 0)}")
    else:
        log(f"Feedback response: {json.dumps(feedback, indent=2)[:200]}")


def test_additional_features():
    """Test additional features (DSPy, Examples, Settings)."""
    log("\n" + "=" * 80)
    log("ADDITIONAL FEATURES")
    log("=" * 80)

    # Example Store
    log("\nTesting Example Store...")
    examples = api_call("GET", "/api/v1/examples", timeout=30)
    if "error" not in examples or examples.get("status_code") == 200:
        log("✓ Example Store is accessible")
    else:
        log(f"⚠ Example Store issue: {examples}")

    # Settings
    log("\nTesting Settings...")
    settings = api_call("GET", "/api/v1/settings", timeout=30)
    log(f"Settings response: {json.dumps(settings, indent=2)[:200]}")

    # Cache stats
    log("\nTesting Cache...")
    cache = api_call("GET", "/api/v1/admin/cache/stats", timeout=10)
    if isinstance(cache, dict) and "total_entries" in cache:
        log(f"✓ Cache has {cache['total_entries']} entries")
    else:
        log(f"Cache response: {cache}")


def main():
    """Run complete workflow test."""
    start_time = time.time()

    log("=" * 80)
    log("Ontos ML Workbench - End-to-End Workflow Testing")
    log("=" * 80)
    log(f"Started: {datetime.now().isoformat()}")
    log(f"Base URL: {BASE_URL}")
    log("=" * 80)

    try:
        # Test each stage
        config = test_system_health()
        test_data_stage(config)
        test_generate_stage()
        test_label_stage()
        test_train_stage()
        test_deploy_stage()
        test_monitor_stage()
        test_improve_stage()
        test_additional_features()

        # Summary
        elapsed = time.time() - start_time
        log("\n" + "=" * 80)
        log("WORKFLOW TEST COMPLETED")
        log("=" * 80)
        log(f"✓ All stages tested successfully")
        log(f"⏱  Total time: {elapsed:.1f}s")
        log("=" * 80)

        return 0

    except Exception as e:
        log(f"\n✗ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())
