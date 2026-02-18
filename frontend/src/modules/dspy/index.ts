/**
 * DSPy Optimization Module
 *
 * Module definition for DSPy optimizer
 */

import { Wand2 } from "lucide-react";
import type { OntosModule } from "../types";
import DSPyOptimizer from "./DSPyOptimizer";

export const dspyModule: OntosModule = {
  id: "dspy-optimization",
  name: "DSPy Optimizer",
  description: "Automatic prompt and few-shot example optimization using DSPy framework",
  icon: Wand2,
  stages: ["train", "improve"],
  component: DSPyOptimizer,

  hooks: {
    canActivate: (context) => {
      // Requires template to be selected
      return !!context.template;
    },
  },

  settings: {
    defaultOptimizer: "BootstrapFewShot",
    maxTrials: 100,
    autoOptimize: false,
  },

  isEnabled: true,
  categories: ["optimization"],
  version: "1.0.0",
};

export { DSPyOptimizer };
