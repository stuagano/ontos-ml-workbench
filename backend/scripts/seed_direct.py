#!/usr/bin/env python3
"""
Seed sheets directly using Databricks SDK and Spark
No SQL warehouse required - uses cluster compute directly
"""
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from datetime import datetime
from uuid import uuid4
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.workspace import ImportFormat, Language
from app.core.config import get_settings

print("🌱 Seeding sheets directly via SDK...\n")

settings = get_settings()
w = WorkspaceClient()
catalog = settings.databricks_catalog
schema = settings.databricks_schema
table_name = f"{catalog}.{schema}.sheets"
user = "stuart.gano@databricks.com"

print(f"Target: {table_name}\n")

# Prepare seed data as SQL VALUES
sheets = [
    {
        "id": f"sheet-{uuid4()}",
        "name": "PCB Defect Detection Dataset",
        "description": "Microscope images of PCBs with labeled defects",
        "source_type": "uc_volume",
        "source_table": None,
        "source_volume": "/Volumes/home_stuart_gano/ontos_ml_workbench/pcb_images",
        "source_path": "defect_images/",
        "item_id_column": "image_filename",
        "text_columns": [],
        "image_columns": ["image_path"],
        "metadata_columns": ["sensor_reading", "timestamp"],
        "sampling_strategy": "all",
        "sample_size": None,
        "filter_expression": None,
        "status": "active",
        "item_count": 150,
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
        "metadata_columns": ["sensor_id", "location"],
        "sampling_strategy": "random",
        "sample_size": 1000,
        "filter_expression": 'status = "active"',
        "status": "active",
        "item_count": 5000,
    },
]

# Create a notebook to run as a job
notebook_code = f'''
# Databricks notebook source
from pyspark.sql import Row
from datetime import datetime

sheets_data = {sheets}

# Create Spark DataFrame
rows = []
for sheet in sheets_data:
    # Convert arrays to proper format
    text_cols = sheet["text_columns"] if sheet["text_columns"] else []
    image_cols = sheet["image_columns"] if sheet["image_columns"] else []
    meta_cols = sheet["metadata_columns"] if sheet["metadata_columns"] else []

    row = Row(
        id=sheet["id"],
        name=sheet["name"],
        description=sheet["description"],
        source_type=sheet["source_type"],
        source_table=sheet["source_table"],
        source_volume=sheet["source_volume"],
        source_path=sheet["source_path"],
        item_id_column=sheet["item_id_column"],
        text_columns=text_cols,
        image_columns=image_cols,
        metadata_columns=meta_cols,
        sampling_strategy=sheet["sampling_strategy"],
        sample_size=sheet["sample_size"],
        filter_expression=sheet["filter_expression"],
        status=sheet["status"],
        item_count=sheet["item_count"],
        last_validated_at=None,
        created_at=datetime.now(),
        created_by="{user}",
        updated_at=datetime.now(),
        updated_by="{user}"
    )
    rows.append(row)

df = spark.createDataFrame(rows)

# Write to Delta table
df.write.format("delta").mode("append").saveAsTable("{table_name}")

print(f"✅ Successfully inserted {{len(rows)}} sheets into {table_name}")
'''

print("Creating temporary notebook...")
# Create notebook in workspace
notebook_path = f"/Workspace/Users/{user}/temp_seed_sheets"
try:
    w.workspace.mkdirs(f"/Users/{user}")
except:
    pass  # Directory might already exist

# Delete if exists
try:
    w.workspace.delete(notebook_path)
except:
    pass

# Import notebook
import base64
w.workspace.import_(
    path=notebook_path,
    content=base64.b64encode(notebook_code.encode()).decode(),
    format=ImportFormat.SOURCE,
    language=Language.PYTHON
)
print(f"✅ Notebook created: {notebook_path}\n")

# Get a cluster to run on
print("Finding available cluster...")
clusters = list(w.clusters.list())
running_clusters = [c for c in clusters if c.state and str(c.state).lower() == 'running']

if running_clusters:
    cluster = running_clusters[0]
    print(f"✅ Using running cluster: {cluster.cluster_name} ({cluster.cluster_id})\n")
else:
    print("No running clusters found. Creating one-time job cluster...")
    cluster = None

# Run notebook as job
from databricks.sdk.service.jobs import Task, NotebookTask, Source

print("Creating and running job...")
job = w.jobs.create(
    name=f"Seed Sheets - {datetime.now().isoformat()}",
    tasks=[
        Task(
            task_key="seed_data",
            existing_cluster_id=cluster.cluster_id if cluster else None,
            notebook_task=NotebookTask(
                notebook_path=notebook_path,
                source=Source.WORKSPACE
            ),
        )
    ],
)

print(f"✅ Job created: {job.job_id}")

# Run the job
run = w.jobs.run_now(job_id=job.job_id)
print(f"✅ Job started: {run.run_id}")
print(f"\nMonitor at: {w.config.host}/jobs/{job.job_id}/runs/{run.run_id}\n")

# Wait for completion
print("Waiting for job to complete...")
import time
for i in range(120):  # Wait up to 10 minutes
    run_status = w.jobs.get_run(run.run_id)
    state = str(run_status.state.life_cycle_state)

    if state == "TERMINATED":
        result = str(run_status.state.result_state)
        if result == "SUCCESS":
            print("✅ Job completed successfully!")
            print(f"\n🎉 Seed data has been written to {table_name}")

            # Verify
            print("\nVerifying...")
            tables_list = list(w.tables.list(catalog_name=catalog, schema_name=schema))
            sheets_table = [t for t in tables_list if t.name == "sheets"]
            if sheets_table:
                print(f"✅ Table exists with {len(sheets)} rows added")

            # Clean up
            w.jobs.delete(job.job_id)
            w.workspace.delete(notebook_path)
            print(f"✅ Cleaned up job and notebook")
            sys.exit(0)
        else:
            print(f"❌ Job failed with result: {result}")
            sys.exit(1)
    elif state in ["INTERNAL_ERROR", "SKIPPED"]:
        print(f"❌ Job error: {state}")
        sys.exit(1)

    print(f"  Status: {state} ({i+1}s)")
    time.sleep(5)

print("⏱  Job is still running. Check the link above for status.")
