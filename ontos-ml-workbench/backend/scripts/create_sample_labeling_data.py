#!/usr/bin/env python3
"""Create sample labeling data for testing the workflow."""

import json
import sys
import uuid
from datetime import datetime

sys.path.insert(
    0, "/Users/stuart.gano/Documents/Customers/Mirion/mirion-vital-workbench/backend"
)

from app.services.sql_service import get_sql_service

sql = get_sql_service()

# Sample flower data (inspired by Databricks sample datasets)
FLOWER_DATA = [
    {
        "species": "setosa",
        "sepal_length": 5.1,
        "sepal_width": 3.5,
        "petal_length": 1.4,
        "petal_width": 0.2,
        "image_url": "/images/iris_setosa_001.jpg",
    },
    {
        "species": "setosa",
        "sepal_length": 4.9,
        "sepal_width": 3.0,
        "petal_length": 1.4,
        "petal_width": 0.2,
        "image_url": "/images/iris_setosa_002.jpg",
    },
    {
        "species": "setosa",
        "sepal_length": 4.7,
        "sepal_width": 3.2,
        "petal_length": 1.3,
        "petal_width": 0.2,
        "image_url": "/images/iris_setosa_003.jpg",
    },
    {
        "species": "versicolor",
        "sepal_length": 7.0,
        "sepal_width": 3.2,
        "petal_length": 4.7,
        "petal_width": 1.4,
        "image_url": "/images/iris_versicolor_001.jpg",
    },
    {
        "species": "versicolor",
        "sepal_length": 6.4,
        "sepal_width": 3.2,
        "petal_length": 4.5,
        "petal_width": 1.5,
        "image_url": "/images/iris_versicolor_002.jpg",
    },
    {
        "species": "versicolor",
        "sepal_length": 6.9,
        "sepal_width": 3.1,
        "petal_length": 4.9,
        "petal_width": 1.5,
        "image_url": "/images/iris_versicolor_003.jpg",
    },
    {
        "species": "virginica",
        "sepal_length": 6.3,
        "sepal_width": 3.3,
        "petal_length": 6.0,
        "petal_width": 2.5,
        "image_url": "/images/iris_virginica_001.jpg",
    },
    {
        "species": "virginica",
        "sepal_length": 5.8,
        "sepal_width": 2.7,
        "petal_length": 5.1,
        "petal_width": 1.9,
        "image_url": "/images/iris_virginica_002.jpg",
    },
    {
        "species": "virginica",
        "sepal_length": 7.1,
        "sepal_width": 3.0,
        "petal_length": 5.9,
        "petal_width": 2.1,
        "image_url": "/images/iris_virginica_003.jpg",
    },
    {
        "species": "setosa",
        "sepal_length": 5.4,
        "sepal_width": 3.9,
        "petal_length": 1.7,
        "petal_width": 0.4,
        "image_url": "/images/iris_setosa_004.jpg",
    },
    {
        "species": "versicolor",
        "sepal_length": 5.5,
        "sepal_width": 2.3,
        "petal_length": 4.0,
        "petal_width": 1.3,
        "image_url": "/images/iris_versicolor_004.jpg",
    },
    {
        "species": "virginica",
        "sepal_length": 6.5,
        "sepal_width": 3.0,
        "petal_length": 5.8,
        "petal_width": 2.2,
        "image_url": "/images/iris_virginica_004.jpg",
    },
]


