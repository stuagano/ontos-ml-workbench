/**
 * Labeling Jobs Module
 *
 * Multi-user annotation workflow management
 */

import { ClipboardList } from "lucide-react";
import type { OntosModule } from "../types";
import LabelingModule from "./LabelingModule";

export const labelingModule: OntosModule = {
  id: "labeling-jobs",
  name: "Labeling Jobs",
  description: "Manage labeling workflows and annotation tasks",
  icon: ClipboardList,
  stages: ["label", "curate"],
  component: LabelingModule,
  isEnabled: true,
  categories: ["annotation"],
  version: "1.0.0",
};

export { LabelingModule };
