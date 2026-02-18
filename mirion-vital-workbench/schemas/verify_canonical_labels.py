#!/usr/bin/env python3
from databricks.sdk import WorkspaceClient

w = WorkspaceClient(profile="fe-vm-serverless-dxukih")

# Get labels by type
result = w.statement_execution.execute_statement(
    statement="""
    SELECT
        label_type,
        COUNT(*) as count,
        COUNT(DISTINCT sheet_id) as num_sheets,
        AVG(CASE
            WHEN label_confidence = 'low' THEN 1
            WHEN label_confidence = 'medium' THEN 2
            WHEN label_confidence = 'high' THEN 3
            WHEN label_confidence = 'verified' THEN 4
            ELSE 0
        END) as avg_confidence
    FROM `erp-demonstrations`.ontos_ml_workbench.canonical_labels
    GROUP BY label_type
    ORDER BY count DESC
    """,
    warehouse_id="387bcda0f2ece20c",
    wait_timeout="30s",
)

if (
    result.status.state.value == "SUCCEEDED"
    and result.result
    and result.result.data_array
):
    print("\n📊 Canonical Labels Summary:")
    print("=" * 80)
    print(
        f"{'Label Type':30s} | {'Count':>6s} | {'Sheets':>7s} | {'Avg Confidence':>15s}"
    )
    print("-" * 80)
    for row in result.result.data_array:
        conf_map = {1: "low", 2: "medium", 3: "high", 4: "verified"}
        avg_conf = conf_map.get(round(float(row[3])), "unknown")
        print(f"{row[0]:30s} | {str(row[1]):>6s} | {str(row[2]):>7s} | {avg_conf:>15s}")
    print("=" * 80)

    total = sum(int(row[1]) for row in result.result.data_array)
    print(f"Total: {total} canonical labels\n")

    # Show sample labels with data classification
    print("📋 Sample Labels with Governance:")
    print("-" * 80)
    sample_result = w.statement_execution.execute_statement(
        statement="""
        SELECT
            item_ref,
            label_type,
            label_confidence,
            data_classification,
            SIZE(allowed_uses) as num_uses
        FROM `erp-demonstrations`.ontos_ml_workbench.canonical_labels
        LIMIT 5
        """,
        warehouse_id="387bcda0f2ece20c",
        wait_timeout="30s",
    )
    if sample_result.result and sample_result.result.data_array:
        for row in sample_result.result.data_array:
            print(
                f"  {row[0]:20s} | {row[1]:25s} | {row[2]:10s} | {row[3]:15s} | {row[4]} uses"
            )
else:
    print("❌ Query failed or no data")
