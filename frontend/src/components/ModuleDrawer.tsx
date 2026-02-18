/**
 * ModuleDrawer - UI for accessing pluggable modules
 *
 * Shows available modules for current stage as a sidebar or action buttons
 */

import { useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { clsx } from "clsx";
import type { OntosModule, ModuleContext } from "../modules/types";

interface ModuleDrawerProps {
  modules: OntosModule[];
  context: ModuleContext;
  onOpenModule: (moduleId: string, context: ModuleContext) => void;
  position?: "right" | "left";
}

export function ModuleDrawer({
  modules,
  context,
  onOpenModule,
  position = "right",
}: ModuleDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (modules.length === 0) return null;

  return (
    <>
      {/* Collapsed: Icon buttons */}
      {!isExpanded && (
        <div
          className={clsx(
            "fixed top-20 z-30 flex flex-col gap-2 p-2 bg-white border border-db-gray-200 rounded-lg shadow-lg",
            position === "right" ? "right-4" : "left-4"
          )}
        >
          {modules.map((module) => {
            const Icon = module.icon;
            const canActivate =
              !module.hooks?.canActivate ||
              module.hooks.canActivate(context);

            return (
              <button
                key={module.id}
                onClick={() => {
                  if (canActivate) {
                    onOpenModule(module.id, context);
                  }
                }}
                disabled={!canActivate}
                className={clsx(
                  "p-3 rounded-lg transition-all group relative",
                  canActivate
                    ? "bg-white hover:bg-indigo-50 border border-db-gray-200 hover:border-indigo-300"
                    : "bg-db-gray-50 border border-db-gray-100 cursor-not-allowed opacity-50"
                )}
                title={module.name}
              >
                <Icon
                  className={clsx(
                    "w-5 h-5",
                    canActivate ? "text-indigo-600" : "text-db-gray-400"
                  )}
                />

                {/* Tooltip */}
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-db-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {module.name}
                </div>
              </button>
            );
          })}

          {/* Expand button */}
          <button
            onClick={() => setIsExpanded(true)}
            className="p-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            title="Show module details"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Expanded: Full module list */}
      {isExpanded && (
        <div
          className={clsx(
            "fixed top-0 bottom-0 z-40 w-80 bg-white border-l border-db-gray-200 shadow-xl flex flex-col",
            position === "right" ? "right-0" : "left-0"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-db-gray-200">
            <h2 className="font-semibold text-db-gray-900">Modules</h2>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 hover:bg-db-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Module list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {modules.map((module) => {
              const Icon = module.icon;
              const canActivate =
                !module.hooks?.canActivate ||
                module.hooks.canActivate(context);

              return (
                <button
                  key={module.id}
                  onClick={() => {
                    if (canActivate) {
                      onOpenModule(module.id, context);
                      setIsExpanded(false);
                    }
                  }}
                  disabled={!canActivate}
                  className={clsx(
                    "w-full p-4 rounded-lg border text-left transition-all",
                    canActivate
                      ? "bg-white hover:bg-indigo-50 border-db-gray-200 hover:border-indigo-300"
                      : "bg-db-gray-50 border-db-gray-100 cursor-not-allowed opacity-50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={clsx(
                        "p-2 rounded-lg",
                        canActivate
                          ? "bg-indigo-100 text-indigo-600"
                          : "bg-db-gray-100 text-db-gray-400"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-db-gray-900">
                        {module.name}
                      </h3>
                      <p className="text-sm text-db-gray-500 mt-0.5">
                        {module.description}
                      </p>

                      {!canActivate && (
                        <p className="text-xs text-amber-600 mt-2">
                          Not available in current context
                        </p>
                      )}

                      {module.categories && module.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {module.categories.map((cat) => (
                            <span
                              key={cat}
                              className="px-2 py-0.5 bg-db-gray-100 text-db-gray-600 text-xs rounded-full"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </>
  );
}

/**
 * Quick action button for a specific module
 * Shows inline in stage content
 */
interface ModuleQuickActionProps {
  module: OntosModule;
  context: ModuleContext;
  onOpen: () => void;
  variant?: "primary" | "secondary";
}

export function ModuleQuickAction({
  module,
  context,
  onOpen,
  variant = "primary",
}: ModuleQuickActionProps) {
  const Icon = module.icon;
  const canActivate =
    !module.hooks?.canActivate || module.hooks.canActivate(context);

  if (!canActivate) return null;

  return (
    <button
      onClick={onOpen}
      className={clsx(
        "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
        variant === "primary"
          ? "bg-indigo-600 text-white hover:bg-indigo-700"
          : "bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50"
      )}
    >
      <Icon className="w-4 h-4" />
      {module.name}
    </button>
  );
}
