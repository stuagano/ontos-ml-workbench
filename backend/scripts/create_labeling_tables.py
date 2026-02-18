#!/usr/bin/env python3
"""Create labeling workflow tables in Databricks."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.sql_service import get_sql_service


def main():
    sql = get_sql_service()

    # Create labeling_jobs table (no DEFAULT values - handled in app code)
    print("Creating labeling_jobs table...")
    sql.execute("""
    CREATE TABLE IF NOT EXISTS labeling_jobs (
      id STRING NOT NULL,
      name STRING NOT NULL,
      description STRING,
      sheet_id STRING NOT NULL,
      target_columns STRING,
      label_schema STRING,
      instructions STRING,
      ai_assist_enabled BOOLEAN,
      ai_model STRING,
      assignment_strategy STRING,
      default_batch_size INT,
      status STRING,
      total_items INT,
      labeled_items INT,
      reviewed_items INT,
      approved_items INT,
      created_by STRING,
      created_at TIMESTAMP,
      updated_at TIMESTAMP,
      CONSTRAINT labeling_jobs_pk PRIMARY KEY (id)
    ) USING DELTA
    TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true')
    """)
    print("  labeling_jobs created")

    # Create labeling_tasks table
    print("Creating labeling_tasks table...")
    sql.execute("""
    CREATE TABLE IF NOT EXISTS labeling_tasks (
      id STRING NOT NULL,
      job_id STRING NOT NULL,
      name STRING,
      item_indices STRING,
      item_count INT,
      assigned_to STRING,
      assigned_at TIMESTAMP,
      status STRING,
      labeled_count INT,
      started_at TIMESTAMP,
      submitted_at TIMESTAMP,
      reviewer STRING,
      reviewed_at TIMESTAMP,
      review_notes STRING,
      rejection_reason STRING,
      priority STRING,
      due_date TIMESTAMP,
      created_at TIMESTAMP,
      updated_at TIMESTAMP,
      CONSTRAINT labeling_tasks_pk PRIMARY KEY (id)
    ) USING DELTA
    TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true')
    """)
    print("  labeling_tasks created")

    # Create labeled_items table
    print("Creating labeled_items table...")
    sql.execute("""
    CREATE TABLE IF NOT EXISTS labeled_items (
      id STRING NOT NULL,
      task_id STRING NOT NULL,
      job_id STRING NOT NULL,
      row_index INT NOT NULL,
      ai_labels STRING,
      ai_confidence DOUBLE,
      human_labels STRING,
      labeled_by STRING,
      labeled_at TIMESTAMP,
      status STRING,
      review_status STRING,
      review_notes STRING,
      reviewed_by STRING,
      reviewed_at TIMESTAMP,
      is_difficult BOOLEAN,
      needs_discussion BOOLEAN,
      skip_reason STRING,
      created_at TIMESTAMP,
      updated_at TIMESTAMP,
      CONSTRAINT labeled_items_pk PRIMARY KEY (id)
    ) USING DELTA
    TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true')
    """)
    print("  labeled_items created")

    # Create workspace_users table
    print("Creating workspace_users table...")
    sql.execute("""
    CREATE TABLE IF NOT EXISTS workspace_users (
      id STRING NOT NULL,
      email STRING NOT NULL,
      display_name STRING,
      role STRING,
      max_concurrent_tasks INT,
      current_task_count INT,
      total_labeled INT,
      total_reviewed INT,
      accuracy_score DOUBLE,
      avg_time_per_item DOUBLE,
      is_active BOOLEAN,
      last_active_at TIMESTAMP,
      created_at TIMESTAMP,
      updated_at TIMESTAMP,
      CONSTRAINT workspace_users_pk PRIMARY KEY (id)
    ) USING DELTA
    TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true')
    """)
    print("  workspace_users created")

    print("\nAll labeling tables created successfully!")


if __name__ == "__main__":
    main()
