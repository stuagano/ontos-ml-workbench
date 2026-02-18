/**
 * ColumnMappingModal - Maps template variables to sheet columns
 *
 * Designed for ML workflows with clear separation of:
 * - Target Variable (what we're predicting / dependent variable)
 * - Feature Variables (input data / independent variables)
 *
 * Features:
 * - Auto-matches when variable name equals column name
 * - Dropdown selection for manual mapping
 * - Clear visual distinction between target and features
 * - Validates all variables are mapped before proceeding
 */

import { useState, useEffect, useMemo } from "react";
import { X, ArrowRight, Check, AlertCircle, Target, Layers, Sparkles } from "lucide-react";
import { clsx } from "clsx";

export interface SheetColumn {
  name: string;
  type: string;
  category: "text" | "image" | "metadata";
}

interface ColumnMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mapping: Record<string, string>) => void;

  // Template info
  templateName: string;
  promptTemplate: string;

  // ML variable configuration (from template)
  targetColumn?: string | null;
  featureColumns?: string[] | null;

  // Sheet columns organized by category
  sheetColumns: SheetColumn[];

  // Optional: pre-existing mapping (for editing)
  initialMapping?: Record<string, string>;
}

/**
 * Extract {{placeholders}} from a template string
 */
function extractPlaceholders(template: string): string[] {
  const matches = template.match(/\{\{([^}]+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/[{}]/g, "").trim()))];
}

