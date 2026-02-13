#!/usr/bin/env python3
"""Comprehensive API endpoint testing for VITAL Workbench."""

import requests
import json
from typing import Dict, Any, List
from datetime import datetime

BASE_URL = "http://localhost:8000"


class APITester:
    """API testing utility."""

    def __init__(self):
        self.results = []
        self.passed = 0
        self.failed = 0

    def test(self, name: str, method: str, endpoint: str, expected_status: int = 200,
             data: Dict = None, description: str = ""):
        """Execute a single API test."""
        url = f"{BASE_URL}{endpoint}"
        print(f"\n{'='*80}")
        print(f"TEST: {name}")
        if description:
            print(f"DESC: {description}")
        print(f"URL:  {method} {endpoint}")
        print('=' * 80)

        try:
            if method == "GET":
                response = requests.get(url, timeout=10)
            elif method == "POST":
                response = requests.post(url, json=data, timeout=10)
            elif method == "PUT":
                response = requests.put(url, json=data, timeout=10)
            elif method == "DELETE":
                response = requests.delete(url, timeout=10)
            else:
                print(f"✗ Unsupported method: {method}")
                self.failed += 1
                return None

            status_match = response.status_code == expected_status
            status_icon = "✓" if status_match else "✗"

            print(f"{status_icon} Status: {response.status_code} (expected: {expected_status})")

            try:
                response_data = response.json()
                print(f"Response: {json.dumps(response_data, indent=2)[:500]}...")

                if status_match:
                    self.passed += 1
                    self.results.append({
                        "name": name,
                        "status": "PASS",
                        "method": method,
                        "endpoint": endpoint,
                        "response_code": response.status_code
                    })
                else:
                    self.failed += 1
                    self.results.append({
                        "name": name,
                        "status": "FAIL",
                        "method": method,
                        "endpoint": endpoint,
                        "response_code": response.status_code,
                        "expected": expected_status
                    })

                return response_data

            except json.JSONDecodeError:
                print(f"Response (raw): {response.text[:500]}")
                if status_match:
                    self.passed += 1
                else:
                    self.failed += 1
                return response.text

        except Exception as e:
            print(f"✗ Error: {e}")
            self.failed += 1
            self.results.append({
                "name": name,
                "status": "ERROR",
                "method": method,
                "endpoint": endpoint,
                "error": str(e)
            })
            return None

    def print_summary(self):
        """Print test summary."""
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"Total tests: {self.passed + self.failed}")
        print(f"✓ Passed: {self.passed}")
        print(f"✗ Failed: {self.failed}")
        print(f"Success rate: {self.passed / (self.passed + self.failed) * 100:.1f}%")
        print("=" * 80)

        if self.failed > 0:
            print("\nFailed tests:")
            for result in self.results:
                if result["status"] in ["FAIL", "ERROR"]:
                    print(f"  - {result['name']}: {result.get('error', 'Status mismatch')}")


