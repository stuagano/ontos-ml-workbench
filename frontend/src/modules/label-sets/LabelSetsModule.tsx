/**
 * Label Sets Module Component
 *
 * Wraps LabelSetsPage for the module system
 */

import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { ModuleComponentProps } from "../types";

const LabelSetsPage = lazy(() =>
  import("../../pages/LabelSetsPage").then((m) => ({
    default: m.LabelSetsPage,
  })),
);

export default function LabelSetsModule({ onClose }: ModuleComponentProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-db-orange" />
        </div>
      }
    >
      <LabelSetsPage />
    </Suspense>
  );
}
