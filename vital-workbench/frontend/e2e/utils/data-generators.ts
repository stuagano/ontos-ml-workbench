/**
 * Data generators for E2E tests
 * Creates realistic test data for various scenarios
 */

import { randomUUID } from 'crypto';

/**
 * Generate a unique test ID
 */
export function generateTestId(prefix = 'test'): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

/**
 * Generate sheet data
 */
export function generateSheet(overrides: Partial<any> = {}) {
  return {
    name: `Test Sheet ${generateTestId()}`,
    description: 'Auto-generated test sheet',
    source_type: 'unity_catalog_table',
    source_path: 'catalog.schema.test_data',
    data_type: 'tabular',
    status: 'active',
    ...overrides,
  };
}

/**
 * Generate template data
 */
export function generateTemplate(overrides: Partial<any> = {}) {
  return {
    name: `Test Template ${generateTestId()}`,
    description: 'Auto-generated test template',
    label_type: 'test_classification',
    template_text: 'Test prompt: {input}',
    input_variables: ['input'],
    output_format: 'classification',
    status: 'active',
    ...overrides,
  };
}

/**
 * Generate endpoint data
 */
export function generateEndpoint(overrides: Partial<any> = {}) {
  const id = generateTestId('endpoint');
  return {
    name: `test-endpoint-${id}`,
    model_name: 'catalog.schema.test_model',
    model_version: '1',
    endpoint_name: `test-endpoint-${id}`,
    workload_size: 'Small',
    scale_to_zero: true,
    ...overrides,
  };
}

/**
 * Generate feedback data
 */
export function generateFeedback(endpointId: string, overrides: Partial<any> = {}) {
  const id = generateTestId();
  return {
    endpoint_id: endpointId,
    input_text: `Test input ${id}`,
    output_text: `Test output ${id}`,
    rating: 'positive',
    ...overrides,
  };
}

/**
 * Generate alert configuration
 */
export function generateAlert(endpointId: string, overrides: Partial<any> = {}) {
  return {
    endpoint_id: endpointId,
    alert_type: 'error_rate',
    threshold: 0.1,
    condition: 'gt',
    enabled: true,
    ...overrides,
  };
}

/**
 * Generate batch of feedback items
 */
export function generateFeedbackBatch(
  endpointId: string,
  count: number,
  positiveRate = 0.7
) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const isPositive = Math.random() < positiveRate;
    items.push(
      generateFeedback(endpointId, {
        rating: isPositive ? 'positive' : 'negative',
        feedback_text: i % 3 === 0 ? `Comment ${i}` : undefined,
      })
    );
  }
  return items;
}

/**
 * Generate training sheet data
 */
export function generateTrainingSheet(overrides: Partial<any> = {}) {
  return {
    name: `Test Training Sheet ${generateTestId()}`,
    description: 'Auto-generated training sheet',
    status: 'active',
    total_rows: 0,
    ...overrides,
  };
}

/**
 * Generate realistic defect detection data
 */
export function generateDefectDetectionSheet() {
  return generateSheet({
    name: 'Defect Detection Sheet',
    description: 'Inspection images with defect labels',
    source_type: 'unity_catalog_volume',
    source_path: '/Volumes/catalog/schema/inspection_images',
    data_type: 'image',
  });
}

/**
 * Generate realistic maintenance prediction data
 */
export function generateMaintenanceSheet() {
  return generateSheet({
    name: 'Maintenance Prediction Sheet',
    description: 'Equipment telemetry for predictive maintenance',
    source_type: 'unity_catalog_table',
    source_path: 'catalog.schema.equipment_telemetry',
    data_type: 'tabular',
  });
}

/**
 * Generate realistic sensor anomaly data
 */
export function generateAnomalySheet() {
  return generateSheet({
    name: 'Anomaly Detection Sheet',
    description: 'Sensor streams with labeled anomalies',
    source_type: 'unity_catalog_table',
    source_path: 'catalog.schema.sensor_readings',
    data_type: 'timeseries',
  });
}
