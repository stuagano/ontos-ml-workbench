-- Create monitor_alerts table
CREATE TABLE IF NOT EXISTS your_catalog.ontos_ml_workbench.monitor_alerts (
  id STRING NOT NULL,
  endpoint_id STRING NOT NULL,
  alert_type STRING NOT NULL,
  threshold DOUBLE,
  condition STRING,
  status STRING DEFAULT 'active',
  triggered_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  acknowledged_by STRING,
  resolved_at TIMESTAMP,
  current_value DOUBLE,
  message STRING,
  created_at TIMESTAMP DEFAULT current_timestamp(),
  CONSTRAINT monitor_alerts_pk PRIMARY KEY (id)
) USING DELTA
COMMENT 'Monitoring alerts for deployed model endpoints';
