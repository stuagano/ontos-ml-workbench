# Databricks notebook source
# MAGIC %md
# MAGIC # Labeling Agent Job
# MAGIC AI-assisted pre-labeling of curation items using the template's prompt.
# MAGIC
# MAGIC This notebook:
# MAGIC 1. Loads pending curation items for a given template
# MAGIC 2. Calls Foundation Model API to generate labels
# MAGIC 3. Parses response and extracts labels + confidence
# MAGIC 4. Auto-approves high-confidence items, flags others for human review

# COMMAND ----------

# MAGIC %pip install databricks-sdk openai tenacity
# MAGIC dbutils.library.restartPython()

# COMMAND ----------

dbutils.widgets.text("template_id", "", "Template ID")
dbutils.widgets.text("confidence_threshold", "0.8", "Auto-approve Threshold")
dbutils.widgets.text(
    "model", "databricks-meta-llama-3-1-70b-instruct", "Model Endpoint"
)
dbutils.widgets.text("batch_size", "100", "Batch Size")

# COMMAND ----------

import json
from datetime import datetime

from pyspark.sql import functions as F
from pyspark.sql.types import FloatType, StringType, StructField, StructType
from tenacity import retry, stop_after_attempt, wait_exponential

template_id = dbutils.widgets.get("template_id")
confidence_threshold = float(dbutils.widgets.get("confidence_threshold"))
model = dbutils.widgets.get("model")
batch_size = int(dbutils.widgets.get("batch_size"))

print(f"Template ID: {template_id}")
print(f"Confidence threshold: {confidence_threshold}")
print(f"Model: {model}")
print(f"Batch size: {batch_size}")

# COMMAND ----------

# Configuration
CATALOG = "home_stuart_gano"
SCHEMA = "databits_dev"

# COMMAND ----------

# MAGIC %md
# MAGIC ## Load Template Configuration

# COMMAND ----------

template = (
    spark.table(f"{CATALOG}.{SCHEMA}.templates")
    .filter(F.col("id") == template_id)
    .first()
)

if not template:
    raise ValueError(f"Template {template_id} not found")

print(f"Template: {template.name}")
print(f"Status: {template.status}")
print(
    f"Prompt template: {template.prompt_template[:500] if template.prompt_template else 'None'}..."
)

# Extract label categories from template schema if available
label_categories = []
if template.schema_spec:
    schema_spec = (
        json.loads(template.schema_spec)
        if isinstance(template.schema_spec, str)
        else template.schema_spec
    )
    label_categories = schema_spec.get("labels", [])

print(f"Label categories: {label_categories}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Load Pending Items

# COMMAND ----------

pending_items_df = (
    spark.table(f"{CATALOG}.{SCHEMA}.curation_items")
    .filter((F.col("template_id") == template_id) & (F.col("status") == "pending"))
    .limit(batch_size)
)

pending_count = pending_items_df.count()
print(f"Found {pending_count} pending items to process")

if pending_count == 0:
    print("No pending items to process. Exiting.")
    dbutils.notebook.exit(
        json.dumps({"status": "success", "processed": 0, "message": "No pending items"})
    )

# Collect items for processing
pending_items = pending_items_df.collect()

# COMMAND ----------

# MAGIC %md
# MAGIC ## Initialize Foundation Model API Client

# COMMAND ----------

import os

from openai import OpenAI

# Use Databricks Foundation Model API
client = OpenAI(
    api_key=dbutils.secrets.get(scope="databits", key="fmapi-token")
    if dbutils.secrets.listScopes()
    else os.environ.get("DATABRICKS_TOKEN", ""),
    base_url=f"{spark.conf.get('spark.databricks.workspaceUrl')}/serving-endpoints",
)

# COMMAND ----------

# MAGIC %md
# MAGIC ## Define Labeling Function

# COMMAND ----------

LABELING_SYSTEM_PROMPT = """You are an expert data labeling assistant. Your job is to analyze content and assign appropriate labels based on the given categories and criteria.

You must respond with a valid JSON object containing:
- "label": The primary label you assign to the content (must be one of the provided categories, or "unknown" if unclear)
- "confidence": A float between 0.0 and 1.0 indicating how confident you are
- "reasoning": A brief explanation of your labeling decision (1-2 sentences)
- "additional_labels": An array of any secondary labels that also apply (optional)

Be consistent, objective, and err on the side of lower confidence when uncertain."""


def build_labeling_prompt(
    item_content: str, prompt_template: str, categories: list
) -> str:
    """Build the labeling prompt for an item."""
    category_str = ", ".join(categories) if categories else "appropriate category"

    user_prompt = f"""Please analyze and label the following content.

{f"Instructions: {prompt_template}" if prompt_template else ""}

Available label categories: {category_str}

Content to label:
---
{item_content[:4000]}
---

Respond with a JSON object containing: label, confidence (0.0-1.0), reasoning, and optional additional_labels array."""

    return user_prompt


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def call_labeling_api(content: str, prompt_template: str, categories: list) -> dict:
    """Call the Foundation Model API to label content."""
    user_prompt = build_labeling_prompt(content, prompt_template, categories)

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": LABELING_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.1,  # Low temperature for consistent labeling
        max_tokens=500,
    )

    response_text = response.choices[0].message.content

    # Parse JSON response
    # Handle potential markdown code blocks
    if "```json" in response_text:
        response_text = response_text.split("```json")[1].split("```")[0]
    elif "```" in response_text:
        response_text = response_text.split("```")[1].split("```")[0]

    result = json.loads(response_text.strip())
    return result


