/**
 * Module System Types
 *
 * Architecture for pluggable capabilities that integrate into pipeline stages
 */

import type { LucideIcon } from "lucide-react";
import type { PipelineStage } from "../types";

/**
 * Context passed to modules when activated
 */
export interface ModuleContext {
  stage: PipelineStage;

  // Resource IDs
  templateId?: string;
  template?: any; // Template object
  assemblyId?: string;
  endpointId?: string;
  sheetId?: string;
  sheetName?: string;

  // Arrays
  feedbackIds?: string[];

  // Modes
  mode?: string;

  // Allow additional properties
  [key: string]: unknown;
}

/**
 * Module lifecycle hooks
 */
export interface ModuleHooks {
  /** Called when entering a stage where this module is available */
  onStageEnter?: (context: ModuleContext) => void;

  /** Called when leaving a stage */
  onStageExit?: (context: ModuleContext) => void;

  /** Determines if module can be activated given current context */
  canActivate?: (context: ModuleContext) => boolean;

  /** Called before module opens */
  onBeforeOpen?: (context: ModuleContext) => Promise<boolean>;

  /** Called after module closes */
  onAfterClose?: (context: ModuleContext, result?: unknown) => void;
}

/**
 * Module configuration schema
 */
export interface ModuleSettings {
  [key: string]: unknown;
}

/**
 * A pluggable module that extends Ontos ML functionality
 */
export interface OntosModule {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Short description */
  description: string;

  /** Icon component */
  icon: LucideIcon;

  /** Which pipeline stages this module is relevant to */
  stages: PipelineStage[];

  /** React component to render when module is opened */
  component: React.ComponentType<ModuleComponentProps>;

  /** Integration hooks */
  hooks?: ModuleHooks;

  /** Module-specific configuration */
  settings?: ModuleSettings;

  /** Whether module is enabled */
  isEnabled: boolean;

  /** Whether module requires initial setup */
  requiresSetup?: boolean;

  /** Categories/tags for filtering */
  categories?: ModuleCategory[];

  /** Module version */
  version?: string;
}

/**
 * Props passed to module components
 */
export interface ModuleComponentProps {
  /** Context when module was opened */
  context: ModuleContext;

  /** Callback to close the module */
  onClose: (result?: unknown) => void;

  /** Whether module is opened in modal or drawer */
  displayMode?: "modal" | "drawer" | "inline";
}

/**
 * Module categories for organization
 */
export type ModuleCategory =
  | "optimization"
  | "annotation"
  | "deployment"
  | "monitoring"
  | "analytics"
  | "integration"
  | "quality";

/**
 * Module display preferences
 */
export interface ModuleDisplayConfig {
  /** Preferred display mode */
  preferredMode: "modal" | "drawer" | "inline";

  /** Size when in modal */
  modalSize?: "sm" | "md" | "lg" | "xl" | "full";

  /** Whether to show in module drawer by default */
  showInDrawer?: boolean;

  /** Whether to show quick action button in stage */
  showQuickAction?: boolean;
}
