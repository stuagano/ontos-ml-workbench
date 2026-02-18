# Databricks notebook source
# MAGIC %md
# MAGIC # Training Data Assembly Job
# MAGIC
# MAGIC Assembles approved curation items into training dataset format for fine-tuning.
# MAGIC
# MAGIC This notebook:
# MAGIC 1. Loads approved curation items for a template
# MAGIC 2. Formats data into chat/completion training format
# MAGIC 3. Performs train/validation split
# MAGIC 4. Writes output to UC volume as JSONL

# COMMAND ----------

dbutils.widgets.text("template_id", "", "Template ID")
dbutils.widgets.text("output_format", "jsonl", "Output Format (jsonl/parquet/delta)")
dbutils.widgets.text("split_ratio", "0.9", "Train/Val Split (0.8 = 80% train)")
dbutils.widgets.text("include_only_approved", "true", "Include only approved items")
dbutils.widgets.text("output_path", "", "Output Volume Path (optional)")

# COMMAND ----------

import hashlib
import json
from datetime import datetime

from pyspark.sql import functions as F
from pyspark.sql.types import ArrayType, MapType, StringType, StructField, StructType

template_id = dbutils.widgets.get("template_id")
output_format = dbutils.widgets.get("output_format").lower()
split_ratio = float(dbutils.widgets.get("split_ratio"))
include_only_approved = dbutils.widgets.get("include_only_approved").lower() == "true"
output_path = dbutils.widgets.get("output_path")

print(f"Template ID: {template_id}")
print(f"Output format: {output_format}")
print(f"Train/Val split: {split_ratio * 100:.0f}% / {(1 - split_ratio) * 100:.0f}%")
print(f"Include only approved: {include_only_approved}")

# COMMAND ----------

# Configuration
CATALOG = "your_catalog"
SCHEMA = "ontos_ml_dev"
DEFAULT_VOLUME = f"/Volumes/{CATALOG}/{SCHEMA}/training_data"

if not output_path:
    output_path = DEFAULT_VOLUME

