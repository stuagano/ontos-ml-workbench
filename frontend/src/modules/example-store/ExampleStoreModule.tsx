/**
 * Example Store Module Component
 *
 * Wraps ExampleStorePage for the module system
 */

import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { ModuleComponentProps } from "../types";

const ExampleStorePage = lazy(() =>
  import("../../pages/ExampleStorePage").then((m) => ({
    default: m.ExampleStorePage,
  })),
);

export default function ExampleStoreModule({
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
      <ExampleStorePage onClose={() => onClose()} />
    </Suspense>
  );
}
