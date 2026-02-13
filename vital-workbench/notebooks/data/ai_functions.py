# Databricks notebook source
# MAGIC %md
# MAGIC # AI Functions Job
# MAGIC Runs AI functions (classify, extract, summarize) on data

# COMMAND ----------

dbutils.widgets.text("template_id", "", "Template ID")
dbutils.widgets.text("function_type", "classify", "Function Type")

# COMMAND ----------

template_id = dbutils.widgets.get("template_id")
function_type = dbutils.widgets.get("function_type")

print(f"Processing template: {template_id}")
print(f"Function type: {function_type}")

# COMMAND ----------

# TODO: Implement AI functions
# 1. Load items from source table
# 2. Apply AI function (classify/extract/summarize)
# 3. Store results in curation_items table

print("AI functions placeholder - implement with ai_query() UDF")