def main():
    now = datetime.utcnow().isoformat()

    # 1. Create a sample sheet
    sheet_id = str(uuid.uuid4())
    print(f"Creating sample sheet: {sheet_id}")

    columns = [
        {
            "id": "species",
            "name": "Species",
            "data_type": "string",
            "source_type": "imported",
            "order": 0,
        },
        {
            "id": "sepal_length",
            "name": "Sepal Length",
            "data_type": "number",
            "source_type": "imported",
            "order": 1,
        },
        {
            "id": "sepal_width",
            "name": "Sepal Width",
            "data_type": "number",
            "source_type": "imported",
            "order": 2,
        },
        {
            "id": "petal_length",
            "name": "Petal Length",
            "data_type": "number",
            "source_type": "imported",
            "order": 3,
        },
        {
            "id": "petal_width",
            "name": "Petal Width",
            "data_type": "number",
            "source_type": "imported",
            "order": 4,
        },
        {
            "id": "image_url",
            "name": "Image URL",
            "data_type": "string",
            "source_type": "imported",
            "order": 5,
        },
        {
            "id": "quality_rating",
            "name": "Quality Rating",
            "data_type": "number",
            "source_type": "generated",
            "order": 6,
        },
        {
            "id": "health_status",
            "name": "Health Status",
            "data_type": "string",
            "source_type": "generated",
            "order": 7,
        },
    ]

    columns_json = json.dumps(columns).replace("'", "''")

    sql.execute(f"""
    INSERT INTO sheets (id, name, description, version, status, columns, row_count, created_by, created_at, updated_at)
    VALUES (
        '{sheet_id}',
        'Iris Flower Dataset',
        'Sample iris flower dataset for labeling quality and health status',
        '1.0.0',
        'published',
        '{columns_json}',
        {len(FLOWER_DATA)},
        'stuart.gano@databricks.com',
        '{now}',
        '{now}'
    )
    """)
    print(f"  Sheet created: Iris Flower Dataset")

    # 2. Insert sheet data
    print("Inserting sheet data...")
    for row_idx, flower in enumerate(FLOWER_DATA):
        for col_id, value in flower.items():
            data_id = str(uuid.uuid4())
            value_json = json.dumps(value).replace("'", "''")
            sql.execute(f"""
            INSERT INTO sheet_data (id, sheet_id, row_index, column_id, value, source, generated_at, edited_at)
            VALUES (
                '{data_id}',
                '{sheet_id}',
                {row_idx},
                '{col_id}',
                '{value_json}',
                'imported',
                NULL,
                NULL
            )
            """)
    print(f"  Inserted {len(FLOWER_DATA)} rows of data")

    # 3. Create a labeling job
    job_id = str(uuid.uuid4())
    print(f"\nCreating labeling job: {job_id}")

    label_schema = {
        "fields": [
            {
                "id": "quality_rating",
                "name": "Quality Rating",
                "field_type": "number",
                "required": True,
                "min_value": 1,
                "max_value": 5,
                "description": "Rate the overall quality of this flower sample (1=Poor, 5=Excellent)",
            },
            {
                "id": "health_status",
                "name": "Health Status",
                "field_type": "select",
                "required": True,
                "options": [
                    "Healthy",
                    "Slightly Damaged",
                    "Damaged",
                    "Diseased",
                    "Dead",
                ],
                "description": "Assess the health status of the flower",
            },
            {
                "id": "notes",
                "name": "Notes",
                "field_type": "text",
                "required": False,
                "description": "Any additional observations",
            },
        ]
    }

    target_columns = ["quality_rating", "health_status"]
    label_schema_json = json.dumps(label_schema).replace("'", "''")
    target_columns_json = json.dumps(target_columns).replace("'", "''")

    instructions = """## Flower Quality Assessment

### Task
Review each iris flower sample and assess its quality and health status.

### Quality Rating (1-5)
- **5 - Excellent**: Perfect specimen, vibrant colors, no defects
- **4 - Good**: Minor imperfections, healthy overall
- **3 - Average**: Some visible wear or minor damage
- **2 - Below Average**: Significant damage or discoloration
- **1 - Poor**: Severely damaged or unusable

### Health Status
- **Healthy**: No signs of disease or damage
- **Slightly Damaged**: Minor physical damage (torn petals, etc.)
- **Damaged**: Significant physical damage
- **Diseased**: Shows signs of disease (spots, discoloration)
- **Dead**: No longer viable

### Tips
- Consider petal integrity, color vibrancy, and overall appearance
- Use the Notes field for any unusual observations
""".replace("'", "''")

    sql.execute(f"""
    INSERT INTO labeling_jobs (
        id, name, description, sheet_id, target_columns, label_schema,
        instructions, ai_assist_enabled, ai_model, assignment_strategy,
        default_batch_size, status, total_items, labeled_items,
        reviewed_items, approved_items, created_by, created_at, updated_at
    ) VALUES (
        '{job_id}',
        'Iris Flower Quality Assessment',
        'Assess quality and health status of iris flower samples',
        '{sheet_id}',
        '{target_columns_json}',
        '{label_schema_json}',
        '{instructions}',
        true,
        'databricks-meta-llama-3-3-70b-instruct',
        'manual',
        5,
        'active',
        {len(FLOWER_DATA)},
        0,
        0,
        0,
        'stuart.gano@databricks.com',
        '{now}',
        '{now}'
    )
    """)
    print(f"  Job created: Iris Flower Quality Assessment")

    # 4. Create labeling tasks (batches)
    batch_size = 4
    task_ids = []

    print("\nCreating labeling tasks...")
    for batch_idx in range(0, len(FLOWER_DATA), batch_size):
        task_id = str(uuid.uuid4())
        task_ids.append(task_id)

        end_idx = min(batch_idx + batch_size, len(FLOWER_DATA))
        item_indices = list(range(batch_idx, end_idx))
        item_indices_json = json.dumps(item_indices).replace("'", "''")

        # First task assigned and in progress, others pending
        if batch_idx == 0:
            status = "in_progress"
            assigned_to = "stuart.gano@databricks.com"
            assigned_at = now
            started_at = now
        else:
            status = "pending"
            assigned_to = "NULL"
            assigned_at = "NULL"
            started_at = "NULL"

        sql.execute(f"""
        INSERT INTO labeling_tasks (
            id, job_id, name, item_indices, item_count, assigned_to,
            assigned_at, status, labeled_count, started_at, submitted_at,
            reviewer, reviewed_at, review_notes, rejection_reason,
            priority, due_date, created_at, updated_at
        ) VALUES (
            '{task_id}',
            '{job_id}',
            'Batch {batch_idx // batch_size + 1}',
            '{item_indices_json}',
            {len(item_indices)},
            {f"'{assigned_to}'" if assigned_to != "NULL" else "NULL"},
            {f"'{assigned_at}'" if assigned_at != "NULL" else "NULL"},
            '{status}',
            0,
            {f"'{started_at}'" if started_at != "NULL" else "NULL"},
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            'normal',
            NULL,
            '{now}',
            '{now}'
        )
        """)
        print(
            f"  Task created: Batch {batch_idx // batch_size + 1} ({len(item_indices)} items) - {status}"
        )

    # 5. Create labeled items for the first task (with AI pre-labels)
    print("\nCreating labeled items with AI suggestions...")
    first_task_id = task_ids[0]

    # AI suggestions for each flower
    ai_suggestions = [
        {"quality_rating": 4, "health_status": "Healthy"},
        {"quality_rating": 3, "health_status": "Slightly Damaged"},
        {"quality_rating": 5, "health_status": "Healthy"},
        {"quality_rating": 4, "health_status": "Healthy"},
    ]

    for idx, (row_idx, ai_label) in enumerate(zip(range(4), ai_suggestions)):
        item_id = str(uuid.uuid4())
        ai_labels_json = json.dumps(ai_label).replace("'", "''")
        confidence = 0.85 + (idx % 3) * 0.05  # Vary confidence a bit

        sql.execute(f"""
        INSERT INTO labeled_items (
            id, task_id, job_id, row_index, ai_labels, ai_confidence,
            human_labels, labeled_by, labeled_at, status, review_status,
            review_notes, reviewed_by, reviewed_at, is_difficult,
            needs_discussion, skip_reason, created_at, updated_at
        ) VALUES (
            '{item_id}',
            '{first_task_id}',
            '{job_id}',
            {row_idx},
            '{ai_labels_json}',
            {confidence},
            NULL,
            NULL,
            NULL,
            'ai_labeled',
            NULL,
            NULL,
            NULL,
            NULL,
            false,
            false,
            NULL,
            '{now}',
            '{now}'
        )
        """)
    print(f"  Created 4 labeled items with AI suggestions")

    # 6. Create a workspace user
    print("\nCreating workspace user...")
    user_id = str(uuid.uuid4())
    sql.execute(f"""
    INSERT INTO workspace_users (
        id, email, display_name, role, max_concurrent_tasks,
        current_task_count, total_labeled, total_reviewed,
        accuracy_score, avg_time_per_item, is_active, last_active_at,
        created_at, updated_at
    ) VALUES (
        '{user_id}',
        'stuart.gano@databricks.com',
        'Stuart Gano',
        'admin',
        10,
        1,
        0,
        0,
        NULL,
        NULL,
        true,
        '{now}',
        '{now}',
        '{now}'
    )
    """)
    print(f"  User created: Stuart Gano (admin)")

    print("\n" + "=" * 60)
    print("SAMPLE DATA CREATED SUCCESSFULLY!")
    print("=" * 60)
    print(f"\nSheet ID: {sheet_id}")
    print(f"Job ID: {job_id}")
    print(f"Tasks: {len(task_ids)} batches")
    print(f"Items: {len(FLOWER_DATA)} total, 4 with AI labels")
    print("\nYou can now test the labeling workflow in the UI!")


if __name__ == "__main__":
    main()
