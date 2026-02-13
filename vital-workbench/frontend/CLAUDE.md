## Frontend - VITAL Workbench React

React + TypeScript interface for Mirion's radiation safety AI workbench.

## Stack
- React 18, TypeScript, Vite
- Tailwind CSS for styling
- React Router for navigation
- Deployed as Databricks App (served by FastAPI)

## Structure
- src/components/ — Reusable UI components
- src/pages/ — 7 workflow stage pages (Data, Generate, Label, Train, Deploy, Monitor, Improve)
- src/services/ — API client for backend communication
- src/types/ — TypeScript type definitions (sync with backend Pydantic models)
- src/utils/ — Helper functions

## Commands
- Dev (APX): `apx dev start` (from project root, hot reload enabled)
- Dev (manual): `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Type check: `npx tsc --noEmit`

## Verification
After frontend changes:
1. `npx tsc --noEmit` — fix type errors first
2. Check browser console for errors
3. Test UI interactions
4. Verify API calls in Network tab
5. `npm run build` — confirm production build succeeds

## Conventions
- Functional components with hooks (no class components)
- TypeScript strict mode enabled
- Type definitions must match backend Pydantic models
- Use Tailwind utility classes (no custom CSS unless necessary)
- API calls through services/api.ts client
- Stage-based navigation (7 workflow stages + Tools section)

## Key UI Patterns
- **Stage Navigation**: Linear workflow (DATA → GENERATE → LABEL → TRAIN → DEPLOY → MONITOR → IMPROVE)
- **TOOLS Section**: Modal/overlay access to Templates, Example Store, DSPy Optimizer, Canonical Labeling
- **Keyboard Shortcuts**: Alt+T (Templates), Alt+E (Examples), Alt+D (DSPy)
- **Multimodal Display**: Images, tables, sensor data visualizations
- **Approval Workflow**: Approve/Edit/Reject patterns for Q&A pairs

## Domain Terminology
- "Sheet" (not DataBit) — Dataset definition
- "Training Sheet" (not Assembly) — Q&A dataset
- "Canonical Label" — Expert-validated ground truth
- "Item" — Individual data point in a Sheet
- "Q&A Pair" — Question + answer for model training

## Don't
- Don't use `any` type — use `unknown` and narrow the type
- Don't skip error handling — always show user feedback
- Don't hardcode API URLs — use environment variables
- Don't use old terminology (see Domain Terminology above)
- Don't add new UI libraries without discussing (keep dependencies minimal)
- Don't bypass the services layer — all API calls through services/

## API Integration
- Backend endpoint: `/api/v1/...`
- Auth: Databricks workspace authentication (handled by platform)
- Error handling: Display user-friendly messages, log technical details
- Loading states: Show spinners/skeletons during data fetch