print(f"Output path: {output_path}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Load Template

# COMMAND ----------

template = (
    spark.table(f"{CATALOG}.{SCHEMA}.templates")
    .filter(F.col("id") == template_id)
    .first()
)

if not template:
    raise ValueError(f"Template {template_id} not found")

print(f"Template: {template.name}")
print(f"Version: {template.version}")
print(f"Status: {template.status}")

# Parse template schema for field mapping
schema_spec = {}
if template.schema_spec:
    schema_spec = (
        json.loads(template.schema_spec)
        if isinstance(template.schema_spec, str)
        else template.schema_spec
    )

system_prompt = schema_spec.get(
    "system_prompt", template.prompt_template or "You are a helpful assistant."
)
input_field = schema_spec.get("input_field", "input_text")
output_field = schema_spec.get("output_field", "output_text")

print(f"System prompt: {system_prompt[:200]}...")
print(f"Input field: {input_field}")
print(f"Output field: {output_field}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Load Curation Items

# COMMAND ----------

# Build status filter
if include_only_approved:
    status_filter = F.col("status").isin("approved", "auto_approved")
else:
    status_filter = F.col("status").isin("approved", "auto_approved", "pending")

items_df = spark.table(f"{CATALOG}.{SCHEMA}.curation_items").filter(
    (F.col("template_id") == template_id) & status_filter
)

total_count = items_df.count()
print(f"Found {total_count} items for training data assembly")

if total_count == 0:
    print("No items to assemble. Exiting.")
    dbutils.notebook.exit(
        json.dumps({"status": "success", "message": "No items to assemble", "total": 0})
    )

# COMMAND ----------

# MAGIC %md
# MAGIC ## Format Training Data

# COMMAND ----------


def format_chat_messages(input_text: str, output_text: str, system: str) -> list:
    """Format a single example as chat messages."""
    messages = []

    # Add system message if provided
    if system:
        messages.append({"role": "system", "content": system})

    # Add user message (input)
    messages.append({"role": "user", "content": input_text or ""})

    # Add assistant message (output)
    messages.append({"role": "assistant", "content": output_text or ""})

    return messages


# Register UDF for formatting
@F.udf(ArrayType(MapType(StringType(), StringType())))
def format_chat_udf(input_text, output_text):
    return format_chat_messages(input_text, output_text, system_prompt)


# Format all items
formatted_df = items_df.select(
    F.col("id"),
    F.col("input_text"),
    F.col("output_text"),
    F.col("human_label").alias("label"),
    F.col("quality_score"),
    format_chat_udf(F.col("input_text"), F.col("output_text")).alias("messages"),
)

# Show sample
print("Sample formatted data:")
formatted_df.select("messages").show(2, truncate=False)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Train/Validation Split

# COMMAND ----------


# Use deterministic split based on item ID hash for reproducibility
@F.udf(StringType())
def hash_partition(item_id):
    """Deterministic hash for train/val split."""
    hash_val = int(hashlib.md5(item_id.encode()).hexdigest()[:8], 16)
    return "train" if (hash_val % 100) < (split_ratio * 100) else "validation"


split_df = formatted_df.withColumn("split", hash_partition(F.col("id")))

train_df = split_df.filter(F.col("split") == "train")
val_df = split_df.filter(F.col("split") == "validation")

train_count = train_df.count()
val_count = val_df.count()

print(f"Train set: {train_count} examples ({train_count / total_count * 100:.1f}%)")
print(f"Validation set: {val_count} examples ({val_count / total_count * 100:.1f}%)")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Write Training Data

# COMMAND ----------

timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
template_slug = template.name.lower().replace(" ", "_")[:30]
base_path = f"{output_path}/{template_slug}_{template.version}_{timestamp}"

print(f"Output base path: {base_path}")

# COMMAND ----------


def write_jsonl(df, path):
    """Write DataFrame to JSONL format for training."""
    # Select only messages column for training
    training_data = df.select("messages")

    # Convert to JSON strings
    json_df = training_data.select(F.to_json(F.struct("messages")).alias("json_line"))

    # Write as text file (one JSON object per line)
    json_df.coalesce(1).write.mode("overwrite").text(path)

    # Rename the output file to .jsonl
    files = dbutils.fs.ls(path)
    for f in files:
        if f.name.startswith("part-"):
            dbutils.fs.mv(f.path, f"{path}/data.jsonl")
            break


def write_parquet(df, path):
    """Write DataFrame to Parquet format."""
    df.select(
        "id", "input_text", "output_text", "label", "quality_score", "messages", "split"
    ).coalesce(4).write.mode("overwrite").parquet(path)


def write_delta(df, path):
    """Write DataFrame to Delta format."""
    df.select(
        "id", "input_text", "output_text", "label", "quality_score", "messages", "split"
    ).write.mode("overwrite").format("delta").save(path)


# COMMAND ----------

# Write based on output format
if output_format == "jsonl":
    print("Writing JSONL format...")
    write_jsonl(train_df, f"{base_path}/train")
    write_jsonl(val_df, f"{base_path}/validation")

elif output_format == "parquet":
    print("Writing Parquet format...")
    write_parquet(split_df, f"{base_path}")

elif output_format == "delta":
    print("Writing Delta format...")
    write_delta(split_df, f"{base_path}")

else:
    raise ValueError(f"Unknown output format: {output_format}")

print(f"Data written to: {base_path}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Create Manifest

# COMMAND ----------

# Create a manifest file with metadata
manifest = {
    "template_id": template_id,
    "template_name": template.name,
    "template_version": template.version,
    "created_at": datetime.utcnow().isoformat(),
    "output_format": output_format,
    "split_ratio": split_ratio,
    "include_only_approved": include_only_approved,
    "train_count": train_count,
    "validation_count": val_count,
    "total_count": total_count,
    "system_prompt": system_prompt,
    "output_path": base_path,
}

manifest_path = f"{base_path}/manifest.json"
dbutils.fs.put(manifest_path, json.dumps(manifest, indent=2), overwrite=True)
print(f"Manifest written to: {manifest_path}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Verify Output

# COMMAND ----------

# List output files
print("Output files:")
try:
    files = dbutils.fs.ls(base_path)
    for f in files:
        print(f"  {f.name} ({f.size} bytes)")
except Exception as e:
    print(f"Could not list files: {e}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Summary

# COMMAND ----------

print("=" * 50)
print("TRAINING DATA ASSEMBLY SUMMARY")
print("=" * 50)
print(f"Template: {template.name} v{template.version}")
print(f"Output format: {output_format}")
print(f"Output path: {base_path}")
print()
print(f"Training examples: {train_count}")
print(f"Validation examples: {val_count}")
print(f"Total: {total_count}")
print()
print("Ready for fine-tuning!")

# COMMAND ----------

# Return summary
summary = {
    "status": "success",
    "template_id": template_id,
    "template_name": template.name,
    "output_path": base_path,
    "output_format": output_format,
    "train_count": train_count,
    "validation_count": val_count,
    "total_count": total_count,
}

dbutils.notebook.exit(json.dumps(summary))
