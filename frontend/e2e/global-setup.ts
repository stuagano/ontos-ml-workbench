/**
 * Global setup for E2E tests
 * Runs once before all tests
 */

import { chromium, FullConfig } from '@playwright/test';
import { waitForApi } from './utils/api-helpers';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Running global E2E setup...');

  const { baseURL } = config.projects[0].use;

  if (baseURL) {
    console.log(`⏳ Waiting for API to be ready at ${baseURL}...`);
    try {
      await waitForApi();
      console.log('✅ API is ready');
    } catch (error) {
      console.error('❌ API is not ready:', error);
      throw error;
    }
  }

  // Optional: Seed test data if not in read-only mode
  if (process.env.E2E_READ_ONLY !== 'true') {
    console.log('📦 Seeding test data...');
    try {
      // Uncomment when backend cleanup endpoints are ready
      // await seedSheets();
      // await seedTemplates();
      console.log('✅ Test data seeded');
    } catch (error) {
      console.warn('⚠️  Failed to seed test data:', error);
      // Don't fail setup if seeding fails
    }
  }

  console.log('✅ Global setup complete');
}

export default globalSetup;
