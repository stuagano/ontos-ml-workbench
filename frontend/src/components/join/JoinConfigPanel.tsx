/**
 * JoinConfigPanel — orchestrator for multi-source join configuration.
 *
 * Staging-based workflow:
 *   1. User adds a secondary source → backend suggests join keys
 *   2. User clicks suggestions to stage them (multi-select for composite keys)
 *   3. User reviews staged mappings, picks join type
 *   4. User clicks "Preview Join" to execute and see results
 *   5. On satisfaction, config is persisted to the Sheet
 */
import { useState, useCallback } from "react";
import {
  Plus,
  Loader2,
  Link2,
  Database,
  Play,
  X,
  ArrowLeftRight,
} from "lucide-react";
import { clsx } from "clsx";
import { UCBrowser, type UCItem } from "../UCBrowser";
import { JoinKeySuggestions, suggestionKey } from "./JoinKeySuggestions";
import { JoinPreviewTable } from "./JoinPreviewTable";
import { suggestJoinKeys, previewJoin } from "../../services/api";
import { useToast } from "../Toast";
import type {
  MultiDatasetConfig,
  DataSourceConfig,
  JoinKeyMapping,
  JoinKeySuggestion,
  PreviewJoinResponse,
} from "../../types";

interface JoinConfigPanelProps {
  /** The primary table path (catalog.schema.table) */
  primaryTable: string;
  /** Callback when join config changes (to persist on Sheet) */
  onConfigChange: (config: MultiDatasetConfig | null) => void;
  /** Existing join config (loaded from sheet.join_config) */
  initialConfig?: MultiDatasetConfig | null;
}

function makeDataSourceConfig(
  fullPath: string,
  role: "primary" | "secondary",
  alias: string,
): DataSourceConfig {
  const parts = fullPath.split(".");
  return {
    source: {
      type: "table",
      catalog: parts[0] || "",
      schema: parts[1] || "",
      name: parts[2] || parts[parts.length - 1] || "",
      fullPath,
    },
    role,
    alias,
    joinKeys: [],
  };
}

