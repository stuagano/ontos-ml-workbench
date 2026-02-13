#!/usr/bin/env python3
"""
Seed sheets table with sample data using direct Delta writes via Databricks SDK
Bypasses SQL warehouse to avoid INSERT timeout issues
"""
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from datetime import datetime
from uuid import uuid4
import pandas as pd
from databricks.sdk import WorkspaceClient
from app.core.config import get_settings

print("🌱 Seeding sheets table with sample data...\n")

# Initialize
settings = get_settings()
w = WorkspaceClient()
catalog = settings.databricks_catalog
schema = settings.databricks_schema
table_name = f"{catalog}.{schema}.sheets"
user = "stuart.gano@databricks.com"

print(f"Target table: {table_name}")

# Prepare seed data as pandas DataFrame
seed_data = pd.DataFrame([
    {
        "id": f"sheet-{uuid4()}",
        "name": "PCB Defect Detection Dataset",
        "description": "Microscope images of PCBs with labeled defects",
        "source_type": "uc_volume",
        "source_table": None,
        "source_volume": "/Volumes/home_stuart_gano/mirion_vital_workbench/pcb_images",
        "source_path": "defect_images/",
        "item_id_column": "image_filename",
        "text_columns": [],
        "image_columns": ["image_path"],
        "metadata_columns": ["sensor_reading", "timestamp", "station_id"],
        "sampling_strategy": "all",
        "sample_size": None,
        "filter_expression": None,
        "status": "active",
        "item_count": 150,
        "last_validated_at": None,
        "created_at": datetime.now(),
        "created_by": user,
        "updated_at": datetime.now(),
        "updated_by": user,
    },
    {
        "id": f"sheet-{uuid4()}",
        "name": "Radiation Sensor Telemetry",
        "description": "Time-series sensor data from radiation detectors",
        "source_type": "uc_table",
        "source_table": f"{catalog}.{schema}.sensor_readings",
        "source_volume": None,
        "source_path": None,
        "item_id_column": "reading_id",
        "text_columns": ["notes", "alert_message"],
        "image_columns": [],
        "metadata_columns": ["sensor_id", "location", "timestamp", "calibration_date"],
        "sampling_strategy": "random",
        "sample_size": 1000,
        "filter_expression": 'status = "active" AND reading_value > 0',
        "status": "active",
        "item_count": 5000,
        "last_validated_at": None,
        "created_at": datetime.now(),
        "created_by": user,
        "updated_at": datetime.now(),
        "updated_by": user,
    },
])

print(f"Prepared {len(seed_data)} sheets for insertion\n")

# Try different approaches to write data
print("Attempting to write data using Databricks Jobs API...\n")

# Create a simple Python script that will run as a job
job_script = f"""
import pandas as pd
from datetime import datetime

# Recreate the DataFrame in the job context
data = {seed_data.to_dict('list')}
df = pd.DataFrame(data)

# Convert to Spark DataFrame
spark_df = spark.createDataFrame(df)

# Write to Delta table
spark_df.write.format("delta").mode("append").saveAsTable("{table_name}")

print(f"✅ Successfully inserted {{len(df)}} rows into {table_name}")
"""

# Create a one-off job to write the data
try:
    print("Creating Databricks job to write seed data...")

    # Get a cluster to run on
    clusters = list(w.clusters.list())
    if not clusters:
        print("❌ No clusters available. Please create a cluster first.")
        sys.exit(1)

    cluster_id = clusters[0].cluster_id
    print(f"Using cluster: {clusters[0].cluster_name} ({cluster_id})")

    # Create job
    from databricks.sdk.service.jobs import Task, PythonTask, Source

    job = w.jobs.create(
        name=f"Seed Sheets Table - {datetime.now().isoformat()}",
        tasks=[
            Task(
                task_key="seed_data",
                existing_cluster_id=cluster_id,
                python_task=PythonTask(
                    python_script=job_script,
                    source=Source.INLINE
                ),
            )
        ],
    )

    print(f"✅ Created job: {job.job_id}")

    # Run the job
    print("Running job...")
    run = w.jobs.run_now(job_id=job.job_id)

    print(f"✅ Job started: {run.run_id}")
    print(f"\nMonitor at: {w.config.host}/jobs/{job.job_id}/runs/{run.run_id}")

    # Wait for completion
    print("\nWaiting for job to complete...")
    import time
    for i in range(60):  # Wait up to 5 minutes
        run_status = w.jobs.get_run(run.run_id)
        state = run_status.state.life_cycle_state

        if state == "TERMINATED":
            result = run_status.state.result_state
            if result == "SUCCESS":
                print("✅ Job completed successfully!")
                print(f"\n🎉 Seed data has been written to {table_name}")

                # Clean up job
                w.jobs.delete(job.job_id)
                print(f"✅ Cleaned up job {job.job_id}")
                break
            else:
                print(f"❌ Job failed with result: {result}")
                sys.exit(1)
        elif state in ["INTERNAL_ERROR", "SKIPPED"]:
            print(f"❌ Job error: {state}")
            sys.exit(1)

        print(f"  Status: {state} ({i+1}s)")
        time.sleep(5)
    else:
        print("⏱  Job is still running. Check the link above for status.")

except Exception as e:
    print(f"❌ Failed to write seed data via job: {e}")
    print("\n" + "="*60)
    print("Alternative: Use Databricks SQL Editor")
    print("="*60)
    print(f"\nCopy and paste this SQL into Databricks workspace SQL editor:\n")

    # Generate SQL INSERT statements as fallback
    for _, row in seed_data.iterrows():
        text_cols = ", ".join([f"'{c}'" for c in row['text_columns']])
        image_cols = ", ".join([f"'{c}'" for c in row['image_columns']])
        meta_cols = ", ".join([f"'{c}'" for c in row['metadata_columns']])

        print(f"""
INSERT INTO {table_name} VALUES (
  '{row['id']}',
  '{row['name']}',
  '{row['description']}',
  '{row['source_type']}',
  {f"'{row['source_table']}'" if row['source_table'] else 'NULL'},
  {f"'{row['source_volume']}'" if row['source_volume'] else 'NULL'},
  {f"'{row['source_path']}'" if row['source_path'] else 'NULL'},
  '{row['item_id_column']}',
  ARRAY({text_cols}),
  ARRAY({image_cols}),
  ARRAY({meta_cols}),
  '{row['sampling_strategy']}',
  {row['sample_size'] if row['sample_size'] else 'NULL'},
  {f"'{row['filter_expression']}'" if row['filter_expression'] else 'NULL'},
  '{row['status']}',
  {row['item_count']},
  NULL,
  CURRENT_TIMESTAMP(),
  '{row['created_by']}',
  CURRENT_TIMESTAMP(),
  '{row['updated_by']}'
);
""")

    print("\nAfter running SQL, verify with:")
    print(f"SELECT * FROM {table_name};")
