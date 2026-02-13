/**
 * Global teardown for E2E tests
 * Runs once after all tests
 */

import { FullConfig } from '@playwright/test';
import { cleanupTestData } from './utils/api-helpers';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Running global E2E teardown...');

  // Cleanup test data if not in read-only mode
  if (process.env.E2E_READ_ONLY !== 'true') {
    console.log('🗑️  Cleaning up test data...');
    try {
      // Uncomment when backend cleanup endpoints are ready
      // await cleanupTestData();
      console.log('✅ Test data cleaned up');
    } catch (error) {
      console.warn('⚠️  Failed to clean up test data:', error);
      // Don't fail teardown if cleanup fails
    }
  }

  console.log('✅ Global teardown complete');
}

export default globalTeardown;
