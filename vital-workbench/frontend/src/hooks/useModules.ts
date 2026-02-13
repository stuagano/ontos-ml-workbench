/**
 * Hook for accessing and managing modules
 */

import { useState, useCallback, useMemo } from "react";
import { getModulesForStage, getModuleById } from "../modules/registry";
import type { ModuleContext } from "../modules/types";
import type { PipelineStage } from "../types";

interface UseModulesOptions {
  stage?: PipelineStage;
}

interface ModuleState {
  isOpen: boolean;
  activeModuleId: string | null;
  context: ModuleContext | null;
}

export function useModules(options?: UseModulesOptions) {
  const [state, setState] = useState<ModuleState>({
    isOpen: false,
    activeModuleId: null,
    context: null,
  });

  // Get modules for current stage
  const availableModules = useMemo(() => {
    if (!options?.stage) return [];
    return getModulesForStage(options.stage);
  }, [options?.stage]);

  // Currently active module
  const activeModule = useMemo(() => {
    if (!state.activeModuleId) return null;
    return getModuleById(state.activeModuleId);
  }, [state.activeModuleId]);

  /**
   * Open a module with context
   */
  const openModule = useCallback(
    async (moduleId: string, context: ModuleContext = {} as ModuleContext) => {
      const module = getModuleById(moduleId);
      if (!module) {
        console.error(`Module not found: ${moduleId}`);
        return;
      }

      // Check if module can be activated
      if (module.hooks?.canActivate && !module.hooks.canActivate(context)) {
        console.warn(`Module ${moduleId} cannot be activated in current context`);
        return;
      }

      // Call before open hook
      if (module.hooks?.onBeforeOpen) {
        const shouldOpen = await module.hooks.onBeforeOpen(context);
        if (!shouldOpen) return;
      }

      setState({
        isOpen: true,
        activeModuleId: moduleId,
        context,
      });
    },
    []
  );

  /**
   * Close the currently active module
   */
  const closeModule = useCallback(
    (result?: unknown) => {
      if (activeModule?.hooks?.onAfterClose && state.context) {
        activeModule.hooks.onAfterClose(state.context, result);
      }

      setState({
        isOpen: false,
        activeModuleId: null,
        context: null,
      });
    },
    [activeModule, state.context]
  );

  /**
   * Check if a module can be activated
   */
  const canActivateModule = useCallback(
    (moduleId: string, context: ModuleContext): boolean => {
      const module = getModuleById(moduleId);
      if (!module || !module.isEnabled) return false;
      if (!module.hooks?.canActivate) return true;
      return module.hooks.canActivate(context);
    },
    []
  );

  return {
    // Available modules for current stage
    availableModules,

    // Currently active module
    activeModule,
    isOpen: state.isOpen,
    context: state.context,

    // Actions
    openModule,
    closeModule,
    canActivateModule,
  };
}