export function JoinConfigPanel({
  primaryTable,
  onConfigChange,
  initialConfig,
}: JoinConfigPanelProps) {
  const toast = useToast();

  // Sources
  const [sources, setSources] = useState<DataSourceConfig[]>(
    initialConfig?.sources || [makeDataSourceConfig(primaryTable, "primary", "t0")]
  );
  const [showBrowser, setShowBrowser] = useState(false);

  // Suggestion state
  const [suggestions, setSuggestions] = useState<JoinKeySuggestion[]>([]);
  const [isSuggestingKeys, setIsSuggestingKeys] = useState(false);

  // Staged key mappings (multi-select for composite keys)
  const [stagedMappings, setStagedMappings] = useState<Map<string, JoinKeyMapping>>(
    () => {
      // Restore from initialConfig if present
      const map = new Map<string, JoinKeyMapping>();
      if (initialConfig?.joinConfig?.keyMappings) {
        for (const km of initialConfig.joinConfig.keyMappings) {
          const key = `${km.sourceColumn}__${km.targetColumn}`;
          map.set(key, km);
        }
      }
      return map;
    }
  );

  // Join type
  const [joinType, setJoinType] = useState<"inner" | "left" | "full">(
    initialConfig?.joinConfig?.joinType || "inner"
  );

  // Preview state
  const [previewResult, setPreviewResult] = useState<PreviewJoinResponse | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewStale, setPreviewStale] = useState(false);

  const hasSecondary = sources.length > 1;
  const hasStagedKeys = stagedMappings.size > 0;

  // ---------------------------------------------------------------
  // Suggestions
  // ---------------------------------------------------------------

  const triggerSuggestions = useCallback(
    async (targetTable: string) => {
      setIsSuggestingKeys(true);
      setSuggestions([]);
      setStagedMappings(new Map());
      setPreviewResult(null);
      setPreviewStale(false);

      try {
        const result = await suggestJoinKeys({
          source_table: primaryTable,
          target_table: targetTable,
        });
        setSuggestions(result.suggestions);
      } catch (err) {
        toast.error(
          "Join key analysis failed",
          err instanceof Error ? err.message : "Unknown error"
        );
      } finally {
        setIsSuggestingKeys(false);
      }
    },
    [primaryTable]
  );

  // ---------------------------------------------------------------
  // Source management
  // ---------------------------------------------------------------

  const handleAddSource = (item: UCItem) => {
    if (item.type !== "table") return;

    const targetTable = `${item.catalogName}.${item.schemaName}.${item.name}`;
    const alias = `t${sources.length}`;
    const newSource = makeDataSourceConfig(targetTable, "secondary", alias);

    const updated = [...sources, newSource];
    setSources(updated);
    setShowBrowser(false);

    triggerSuggestions(targetTable);
  };

  const handleRemoveSource = (index: number) => {
    const updated = sources.filter((_, i) => i !== index);
    setSources(updated);
    setSuggestions([]);
    setStagedMappings(new Map());
    setPreviewResult(null);
    setPreviewStale(false);

    if (updated.length <= 1) {
      onConfigChange(null);
    }
  };

  // ---------------------------------------------------------------
  // Staging: toggle suggestions into/out of staged mappings
  // ---------------------------------------------------------------

  const handleToggleSuggestion = (suggestion: JoinKeySuggestion) => {
    const key = suggestionKey(suggestion);
    const next = new Map(stagedMappings);

    if (next.has(key)) {
      next.delete(key);
    } else {
      const secondarySource = sources[sources.length - 1];
      next.set(key, {
        sourceAlias: "t0",
        sourceColumn: suggestion.source_column,
        targetAlias: secondarySource?.alias || `t${sources.length - 1}`,
        targetColumn: suggestion.target_column,
      });
    }

    setStagedMappings(next);
    setPreviewStale(true); // staged keys changed → preview is stale
  };

  const handleRemoveMapping = (key: string) => {
    const next = new Map(stagedMappings);
    next.delete(key);
    setStagedMappings(next);
    setPreviewStale(true);

    if (next.size === 0) {
      setPreviewResult(null);
    }
  };

  // ---------------------------------------------------------------
  // Preview (explicit button click)
  // ---------------------------------------------------------------

  const handlePreviewJoin = async () => {
    if (stagedMappings.size === 0) {
      toast.error("No join keys selected", "Select at least one join key pair before previewing.");
      return;
    }

    const keyMappings = Array.from(stagedMappings.values());

    const config: MultiDatasetConfig = {
      sources,
      joinConfig: {
        keyMappings,
        joinType,
      },
    };

    onConfigChange(config);
    setIsPreviewLoading(true);
    setPreviewStale(false);

    try {
      const result = await previewJoin({
        sources: config.sources.map((s) => ({
          sourceTable: s.source.fullPath,
          role: s.role,
          alias: s.alias,
          joinKeys: s.joinKeys,
          selectedColumns: s.selectedColumns,
        })),
        joinConfig: {
          keyMappings: config.joinConfig.keyMappings,
          joinType: config.joinConfig.joinType,
          timeWindow: config.joinConfig.timeWindow,
        },
        limit: 50,
      });
      setPreviewResult(result);
    } catch (err) {
      toast.error(
        "Join preview failed",
        err instanceof Error ? err.message : "Unknown error"
      );
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Join type change marks preview as stale (user must re-click Preview)
  const handleJoinTypeChange = (type: "inner" | "left" | "full") => {
    setJoinType(type);
    setPreviewStale(true);
  };

  // ---------------------------------------------------------------
  // Collapsed state: no secondary sources
  // ---------------------------------------------------------------

  if (!hasSecondary && !showBrowser) {
    return (
      <div className="bg-white rounded-lg border border-dashed border-db-gray-300 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link2 className="w-5 h-5 text-db-gray-400" />
            <div>
              <h3 className="font-medium text-db-gray-800">
                Multi-Source Join
              </h3>
              <p className="text-sm text-db-gray-500">
                Join additional tables to enrich your dataset
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowBrowser(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Data Source
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------
  // Full panel
  // ---------------------------------------------------------------

  return (
    <div className="bg-white rounded-lg border border-db-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-db-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-db-gray-900 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-blue-600" />
              Join Configuration
            </h2>
            <p className="text-sm text-db-gray-600 mt-0.5">
              {sources.length} source{sources.length !== 1 ? "s" : ""}
              {hasStagedKeys && ` · ${stagedMappings.size} key${stagedMappings.size !== 1 ? "s" : ""} staged`}
            </p>
          </div>
          <button
            onClick={() => setShowBrowser(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
          >
            <Plus className="w-4 h-4" />
            Add Source
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Source cards */}
        <div className="grid gap-3 md:grid-cols-2">
          {sources.map((src, idx) => (
            <div
              key={idx}
              className={clsx(
                "rounded-lg border p-4",
                idx === 0
                  ? "border-blue-300 bg-blue-50/50"
                  : "border-db-gray-200 bg-white"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-db-gray-500" />
                  <span className="font-medium text-sm text-db-gray-900 truncate">
                    {src.source?.name || src.alias || `Source ${idx}`}
                  </span>
                  <span
                    className={clsx(
                      "px-2 py-0.5 text-[10px] font-medium rounded-full",
                      idx === 0
                        ? "bg-blue-100 text-blue-700"
                        : "bg-db-gray-100 text-db-gray-600"
                    )}
                  >
                    {idx === 0 ? "Primary" : "Secondary"}
                  </span>
                </div>
                {idx > 0 && (
                  <button
                    onClick={() => handleRemoveSource(idx)}
                    className="text-db-gray-400 hover:text-red-500 text-xs"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-db-gray-500 font-mono truncate">
                {src.source?.fullPath}
              </p>
            </div>
          ))}
        </div>

        {/* Join key suggestions (multi-select) */}
        {hasSecondary && (
          <JoinKeySuggestions
            suggestions={suggestions}
            selectedKeys={new Set(stagedMappings.keys())}
            onToggle={handleToggleSuggestion}
            isLoading={isSuggestingKeys}
          />
        )}

        {/* Staged mappings summary + join type + Preview button */}
        {hasStagedKeys && (
          <div className="space-y-4">
            {/* Staged key pills */}
            <div>
              <p className="text-sm font-medium text-db-gray-700 mb-2">
                Staged Join Keys
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from(stagedMappings.entries()).map(([key, km]) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-800"
                  >
                    <span className="font-mono text-xs">{km.sourceColumn}</span>
                    <ArrowLeftRight className="w-3 h-3 text-blue-400" />
                    <span className="font-mono text-xs">{km.targetColumn}</span>
                    <button
                      onClick={() => handleRemoveMapping(key)}
                      className="ml-1 p-0.5 hover:bg-blue-200 rounded-full transition-colors"
                      title="Remove this key"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Join type selector */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-db-gray-700">Join Type</span>
              <div className="flex items-center gap-1 bg-db-gray-100 rounded-lg p-0.5">
                {(["inner", "left", "full"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleJoinTypeChange(type)}
                    className={clsx(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                      joinType === type
                        ? "bg-white shadow-sm text-db-gray-900"
                        : "text-db-gray-500 hover:text-db-gray-700"
                    )}
                  >
                    {type === "full" ? "FULL OUTER" : type.toUpperCase()}
                  </button>
                ))}
              </div>
              <span className="text-xs text-db-gray-400">
                {joinType === "inner" && "Only rows matching in both tables"}
                {joinType === "left" && "All primary rows, matched secondary where available"}
                {joinType === "full" && "All rows from both tables"}
              </span>
            </div>

            {/* Preview button */}
            <button
              onClick={handlePreviewJoin}
              disabled={isPreviewLoading}
              className={clsx(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors",
                previewStale || !previewResult
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-db-gray-100 text-db-gray-700 hover:bg-db-gray-200",
                isPreviewLoading && "opacity-60 cursor-not-allowed"
              )}
            >
              {isPreviewLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running preview...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  {previewStale ? "Re-run Preview" : previewResult ? "Preview Again" : "Preview Join"}
                </>
              )}
            </button>
          </div>
        )}

        {/* Preview results */}
        {previewResult && !previewStale && (
          <JoinPreviewTable
            rows={previewResult.rows}
            totalRows={previewResult.total_rows}
            matchStats={previewResult.match_stats}
            generatedSql={previewResult.generated_sql}
            joinType={joinType}
            onJoinTypeChange={handleJoinTypeChange}
            isLoading={isPreviewLoading}
          />
        )}

        {/* Stale indicator */}
        {previewResult && previewStale && (
          <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            Join configuration changed. Click <strong>Re-run Preview</strong> to see updated results.
          </div>
        )}
      </div>

      {/* UCBrowser modal */}
      {showBrowser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-db-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Add Data Source</h3>
                <p className="text-sm text-db-gray-500">
                  Select a Unity Catalog table to join with your primary dataset
                </p>
              </div>
              <button
                onClick={() => setShowBrowser(false)}
                className="p-1 hover:bg-db-gray-100 rounded text-db-gray-500"
              >
                &times;
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <UCBrowser onSelect={handleAddSource} filter={["table"]} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