export function ColumnMappingModal({
  isOpen,
  onClose,
  onConfirm,
  templateName,
  promptTemplate,
  targetColumn,
  featureColumns,
  sheetColumns,
  initialMapping,
}: ColumnMappingModalProps) {
  // Extract placeholders from template as fallback
  const templatePlaceholders = useMemo(
    () => extractPlaceholders(promptTemplate),
    [promptTemplate]
  );

  // Use explicit feature/target columns if provided, otherwise fall back to placeholders
  const hasMLConfig = targetColumn || (featureColumns && featureColumns.length > 0);

  // All variables that need mapping
  const allVariables = useMemo(() => {
    if (hasMLConfig) {
      const vars: string[] = [];
      if (featureColumns) vars.push(...featureColumns);
      if (targetColumn) vars.push(targetColumn);
      return [...new Set(vars)];
    }
    return templatePlaceholders;
  }, [hasMLConfig, featureColumns, targetColumn, templatePlaceholders]);

  // Initialize mapping state with auto-matching
  const [mapping, setMapping] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};

    if (initialMapping) {
      Object.assign(initial, initialMapping);
    }

    // Auto-match: if variable name equals column name exactly
    allVariables.forEach((variable) => {
      if (!initial[variable]) {
        const exactMatch = sheetColumns.find((col) => col.name === variable);
        if (exactMatch) {
          initial[variable] = exactMatch.name;
        }
      }
    });

    return initial;
  });

  // Reset mapping when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, string> = {};
      if (initialMapping) {
        Object.assign(initial, initialMapping);
      }
      allVariables.forEach((variable) => {
        if (!initial[variable]) {
          const exactMatch = sheetColumns.find((col) => col.name === variable);
          if (exactMatch) {
            initial[variable] = exactMatch.name;
          }
        }
      });
      setMapping(initial);
    }
  }, [isOpen, allVariables, sheetColumns, initialMapping]);

  // Track unmapped variables
  const unmappedCount = allVariables.filter((v) => !mapping[v]).length;
  const isValid = unmappedCount === 0 && allVariables.length > 0;

  // Update a single mapping
  const updateMapping = (variable: string, columnName: string) => {
    setMapping((prev) => {
      const next = { ...prev };
      if (columnName) {
        next[variable] = columnName;
      } else {
        delete next[variable];
      }
      return next;
    });
  };

  // Auto-match all possible (case-insensitive)
  const autoMatchAll = () => {
    const newMapping = { ...mapping };
    allVariables.forEach((variable) => {
      if (!newMapping[variable]) {
        const match = sheetColumns.find(
          (col) => col.name.toLowerCase() === variable.toLowerCase()
        );
        if (match) {
          newMapping[variable] = match.name;
        }
      }
    });
    setMapping(newMapping);
  };

  // Render a single variable mapping row
  const renderVariableRow = (variable: string, _label: string) => {
    const isMapped = !!mapping[variable];
    const isAutoMapped = isMapped && sheetColumns.some((col) => col.name === variable);

    return (
      <div
        key={variable}
        className={clsx(
          "p-3 rounded-lg border transition-colors",
          isMapped ? "border-green-200 bg-green-50/50" : "border-amber-200 bg-amber-50/50"
        )}
      >
        <div className="flex items-center gap-3">
          {/* Variable name */}
          <div className="flex-1 min-w-0">
            <div className="font-mono text-sm bg-white px-3 py-1.5 rounded border border-db-gray-200 truncate">
              {variable}
            </div>
          </div>

          {/* Arrow */}
          <ArrowRight
            className={clsx(
              "w-4 h-4 flex-shrink-0",
              isMapped ? "text-green-500" : "text-amber-400"
            )}
          />

          {/* Column dropdown */}
          <div className="flex-1 min-w-0">
            <select
              value={mapping[variable] || ""}
              onChange={(e) => updateMapping(variable, e.target.value)}
              className={clsx(
                "w-full px-3 py-1.5 rounded border text-sm",
                isMapped ? "border-green-300 bg-white" : "border-amber-300 bg-white"
              )}
            >
              <option value="">-- Select column --</option>
              {sheetColumns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="flex-shrink-0 w-5">
            {isMapped ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-amber-400" />
            )}
          </div>
        </div>
        {isAutoMapped && (
          <div className="text-xs text-green-600 mt-1 ml-1">Auto-matched</div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-db-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-db-gray-800">
                Configure Data Mapping
              </h2>
              <p className="text-sm text-db-gray-500 mt-1">
                Map variables from <span className="font-medium">{templateName}</span> to your dataset columns
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-db-gray-100 rounded text-db-gray-400 hover:text-db-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Auto-match banner */}
        {allVariables.length > 0 && (
          <div className="px-6 py-2 bg-blue-50 border-b border-blue-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-700 text-sm">
                <Sparkles className="w-4 h-4" />
                <span>
                  {allVariables.length - unmappedCount} of {allVariables.length} auto-matched
                </span>
              </div>
              {unmappedCount > 0 && (
                <button
                  onClick={autoMatchAll}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Try Auto-Match
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mapping content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {hasMLConfig ? (
            <>
              {/* Predicted Column Section */}
              {targetColumn && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-red-100 rounded-lg">
                      <Target className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-db-gray-800">
                        Predicted Column
                      </h3>
                      <p className="text-xs text-db-gray-500">
                        The value the model will learn to predict
                      </p>
                    </div>
                  </div>
                  {renderVariableRow(targetColumn, "Predicted")}
                </div>
              )}

              {/* Training Columns Section */}
              {featureColumns && featureColumns.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                      <Layers className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-db-gray-800">
                        Training Columns
                      </h3>
                      <p className="text-xs text-db-gray-500">
                        Input data used to make predictions ({featureColumns.length})
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {featureColumns.map((feature) =>
                      renderVariableRow(feature, "Training")
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Fallback: Show placeholders from template */
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-purple-100 rounded-lg">
                  <Layers className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-db-gray-800">
                    Template Variables
                  </h3>
                  <p className="text-xs text-db-gray-500">
                    Map placeholders to your sheet columns
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {templatePlaceholders.map((placeholder) =>
                  renderVariableRow(placeholder, "Variable")
                )}
              </div>
            </div>
          )}

          {allVariables.length === 0 && (
            <div className="text-center py-8 text-db-gray-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No variables to map</p>
              <p className="text-sm mt-1">
                Template has no placeholders or ML configuration
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-db-gray-200 flex items-center justify-between flex-shrink-0 bg-db-gray-50">
          <div className="text-sm">
            {isValid ? (
              <span className="text-green-600 flex items-center gap-2">
                <Check className="w-4 h-4" />
                All variables mapped
              </span>
            ) : allVariables.length === 0 ? (
              <span className="text-db-gray-500">No mapping needed</span>
            ) : (
              <span className="text-amber-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {unmappedCount} variable{unmappedCount > 1 ? "s" : ""} need mapping
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-db-gray-700 hover:bg-db-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(mapping)}
              disabled={!isValid && allVariables.length > 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              Confirm & Generate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Utility function to extract placeholders - exported for use in other components
 */
export { extractPlaceholders };
