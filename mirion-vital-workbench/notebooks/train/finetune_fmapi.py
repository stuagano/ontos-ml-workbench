# Databricks notebook source
# MAGIC %md
# MAGIC # Fine-tune Foundation Model via FMAPI
# MAGIC
# MAGIC Launches fine-tuning job using Foundation Model APIs.
# MAGIC Training data is pre-exported by the workbench in JSONL format.

# COMMAND ----------

# Widget definitions
dbutils.widgets.text("assembly_id", "", "Assembly ID")
dbutils.widgets.text("base_model", "databricks-meta-llama-3-1-8b-instruct", "Base Model")
dbutils.widgets.text("train_path", "", "Training Data Path (JSONL)")
dbutils.widgets.text("val_path", "", "Validation Data Path (JSONL)")
dbutils.widgets.text("epochs", "3", "Training Epochs")
dbutils.widgets.text("learning_rate", "0.0001", "Learning Rate")
dbutils.widgets.text("output_model_name", "", "Output Model Name")

# COMMAND ----------

# Get parameters
assembly_id = dbutils.widgets.get("assembly_id")
base_model = dbutils.widgets.get("base_model")
train_path = dbutils.widgets.get("train_path")
val_path = dbutils.widgets.get("val_path")
epochs = int(dbutils.widgets.get("epochs"))
learning_rate = float(dbutils.widgets.get("learning_rate"))
output_model_name = dbutils.widgets.get("output_model_name") or f"vital-{assembly_id[:8]}"

print(f"Assembly: {assembly_id}")
print(f"Base model: {base_model}")
print(f"Training data: {train_path}")
print(f"Validation data: {val_path}")
print(f"Epochs: {epochs}")
print(f"Learning rate: {learning_rate}")
print(f"Output model: {output_model_name}")

# COMMAND ----------

# Validate inputs
if not assembly_id:
    raise ValueError("assembly_id is required")
if not train_path:
    raise ValueError("train_path is required - export assembly first")
if not base_model:
    raise ValueError("base_model is required")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Verify Training Data

# COMMAND ----------

# Check training data exists and has content
import json
import requests
import time
from datetime import datetime
from databricks.sdk import WorkspaceClient

# Initialize workspace client for file access (works in serverless)
w = WorkspaceClient()

def read_volume_file(path: str) -> str:
    """Read file content from Volume using SDK (works in serverless)."""
    print(f"Reading file: {path}")
    response = w.files.download(path)
    # DownloadResponse has .contents attribute which is the file-like object
    content = response.contents.read().decode("utf-8")
    print(f"Successfully read {len(content)} bytes")
    return content

def count_jsonl_lines(path: str) -> int:
    """Count lines in a JSONL file."""
    content = read_volume_file(path)
    return len([line for line in content.strip().split("\n") if line])

train_count = count_jsonl_lines(train_path)
val_count = count_jsonl_lines(val_path) if val_path else 0

print(f"Training examples: {train_count}")
print(f"Validation examples: {val_count}")

if train_count < 10:
    raise ValueError(f"Need at least 10 training examples, got {train_count}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Preview Training Data

# COMMAND ----------

# Show sample training examples
def preview_jsonl(path: str, n: int = 3):
    """Preview first n examples from JSONL file."""
    content = read_volume_file(path)
    lines = content.strip().split("\n")
    for i, line in enumerate(lines[:n]):
        example = json.loads(line)
        print(f"\n--- Example {i+1} ---")
        if "messages" in example:
            for msg in example["messages"]:
                role = msg["role"]
                content_text = msg["content"][:200] + "..." if len(msg["content"]) > 200 else msg["content"]
                print(f"{role}: {content_text}")
        else:
            print(json.dumps(example, indent=2)[:500])

print("Training data preview:")
preview_jsonl(train_path)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Create Fine-tuning Run

# COMMAND ----------

# Get workspace context
workspace_url = spark.conf.get("spark.databricks.workspaceUrl")
token = dbutils.notebook.entry_point.getDbutils().notebook().getContext().apiToken().get()

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

print(f"Workspace: {workspace_url}")

# COMMAND ----------

# Check if Foundation Model Training API is available
fm_api_available = False
run_id = None

try:
    response = requests.get(
        f"https://{workspace_url}/api/2.0/fine-tuning/runs",
        headers=headers,
        timeout=30
    )
    if response.status_code == 200:
        print("Foundation Model Training API available")
        fm_api_available = True
    else:
        print(f"FM Training API not available: {response.status_code}")
except Exception as e:
    print(f"FM Training API check failed: {e}")

# COMMAND ----------

if fm_api_available:
    # Create fine-tuning run via Foundation Model API
    training_config = {
        "model": base_model,
        "training_data_path": train_path,
        "validation_data_path": val_path if val_path else None,
        "registered_model_name": output_model_name,
        "training_duration": f"{epochs}ep",
        "learning_rate": learning_rate,
        "context_length": 4096,
        "task_type": "CHAT_COMPLETION",
    }

    print("Creating fine-tuning run with config:")
    print(json.dumps(training_config, indent=2))

    response = requests.post(
        f"https://{workspace_url}/api/2.0/fine-tuning/runs",
        headers=headers,
        json=training_config,
        timeout=60
    )

    if response.status_code in [200, 201]:
        run_info = response.json()
        run_id = run_info.get("run_id")
        print(f"Fine-tuning run created: {run_id}")
    else:
        print(f"Failed to create run: {response.status_code}")
        print(response.text[:500])
else:
    print("Foundation Model Training API not available on this workspace")
    print("Training data validated successfully - ready for manual fine-tuning")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Summary

# COMMAND ----------

print("\n" + "="*60)
print("FINE-TUNING JOB SUMMARY")
print("="*60)
print(f"Assembly ID:     {assembly_id}")
print(f"Base Model:      {base_model}")
print(f"Output Model:    {output_model_name}")
print(f"Training Data:   {train_path}")
print(f"Validation Data: {val_path or 'None'}")
print(f"Examples:        {train_count} train, {val_count} val")
print(f"Epochs:          {epochs}")
print(f"Learning Rate:   {learning_rate}")
print("-"*60)
print(f"FM API Available: {fm_api_available}")
if run_id:
    print(f"FM API Run ID:   {run_id}")
print("="*60)

# Return results for job orchestration
dbutils.notebook.exit(json.dumps({
    "assembly_id": assembly_id,
    "fm_api_available": fm_api_available,
    "fm_api_run_id": run_id,
    "output_model_name": output_model_name,
    "train_count": train_count,
    "val_count": val_count,
    "status": "success"
}))
