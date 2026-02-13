"""
End-to-end test: Verify ML column configuration flows through the entire system
Tests: Template → Template Config → Training Sheet → Database
"""
import requests
import json

API_BASE = "http://localhost:8000/api/v1"

def test_ml_columns_end_to_end():
    """Test ML columns flow through: templates → sheets → training_sheets"""

    print("=" * 80)
    print("E2E Test: ML Column Configuration")
    print("=" * 80)

    # Step 1: Create template with ML columns
    print("\n1. Creating template with ML configuration...")
    template_data = {
        "name": "E2E Price Prediction",
        "description": "End-to-end test template",
        "feature_columns": ["order_id", "product_id", "quantity", "unit_price"],
        "target_column": "total_price",
        "prompt_template": "Predict price for order {{order_id}}",
        "system_prompt": "You are a price prediction assistant.",
        "label_type": "regression"
    }

    response = requests.post(f"{API_BASE}/templates", json=template_data)
    if response.status_code != 201:
        print(f"✗ Template creation failed: {response.status_code}")
        print(response.text)
        return False

    template = response.json()
    print(f"✓ Template created: {template['id']}")
    print(f"  Features: {template.get('feature_columns', [])}")
    print(f"  Target: {template.get('target_column')}")

    # Step 2: Verify template retrieval includes ML columns
    print("\n2. Retrieving template...")
    response = requests.get(f"{API_BASE}/templates/{template['id']}")
    if response.status_code != 200:
        print(f"✗ Template retrieval failed: {response.status_code}")
        return False

    retrieved_template = response.json()
    if retrieved_template.get('feature_columns') == template_data['feature_columns']:
        print(f"✓ Feature columns match: {retrieved_template['feature_columns']}")
    else:
        print(f"✗ Feature columns mismatch!")
        return False

    if retrieved_template.get('target_column') == template_data['target_column']:
        print(f"✓ Target column matches: {retrieved_template['target_column']}")
    else:
        print(f"✗ Target column mismatch!")
        return False

    # Step 3: Check if sheet exists (use order_items sheet if available)
    print("\n3. Looking for test sheet...")
    response = requests.get(f"{API_BASE}/sheets-v2")
    if response.status_code != 200:
        print(f"✗ Failed to list sheets: {response.status_code}")
        return False

    sheets_response = response.json()
    # Handle both list and dict with 'sheets' key
    sheets = sheets_response if isinstance(sheets_response, list) else sheets_response.get('sheets', [])

    test_sheet = None
    for sheet in sheets:
        sheet_name = sheet.get('name', '') if isinstance(sheet, dict) else ''
        if 'order' in sheet_name.lower():
            test_sheet = sheet
            break

    if not test_sheet:
        print("✗ No suitable test sheet found (need one with 'order' in name)")
        print("  Skipping training sheet creation test")
        return True  # Template tests passed, but can't test full flow

    print(f"✓ Found test sheet: {test_sheet['name']} ({test_sheet['id']})")

    # Step 4: Attach template config to sheet
    print("\n4. Attaching template config to sheet...")
    attach_data = {
        "prompt_template": template['prompt_template'],
        "system_instruction": template['system_prompt'],
        "model": "databricks-meta-llama-3-1-70b-instruct",
        "temperature": 0.7,
        "max_tokens": 1024,
        "feature_columns": template['feature_columns'],
        "target_column": template['target_column'],
        "response_source_mode": "ai_generated"
    }

    response = requests.post(
        f"{API_BASE}/sheets-v2/{test_sheet['id']}/attach-template",
        json=attach_data
    )

    if response.status_code != 200:
        print(f"✗ Template attachment failed: {response.status_code}")
        print(response.text)
        return False

    print("✓ Template attached to sheet")

    # Step 5: Generate training data (assemble)
    print("\n5. Generating training data...")
    assemble_data = {
        "name": "E2E Test Training Sheet",
        "description": "Test training sheet with ML config",
        "row_limit": 5  # Just 5 rows for testing
    }

    response = requests.post(
        f"{API_BASE}/sheets-v2/{test_sheet['id']}/assemble",
        json=assemble_data
    )

    if response.status_code != 201:
        print(f"✗ Training data generation failed: {response.status_code}")
        print(response.text)
        return False

    assemble_response = response.json()
    training_sheet_id = assemble_response.get('training_sheet_id')
    print(f"✓ Training sheet created: {training_sheet_id}")
    print(f"  Total items: {assemble_response.get('total_items')}")

    # Step 6: Verify training sheet has ML columns (via assembly endpoint)
    print("\n6. Retrieving training sheet...")
    response = requests.get(f"{API_BASE}/assemblies/{training_sheet_id}")

    if response.status_code != 200:
        print(f"✗ Training sheet retrieval failed: {response.status_code}")
        print(response.text)
        return False

    training_sheet = response.json()
    template_config = training_sheet.get('template_config', {})

    # Check if ML columns are in template_config
    ts_features = template_config.get('feature_columns', [])
    ts_target = template_config.get('target_column')

    if ts_features == template_data['feature_columns']:
        print(f"✓ Training sheet has feature columns: {ts_features}")
    else:
        print(f"✗ Feature columns mismatch in training sheet!")
        print(f"  Expected: {template_data['feature_columns']}")
        print(f"  Got: {ts_features}")
        return False

    if ts_target == template_data['target_column']:
        print(f"✓ Training sheet has target column: {ts_target}")
    else:
        print(f"✗ Target column mismatch in training sheet!")
        print(f"  Expected: {template_data['target_column']}")
        print(f"  Got: {ts_target}")
        return False

    print("\n" + "=" * 80)
    print("✓ ALL TESTS PASSED!")
    print("=" * 80)
    print("\nML column configuration flows correctly through:")
    print("  1. Templates API")
    print("  2. Template Config attachment")
    print("  3. Training Sheet generation")
    print("  4. Database storage")
    print("  5. API retrieval")

    return True

if __name__ == "__main__":
    success = test_ml_columns_end_to_end()
    exit(0 if success else 1)
