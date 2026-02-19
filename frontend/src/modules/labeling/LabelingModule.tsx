/**
 * Labeling Jobs Module Component
 *
 * Wraps LabelingJobsPage for the module system
 */

import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { ModuleComponentProps } from "../types";

const LabelingWorkflow = lazy(() =>
  import("../../components/labeling").then((m) => ({
    default: m.LabelingWorkflow,
  })),
);

export default function LabelingModule({ onClose }: ModuleComponentProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-db-orange" />
        </div>
      }
    >
      <LabelingWorkflow />
    </Suspense>
  );
}
