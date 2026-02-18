/**
 * API helpers for E2E tests
 * Provides utilities for seeding data, cleaning up, and interacting with the backend
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}

/**
 * Make an API request with proper error handling
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Seed test data for sheets
 */
export async function seedSheets() {
  const sheets = [
    {
      name: 'Test Defect Detection Sheet',
      description: 'Test data for defect detection',
      source_type: 'unity_catalog_table',
      source_path: 'catalog.schema.defect_images',
      data_type: 'image',
      status: 'active',
    },
    {
      name: 'Test Maintenance Sheet',
      description: 'Test data for predictive maintenance',
      source_type: 'unity_catalog_table',
      source_path: 'catalog.schema.equipment_telemetry',
      data_type: 'tabular',
      status: 'active',
    },
  ];

  const createdSheets = [];
  for (const sheet of sheets) {
    const created = await apiRequest('/api/v1/sheets', {
      method: 'POST',
      body: JSON.stringify(sheet),
    });
    createdSheets.push(created);
  }

  return createdSheets;
}

/**
 * Seed test templates
 */
export async function seedTemplates() {
  const templates = [
    {
      name: 'Test Defect Classification Template',
      description: 'Classify defects in inspection images',
      label_type: 'defect_type',
      template_text: 'Classify the defect type in this image: {image_path}',
      input_variables: ['image_path'],
      output_format: 'classification',
      status: 'active',
    },
  ];

  const createdTemplates = [];
  for (const template of templates) {
    const created = await apiRequest('/api/v1/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
    createdTemplates.push(created);
  }

  return createdTemplates;
}

/**
 * Seed test endpoint (deployment)
 */
export async function seedEndpoint() {
  const endpoint = {
    name: 'test-defect-detector-v1',
    model_name: 'catalog.schema.defect_detector',
    model_version: '1',
    endpoint_name: 'test-defect-detector',
    status: 'READY',
  };

  return apiRequest('/api/v1/deployment/deploy', {
    method: 'POST',
    body: JSON.stringify(endpoint),
  });
}

/**
 * Seed test feedback
 */
export async function seedFeedback(endpointId: string, count = 10) {
  const feedbackItems = [];

  for (let i = 0; i < count; i++) {
    const isPositive = i % 3 !== 0; // 2/3 positive, 1/3 negative
    const feedback = {
      endpoint_id: endpointId,
      input_text: `Test input ${i}`,
      output_text: `Test output ${i}`,
      rating: isPositive ? 'positive' : 'negative',
      feedback_text: i % 4 === 0 ? `Test comment ${i}` : undefined,
    };

    const created = await apiRequest('/api/v1/feedback', {
      method: 'POST',
      body: JSON.stringify(feedback),
    });
    feedbackItems.push(created);
  }

  return feedbackItems;
}

/**
 * Seed test alerts
 */
export async function seedAlerts(endpointId: string) {
  const alerts = [
    {
      endpoint_id: endpointId,
      alert_type: 'error_rate',
      threshold: 0.1,
      condition: 'gt',
      enabled: true,
    },
    {
      endpoint_id: endpointId,
      alert_type: 'drift',
      threshold: 0.2,
      condition: 'gt',
      enabled: true,
    },
  ];

  const createdAlerts = [];
  for (const alert of alerts) {
    const created = await apiRequest('/api/v1/monitoring/alerts', {
      method: 'POST',
      body: JSON.stringify(alert),
    });
    createdAlerts.push(created);
  }

  return createdAlerts;
}

/**
 * Clean up test data
 */
export async function cleanupTestData() {
  try {
    // Note: This requires implementing cleanup endpoints in the backend
    // or using direct database access for test cleanup
    console.log('Cleanup would happen here - requires cleanup endpoints');
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

/**
 * Wait for API to be ready
 */
export async function waitForApi(maxAttempts = 30, delayMs = 1000): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await fetch(`${API_BASE_URL}/api/v1/health`);
      console.log('API is ready');
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`API not ready after ${maxAttempts} attempts`);
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Get test data by ID
 */
export async function getSheet(id: string) {
  return apiRequest(`/api/v1/sheets/${id}`);
}

export async function getTemplate(id: string) {
  return apiRequest(`/api/v1/templates/${id}`);
}

export async function getEndpoint(name: string) {
  return apiRequest(`/api/v1/deployment/endpoints/${name}`);
}

export async function getFeedback(id: string) {
  return apiRequest(`/api/v1/feedback/${id}`);
}
