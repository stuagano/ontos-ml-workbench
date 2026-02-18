# APX Development Setup for Ontos ML Workbench

APX provides hot reload development for Databricks Apps, replacing the manual backend/frontend coordination with a unified dev server.

## What APX Provides

- **Hot Reload**: Instant updates for Python and React changes
- **Unified Dev Server**: Single command replaces separate backend/frontend servers
- **Local Database**: SQLite mirror of Databricks tables for offline dev
- **Bun Runtime**: No separate Node.js installation needed
- **Fast Builds**: Optimized build pipeline for production deployment

## Installation

### Option 1: Quick Start (Recommended)
```bash
# From project root
uvx --index https://databricks-solutions.github.io/apx/simple apx init
```

This will detect your existing FastAPI + React structure and add APX configuration.

### Option 2: Manual Integration
```bash
# Install APX into existing project
cd ontos-ml-workbench
uv add --index https://databricks-solutions.github.io/apx/simple apx
```

## Configuration

APX works with your existing structure. Key files it uses:

```
ontos-ml-workbench/
├── backend/
│   ├── app/
│   │   └── main.py              # FastAPI app (already compatible)
│   └── requirements.txt          # Python deps
├── frontend/
│   ├── src/                      # React app (already compatible)
│   ├── package.json              # Frontend deps
│   └── vite.config.ts           # Vite config (APX-compatible)
├── app.yaml                      # Databricks App config (existing)
└── databricks.yml               # DAB config (existing)
```

### app.yaml (Your existing config)
```yaml
command:
  - python
  - -m
  - uvicorn
  - app.main:app
  - --host
  - "0.0.0.0"
  - --port
  - "8000"
static_files:
  - source: backend/static
    target: /
```

APX respects this configuration and provides hot reload on top.

## Development Workflow

### Start Dev Server
```bash
apx dev start
```

This:
1. Starts FastAPI backend with hot reload
2. Starts Vite frontend with hot reload
3. Proxies frontend requests to backend
4. Watches for file changes
5. Auto-reloads on save

**Access**: http://localhost:8000 (same as before, but with hot reload!)

### What Gets Hot Reloaded

**Backend Changes** (instant):
- API endpoints (`app/api/v1/endpoints/*.py`)
- Services (`app/services/*.py`)
- Models (`app/models/*.py`)
- Config (`app/core/config.py`)

**Frontend Changes** (instant):
- React components (`src/components/*.tsx`)
- Pages (`src/pages/*.tsx`)
- Styles (`src/**/*.css`)
- Types (`src/types/*.ts`)

**Not Hot Reloaded** (require restart):
- `requirements.txt` changes
- `package.json` changes
- Environment variable changes

### Build for Production
```bash
apx build
```

Creates optimized production bundle in `backend/static/` (same as `npm run build`).

### Deploy to Databricks
```bash
# APX build + DAB deploy
apx build
databricks bundle deploy -t dev
```

Or use existing workflow:
```bash
npm run build
databricks bundle deploy -t dev
```

## Comparison: Current vs APX

### Current Workflow
```bash
# Terminal 1
cd backend
uvicorn app.main:app --reload

# Terminal 2
cd frontend
npm run dev

# Terminal 3 (for changes)
npm run build
databricks bundle deploy -t dev
```

**Pain points**:
- Manual coordination of 2 servers
- Port conflicts (frontend proxying to backend)
- Separate build step before deploy
- No unified logging

### APX Workflow
```bash
# Single terminal
apx dev start
```

**Benefits**:
- One command for everything
- Unified logging (backend + frontend)
- Automatic proxying configured
- Hot reload for both sides
- Faster iteration loop

## Module Development with APX

Your new module system works perfectly with APX hot reload:

**Scenario**: Adding a new Data Quality check
```typescript
// src/modules/quality/DataQualityInspector.tsx

// 1. Add new check
const newCheck = {
  id: "data-freshness",
  name: "Data Freshness",
  category: "completeness",
  status: "warn",
  message: "Data is 7 days old",
  recommendation: "Refresh from source table"
};

// 2. Save file
// ✨ APX hot reloads instantly - see changes in browser!
```

**Scenario**: Adding new API endpoint
```python
# backend/app/api/v1/endpoints/quality.py

@router.post("/quality/analyze")
async def analyze_quality(sheet_id: str):
    """New quality analysis endpoint"""
    return {"score": 95, "checks": [...]}

# ✨ APX hot reloads backend instantly - test in frontend immediately!
```

## Tips for APX Development

### 1. Use Console for Debugging
```typescript
// Frontend
console.log("Module opened:", context);  // Shows in browser console

// Backend
print(f"Analyzing sheet: {sheet_id}")   # Shows in APX terminal
```

### 2. API Client Auto-Updates
```typescript
// src/services/api.ts
export async function analyzeQuality(sheetId: string) {
  return api.post(`/quality/analyze`, { sheet_id: sheetId });
}
// Hot reload picks up changes - no restart needed!
```

### 3. Module Registration
```typescript
// src/modules/registry.ts
export const MODULE_REGISTRY: VitalModule[] = [
  dspyModule,
  dataQualityModule,
  newModule,  // Add new module
];
// Save → Hot reload → Module immediately available!
```

### 4. Environment Variables
```bash
# .env changes require restart
apx dev start  # Restart to pick up new env vars
```

## Troubleshooting

### APX doesn't detect changes
```bash
# Check file watchers
lsof | grep apx

# Increase watch limit (Mac)
sudo sysctl -w kern.maxfiles=65536
sudo sysctl -w kern.maxfilesperproc=65536
```

### Port already in use
```bash
# Find process on port 8000
lsof -i :8000
kill -9 <PID>

# Then restart
apx dev start
```

### Build fails
```bash
# Clean build artifacts
rm -rf backend/static/*
rm -rf frontend/dist/*

# Rebuild
apx build
```

## Migration Checklist

- [ ] Install APX: `uvx apx init`
- [ ] Test dev server: `apx dev start`
- [ ] Verify hot reload works (edit a React component, see instant update)
- [ ] Test backend hot reload (edit an API endpoint, test immediately)
- [ ] Update README.md with APX commands
- [ ] Update CLAUDE.md Development section
- [ ] Train team on new workflow
- [ ] Update CI/CD to use `apx build` if needed

## Resources

- [APX GitHub](https://github.com/databricks-solutions/apx)
- [APX Documentation](https://databricks-solutions.github.io/apx/)
- [Databricks Apps Docs](https://docs.databricks.com/aws/en/dev-tools/databricks-apps/)

## Next Steps

1. **Install APX** and try `apx dev start`
2. **Test hot reload** by editing a component while server runs
3. **Iterate faster** on your module system
4. **Share with team** - one command vs three!

---

**Pro Tip**: APX's hot reload is especially powerful for your modular architecture. You can iterate on DSPy optimization logic, Data Quality checks, and new modules without ever stopping the dev server! 🔥
