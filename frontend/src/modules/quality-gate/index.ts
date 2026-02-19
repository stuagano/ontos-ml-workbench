/**
 * Quality Gate Module
 *
 * Pre-training quality gate checks via Ontos DQX proxy
 */

import { Shield } from "lucide-react";
import type { OntosModule } from "../types";
import QualityGateModule from "./QualityGateModule";

export const qualityGateModule: OntosModule = {
  id: "quality-gate",
  name: "Quality Gate",
  description: "Run Ontos DQX quality checks before training",
  icon: Shield,
  stages: ["train", "curate"],
  component: QualityGateModule,

  hooks: {
    canActivate: (context) => {
      return !!context.assemblyId;
    },
  },

  isEnabled: true,
  categories: ["quality"],
  version: "1.0.0",
};

export { QualityGateModule };
