# VITAL Workbench API - Quick Reference

## DEPLOY Stage (`/api/v1/deployment`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/models` | List models from Unity Catalog |
| GET | `/models/{model_name}/versions` | List model versions |
| GET | `/models/{model_name}/deployments` | Get all deployments for a model |
| GET | `/endpoints` | List all serving endpoints |
| GET | `/endpoints/{name}` | Get endpoint status |
| GET | `/endpoints/{name}/history` | Get deployment history |
| GET | `/endpoints/{name}/validate` | Validate endpoint config |
| POST | `/deploy` | Deploy model to endpoint |
| POST | `/endpoints/{name}/query` | Query endpoint (playground) |
| POST | `/endpoints/{name}/rollback` | Rollback to previous version |
| PUT | `/endpoints/{name}` | Update deployment |
| DELETE | `/endpoints/{name}` | Delete endpoint |
| GET | `/deployments` | List all deployments (paginated) |

## MONITOR Stage (`/api/v1/monitoring`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/metrics/performance` | Get performance metrics |
| GET | `/metrics/realtime/{id}` | Get real-time metrics |
| GET | `/drift/{id}` | Detect data drift |
| GET | `/health/{id}` | Check endpoint health |
| GET | `/alerts` | List alerts (with filters) |
| GET | `/alerts/{id}` | Get alert details |
| POST | `/alerts` | Create monitoring alert |
| POST | `/alerts/{id}/acknowledge` | Acknowledge alert |
| POST | `/alerts/{id}/resolve` | Resolve alert |
| DELETE | `/alerts/{id}` | Delete alert |

## IMPROVE Stage (`/api/v1/feedback`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/` | List feedback (paginated) |
| GET | `/{id}` | Get feedback details |
| GET | `/stats` | Get aggregated statistics |
| GET | `/endpoint/{id}/recent` | Get recent feedback |
| POST | `/` | Submit user feedback |
| POST | `/{id}/flag` | Flag for review |
| POST | `/{id}/to-training` | Convert to training data |
| DELETE | `/{id}` | Delete feedback |
| DELETE | `/{id}/flag` | Remove flag |

## Common Query Parameters

### Pagination
- `page` - Page number (default: 1, min: 1)
- `page_size` - Items per page (default: 20, max: 100)

### Filtering
- `endpoint_id` - Filter by endpoint
- `status` - Filter by status
- `rating` - Filter by rating (positive/negative)
- `flagged_only` - Show only flagged items

### Time Windows
- `hours` - Time window in hours (max: 168 = 7 days)
- `days` - Time period in days (max: 365)
- `minutes` - Time window in minutes (max: 60)

## Response Status Codes

- `200` - Success (GET, PUT)
- `201` - Created (POST)
- `204` - No Content (DELETE)
- `400` - Bad Request
- `404` - Not Found
- `409` - Conflict
- `500` - Server Error

## Quick Start Examples

### Deploy a Model
```bash
curl -X POST "http://localhost:8000/api/v1/deployment/deploy" \
  -H "Content-Type: application/json" \
  -d '{"model_name": "catalog.schema.model", "model_version": "1"}'
```

### Create Alert
```bash
curl -X POST "http://localhost:8000/api/v1/monitoring/alerts" \
  -H "Content-Type: application/json" \
  -d '{"endpoint_id": "ep-123", "alert_type": "error_rate", "threshold": 0.05, "condition": "gt"}'
```

### Submit Feedback
```bash
curl -X POST "http://localhost:8000/api/v1/feedback" \
  -H "Content-Type: application/json" \
  -d '{"endpoint_id": "ep-123", "input_text": "query", "output_text": "response", "rating": "positive"}'
```

### Check Endpoint Health
```bash
curl "http://localhost:8000/api/v1/monitoring/health/ep-123"
```

### Get Performance Metrics
```bash
curl "http://localhost:8000/api/v1/monitoring/metrics/performance?endpoint_id=ep-123&hours=24"
```

## Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Full API Docs**: `/backend/DEPLOY_MONITOR_IMPROVE_API.md`
- **Implementation Report**: `/DEPLOY_MONITOR_IMPROVE_IMPLEMENTATION.md`
