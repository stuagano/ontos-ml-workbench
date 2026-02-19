/**
 * Registries Module
 *
 * Admin page for browsing/creating/editing Tools, Agents, and Endpoints
 */

import { Settings } from "lucide-react";
import type { OntosModule } from "../types";
import RegistriesModule from "./RegistriesModule";

export const registriesModule: OntosModule = {
  id: "registries",
  name: "Registries",
  description: "Manage tools, agents, and serving endpoints",
  icon: Settings,
  stages: ["deploy"],
  component: RegistriesModule,
  isEnabled: true,
  categories: ["deployment"],
  version: "1.0.0",
};

export { RegistriesModule };
