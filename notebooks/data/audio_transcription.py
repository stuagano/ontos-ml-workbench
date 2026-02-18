# Databricks notebook source
# MAGIC %md
# MAGIC # Audio Transcription Job
# MAGIC Transcribes audio files to text using Whisper or similar

# COMMAND ----------

dbutils.widgets.text("template_id", "", "Template ID")
dbutils.widgets.text("source_volume", "", "Source Volume Path")

# COMMAND ----------

template_id = dbutils.widgets.get("template_id")
source_volume = dbutils.widgets.get("source_volume")

print(f"Processing template: {template_id}")
print(f"Source volume: {source_volume}")

# COMMAND ----------

# TODO: Implement audio transcription
# 1. List audio files in source volume
# 2. Apply Whisper/transcription model
# 3. Store transcripts in curation_items table

print("Audio transcription placeholder - implement with Whisper model")