def main():
    """Run comprehensive API tests."""
    tester = APITester()

    print("=" * 80)
    print("VITAL Workbench - API Endpoint Testing")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 80)

    # ========================================================================
    # System Health
    # ========================================================================
    print("\n" + "=" * 80)
    print("STAGE: System Health")
    print("=" * 80)

    tester.test(
        "Health Check",
        "GET", "/api/health",
        description="Verify API is running"
    )

    tester.test(
        "Config Check",
        "GET", "/api/config",
        description="Get workspace configuration"
    )

    # ========================================================================
    # DATA Stage - Sheets Management
    # ========================================================================
    print("\n" + "=" * 80)
    print("STAGE: DATA - Sheets Management")
    print("=" * 80)

    sheets_response = tester.test(
        "List All Sheets",
        "GET", "/api/v1/sheets-v2",
        description="Get all dataset definitions"
    )

    if sheets_response and isinstance(sheets_response, list) and len(sheets_response) > 0:
        sheet_id = sheets_response[0].get('id')

        tester.test(
            "Get Sheet by ID",
            "GET", f"/api/v1/sheets-v2/{sheet_id}",
            description=f"Get details for sheet {sheet_id}"
        )

    tester.test(
        "Create New Sheet",
        "POST", "/api/v1/sheets-v2",
        data={
            "name": "Test Sheet - API Test",
            "description": "Created by automated test",
            "source_type": "uc_table",
            "source_table": "erp-demonstrations.vital_workbench.test_data",
            "item_id_column": "id",
            "text_columns": ["description"],
            "image_columns": [],
            "metadata_columns": ["timestamp"],
            "sampling_strategy": "random",
            "sample_size": 100
        },
        expected_status=201,
        description="Create a new test sheet"
    )

    # ========================================================================
    # Unity Catalog Browse
    # ========================================================================
    print("\n" + "=" * 80)
    print("STAGE: Unity Catalog Browsing")
    print("=" * 80)

    tester.test(
        "List Catalogs",
        "GET", "/api/v1/unity-catalog/catalogs",
        description="Browse available catalogs"
    )

    tester.test(
        "List Schemas",
        "GET", "/api/v1/unity-catalog/catalogs/erp-demonstrations/schemas",
        description="List schemas in erp-demonstrations catalog"
    )

    tester.test(
        "List Tables",
        "GET", "/api/v1/unity-catalog/catalogs/erp-demonstrations/schemas/vital_workbench/tables",
        description="List tables in vital_workbench schema"
    )

    # ========================================================================
    # GENERATE Stage - Templates
    # ========================================================================
    print("\n" + "=" * 80)
    print("STAGE: GENERATE - Templates")
    print("=" * 80)

    templates_response = tester.test(
        "List Templates",
        "GET", "/api/v1/templates",
        description="Get all prompt templates"
    )

    tester.test(
        "Create Template",
        "POST", "/api/v1/templates",
        data={
            "name": "Test Template",
            "description": "Automated test template",
            "label_type": "classification",
            "prompt_template": "Classify this item: {text}",
            "task_type": "classification",
            "output_schema": {"type": "string"}
        },
        expected_status=201,
        description="Create a new prompt template"
    )

    # ========================================================================
    # LABEL Stage - Canonical Labels
    # ========================================================================
    print("\n" + "=" * 80)
    print("STAGE: LABEL - Canonical Labels")
    print("=" * 80)

    tester.test(
        "List Canonical Labels",
        "GET", "/api/v1/canonical-labels",
        description="Get all canonical labels"
    )

    if sheets_response and isinstance(sheets_response, list) and len(sheets_response) > 0:
        sheet_id = sheets_response[0].get('id')

        tester.test(
            "Create Canonical Label",
            "POST", "/api/v1/canonical-labels",
            data={
                "sheet_id": sheet_id,
                "item_ref": "test-item-001",
                "label_type": "classification",
                "label_value": {"class": "defect", "confidence": 0.95},
                "labeled_by": "test-user",
                "labeling_method": "manual"
            },
            expected_status=201,
            description="Create a canonical label"
        )

    tester.test(
        "List Labelsets",
        "GET", "/api/v1/labelsets",
        description="Get available labelsets"
    )

    # ========================================================================
    # Labeling Workflow
    # ========================================================================
    print("\n" + "=" * 80)
    print("STAGE: LABEL - Labeling Workflow")
    print("=" * 80)

    tester.test(
        "Get Labeling Queue",
        "GET", "/api/v1/labeling/queue?status=pending&limit=10",
        description="Get items pending labeling"
    )

    # ========================================================================
    # TRAIN Stage - Training Jobs
    # ========================================================================
    print("\n" + "=" * 80)
    print("STAGE: TRAIN - Training Jobs")
    print("=" * 80)

    tester.test(
        "List Training Jobs",
        "GET", "/api/v1/training/jobs",
        description="Get all training jobs"
    )

    # ========================================================================
    # DEPLOY Stage - Model Registry
    # ========================================================================
    print("\n" + "=" * 80)
    print("STAGE: DEPLOY - Model Registry")
    print("=" * 80)

    tester.test(
        "List Registered Models",
        "GET", "/api/v1/registries",
        description="Get models in Unity Catalog registry"
    )

    # ========================================================================
    # MONITOR Stage
    # ========================================================================
    print("\n" + "=" * 80)
    print("STAGE: MONITOR - Monitoring")
    print("=" * 80)

    tester.test(
        "Get Monitoring Metrics",
        "GET", "/api/v1/monitoring/metrics",
        description="Get model monitoring metrics",
        expected_status=200  # May return empty list
    )

    # ========================================================================
    # IMPROVE Stage - Feedback
    # ========================================================================
    print("\n" + "=" * 80)
    print("STAGE: IMPROVE - Feedback")
    print("=" * 80)

    tester.test(
        "List Feedback Items",
        "GET", "/api/v1/feedback",
        description="Get user feedback"
    )

    # ========================================================================
    # DSPy Integration
    # ========================================================================
    print("\n" + "=" * 80)
    print("STAGE: DSPy Integration")
    print("=" * 80)

    tester.test(
        "List Example Store",
        "GET", "/api/v1/examples",
        description="Get few-shot examples"
    )

    # ========================================================================
    # Settings & Admin
    # ========================================================================
    print("\n" + "=" * 80)
    print("STAGE: Settings & Admin")
    print("=" * 80)

    tester.test(
        "Get Global Settings",
        "GET", "/api/v1/settings",
        description="Get application settings"
    )

    tester.test(
        "Get Cache Stats",
        "GET", "/api/v1/admin/cache/stats",
        description="Get cache statistics"
    )

    # ========================================================================
    # Print Summary
    # ========================================================================
    tester.print_summary()

    print(f"\nCompleted: {datetime.now().isoformat()}")

    # Save results to file
    results_file = "test_results.json"
    with open(results_file, 'w') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total": tester.passed + tester.failed,
                "passed": tester.passed,
                "failed": tester.failed,
                "success_rate": f"{tester.passed / (tester.passed + tester.failed) * 100:.1f}%"
            },
            "results": tester.results
        }, f, indent=2)

    print(f"\n✓ Results saved to: {results_file}")

    return 0 if tester.failed == 0 else 1


if __name__ == "__main__":
    exit(main())
