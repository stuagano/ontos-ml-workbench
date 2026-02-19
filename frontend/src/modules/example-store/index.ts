/**
 * Example Store Module
 *
 * Few-shot example management for prompt optimization
 */

import { BookOpen } from "lucide-react";
import type { OntosModule } from "../types";
import ExampleStoreModule from "./ExampleStoreModule";

export const exampleStoreModule: OntosModule = {
  id: "example-store",
  name: "Example Store",
  description: "Dynamic few-shot examples for prompt optimization",
  icon: BookOpen,
  stages: ["train", "improve"],
  component: ExampleStoreModule,
  isEnabled: true,
  categories: ["optimization"],
  version: "1.0.0",
};

export { ExampleStoreModule };
