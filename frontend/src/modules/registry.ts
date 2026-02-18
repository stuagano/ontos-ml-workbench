/**
 * Module Registry
 *
 * Central registry for all pluggable modules in Ontos ML
 */

import type { OntosModule } from "./types";
import type { PipelineStage } from "../types";

// Import actual modules
import { dspyModule } from "./dspy";
import { dataQualityModule } from "./quality";

/**
 * All registered modules
 *
 * Future modules to add:
 * - Labeling Workflows (multi-user annotation)
 * - Monitoring & Alerts (drift detection, performance tracking)
 * - Analytics Dashboard (detailed usage analytics)
 * - Example Store (few-shot example management)
 * - Evaluation Harness (model comparison)
 * - Cost Tracker (budget monitoring)
 */
export const MODULE_REGISTRY: OntosModule[] = [
  dspyModule,
  dataQualityModule,
];

/**
 * Get all modules available for a specific stage
 */
export function getModulesForStage(stage: PipelineStage): OntosModule[] {
  return MODULE_REGISTRY.filter(
    (module) => module.isEnabled && module.stages.includes(stage)
  );
}

/**
 * Get module by ID
 */
export function getModuleById(id: string): OntosModule | undefined {
  return MODULE_REGISTRY.find((module) => module.id === id);
}

/**
 * Get modules by category
 */
export function getModulesByCategory(
  category: string
): OntosModule[] {
  return MODULE_REGISTRY.filter(
    (module) =>
      module.isEnabled &&
      module.categories?.includes(category as any)
  );
}
