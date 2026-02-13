# APX Installation and Configuration Guide

**Status**: APX is ALREADY INSTALLED and configured for the VITAL Workbench project.

This guide provides the exact steps to verify APX is working and how to use it for the demo.

---

## Current Status (✅ Ready)

### What's Already Done

1. **APX Installed**: Version 0.2.6 at `/Users/stuart.gano/.local/bin/apx`
2. **pyproject.toml Configured**: APX dependency added with proper configuration
3. **Project Structure Compatible**: FastAPI backend + React frontend structure is APX-ready
4. **Frontend Built**: Production build exists in `backend/static/` and `frontend/dist/`

### Configuration Files

**pyproject.toml** (Already configured):
```toml
[tool.apx]
backend = "backend"
frontend = "frontend"
python-version = "3.11"

[tool.apx.metadata]
name = "mirion-vital-workbench"
app-name = "VITAL Workbench"
app-slug = "vital-workbench"
app-entrypoint = "app.main:app"
metadata-path = "app.yaml"
version = "0.1.0"
description = "VITAL Platform Workbench for Mirion"
working-dir = "backend"
```

**app.yaml** (Python entrypoint):
```python
from pathlib import Path

app_name = "VITAL Workbench"
app_entrypoint = "app.main:app"
app_slug = "vital-workbench"
api_prefix = "/api"
dist_dir = Path(__file__).parent / "__dist__"
```

---

## Pre-Demo Checklist

Before starting the APX dev server for the demo, verify:

### 1. Check Current Processes

```bash
# Check if anything is running on dev ports
lsof -i:8000,5173

# Stop any existing processes
# If you see processes on port 8000 or 5173, kill them:
kill -9 <PID>
```

**Current Status**: Manual dev servers may be running (seen in lsof output)

### 2. Check APX Status

```bash
# From project root
apx dev status
```

Expected output if not running:
```
Dev Server: not running
```

### 3. Verify Environment

```bash
# Check backend .env file exists
ls -la backend/.env

# Verify it has correct workspace config
cat backend/.env | grep DATABRICKS
```

**Current Configuration** (backend/.env):
```
DATABRICKS_HOST=https://fevm-serverless-dxukih.cloud.databricks.com
DATABRICKS_CATALOG=erp-demonstrations
DATABRICKS_SCHEMA=vital_workbench
DATABRICKS_WAREHOUSE_ID=387bcda0f2ece20c
DATABRICKS_CONFIG_PROFILE=fe-vm-serverless-dxukih
```

---

## Starting APX for Demo

### Stop Any Running Servers

```bash
# Kill any manual dev servers
pkill -f "uvicorn app.main:app"
pkill -f "vite"
pkill -f "npm run dev"

# Or more surgical approach
lsof -ti:8000,5173 | xargs kill -9
```

### Start APX Dev Server

```bash
# From project root
cd /Users/stuart.gano/Documents/Customers/Mirion/mirion-vital-workbench

# Start APX in detached mode
apx dev start
```

Expected output:
```
🚀 Starting development servers...
✓ Backend server started on http://localhost:8000
✓ Frontend server started on http://localhost:5173
✓ Development servers running in detached mode

Access your app at: http://localhost:8000
```

### Verify APX is Running

```bash
# Check status
apx dev status

# View logs
apx dev logs

# View just backend logs
apx dev logs | grep -A5 "backend"

# View just frontend logs
apx dev logs | grep -A5 "frontend"
```

### Access the Application

Open browser to: **http://localhost:8000**

This will:
1. Serve the React frontend from port 8000 (proxied from 5173)
2. API endpoints available at `/api/v1/*`
3. Hot reload enabled for both backend and frontend changes

---

## Demo-Time Hot Reload

### Test Hot Reload Works

**Backend Changes** (instant reload):
```bash
# Edit a backend file (it will auto-reload)
# Example: Add a print statement to an endpoint
echo 'print("Demo backend change!")' >> backend/app/api/v1/endpoints/sheets.py

# Check logs to see reload
apx dev logs | tail -20
```

**Frontend Changes** (instant reload):
```bash
# Edit a React component (browser auto-refreshes)
# Example: Edit a page component
code frontend/src/pages/DataPage.tsx

# Save file - browser will auto-refresh
```

### Common Demo Scenarios

#### Scenario 1: Show Data Page Working
1. Navigate to: http://localhost:8000/data
2. Verify Sheets list loads from Unity Catalog
3. Show table: `erp-demonstrations.vital_workbench.sheets`

#### Scenario 2: Show Canonical Labeling Tool
1. Click "TOOLS" in sidebar
2. Select "Canonical Labels" (or press Alt+C)
3. Demonstrate label creation workflow

#### Scenario 3: Show Hot Reload
1. Open `frontend/src/components/StageNav.tsx` in editor
2. Change a stage name (e.g., "DATA" → "DATA SOURCES")
3. Save file
4. Watch browser instantly update without refresh

---

## Troubleshooting

### Issue: APX won't start

**Check ports in use:**
```bash
lsof -i:8000,5173
```

