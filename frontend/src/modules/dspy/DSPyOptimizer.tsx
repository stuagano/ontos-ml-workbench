/**
 * DSPy Optimizer Module
 *
 * Provides automatic prompt and few-shot example optimization using DSPy framework
 * Can be used for pre-training optimization or feedback-driven refinement
 */

import { DSPyOptimizationPage } from "../../pages/DSPyOptimizationPage";
import type { ModuleComponentProps } from "../types";

export function DSPyOptimizer({ context, onClose }: ModuleComponentProps) {
  // Extract template from context
  const template = context.template;

  if (!template) {
    return (
      <div className="p-8 text-center">
        <p className="text-db-gray-500">No template provided</p>
      </div>
    );
  }

  return (
    <DSPyOptimizationPage
      template={template}
      onClose={() => onClose()}
    />
  );
}

export default DSPyOptimizer;
