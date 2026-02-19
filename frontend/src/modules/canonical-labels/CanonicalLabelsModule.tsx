/**
 * Canonical Labels Module Component
 *
 * Wraps CanonicalLabelingTool for the module system
 */

import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { ModuleComponentProps } from "../types";

const CanonicalLabelingTool = lazy(() =>
  import("../../components/CanonicalLabelingTool").then((m) => ({
    default: m.CanonicalLabelingTool,
  })),
);

export default function CanonicalLabelsModule({
  onClose,
}: ModuleComponentProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-db-orange" />
        </div>
      }
    >
      <CanonicalLabelingTool onClose={() => onClose()} />
    </Suspense>
  );
}
