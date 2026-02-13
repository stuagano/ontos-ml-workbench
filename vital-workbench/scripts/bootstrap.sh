#!/bin/bash
# Bootstrap script for VITAL Workbench on a fresh FEVM workspace
# Usage: ./scripts/bootstrap.sh <workspace-name>
#
# This script:
# 1. Creates/validates the FEVM workspace
# 2. Sets up Unity Catalog (catalog, schema, tables)
# 3. Creates sample data
# 4. Deploys the Databricks App
# 5. Grants permissions to the app service principal

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration
WORKSPACE_NAME="${1:-}"
APP_NAME="vital-workbench"
CATALOG_NAME="${2:-}" # Will be auto-detected if not provided
SCHEMA_NAME="vital_workbench"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

if [ -z "$WORKSPACE_NAME" ]; then
    echo "Usage: $0 <workspace-name>"
    echo ""
    echo "Example: $0 vdm-serverless-abc123"
    echo ""
    echo "To create a new FEVM workspace, visit: https://go/fevm"
    exit 1
fi

PROFILE_NAME="fe-vm-${WORKSPACE_NAME}"

log_info "Starting VITAL Workbench bootstrap for workspace: $WORKSPACE_NAME"
log_info "Using Databricks profile: $PROFILE_NAME"

# Step 1: Validate workspace access
log_info "Step 1: Validating workspace access..."
if ! databricks auth profiles 2>/dev/null | grep -q "$PROFILE_NAME.*YES"; then
    log_warn "Profile $PROFILE_NAME not found or not valid. Attempting to authenticate..."

    # Try to get workspace URL from FEVM naming convention
    WORKSPACE_HOST="https://fevm-${WORKSPACE_NAME}.cloud.databricks.com"
    log_info "Authenticating to $WORKSPACE_HOST"

    databricks auth login "$WORKSPACE_HOST" --profile="$PROFILE_NAME"
fi

# Verify authentication
if ! databricks auth profiles 2>/dev/null | grep -q "$PROFILE_NAME.*YES"; then
    log_error "Failed to authenticate to workspace. Please run:"
    log_error "  databricks auth login https://fevm-${WORKSPACE_NAME}.cloud.databricks.com --profile=$PROFILE_NAME"
    exit 1
fi
log_success "Workspace authentication verified"

# Get workspace host for later use
WORKSPACE_HOST=$(databricks auth env --profile="$PROFILE_NAME" 2>/dev/null | grep DATABRICKS_HOST | cut -d= -f2 | tr -d '"')
log_info "Workspace host: $WORKSPACE_HOST"

# Step 2: Find a SQL warehouse
log_info "Step 2: Finding SQL warehouse..."
WAREHOUSE_INFO=$(databricks warehouses list --profile="$PROFILE_NAME" -o json 2>/dev/null | jq -r '.[0] | "\(.id) \(.name)"' || echo "")

if [ -z "$WAREHOUSE_INFO" ] || [ "$WAREHOUSE_INFO" = "null null" ]; then
    log_warn "No SQL warehouse found. Creating a serverless warehouse..."

    WAREHOUSE_ID=$(databricks warehouses create \
        --name "vital-workbench-warehouse" \
        --cluster-size "2X-Small" \
        --warehouse-type "PRO" \
        --enable-serverless-compute \
        --profile="$PROFILE_NAME" \
        -o json | jq -r '.id')

    log_info "Created warehouse: $WAREHOUSE_ID"
    log_info "Waiting for warehouse to start..."
    sleep 30
else
    WAREHOUSE_ID=$(echo "$WAREHOUSE_INFO" | awk '{print $1}')
    WAREHOUSE_NAME=$(echo "$WAREHOUSE_INFO" | cut -d' ' -f2-)
    log_info "Using existing warehouse: $WAREHOUSE_NAME ($WAREHOUSE_ID)"
fi

log_success "SQL Warehouse ID: $WAREHOUSE_ID"

# Step 3: Set up Unity Catalog
log_info "Step 3: Setting up Unity Catalog..."

# Auto-detect catalog if not provided
if [ -z "$CATALOG_NAME" ]; then
    # Look for workspace-specific catalog or use first MANAGED_CATALOG
    CATALOG_NAME=$(databricks catalogs list --profile="$PROFILE_NAME" -o json 2>/dev/null | \
        jq -r '.[] | select(.catalog_type == "MANAGED_CATALOG") | .name' | head -1)

    if [ -z "$CATALOG_NAME" ]; then
        CATALOG_NAME="main"
    fi
    log_info "Auto-detected catalog: $CATALOG_NAME"