**Solution:** Kill conflicting processes
```bash
lsof -ti:8000,5173 | xargs kill -9
apx dev start
```

### Issue: Backend not reloading

**Check backend logs:**
```bash
apx dev logs | grep -A10 "backend"
```

**Solution:** Restart APX
```bash
apx dev restart
```

### Issue: Frontend not reloading

**Check if Vite is watching:**
```bash
apx dev logs | grep -i "vite"
```

**Solution:** Rebuild frontend
```bash
cd frontend
npm run build
cd ..
apx dev restart
```

### Issue: "Module not found" errors

**Solution:** Reinstall dependencies
```bash
# Backend dependencies
cd backend
pip install -r requirements.txt

# Frontend dependencies
cd ../frontend
npm install

# Restart APX
cd ..
apx dev restart
```

### Issue: Databricks connection fails

**Check credentials:**
```bash
# Verify profile exists
cat ~/.databrickscfg | grep -A5 "fe-vm-serverless-dxukih"

# Test connection
databricks workspace list --profile fe-vm-serverless-dxukih
```

**Solution:** Re-authenticate
```bash
databricks auth login --host https://fevm-serverless-dxukih.cloud.databricks.com --profile fe-vm-serverless-dxukih
```

### Issue: Port 8000 already in use by manual server

```bash
# Find the process
lsof -i:8000

# Kill it
kill -9 <PID>

# Start APX
apx dev start
```

---

## Stopping APX After Demo

```bash
# Stop cleanly
apx dev stop

# Or force stop if needed
pkill -f apx
```

---

## Demo Day Quick Reference

### Start Everything
```bash
cd /Users/stuart.gano/Documents/Customers/Mirion/mirion-vital-workbench
apx dev start
```

### Check Status
```bash
apx dev status
```

### View Logs
```bash
apx dev logs
```

### Stop Everything
```bash
apx dev stop
```

### Restart (if issues)
```bash
apx dev restart
```

---

## Why APX for the Demo?

### Benefits Over Manual Dev Servers

| Feature | Manual (2 terminals) | APX (1 command) |
|---------|---------------------|-----------------|
| **Startup** | `cd backend && uvicorn...`<br>`cd frontend && npm run dev` | `apx dev start` |
| **Logs** | Switch between terminals | `apx dev logs` (unified) |
| **Hot Reload** | Backend only (uvicorn reload) | Backend + Frontend |
| **Port Management** | Manual proxy config | Automatic |
| **Demo Confidence** | Higher risk of terminal mixups | Single command, clear status |

### Demo Flow

1. **Pre-demo**: `apx dev start` (30 seconds)
2. **During demo**: Focus on browser, not terminals
3. **Show hot reload**: Edit a component, instant feedback
4. **Post-demo**: `apx dev stop` (clean exit)

---

## Alternative: Manual Dev Servers (Fallback)

If APX has issues during demo, fallback to manual:

```bash
# Terminal 1: Backend
cd backend
source .venv/bin/activate  # If using venv
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

Access at: http://localhost:5173 (Vite dev server with API proxy)

---

## APX Commands Reference

### Dev Server Management
```bash
apx dev start      # Start in detached mode
apx dev status     # Check if running
apx dev logs       # View logs (both servers)
apx dev stop       # Stop servers
apx dev restart    # Restart servers
apx dev check      # Check project for errors
```

### Building
```bash
apx build          # Build production bundle
apx build --skip-ui-build  # Build backend only
```

### Other
```bash
apx --version      # Check APX version
apx --help         # Show all commands
apx dev --help     # Show dev commands
```

---

## Next Steps After Demo

1. **Update README.md**: Add APX as recommended dev workflow
2. **Team Training**: Share this guide with team
3. **CI/CD Integration**: Consider using `apx build` in deployment pipeline
4. **Documentation**: Update CLAUDE.md with APX commands

---

## Files and Directories

### APX Related Files
- `/Users/stuart.gano/.local/bin/apx` - APX binary
- `pyproject.toml` - APX configuration
- `app.yaml` - App entrypoint (Python format)
- `.apx/` - APX cache directory (currently empty)

### Project Structure
```
mirion-vital-workbench/
├── backend/
│   ├── app/
│   │   └── main.py         # FastAPI app (APX entry point)
│   ├── .env                # Databricks config
│   ├── requirements.txt    # Python deps
│   └── static/             # Built frontend (production)
├── frontend/
│   ├── src/                # React source
│   ├── dist/               # Built frontend (local)
│   ├── package.json        # Frontend deps
│   └── vite.config.ts      # Vite config (APX compatible)
├── pyproject.toml          # APX config
└── app.yaml                # App metadata
```

---

## Summary

**Current Status**: ✅ APX is installed and configured

**To start for demo**:
```bash
cd /Users/stuart.gano/Documents/Customers/Mirion/mirion-vital-workbench
apx dev start
```

**To verify**:
```bash
apx dev status
```

**To access**:
```
http://localhost:8000
```

**To stop**:
```bash
apx dev stop
```

That's it! APX is ready for the demo. No additional installation needed.
