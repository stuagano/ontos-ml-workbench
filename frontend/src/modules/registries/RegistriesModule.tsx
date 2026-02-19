/**
 * Registries Module Component
 *
 * Wraps RegistriesPage for the module system
 */

import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { ModuleComponentProps } from "../types";

const RegistriesPage = lazy(() =>
  import("../../pages/RegistriesPage").then((m) => ({
    default: m.RegistriesPage,
  })),
);

export default function RegistriesModule({ onClose }: ModuleComponentProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-db-orange" />
        </div>
      }
    >
      <RegistriesPage onClose={onClose} />
    </Suspense>
  );
}