# COMMAND ----------

# MAGIC %md
# MAGIC ## Process Items

# COMMAND ----------

results = []
errors = []

for idx, item in enumerate(pending_items):
    item_id = item.id
    item_content = item.item_content or item.input_text or ""

    print(f"Processing item {idx + 1}/{len(pending_items)}: {item_id[:8]}...")

    try:
        # Call labeling API
        label_result = call_labeling_api(
            content=item_content,
            prompt_template=template.prompt_template or "",
            categories=label_categories,
        )

        label = label_result.get("label", "unknown")
        confidence = float(label_result.get("confidence", 0.0))
        reasoning = label_result.get("reasoning", "")
        additional_labels = label_result.get("additional_labels", [])

        # Determine status based on confidence
        if confidence >= confidence_threshold:
            new_status = "approved"
        elif confidence >= 0.5:
            new_status = "needs_review"
        else:
            new_status = "flagged"

        results.append(
            {
                "id": item_id,
                "agent_label": label,
                "agent_confidence": confidence,
                "agent_reasoning": reasoning,
                "additional_labels": json.dumps(additional_labels),
                "new_status": new_status,
            }
        )

        print(f"  Label: {label} (confidence: {confidence:.2f}) -> {new_status}")

    except Exception as e:
        print(f"  Error processing item {item_id}: {str(e)}")
        errors.append({"id": item_id, "error": str(e)})

print(f"\nProcessed: {len(results)}, Errors: {len(errors)}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Update Curation Items

# COMMAND ----------

if results:
    # Create DataFrame with results
    results_df = spark.createDataFrame(results)

    # Update items in the table
    now = datetime.utcnow().isoformat()

    for result in results:
        update_sql = f"""
        UPDATE {CATALOG}.{SCHEMA}.curation_items
        SET
            agent_label = '{result["agent_label"]}',
            agent_confidence = {result["agent_confidence"]},
            review_notes = '{result["agent_reasoning"].replace("'", "''")}',
            status = '{result["new_status"]}',
            updated_at = '{now}'
        WHERE id = '{result["id"]}'
        """
        spark.sql(update_sql)

    print(f"Updated {len(results)} items in curation_items table")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Summary Statistics

# COMMAND ----------

# Calculate summary
status_counts = {}
for r in results:
    status = r["new_status"]
    status_counts[status] = status_counts.get(status, 0) + 1

print("=" * 50)
print("LABELING AGENT SUMMARY")
print("=" * 50)
print(f"Template: {template.name}")
print(f"Model: {model}")
print(f"Confidence threshold: {confidence_threshold}")
print(f"Items processed: {len(results)}")
print(f"Errors: {len(errors)}")
print()
print("Status breakdown:")
for status, count in status_counts.items():
    pct = (count / len(results) * 100) if results else 0
    print(f"  {status}: {count} ({pct:.1f}%)")

# Calculate average confidence
if results:
    avg_confidence = sum(r["agent_confidence"] for r in results) / len(results)
    print(f"\nAverage confidence: {avg_confidence:.2f}")

# COMMAND ----------

# Return summary
summary = {
    "status": "success",
    "template_id": template_id,
    "processed": len(results),
    "errors": len(errors),
    "status_breakdown": status_counts,
    "model": model,
    "confidence_threshold": confidence_threshold,
}

dbutils.notebook.exit(json.dumps(summary))
