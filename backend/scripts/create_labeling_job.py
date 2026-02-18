#!/usr/bin/env python3
"""Create a labeling job for the existing sheet."""

import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.sql_service import get_sql_service

sql = get_sql_service()


def main():
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    # Get the sheet ID
    sheets = sql.execute("SELECT id, name, row_count FROM sheets LIMIT 1")
    if not sheets:
        print("No sheets found! Please create a sheet first.")
        return

    sheet = sheets[0]
    sheet_id = sheet["id"]
    sheet_name = sheet["name"]
    row_count = int(sheet["row_count"] or 12)

    print(f"Using sheet: {sheet_name} ({row_count} rows)")

    # Create the labeling job
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
                "description": "Rate the overall quality (1=Poor, 5=Excellent)",
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
                "description": "Assess the health status",
            },
        ]
    }

    target_columns = ["quality_rating", "health_status"]

    instructions = """## Flower Quality Assessment

Rate each flower sample for quality (1-5) and health status.

### Quality Rating
- 5: Excellent - Perfect specimen
- 4: Good - Minor imperfections
- 3: Average - Some visible wear
- 2: Below Average - Significant damage
- 1: Poor - Severely damaged

### Health Status
- Healthy: No signs of disease
- Slightly Damaged: Minor physical damage
- Damaged: Significant physical damage
- Diseased: Shows signs of disease
- Dead: No longer viable"""

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
        '{json.dumps(target_columns)}',
        '{json.dumps(label_schema).replace(chr(39), chr(39) + chr(39))}',
        '{instructions.replace(chr(39), chr(39) + chr(39))}',
        true,
        'databricks-meta-llama-3-3-70b-instruct',
        'manual',
        4,
        'active',
        {row_count},
        0,
        0,
        0,
        'admin@example.com',
        '{now}',
        '{now}'
    )
    """)
    print(f"  Created job: Iris Flower Quality Assessment")

    # Create 3 tasks (batches of 4)
    batch_size = 4
    task_ids = []

    print("\nCreating tasks...")
    for batch_num in range(3):
        task_id = str(uuid.uuid4())
        task_ids.append(task_id)

        start_idx = batch_num * batch_size
        end_idx = min(start_idx + batch_size, row_count)
        item_indices = list(range(start_idx, end_idx))

        # First task in progress, second submitted, third pending
        if batch_num == 0:
            status = "in_progress"
            assigned_to = "'admin@example.com'"
            assigned_at = f"'{now}'"
            started_at = f"'{now}'"
            labeled_count = 2
        elif batch_num == 1:
            status = "submitted"
            assigned_to = "'admin@example.com'"
            assigned_at = f"'{now}'"
            started_at = f"'{now}'"
            labeled_count = 4
        else:
            status = "pending"
            assigned_to = "NULL"
            assigned_at = "NULL"
            started_at = "NULL"
            labeled_count = 0

        sql.execute(f"""
        INSERT INTO labeling_tasks (
            id, job_id, name, item_indices, item_count, assigned_to,
            assigned_at, status, labeled_count, started_at, submitted_at,
            reviewer, reviewed_at, review_notes, rejection_reason,
            priority, due_date, created_at, updated_at
        ) VALUES (
            '{task_id}',
            '{job_id}',
            'Batch {batch_num + 1}',
            '{json.dumps(item_indices)}',
            {len(item_indices)},
            {assigned_to},
            {assigned_at},
            '{status}',
            {labeled_count},
            {started_at},
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
        print(f"  Task: Batch {batch_num + 1} - {status} ({len(item_indices)} items)")

    # Create labeled items for first two tasks
    print("\nCreating labeled items...")

    ai_suggestions = [
        (4, "Healthy", 0.92),
        (3, "Slightly Damaged", 0.78),
        (5, "Healthy", 0.95),
        (4, "Healthy", 0.88),
        (3, "Damaged", 0.72),
        (4, "Healthy", 0.85),
        (5, "Healthy", 0.91),
        (2, "Diseased", 0.65),
    ]

    # First task: 4 items, 2 human labeled
    for idx in range(4):
        item_id = str(uuid.uuid4())
        quality, health, confidence = ai_suggestions[idx]
        ai_labels = json.dumps({"quality_rating": quality, "health_status": health})

        if idx < 2:  # First 2 have human labels
            human_labels = json.dumps(
                {"quality_rating": quality, "health_status": health}
            )
            status = "human_labeled"
            labeled_by = "'admin@example.com'"
            labeled_at = f"'{now}'"
        else:
            human_labels = "NULL"
            status = "ai_labeled"
            labeled_by = "NULL"
            labeled_at = "NULL"

        sql.execute(f"""
        INSERT INTO labeled_items (
            id, task_id, job_id, row_index, ai_labels, ai_confidence,
            human_labels, labeled_by, labeled_at, status, review_status,
            review_notes, reviewed_by, reviewed_at, is_difficult,
            needs_discussion, skip_reason, created_at, updated_at
        ) VALUES (
            '{item_id}',
            '{task_ids[0]}',
            '{job_id}',
            {idx},
            '{ai_labels}',
            {confidence},
            {human_labels if human_labels != "NULL" else "NULL"},
            {labeled_by},
            {labeled_at},
            '{status}',
            NULL, NULL, NULL, NULL,
            false, false, NULL,
            '{now}', '{now}'
        )
        """)
    print(f"  Task 1: 4 items (2 human labeled, 2 AI labeled)")

    # Second task: 4 items, all human labeled (submitted for review)
    for idx in range(4, 8):
        item_id = str(uuid.uuid4())
        quality, health, confidence = ai_suggestions[idx]
        ai_labels = json.dumps({"quality_rating": quality, "health_status": health})
        human_labels = json.dumps(
            {
                "quality_rating": quality + (1 if idx == 7 else 0),
                "health_status": health,
            }
        )

        sql.execute(f"""
        INSERT INTO labeled_items (
            id, task_id, job_id, row_index, ai_labels, ai_confidence,
            human_labels, labeled_by, labeled_at, status, review_status,
            review_notes, reviewed_by, reviewed_at, is_difficult,
            needs_discussion, skip_reason, created_at, updated_at
        ) VALUES (
            '{item_id}',
            '{task_ids[1]}',
            '{job_id}',
            {idx},
            '{ai_labels}',
            {confidence},
            '{human_labels}',
            'admin@example.com',
            '{now}',
            'human_labeled',
            NULL, NULL, NULL, NULL,
            {("true" if idx == 7 else "false")}, false, NULL,
            '{now}', '{now}'
        )
        """)
    print(f"  Task 2: 4 items (all human labeled, ready for review)")

    # Create workspace user if not exists
    print("\nChecking workspace user...")
    users = sql.execute(
        "SELECT id FROM workspace_users WHERE email = 'admin@example.com'"
    )
    if not users:
        user_id = str(uuid.uuid4())
        sql.execute(f"""
        INSERT INTO workspace_users (
            id, email, display_name, role, max_concurrent_tasks,
            current_task_count, total_labeled, total_reviewed,
            accuracy_score, avg_time_per_item, is_active, last_active_at,
            created_at, updated_at
        ) VALUES (
            '{user_id}',
            'admin@example.com',
            'Admin User',
            'admin',
            10, 2, 6, 0, NULL, NULL, true, '{now}', '{now}', '{now}'
        )
        """)
        print("  Created user: Admin User")
    else:
        print("  User already exists")

    # Update job stats
    sql.execute(f"""
    UPDATE labeling_jobs
    SET labeled_items = 6
    WHERE id = '{job_id}'
    """)

    print("\n" + "=" * 60)
    print("LABELING JOB CREATED SUCCESSFULLY!")
    print("=" * 60)
    print(f"\nJob: Iris Flower Quality Assessment")
    print(f"  - 3 tasks (batches)")
    print(f"  - Task 1: In Progress (2/4 labeled)")
    print(f"  - Task 2: Submitted for Review (4/4 labeled)")
    print(f"  - Task 3: Pending (unassigned)")
    print(f"\nRefresh the UI to see the job!")


if __name__ == "__main__":
    main()
