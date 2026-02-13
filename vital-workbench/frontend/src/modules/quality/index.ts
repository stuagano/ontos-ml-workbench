/**
 * Data Quality Module
 *
 * Automated data validation, profiling, and quality checks
 */

import { Shield } from "lucide-react";
import type { VitalModule } from "../types";
import DataQualityInspector from "./DataQualityInspector";

export const dataQualityModule: VitalModule = {
  id: "data-quality",
  name: "Data Quality Inspector",
  description: "Automated validation, profiling, and quality checks for your data",
  icon: Shield,
  stages: ["data", "curate"],
  component: DataQualityInspector,

  hooks: {
    canActivate: (context) => {
      // Requires sheet to be selected
      return !!context.sheetId || !!context.sheetName;
    },
  },

  settings: {
    autoRun: true,
    thresholds: {
      missingDataWarning: 10, // % of missing data to trigger warning
      classImbalanceRatio: 10, // ratio to trigger imbalance warning
      duplicateWarning: 1, // % of duplicates to trigger warning
    },
  },

  isEnabled: true,
  categories: ["quality"],
  version: "1.0.0",
};

export { DataQualityInspector };
