# APX Quick Reference for Ontos ML Development

## Essential Commands

```bash
# Start dev server with hot reload
apx dev start

# Build for production
apx build

# Update APX toolkit
uv sync --upgrade-package apx --index https://databricks-solutions.github.io/apx/simple
```

## Development Flow

### Day-to-Day Development
```bash
# Morning: Start dev server
apx dev start

# Code all day - changes hot reload automatically!
# - Edit React components → instant browser update
# - Edit API endpoints → instant backend reload
# - No restart needed!

# Evening: Deploy to Databricks
apx build
databricks bundle deploy -t dev
```

### Module Development Loop
```bash
# 1. Start APX
apx dev start

# 2. Create new module
# frontend/src/modules/mymodule/index.ts
# frontend/src/modules/mymodule/MyModule.tsx

# 3. Register module
# frontend/src/modules/registry.ts
# → Hot reload picks it up instantly!

# 4. Add to page
# frontend/src/pages/SomePage.tsx
# → See it work immediately!

# 5. Add backend endpoint
# backend/app/api/v1/endpoints/mymodule.py
# → Test from frontend right away!
```

## What Hot Reloads

✅ **Instant Reload**
- React components
- TypeScript files
- CSS/Tailwind styles
- API endpoints
- Services
- Models
- Config (most changes)

❌ **Requires Restart**
- `package.json` changes
- `requirements.txt` changes
- `.env` changes
- New Python packages

## Pro Tips

### 1. Keep APX Running
Don't stop the dev server between changes. Let hot reload do its magic!

### 2. Watch Terminal for Errors
APX shows both Python and TypeScript errors in one place.

### 3. Module System + Hot Reload = 🚀
Add new modules without restarting:
```typescript
// Add to registry.ts
export const MODULE_REGISTRY = [
  dspyModule,
  dataQualityModule,
  myNewModule,  // Save → instant reload!
];
```

### 4. Test Backend Changes from Frontend
```typescript
// Edit API endpoint
// backend/app/api/v1/endpoints/sheets.py

// Immediately test from frontend
// frontend/src/services/api.ts → refresh browser → works!
```

## Troubleshooting

```bash
# Port already in use?
lsof -i :8000
kill -9 <PID>

# APX not detecting changes?
# Restart the dev server
Ctrl+C
apx dev start

# Module not appearing?
# Check browser console for errors
# Check APX terminal for Python errors
```

## File Watchers

APX watches these directories:
```
frontend/src/           → React hot reload
backend/app/           → FastAPI hot reload
backend/static/        → Served to browser
```

## The Magic

Before APX:
```
Terminal 1: uvicorn ...
Terminal 2: npm run dev
Terminal 3: watching logs
Terminal 4: running tests
= Chaos! 😵
```

With APX:
```
apx dev start
= Everything! 🎉
```

## Resources

- Full guide: [APX_SETUP.md](./APX_SETUP.md)
- APX docs: https://databricks-solutions.github.io/apx/
- GitHub: https://github.com/databricks-solutions/apx
