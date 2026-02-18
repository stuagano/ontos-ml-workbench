## Backend - Ontos ML Workbench FastAPI

Mission control backend for Acme Instruments' AI-powered radiation safety platform.

## Stack
- Python 3.11, FastAPI, Pydantic v2
- Databricks SDK for Unity Catalog integration
- uvicorn with hot reload
- Deployed as Databricks App

## Structure
- app/api/v1/ — REST endpoints (sheets, templates, training_sheets, etc.)
- app/core/ — Config, auth, Databricks SDK setup
- app/models/ — Pydantic models for API contracts
- app/services/ — Business logic (sheet operations, label management)
- jobs/ — Databricks job notebooks for data processing

## Commands
- Dev (APX): `apx dev start` (from project root)
- Dev (manual): `uvicorn app.main:app --reload`
- Test: `pytest` (when tests are added)
- Deploy: `databricks bundle deploy -t dev`

## Verification
After backend changes:
1. Check server logs for errors
2. Test API endpoints with browser/curl
3. Verify Unity Catalog connections work
4. Check Databricks SDK interactions

## Conventions
- Use Pydantic models for all request/response schemas
- Async by default for route handlers
- Unity Catalog tables: `<your_catalog>.<your_schema>.*` (set in backend/.env)
- Service layer handles all Databricks SDK calls
- Use composite keys: `(sheet_id, item_ref, label_type)` for canonical labels
- Terminology: "Sheet", "Training Sheet", "Canonical Label" (not old terms)

## Key Business Logic
- **Canonical Labels**: Ground truth layer, label once → reuse everywhere
- **Multiple Labelsets**: Same source data can have different label types
- **Usage Constraints**: Governance layer separate from quality approval
- **Lineage Tracking**: Complete traceability from source → Q&A → models

## Don't
- Don't use blocking I/O in async route handlers
- Don't catch bare `Exception` — catch specific exceptions
- Don't put business logic in route handlers — use services/
- Don't use old terminology (DataBit, Assembly) — see CLAUDE.md for correct terms
- Don't skip Unity Catalog permission checks

## Databricks-Specific
- Use `DatabricksConfig` from app.core.config for SDK setup
- All table operations through Unity Catalog (no direct file access)
- Volume paths for multimodal data (images, PDFs, audio)
- Job orchestration via DAB (databricks.yml)
