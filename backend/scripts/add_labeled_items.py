#!/usr/bin/env python3
"""Add labeled items to the existing tasks."""

import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.sql_service import get_sql_service

sql = get_sql_service()


def escape_json(obj):
    """Escape JSON for SQL string."""
    return json.dumps(obj).replace("'", "''")


def main():
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    job_id = "a4299e09-be39-4f58-aea6-eb4826ddc9d1"
    task1_id = "1457cedb-6498-4784-96e3-b283f9941a80"  # in_progress
    task2_id = "d0f4a668-fe9a-43ae-88da-ef966f3a9fcd"  # submitted

    print("Adding labeled items...")

    # Task 1: 4 items (2 human labeled, 2 AI only)
    items_task1 = [
        (0, 4, "Healthy", 0.92, True),  # human labeled
        (1, 3, "Slightly Damaged", 0.78, True),  # human labeled
        (2, 5, "Healthy", 0.95, False),  # AI only
        (3, 4, "Healthy", 0.88, False),  # AI only
    ]

    for row_idx, quality, health, confidence, human_labeled in items_task1:
        item_id = str(uuid.uuid4())
        ai_labels = escape_json({"quality_rating": quality, "health_status": health})

        if human_labeled:
            human_labels = escape_json(
                {"quality_rating": quality, "health_status": health}
            )
            status = "human_labeled"
            labeled_by = "admin@example.com"
            labeled_at = now
            human_part = f"'{human_labels}', '{labeled_by}', '{labeled_at}'"
        else:
            status = "ai_labeled"
            human_part = "NULL, NULL, NULL"

        query = f"""
        INSERT INTO labeled_items (
            id, task_id, job_id, row_index, ai_labels, ai_confidence,
            human_labels, labeled_by, labeled_at, status, review_status,
            review_notes, reviewed_by, reviewed_at, is_difficult,
            needs_discussion, skip_reason, created_at, updated_at
        ) VALUES (
            '{item_id}', '{task1_id}', '{job_id}', {row_idx},
            '{ai_labels}', {confidence},
            {human_part}, '{status}',
            NULL, NULL, NULL, NULL,
            false, false, NULL,
            '{now}', '{now}'
        )
        """
        sql.execute(query)
    print(f"  Task 1: Added 4 items (2 human labeled)")

    # Task 2: 4 items (all human labeled, ready for review)
    items_task2 = [
        (4, 3, "Damaged", 0.72, 4, "Slightly Damaged"),  # Human corrected
        (5, 4, "Healthy", 0.85, 4, "Healthy"),
        (6, 5, "Healthy", 0.91, 5, "Healthy"),
        (7, 2, "Diseased", 0.65, 3, "Diseased"),  # Human adjusted rating
    ]

    for row_idx, ai_q, ai_h, confidence, human_q, human_h in items_task2:
        item_id = str(uuid.uuid4())
        ai_labels = escape_json({"quality_rating": ai_q, "health_status": ai_h})
        human_labels = escape_json(
            {"quality_rating": human_q, "health_status": human_h}
        )

        # Mark one as difficult
        is_difficult = "true" if row_idx == 7 else "false"

        query = f"""
        INSERT INTO labeled_items (
            id, task_id, job_id, row_index, ai_labels, ai_confidence,
            human_labels, labeled_by, labeled_at, status, review_status,
            review_notes, reviewed_by, reviewed_at, is_difficult,
            needs_discussion, skip_reason, created_at, updated_at
        ) VALUES (
            '{item_id}', '{task2_id}', '{job_id}', {row_idx},
            '{ai_labels}', {confidence},
            '{human_labels}', 'admin@example.com', '{now}', 'human_labeled',
            NULL, NULL, NULL, NULL,
            {is_difficult}, false, NULL,
            '{now}', '{now}'
        )
        """
        sql.execute(query)
    print(f"  Task 2: Added 4 items (all human labeled, 1 flagged difficult)")

    # Update job stats
    sql.execute(f"""
    UPDATE labeling_jobs
    SET labeled_items = 6
    WHERE id = '{job_id}'
    """)
    print("\nUpdated job stats")

    # Check for workspace user
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
            '{user_id}', 'admin@example.com', 'Admin User', 'admin',
            10, 2, 6, 0, NULL, NULL, true, '{now}', '{now}', '{now}'
        )
        """)
        print("Created workspace user")

    print("\n" + "=" * 50)
    print("LABELED ITEMS CREATED!")
    print("=" * 50)
    print("\nSummary:")
    print("  - Task 1 (In Progress): 4 items, 2 human labeled")
    print("  - Task 2 (Submitted): 4 items, all human labeled")
    print("  - Task 3 (Pending): No items yet")
    print("\nRefresh the UI to test!")


if __name__ == "__main__":
    main()