fi

# Check if catalog exists
if databricks catalogs get "$CATALOG_NAME" --profile="$PROFILE_NAME" &>/dev/null; then
    log_info "Catalog '$CATALOG_NAME' already exists"
else
    log_info "Creating catalog '$CATALOG_NAME'..."
    databricks catalogs create "$CATALOG_NAME" --profile="$PROFILE_NAME" || \
        log_warn "Could not create catalog - will use existing one"
fi

# Check if schema exists
if databricks schemas get "${CATALOG_NAME}.${SCHEMA_NAME}" --profile="$PROFILE_NAME" &>/dev/null; then
    log_info "Schema '${CATALOG_NAME}.${SCHEMA_NAME}' already exists"
else
    log_info "Creating schema '${SCHEMA_NAME}'..."
    databricks schemas create "$SCHEMA_NAME" "$CATALOG_NAME" --profile="$PROFILE_NAME"
fi

log_success "Unity Catalog setup complete"

# Step 4: Create tables
log_info "Step 4: Creating application tables..."

# SQL to create all required tables
SQL_INIT=$(cat <<EOF
-- Sheets table
CREATE TABLE IF NOT EXISTS ${CATALOG_NAME}.${SCHEMA_NAME}.sheets (
    id STRING,
    name STRING,
    description STRING,
    status STRING DEFAULT 'draft',
    columns STRING,
    row_data STRING,
    created_by STRING,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Templates table (metadata for MLflow prompts)
CREATE TABLE IF NOT EXISTS ${CATALOG_NAME}.${SCHEMA_NAME}.templates (
    id STRING,
    name STRING,
    description STRING,
    version STRING,
    status STRING DEFAULT 'draft',
    input_schema STRING,
    output_schema STRING,
    prompt_template STRING,
    system_prompt STRING,
    examples STRING,
    base_model STRING,
    temperature DOUBLE,
    max_tokens INT,
    source_catalog STRING,
    source_schema STRING,
    source_table STRING,
    source_volume STRING,
    created_by STRING,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Curation items
CREATE TABLE IF NOT EXISTS ${CATALOG_NAME}.${SCHEMA_NAME}.curation_items (
    id STRING,
    template_id STRING,
    input_data STRING,
    original_output STRING,
    curated_output STRING,
    status STRING DEFAULT 'pending',
    confidence_score DOUBLE,
    review_notes STRING,
    created_by STRING,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Job runs
CREATE TABLE IF NOT EXISTS ${CATALOG_NAME}.${SCHEMA_NAME}.job_runs (
    id STRING,
    job_type STRING,
    status STRING DEFAULT 'pending',
    config STRING,
    template_id STRING,
    model_id STRING,
    endpoint_id STRING,
    result STRING,
    error_message STRING,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_by STRING,
    created_at TIMESTAMP
);

-- Endpoints registry
CREATE TABLE IF NOT EXISTS ${CATALOG_NAME}.${SCHEMA_NAME}.endpoints_registry (
    id STRING,
    name STRING,
    description STRING,
    endpoint_type STRING,
    endpoint_name STRING,
    model_name STRING,
    model_version STRING,
    status STRING DEFAULT 'active',
    config STRING,
    created_by STRING,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Feedback items
CREATE TABLE IF NOT EXISTS ${CATALOG_NAME}.${SCHEMA_NAME}.feedback_items (
    id STRING,
    endpoint_id STRING,
    input_text STRING,
    output_text STRING,
    rating STRING,
    feedback_text STRING,
    session_id STRING,
    request_id STRING,
    created_by STRING,
    created_at TIMESTAMP
);

-- Labeling jobs
CREATE TABLE IF NOT EXISTS ${CATALOG_NAME}.${SCHEMA_NAME}.labeling_jobs (
    id STRING,
    name STRING,
    description STRING,
    sheet_id STRING,
    status STRING DEFAULT 'draft',
    config STRING,
    created_by STRING,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Labeling tasks
CREATE TABLE IF NOT EXISTS ${CATALOG_NAME}.${SCHEMA_NAME}.labeling_tasks (
    id STRING,
    job_id STRING,
    status STRING DEFAULT 'pending',
    assigned_to STRING,
    priority INT,
    item_count INT,
    completed_count INT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Labeled items
CREATE TABLE IF NOT EXISTS ${CATALOG_NAME}.${SCHEMA_NAME}.labeled_items (
    id STRING,
    task_id STRING,
    item_index INT,
    input_data STRING,
    labels STRING,
    status STRING DEFAULT 'pending',
    labeled_by STRING,
    labeled_at TIMESTAMP,
    created_at TIMESTAMP
);

-- Tools registry
CREATE TABLE IF NOT EXISTS ${CATALOG_NAME}.${SCHEMA_NAME}.tools_registry (
    id STRING,
    name STRING,
    description STRING,
    tool_type STRING,
    config STRING,
    status STRING DEFAULT 'active',
    created_by STRING,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Workspace users
CREATE TABLE IF NOT EXISTS ${CATALOG_NAME}.${SCHEMA_NAME}.workspace_users (
    id STRING,
    email STRING,
    display_name STRING,
    role STRING DEFAULT 'labeler',
    is_active BOOLEAN DEFAULT true,
    config STRING,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Agents registry
CREATE TABLE IF NOT EXISTS ${CATALOG_NAME}.${SCHEMA_NAME}.agents_registry (
    id STRING,
    name STRING,
    description STRING,
    agent_type STRING,
    config STRING,
    tools STRING,
    status STRING DEFAULT 'active',
    created_by STRING,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
EOF
)

# Execute SQL via warehouse
echo "$SQL_INIT" | databricks sql exec \
    --warehouse-id "$WAREHOUSE_ID" \
    --profile="$PROFILE_NAME" \
    2>/dev/null || log_warn "Some tables may already exist"

log_success "Tables created"

# Step 5: Create sample data
log_info "Step 5: Creating sample data..."

SAMPLE_DATA_SQL=$(cat <<EOF
-- Insert sample sheet with sensor data
MERGE INTO ${CATALOG_NAME}.${SCHEMA_NAME}.sheets AS target
USING (SELECT 'sample-sensor-sheet-001' AS id) AS source
ON target.id = source.id
WHEN NOT MATCHED THEN INSERT (
    id, name, description, status, columns, row_data, created_by, created_at, updated_at
) VALUES (
    'sample-sensor-sheet-001',
    'Sensor Monitoring Data',
    'Sample IoT sensor readings for anomaly detection demo',
    'draft',
    '[{"id":"col-1","name":"sensor_id","data_type":"string","source_type":"imported","import_config":{"catalog":"demo","schema":"iot","table":"sensors"}},{"id":"col-2","name":"temperature","data_type":"number","source_type":"imported","import_config":{"catalog":"demo","schema":"iot","table":"sensors"}},{"id":"col-3","name":"humidity","data_type":"number","source_type":"imported","import_config":{"catalog":"demo","schema":"iot","table":"sensors"}},{"id":"col-4","name":"status","data_type":"string","source_type":"imported","import_config":{"catalog":"demo","schema":"iot","table":"sensors"}}]',
    '[{"row_index":0,"cells":{"col-1":{"value":"SENSOR-001"},"col-2":{"value":72.5},"col-3":{"value":45.2},"col-4":{"value":"normal"}}},{"row_index":1,"cells":{"col-1":{"value":"SENSOR-002"},"col-2":{"value":185.3},"col-3":{"value":12.1},"col-4":{"value":"critical"}}},{"row_index":2,"cells":{"col-1":{"value":"SENSOR-003"},"col-2":{"value":68.9},"col-3":{"value":52.7},"col-4":{"value":"normal"}}},{"row_index":3,"cells":{"col-1":{"value":"SENSOR-004"},"col-2":{"value":98.2},"col-3":{"value":78.4},"col-4":{"value":"warning"}}},{"row_index":4,"cells":{"col-1":{"value":"SENSOR-005"},"col-2":{"value":71.1},"col-3":{"value":44.8},"col-4":{"value":"normal"}}},{"row_index":5,"cells":{"col-1":{"value":"SENSOR-006"},"col-2":{"value":210.5},"col-3":{"value":5.2},"col-4":{"value":"critical"}}},{"row_index":6,"cells":{"col-1":{"value":"SENSOR-007"},"col-2":{"value":75.8},"col-3":{"value":48.9},"col-4":{"value":"normal"}}},{"row_index":7,"cells":{"col-1":{"value":"SENSOR-008"},"col-2":{"value":92.4},"col-3":{"value":65.1},"col-4":{"value":"warning"}}}]',
    'bootstrap',
    current_timestamp(),
    current_timestamp()
);

-- Insert sample defect detection sheet
MERGE INTO ${CATALOG_NAME}.${SCHEMA_NAME}.sheets AS target
USING (SELECT 'sample-defect-sheet-001' AS id) AS source
ON target.id = source.id
WHEN NOT MATCHED THEN INSERT (
    id, name, description, status, columns, row_data, created_by, created_at, updated_at
) VALUES (
    'sample-defect-sheet-001',
    'Manufacturing Defect Data',
    'Product quality inspection data for defect classification',
    'draft',
    '[{"id":"col-1","name":"product_id","data_type":"string","source_type":"imported"},{"id":"col-2","name":"inspection_notes","data_type":"string","source_type":"imported"},{"id":"col-3","name":"defect_type","data_type":"string","source_type":"imported"},{"id":"col-4","name":"severity","data_type":"string","source_type":"imported"}]',
    '[{"row_index":0,"cells":{"col-1":{"value":"PRD-2024-001"},"col-2":{"value":"Surface scratch visible on left panel, 2cm length"},"col-3":{"value":"cosmetic"},"col-4":{"value":"minor"}}},{"row_index":1,"cells":{"col-1":{"value":"PRD-2024-002"},"col-2":{"value":"Weld joint incomplete, structural integrity compromised"},"col-3":{"value":"structural"},"col-4":{"value":"critical"}}},{"row_index":2,"cells":{"col-1":{"value":"PRD-2024-003"},"col-2":{"value":"Paint bubbling in corner section"},"col-3":{"value":"cosmetic"},"col-4":{"value":"minor"}}},{"row_index":3,"cells":{"col-1":{"value":"PRD-2024-004"},"col-2":{"value":"Alignment off by 3mm, affects assembly"},"col-3":{"value":"dimensional"},"col-4":{"value":"major"}}},{"row_index":4,"cells":{"col-1":{"value":"PRD-2024-005"},"col-2":{"value":"No defects found, passed all inspections"},"col-3":{"value":"none"},"col-4":{"value":"none"}}}]',
    'bootstrap',
    current_timestamp(),
    current_timestamp()
);
EOF
)

echo "$SAMPLE_DATA_SQL" | databricks sql exec \
    --warehouse-id "$WAREHOUSE_ID" \
    --profile="$PROFILE_NAME" \
    2>/dev/null || log_warn "Sample data may already exist"

log_success "Sample data created"

# Step 6: Update app.yaml with correct warehouse ID
log_info "Step 6: Updating app configuration..."

sed -i.bak "s/DATABRICKS_WAREHOUSE_ID.*/DATABRICKS_WAREHOUSE_ID\n    value: \"$WAREHOUSE_ID\"/" "$PROJECT_ROOT/app.yaml" 2>/dev/null || \
    sed -i '' "s/value: \".*\"/value: \"$WAREHOUSE_ID\"/" "$PROJECT_ROOT/app.yaml"

# More reliable approach - rewrite app.yaml
cat > "$PROJECT_ROOT/app.yaml" <<EOF
command:
  - uvicorn
  - app.main:app
  - --host
  - 0.0.0.0
  - --port
  - "8000"
  - --app-dir
  - backend

env:
  - name: APP_NAME
    value: vital-workbench
  - name: APP_TITLE
    value: VITAL Platform Workbench
  - name: DATABRICKS_CATALOG
    value: ${CATALOG_NAME}
  - name: DATABRICKS_SCHEMA
    value: ${SCHEMA_NAME}
  - name: DATABRICKS_WAREHOUSE_ID
    value: "${WAREHOUSE_ID}"
EOF

log_success "App configuration updated"

# Step 7: Build frontend
log_info "Step 7: Building frontend..."
cd "$PROJECT_ROOT/frontend"
npm install --silent 2>/dev/null
npm run build 2>/dev/null
log_success "Frontend built"

# Step 8: Sync and deploy app
log_info "Step 8: Deploying application..."

WORKSPACE_PATH="/Workspace/Users/stuart.gano@databricks.com/Apps/vital-workbench"

# Sync all files
cd "$PROJECT_ROOT"
databricks workspace import-dir frontend/dist "${WORKSPACE_PATH}/frontend/dist" --overwrite --profile="$PROFILE_NAME" 2>/dev/null
databricks sync . "$WORKSPACE_PATH" --profile="$PROFILE_NAME" --watch=false 2>/dev/null

# Create app if it doesn't exist
if ! databricks apps get "$APP_NAME" --profile="$PROFILE_NAME" &>/dev/null; then
    log_info "Creating app '$APP_NAME'..."
    databricks apps create "$APP_NAME" --profile="$PROFILE_NAME" &
    sleep 60  # Wait for compute to start
fi

# Wait for app compute to be ready
log_info "Waiting for app compute to be ready..."
for i in {1..12}; do
    STATUS=$(databricks apps get "$APP_NAME" --profile="$PROFILE_NAME" -o json 2>/dev/null | jq -r '.compute_status // "UNKNOWN"')
    if [ "$STATUS" = "ACTIVE" ]; then
        break
    fi
    log_info "  Compute status: $STATUS (attempt $i/12)"
    sleep 10
done

# Deploy
log_info "Deploying app..."
databricks apps deploy "$APP_NAME" --source-code-path "$WORKSPACE_PATH" --profile="$PROFILE_NAME"

# Step 9: Grant permissions to service principal
log_info "Step 9: Granting permissions to app service principal..."

# Get service principal ID from the app
SP_ID=$(databricks apps get "$APP_NAME" --profile="$PROFILE_NAME" -o json 2>/dev/null | jq -r '.service_principal_id // empty')

if [ -n "$SP_ID" ]; then
    log_info "Service Principal ID: $SP_ID"

    # Grant UC permissions
    GRANT_SQL=$(cat <<EOF
GRANT USE CATALOG ON CATALOG ${CATALOG_NAME} TO \`${SP_ID}\`;
GRANT USE SCHEMA ON SCHEMA ${CATALOG_NAME}.${SCHEMA_NAME} TO \`${SP_ID}\`;
GRANT SELECT, MODIFY ON SCHEMA ${CATALOG_NAME}.${SCHEMA_NAME} TO \`${SP_ID}\`;
EOF
)
    echo "$GRANT_SQL" | databricks sql exec \
        --warehouse-id "$WAREHOUSE_ID" \
        --profile="$PROFILE_NAME" \
        2>/dev/null || log_warn "Permission grants may have failed - check manually"

    log_success "Permissions granted to service principal"
else
    log_warn "Could not find service principal ID - grant permissions manually"
fi

# Step 10: Seed prompt templates via SQL
log_info "Step 10: Seeding prompt templates..."

TEMPLATES_SQL=$(cat <<EOF
-- Sensor Anomaly Detection Template
MERGE INTO ${CATALOG_NAME}.${SCHEMA_NAME}.templates AS target
USING (SELECT 'tpl-sensor-anomaly-001' AS id) AS source
ON target.id = source.id
WHEN NOT MATCHED THEN INSERT (
    id, name, description, version, status,
    system_prompt, prompt_template, input_schema, output_schema,
    base_model, temperature, max_tokens, created_by, created_at, updated_at
) VALUES (
    'tpl-sensor-anomaly-001',
    'Sensor Anomaly Detection',
    'Classify sensor readings as normal, warning, or critical based on temperature and humidity patterns',
    '1.0.0',
    'published',
    'You are an expert industrial IoT analyst specializing in sensor anomaly detection for radiation safety equipment.

Analyze sensor readings and classify the equipment status. Consider:
- Temperature: Normal range is 65-85F. Warning at 90-100F. Critical above 100F or below 50F.
- Humidity: Normal range is 40-60%. Warning outside 30-70%. Critical outside 20-80%.
- Correlations between readings that indicate systemic issues.

Respond in JSON format with your classification and reasoning.',
    'Analyze this sensor reading:

Sensor ID: {{sensor_id}}
Temperature: {{temperature}}F
Humidity: {{humidity}}%
Current Status: {{status}}

Provide your analysis in JSON format with: classification, confidence, anomaly_detected, reasoning, recommended_action',
    '[{"name":"sensor_id","type":"string","required":true},{"name":"temperature","type":"number","required":true},{"name":"humidity","type":"number","required":true},{"name":"status","type":"string","required":true}]',
    '[{"name":"classification","type":"string","required":true},{"name":"confidence","type":"number","required":true},{"name":"anomaly_detected","type":"boolean","required":true},{"name":"reasoning","type":"string","required":true},{"name":"recommended_action","type":"string","required":false}]',
    'databricks-meta-llama-3-1-70b-instruct',
    0.3,
    512,
    'bootstrap',
    current_timestamp(),
    current_timestamp()
);

-- Defect Classification Template
MERGE INTO ${CATALOG_NAME}.${SCHEMA_NAME}.templates AS target
USING (SELECT 'tpl-defect-class-001' AS id) AS source
ON target.id = source.id
WHEN NOT MATCHED THEN INSERT (
    id, name, description, version, status,
    system_prompt, prompt_template, input_schema, output_schema,
    base_model, temperature, max_tokens, created_by, created_at, updated_at
) VALUES (
    'tpl-defect-class-001',
    'Defect Classification',
    'Classify manufacturing defects by type and severity from inspection notes',
    '1.0.0',
    'published',
    'You are a quality control expert for manufacturing inspection. Classify defects found during product inspection.

Defect Categories:
- cosmetic: Visual imperfections (scratches, paint issues, minor dents)
- structural: Issues affecting physical integrity (cracks, incomplete welds)
- dimensional: Size/alignment issues affecting fit or assembly
- functional: Issues affecting product operation
- none: No defect found

Severity Levels: none, minor, major, critical

Be precise and consistent in your classifications.',
    'Classify this inspection finding:

Product ID: {{product_id}}
Inspection Notes: {{inspection_notes}}

Provide classification in JSON format with: defect_type, severity, confidence, reasoning, rework_required, estimated_repair_time_hours',
    '[{"name":"product_id","type":"string","required":true},{"name":"inspection_notes","type":"string","required":true}]',
    '[{"name":"defect_type","type":"string","required":true},{"name":"severity","type":"string","required":true},{"name":"confidence","type":"number","required":true},{"name":"reasoning","type":"string","required":true},{"name":"rework_required","type":"boolean","required":true}]',
    'databricks-meta-llama-3-1-70b-instruct',
    0.2,
    512,
    'bootstrap',
    current_timestamp(),
    current_timestamp()
);

-- Predictive Maintenance Template (draft)
MERGE INTO ${CATALOG_NAME}.${SCHEMA_NAME}.templates AS target
USING (SELECT 'tpl-pred-maint-001' AS id) AS source
ON target.id = source.id
WHEN NOT MATCHED THEN INSERT (
    id, name, description, version, status,
    system_prompt, prompt_template, input_schema, output_schema,
    base_model, temperature, max_tokens, created_by, created_at, updated_at
) VALUES (
    'tpl-pred-maint-001',
    'Predictive Maintenance',
    'Predict equipment failures and recommend maintenance actions based on telemetry data',
    '1.0.0',
    'draft',
    'You are a predictive maintenance AI for industrial radiation detection equipment. Analyze equipment telemetry and maintenance history to predict potential failures.

Consider operating hours, temperature trends, vibration patterns, and historical failure modes.',
    'Analyze this equipment for maintenance needs:

Equipment ID: {{equipment_id}}
Equipment Type: {{equipment_type}}
Operating Hours: {{operating_hours}}
Last Maintenance: {{last_maintenance_date}}
Current Temperature: {{current_temp}}F

Provide your maintenance prediction in JSON format.',
    '[{"name":"equipment_id","type":"string","required":true},{"name":"equipment_type","type":"string","required":true},{"name":"operating_hours","type":"number","required":true},{"name":"last_maintenance_date","type":"string","required":true},{"name":"current_temp","type":"number","required":true}]',
    '[{"name":"failure_probability_30d","type":"number","required":true},{"name":"recommended_action","type":"string","required":true},{"name":"reasoning","type":"string","required":true}]',
    'databricks-meta-llama-3-1-70b-instruct',
    0.4,
    768,
    'bootstrap',
    current_timestamp(),
    current_timestamp()
);

-- Calibration Insights Template (draft)
MERGE INTO ${CATALOG_NAME}.${SCHEMA_NAME}.templates AS target
USING (SELECT 'tpl-calibration-001' AS id) AS source
ON target.id = source.id
WHEN NOT MATCHED THEN INSERT (
    id, name, description, version, status,
    system_prompt, prompt_template, input_schema, output_schema,
    base_model, temperature, max_tokens, created_by, created_at, updated_at
) VALUES (
    'tpl-calibration-001',
    'Calibration Insights',
    'Analyze Monte Carlo simulation results and provide detector calibration recommendations',
    '1.0.0',
    'draft',
    'You are a radiation physics expert specializing in detector calibration. Analyze Monte Carlo simulation results and provide calibration recommendations.

Be precise with numerical recommendations as they affect measurement accuracy.',
    'Analyze these calibration results:

Detector ID: {{detector_id}}
Detector Type: {{detector_type}}
Expected Response: {{expected_response}}
Measured Response: {{measured_response}}
Last Calibration: {{last_calibration_date}}

Provide calibration analysis in JSON format.',
    '[{"name":"detector_id","type":"string","required":true},{"name":"detector_type","type":"string","required":true},{"name":"expected_response","type":"number","required":true},{"name":"measured_response","type":"number","required":true},{"name":"last_calibration_date","type":"string","required":true}]',
    '[{"name":"calibration_status","type":"string","required":true},{"name":"new_calibration_factor","type":"number","required":true},{"name":"recommended_action","type":"string","required":true}]',
    'databricks-meta-llama-3-1-70b-instruct',
    0.2,
    768,
    'bootstrap',
    current_timestamp(),
    current_timestamp()
);
EOF
)

echo "$TEMPLATES_SQL" | databricks sql exec \
    --warehouse-id "$WAREHOUSE_ID" \
    --profile="$PROFILE_NAME" \
    2>/dev/null || log_warn "Templates may already exist"

log_success "Prompt templates seeded"

# Step 11: Seed curation items for demo
log_info "Step 11: Seeding curation items..."

CURATION_SQL=$(cat <<EOF
-- Seed curation items for sensor anomaly template
MERGE INTO ${CATALOG_NAME}.${SCHEMA_NAME}.curation_items AS target
USING (SELECT 'curation-sensor-001' AS id) AS source
ON target.id = source.id
WHEN NOT MATCHED THEN INSERT (
    id, template_id, input_data, original_output, curated_output, status, confidence_score, created_by, created_at, updated_at
) VALUES (
    'curation-sensor-001',
    'tpl-sensor-anomaly-001',
    '{"sensor_id": "SENSOR-002", "temperature": 185.3, "humidity": 12.1, "status": "critical"}',
    '{"classification": "critical", "confidence": 0.95, "anomaly_detected": true, "reasoning": "Temperature 185.3F significantly exceeds critical threshold of 100F. Humidity 12.1% is critically low.", "recommended_action": "Immediate inspection required"}',
    NULL,
    'pending',
    0.95,
    'bootstrap',
    current_timestamp(),
    current_timestamp()
);

MERGE INTO ${CATALOG_NAME}.${SCHEMA_NAME}.curation_items AS target
USING (SELECT 'curation-sensor-002' AS id) AS source
ON target.id = source.id
WHEN NOT MATCHED THEN INSERT (
    id, template_id, input_data, original_output, curated_output, status, confidence_score, created_by, created_at, updated_at
) VALUES (
    'curation-sensor-002',
    'tpl-sensor-anomaly-001',
    '{"sensor_id": "SENSOR-004", "temperature": 98.2, "humidity": 78.4, "status": "warning"}',
    '{"classification": "warning", "confidence": 0.82, "anomaly_detected": true, "reasoning": "Temperature 98.2F approaching critical threshold. Humidity 78.4% is elevated.", "recommended_action": "Monitor closely, schedule inspection within 24 hours"}',
    NULL,
    'pending',
    0.82,
    'bootstrap',
    current_timestamp(),
    current_timestamp()
);

MERGE INTO ${CATALOG_NAME}.${SCHEMA_NAME}.curation_items AS target
USING (SELECT 'curation-sensor-003' AS id) AS source
ON target.id = source.id
WHEN NOT MATCHED THEN INSERT (
    id, template_id, input_data, original_output, curated_output, status, confidence_score, created_by, created_at, updated_at
) VALUES (
    'curation-sensor-003',
    'tpl-sensor-anomaly-001',
    '{"sensor_id": "SENSOR-001", "temperature": 72.5, "humidity": 45.2, "status": "normal"}',
    '{"classification": "normal", "confidence": 0.98, "anomaly_detected": false, "reasoning": "All readings within normal operating parameters.", "recommended_action": null}',
    '{"classification": "normal", "confidence": 0.98, "anomaly_detected": false, "reasoning": "All readings within normal operating parameters.", "recommended_action": null}',
    'approved',
    0.98,
    'bootstrap',
    current_timestamp(),
    current_timestamp()
);

-- Seed curation items for defect classification template
MERGE INTO ${CATALOG_NAME}.${SCHEMA_NAME}.curation_items AS target
USING (SELECT 'curation-defect-001' AS id) AS source
ON target.id = source.id
WHEN NOT MATCHED THEN INSERT (
    id, template_id, input_data, original_output, curated_output, status, confidence_score, created_by, created_at, updated_at
) VALUES (
    'curation-defect-001',
    'tpl-defect-class-001',
    '{"product_id": "PRD-2024-002", "inspection_notes": "Weld joint incomplete, structural integrity compromised"}',
    '{"defect_type": "structural", "severity": "critical", "confidence": 0.94, "reasoning": "Incomplete weld joint directly affects structural integrity - safety critical defect", "rework_required": true, "estimated_repair_time_hours": 4}',
    NULL,
    'pending',
    0.94,
    'bootstrap',
    current_timestamp(),
    current_timestamp()
);

MERGE INTO ${CATALOG_NAME}.${SCHEMA_NAME}.curation_items AS target
USING (SELECT 'curation-defect-002' AS id) AS source
ON target.id = source.id
WHEN NOT MATCHED THEN INSERT (
    id, template_id, input_data, original_output, curated_output, status, confidence_score, created_by, created_at, updated_at
) VALUES (
    'curation-defect-002',
    'tpl-defect-class-001',
    '{"product_id": "PRD-2024-001", "inspection_notes": "Surface scratch visible on left panel, 2cm length"}',
    '{"defect_type": "cosmetic", "severity": "minor", "confidence": 0.91, "reasoning": "Surface scratch is purely cosmetic, does not affect function", "rework_required": false, "estimated_repair_time_hours": null}',
    '{"defect_type": "cosmetic", "severity": "minor", "confidence": 0.91, "reasoning": "Surface scratch is purely cosmetic, does not affect function", "rework_required": false, "estimated_repair_time_hours": null}',
    'approved',
    0.91,
    'bootstrap',
    current_timestamp(),
    current_timestamp()
);
EOF
)

echo "$CURATION_SQL" | databricks sql exec \
    --warehouse-id "$WAREHOUSE_ID" \
    --profile="$PROFILE_NAME" \
    2>/dev/null || log_warn "Curation items may already exist"

log_success "Curation items seeded"

# Step 12: Print summary
echo ""
echo "==========================================="
log_success "VITAL Workbench Bootstrap Complete!"
echo "==========================================="
echo ""
echo "Workspace:     $WORKSPACE_HOST"
echo "App URL:       https://${APP_NAME}-*.aws.databricksapps.com"
echo "Catalog:       $CATALOG_NAME"
echo "Schema:        $SCHEMA_NAME"
echo "Warehouse ID:  $WAREHOUSE_ID"
echo "Profile:       $PROFILE_NAME"
echo ""
echo "To get the exact app URL, run:"
echo "  databricks apps get $APP_NAME --profile=$PROFILE_NAME -o json | jq -r '.url'"
echo ""
echo "Sample data seeded:"
echo "  DATA stage:"
echo "    - Sensor Monitoring Data (8 rows)"
echo "    - Manufacturing Defect Data (5 rows)"
echo ""
echo "  TEMPLATE stage (MLflow Prompt Registry):"
echo "    - sensor-anomaly-detection (published)"
echo "    - defect-classification (published)"
echo "    - predictive-maintenance (draft)"
echo "    - calibration-insights (draft)"
echo ""
echo "  CURATE stage:"
echo "    - 3 sensor anomaly items (1 approved, 2 pending)"
echo "    - 2 defect classification items (1 approved, 1 pending)"
echo ""
log_info "Demo flow:"
echo "  1. Open app → DATA stage shows sample sheets"
echo "  2. TEMPLATE stage shows pre-built prompt templates"
echo "  3. CURATE stage has items ready for review"
echo ""
