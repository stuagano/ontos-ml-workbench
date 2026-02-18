# Synthetic Data

Sample data for AI use cases. Used for demos, testing, and development.

## Use Cases

### defect_detection/
Visual inspection data for manufacturing defect detection.
- `labels.json` - Defect classifications (crack, contamination, misalignment, etc.)

### predictive_maintenance/
Equipment telemetry for failure prediction.
- `equipment.json` - Equipment metadata (detector types, locations, install dates)
- `telemetry.csv` - Sensor time series (temperature, voltage, counts)
- `failures.csv` - Historical failure events with root causes

### anomaly_detection/
Real-time sensor monitoring data.
- `anomalies.json` - Labeled anomaly events with explanations

### calibration/
Monte Carlo simulation outputs for calibration insights.
- `mc_simulations.csv` - Simulation results (energy, efficiency, resolution)

### templates/
Prompt template definitions for each use case.
- `defect_detection_template.json`
- `predictive_maintenance_template.json`
- `anomaly_detection_template.json`
- `calibration_insights_template.json`

## Loading Data

The bootstrap script seeds this data into Unity Catalog:

```bash
./scripts/bootstrap.sh <workspace-name>
```

Or seed manually via the API:

```bash
python scripts/seed_via_api.py
```

## Data Format

All data uses domain-specific terminology:
- **Detector types**: NaI, HPGe, LaBr3, CZT
- **Facilities**: Manufacturing sites, field deployments
- **Metrics**: Count rates, energy resolution, efficiency curves
