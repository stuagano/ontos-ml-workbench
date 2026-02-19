/**
 * Label Sets Module
 *
 * Label set configuration management
 */

import { Layers } from "lucide-react";
import type { OntosModule } from "../types";
import LabelSetsModule from "./LabelSetsModule";

export const labelSetsModule: OntosModule = {
  id: "label-sets",
  name: "Label Sets",
  description: "Manage label set configurations for annotation",
  icon: Layers,
  stages: ["label", "curate"],
  component: LabelSetsModule,
  isEnabled: true,
  categories: ["annotation"],
  version: "1.0.0",
};

export { LabelSetsModule };
