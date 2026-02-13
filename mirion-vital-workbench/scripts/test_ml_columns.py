"""
Test script: Verify ML column configuration works end-to-end
"""
import requests
import json

# Backend URL
API_BASE = "http://localhost:8000/api/v1"

def test_create_template_with_ml_columns():
    """Test creating a template with ML column configuration"""

    # Create template with ML columns
    template_data = {
        "name": "Price Prediction Template",
        "description": "Predict price from order features",
        "feature_columns": ["order_id", "product_id", "quantity", "unit_price"],
        "target_column": "total_price",
        "prompt_template": "Given order {{order_id}} with product {{product_id}}, quantity {{quantity}}, and unit price {{unit_price}}, predict the total price.",
        "system_prompt": "You are a helpful assistant that predicts prices.",
        "label_type": "regression"
    }

    print("=" * 80)
    print("Testing ML Column Configuration")
    print("=" * 80)

    print("\n1. Creating template with ML columns...")
    print(f"   Features: {template_data['feature_columns']}")
    print(f"   Target: {template_data['target_column']}")

    response = requests.post(
        f"{API_BASE}/templates",
        json=template_data,
        headers={"Content-Type": "application/json"}
    )

    if response.status_code == 201:
        template = response.json()
        print(f"\n✓ Template created successfully!")
        print(f"  ID: {template['id']}")
        print(f"  Name: {template['name']}")
        print(f"  Feature columns: {template.get('feature_columns', [])}")
        print(f"  Target column: {template.get('target_column', 'N/A')}")

        # Test retrieving the template
        print("\n2. Retrieving template...")
        get_response = requests.get(f"{API_BASE}/templates/{template['id']}")

        if get_response.status_code == 200:
            retrieved = get_response.json()
            print(f"✓ Template retrieved successfully!")
            print(f"  Feature columns: {retrieved.get('feature_columns', [])}")
            print(f"  Target column: {retrieved.get('target_column', 'N/A')}")

            # Verify ML columns are present
            if retrieved.get('feature_columns') == template_data['feature_columns']:
                print("\n✓ Feature columns match!")
            else:
                print("\n✗ Feature columns mismatch!")

            if retrieved.get('target_column') == template_data['target_column']:
                print("✓ Target column matches!")
            else:
                print("✗ Target column mismatch!")
        else:
            print(f"✗ Failed to retrieve template: {get_response.status_code}")
            print(get_response.text)
    else:
        print(f"\n✗ Failed to create template: {response.status_code}")
        print(response.text)

    print("\n" + "=" * 80)

if __name__ == "__main__":
    test_create_template_with_ml_columns()
