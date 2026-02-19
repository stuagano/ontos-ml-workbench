/**
 * Canonical Labels Module
 *
 * Label source data directly for "label once, reuse everywhere"
 */

import { Tag } from "lucide-react";
import type { OntosModule } from "../types";
import CanonicalLabelsModule from "./CanonicalLabelsModule";

export const canonicalLabelsModule: OntosModule = {
  id: "canonical-labels",
  name: "Canonical Labels",
  description: "Label source data directly — label once, reuse everywhere",
  icon: Tag,
  stages: ["label", "curate", "data"],
  component: CanonicalLabelsModule,

  hooks: {
    canActivate: (context) => {
      return !!context.sheetId || !!context.sheetName;
    },
  },

  isEnabled: true,
  categories: ["annotation"],
  version: "1.0.0",
};

export { CanonicalLabelsModule };
