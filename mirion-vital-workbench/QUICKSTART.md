# VITAL Workbench - Quick Start Guide

Get the application running in 3 steps:

## Step 1: Seed the Database (Databricks Notebook)

1. Upload `schemas/check_and_seed.py` to your Databricks workspace
2. Run all cells in the notebook
3. Verify you see seeded data:
   - 3 sheets (PCB defects, sensor telemetry, anomaly stream)
   - 3 templates (defect classification, predictive maintenance, anomaly detection)
   - 3 canonical labels (sample defect labels)

**Workspace:** `https://fevm-serverless-dxukih.cloud.databricks.com`

## Step 2: Start the Application (Local)

From the project root directory:

```bash
./start-dev.sh
```

This will:
- Install backend dependencies (Python virtual env)
- Install frontend dependencies (npm)
- Start backend on http://localhost:8000
- Start frontend on http://localhost:5173

Press `Ctrl+C` to stop both services.

### Manual Start (Alternative)

If you prefer to start services manually:

```bash
# Terminal 1: Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

## Step 3: Verify Everything Works

Open your browser:

1. **Frontend**: http://localhost:5173
   - Should see VITAL Workbench UI

2. **API Docs**: http://localhost:8000/docs
   - Interactive API documentation
   - Try the `/api/v1/sheets-v2` endpoints

3. **Health Check**: http://localhost:8000/api/v1/health
   - Should return `{"status": "healthy"}`

### Test the API

```bash
# List sheets
curl http://localhost:8000/api/v1/sheets-v2

# Get specific sheet
curl http://localhost:8000/api/v1/sheets-v2/sheet-defect-images-001

# List templates
curl http://localhost:8000/api/v1/templates

# List canonical labels
curl http://localhost:8000/api/v1/canonical-labels
```

## Troubleshooting

### Backend won't start
- Check `.env` file exists in `backend/` directory
- Verify Databricks credentials in `.env`
- Check warehouse ID is correct: `387bcda0f2ece20c`

### Frontend won't start
- Delete `node_modules` and run `npm install` again
- Check Node.js version: `node --version` (should be 18+)

### Database connection errors
- Verify you're authenticated: `databricks auth profiles`
- Check workspace URL is correct in `backend/.env`
- Verify warehouse is running in Databricks workspace

### No data showing in UI
- Run the Databricks notebook again
- Check tables have data: See Step 1 verification queries

## What You Can Do Now

With the seeded data, you can:

1. **View Sheets** - Browse the 3 sample datasets
2. **View Templates** - See the prompt templates for each use case
3. **View Canonical Labels** - Expert-labeled ground truth data
4. **Create Training Sheets** - Combine sheets + templates to generate Q&A pairs (coming soon)
5. **API Integration** - Use the REST API to build custom workflows

## Configuration

Current configuration (in `backend/.env`):

- **Workspace**: `fevm-serverless-dxukih.cloud.databricks.com`
- **Catalog**: `home_stuart_gano`
- **Schema**: `mirion_vital_workbench`
- **Warehouse ID**: `387bcda0f2ece20c`
- **Profile**: `fe-vm-serverless-dxukih`

## Next Steps

- [ ] Explore the DATA stage (browse sheets)
- [ ] Explore the GENERATE stage (create training sheets)
- [ ] Explore the LABEL stage (review Q&A pairs)
- [ ] Explore the TOOLS section (templates, canonical labels)

## Support

For issues or questions:
- Check `CLAUDE.md` for project documentation
- Check `backend/CLAUDE.md` for backend specifics
- Check `backend/TASK3_COMPLETION.md` for API details
