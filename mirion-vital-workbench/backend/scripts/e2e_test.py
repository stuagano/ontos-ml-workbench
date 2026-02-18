#!/usr/bin/env python3
"""
End-to-End Test Script for Ontos ML Workbench.

Tests the complete workflow:
DATA → GENERATE → LABEL → TRAIN

This script:
1. Sets up test data (Sheet + Template)
2. Generates Q&A pairs (Training Sheet)
3. Simulates labeling workflow
4. Triggers training job
5. Verifies results at each stage
6. Cleans up test data
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from typing import Any

import httpx
from dotenv import load_dotenv


class Colors:
    """ANSI color codes for terminal output."""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


class E2ETest:
    """End-to-end test orchestrator."""

    def __init__(self, base_url: str, verbose: bool = False):
        self.base_url = base_url.rstrip('/')
        self.verbose = verbose
        self.client = httpx.Client(base_url=self.base_url, timeout=60.0)
        self.test_resources: dict[str, str] = {}
        self.passed = 0
        self.failed = 0

    def log(self, message: str, color: str = Colors.BLUE):
        """Log a message with color."""
        print(f"{color}{message}{Colors.RESET}")

    def log_success(self, message: str):
        """Log a success message."""
        self.passed += 1
        print(f"{Colors.GREEN}✓ {message}{Colors.RESET}")

    def log_error(self, message: str):
        """Log an error message."""
        self.failed += 1
        print(f"{Colors.RED}✗ {message}{Colors.RESET}")

    def log_info(self, message: str):
        """Log an info message."""
        if self.verbose:
            print(f"{Colors.BLUE}ℹ {message}{Colors.RESET}")

    def assert_status(self, response: httpx.Response, expected: int, description: str):
        """Assert response status code."""
        if response.status_code == expected:
            self.log_success(f"{description} - Status {response.status_code}")
            return True
        else:
            self.log_error(
                f"{description} - Expected {expected}, got {response.status_code}"
            )
            if self.verbose:
                print(f"Response: {response.text[:500]}")
            return False

    def assert_field(self, data: dict, field: str, description: str):
        """Assert field exists in response."""
        if field in data:
            self.log_success(f"{description} - Field '{field}' exists")
            return True
        else:
            self.log_error(f"{description} - Field '{field}' missing")
            return False

    # --- Test Stages ---

    def test_health_check(self) -> bool:
        """Test 1: Health check."""
        self.log(f"\n{Colors.BOLD}=== Stage 0: Health Check ==={Colors.RESET}")

        try:
            response = self.client.get("/api/health")
            if not self.assert_status(response, 200, "Health check"):
                return False

            data = response.json()
            return self.assert_field(data, "status", "Health response")
        except Exception as e:
            self.log_error(f"Health check failed: {e}")
            return False

    def test_create_sheet(self) -> bool:
        """Test 2: Create Sheet (DATA stage)."""
        self.log(f"\n{Colors.BOLD}=== Stage 1: DATA - Create Sheet ==={Colors.RESET}")

        payload = {
            "name": f"E2E Test Sheet {datetime.now().isoformat()}",
            "description": "End-to-end test dataset for equipment defects",
            "source_catalog": "main",
            "source_schema": "radiation_safety",
            "source_table": "equipment_inspections",
            "source_volume": "/Volumes/main/radiation_safety/test_images",
            "modalities": ["image", "sensor"],
            "use_case": "defect_detection",
            "status": "active"
        }

        try:
            response = self.client.post("/api/v1/sheets", json=payload)
            if not self.assert_status(response, 201, "Create sheet"):
                return False

            data = response.json()
            if not self.assert_field(data, "id", "Sheet response"):
                return False

            self.test_resources["sheet_id"] = data["id"]
            self.log_info(f"Created sheet: {self.test_resources['sheet_id']}")
            return True
        except Exception as e:
            self.log_error(f"Create sheet failed: {e}")
            return False

    def test_create_template(self) -> bool:
        """Test 3: Create Template."""
        self.log(f"\n{Colors.BOLD}=== Stage 2: GENERATE - Create Template ==={Colors.RESET}")

        payload = {
            "name": f"E2E Test Template {datetime.now().isoformat()}",
            "description": "Test template for defect classification",
            "label_type": "defect_type",
            "prompt_template": "Analyze this equipment image: {{image_path}}\nSensor reading: {{sensor_value}}\nClassify the defect type.",
            "system_prompt": "You are a radiation safety expert specializing in equipment defect detection.",
            "base_model": "databricks-meta-llama-3-1-70b-instruct",
            "temperature": 0.7,
            "max_tokens": 1024,
            "version": "1.0.0",
            "status": "active"
        }

        try:
            response = self.client.post("/api/v1/templates", json=payload)
            if not self.assert_status(response, 201, "Create template"):
                return False

            data = response.json()
            if not self.assert_field(data, "id", "Template response"):
                return False

            self.test_resources["template_id"] = data["id"]
            self.log_info(f"Created template: {self.test_resources['template_id']}")
            return True
        except Exception as e:
            self.log_error(f"Create template failed: {e}")
            return False

    def test_create_training_sheet(self) -> bool:
        """Test 4: Create Training Sheet (Assembly)."""
        self.log(f"\n{Colors.BOLD}=== Stage 2: GENERATE - Create Training Sheet ==={Colors.RESET}")

        if "sheet_id" not in self.test_resources or "template_id" not in self.test_resources:
            self.log_error("Missing prerequisites: sheet_id or template_id")
            return False

        payload = {
            "name": f"E2E Training Sheet {datetime.now().isoformat()}",
            "description": "Test Q&A dataset",
            "sheet_id": self.test_resources["sheet_id"],
            "template_id": self.test_resources["template_id"],
            "generation_config": {
                "confidence_threshold": 0.8,
                "auto_approve_with_canonical": True,
                "max_samples": 10
            },
            "status": "draft"
        }

        try:
            response = self.client.post("/api/v1/assemblies", json=payload)
            if not self.assert_status(response, 201, "Create training sheet"):
                return False

            data = response.json()
            if not self.assert_field(data, "id", "Training sheet response"):
                return False

            self.test_resources["training_sheet_id"] = data["id"]
            self.log_info(f"Created training sheet: {self.test_resources['training_sheet_id']}")
            return True
        except Exception as e:
            self.log_error(f"Create training sheet failed: {e}")
            return False

    def test_create_canonical_label(self) -> bool:
        """Test 5: Create Canonical Label."""
        self.log(f"\n{Colors.BOLD}=== Stage 3: LABEL - Create Canonical Label ==={Colors.RESET}")

        if "sheet_id" not in self.test_resources:
            self.log_error("Missing prerequisite: sheet_id")
            return False

        payload = {
            "sheet_id": self.test_resources["sheet_id"],
            "item_ref": "test_item_001",
            "label_type": "defect_type",
            "label_value": {
                "defect": "crack",
                "severity": "high",
                "location": "weld_joint"
            },
            "confidence": 1.0,
            "labeled_by": "test_expert@example.com",
            "validation_method": "expert_review",
            "notes": "E2E test label"
        }

        try:
            response = self.client.post("/api/v1/canonical-labels", json=payload)
            if not self.assert_status(response, 201, "Create canonical label"):
                return False

            data = response.json()
            if not self.assert_field(data, "id", "Canonical label response"):
                return False

            self.test_resources["label_id"] = data["id"]
            self.log_info(f"Created canonical label: {self.test_resources['label_id']}")
            return True
        except Exception as e:
            self.log_error(f"Create canonical label failed: {e}")
            return False

    def test_trigger_training(self) -> bool:
        """Test 6: Trigger Training Job."""
        self.log(f"\n{Colors.BOLD}=== Stage 4: TRAIN - Trigger Training ==={Colors.RESET}")

        if "training_sheet_id" not in self.test_resources:
            self.log_error("Missing prerequisite: training_sheet_id")
            return False

        payload = {
            "training_sheet_id": self.test_resources["training_sheet_id"],
            "model_name": f"e2e-test-model-{int(time.time())}",
            "base_model": "databricks-meta-llama-3-1-70b-instruct",
            "training_config": {
                "epochs": 1,
                "batch_size": 4,
                "learning_rate": 0.0001
            }
        }

        try:
            response = self.client.post("/api/v1/training/jobs", json=payload)
            # Training job may return 202 (Accepted) or 201 (Created)
            if not self.assert_status(response, 202, "Trigger training") and \
               not self.assert_status(response, 201, "Trigger training"):
                return False

            data = response.json()
            if self.assert_field(data, "id", "Training job response"):
                self.test_resources["training_job_id"] = data.get("id")
                self.log_info(f"Training job created: {self.test_resources.get('training_job_id')}")
            return True
        except Exception as e:
            self.log_error(f"Trigger training failed: {e}")
            return False

    def test_verify_workflow(self) -> bool:
        """Test 7: Verify complete workflow."""
        self.log(f"\n{Colors.BOLD}=== Stage 5: VERIFY - Check Resources ==={Colors.RESET}")

        checks = [
            ("sheet_id", "/api/v1/sheets/"),
            ("template_id", "/api/v1/templates/"),
            ("training_sheet_id", "/api/v1/assemblies/"),
            ("label_id", "/api/v1/canonical-labels/"),
        ]

        all_ok = True
        for resource_key, endpoint_prefix in checks:
            if resource_key in self.test_resources:
                resource_id = self.test_resources[resource_key]
                try:
                    response = self.client.get(f"{endpoint_prefix}{resource_id}")
                    if response.status_code == 200:
                        self.log_success(f"Verified {resource_key}: {resource_id}")
                    else:
                        self.log_error(f"Failed to verify {resource_key}: {resource_id}")
                        all_ok = False
                except Exception as e:
                    self.log_error(f"Error verifying {resource_key}: {e}")
                    all_ok = False

        return all_ok

    def cleanup(self):
        """Clean up test resources."""
        self.log(f"\n{Colors.BOLD}=== Stage 6: CLEANUP ==={Colors.RESET}")

        cleanup_order = [
            ("training_job_id", "/api/v1/training/jobs/"),
            ("label_id", "/api/v1/canonical-labels/"),
            ("training_sheet_id", "/api/v1/assemblies/"),
            ("template_id", "/api/v1/templates/"),
            ("sheet_id", "/api/v1/sheets/"),
        ]

        for resource_key, endpoint_prefix in cleanup_order:
            if resource_key in self.test_resources:
                resource_id = self.test_resources[resource_key]
                try:
                    response = self.client.delete(f"{endpoint_prefix}{resource_id}")
                    if response.status_code in [200, 204]:
                        self.log_success(f"Deleted {resource_key}: {resource_id}")
                    else:
                        self.log_info(f"Could not delete {resource_key} (status {response.status_code})")
                except Exception as e:
                    self.log_info(f"Cleanup error for {resource_key}: {e}")

    def run(self, skip_cleanup: bool = False) -> bool:
        """Run all E2E tests."""
        self.log(f"\n{Colors.BOLD}{'='*60}{Colors.RESET}")
        self.log(f"{Colors.BOLD}Ontos ML Workbench E2E Test Suite{Colors.RESET}")
        self.log(f"{Colors.BOLD}{'='*60}{Colors.RESET}")
        self.log(f"Target: {self.base_url}")

        try:
            # Run tests in workflow order
            tests = [
                self.test_health_check,
                self.test_create_sheet,
                self.test_create_template,
                self.test_create_training_sheet,
                self.test_create_canonical_label,
                self.test_trigger_training,
                self.test_verify_workflow,
            ]

            for test in tests:
                if not test():
                    self.log(f"\n{Colors.YELLOW}Test failed, stopping...{Colors.RESET}")
                    break
                time.sleep(0.5)  # Brief pause between tests

        finally:
            if not skip_cleanup:
                self.cleanup()

        # Print summary
        self.log(f"\n{Colors.BOLD}{'='*60}{Colors.RESET}")
        self.log(f"{Colors.BOLD}Test Summary{Colors.RESET}")
        self.log(f"{Colors.BOLD}{'='*60}{Colors.RESET}")
        self.log(f"{Colors.GREEN}Passed: {self.passed}{Colors.RESET}")
        self.log(f"{Colors.RED}Failed: {self.failed}{Colors.RESET}")

        if self.failed == 0:
            self.log(f"\n{Colors.GREEN}{Colors.BOLD}✓ All tests passed!{Colors.RESET}")
            return True
        else:
            self.log(f"\n{Colors.RED}{Colors.BOLD}✗ Some tests failed{Colors.RESET}")
            return False


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="End-to-end test suite for Ontos ML Workbench"
    )
    parser.add_argument(
        "--url",
        default="http://localhost:8000",
        help="Base URL of the API (default: http://localhost:8000)"
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable verbose output"
    )
    parser.add_argument(
        "--skip-cleanup",
        action="store_true",
        help="Skip cleanup of test resources"
    )

    args = parser.parse_args()

    # Load environment variables
    load_dotenv()

    # Run tests
    test = E2ETest(args.url, verbose=args.verbose)
    success = test.run(skip_cleanup=args.skip_cleanup)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
