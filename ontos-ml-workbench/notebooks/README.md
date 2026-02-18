# Ontos ML Platform Notebooks

Databricks notebooks implementing the 7-stage AI lifecycle pipeline.

```
DATA → TEMPLATE → CURATE → TRAIN → DEPLOY → MONITOR → IMPROVE
```

## Stages

### data/
Data extraction and enrichment pipelines:
- `ai_functions.py` - AI function wrappers for structured extraction
- `audio_transcription.py` - Speech-to-text for field recordings
- `embedding_generation.py` - Vector embeddings for semantic search
- `ocr_extraction.py` - Document OCR for compliance records

### curate/
AI-assisted labeling and data curation:
- `labeling_agent.py` - AI agent that pre-labels data for expert review
- `quality_scoring.py` - Automated quality checks for labeled data

### train/
Model training and fine-tuning:
- `data_assembly.py` - Assemble training datasets from curated items
- `finetune_fmapi.py` - Fine-tune models via Foundation Model API
- `model_evaluation.py` - Evaluate models against physics benchmarks

### monitor/
Production model monitoring:
- `drift_detection.py` - Detect prediction drift and data quality issues

### improve/
Continuous improvement feedback loops:
- `feedback_analysis.py` - Analyze expert feedback for retraining

## Running Notebooks

These notebooks are designed to run as Databricks Jobs. Configuration is in `resources/jobs.yml`.

```bash
# Deploy jobs
databricks bundle deploy -t dev

# Run a job
databricks bundle run labeling_job -t dev
```

## Notebook Format

All `.py` files are Databricks notebooks in source format (not regular Python scripts). Look for `# Databricks notebook source` at the top.
