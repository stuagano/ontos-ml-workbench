/**
 * DataQualityPage — Standalone Data Quality tool.
 *
 * Full-page overlay accessible from the Tools sidebar. Lets users pick a sheet,
 * profile the underlying table, get AI-suggested or AI-generated quality rules,
 * run checks, and browse historical results — all powered by real DQX backend
 * endpoints.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  AlertCircle,
  BarChart3,
  Play,
  Wand2,
  Database,
  ChevronRight,
  X,
  Clock,
  FileText,
  Download,
} from "lucide-react";
import { clsx } from "clsx";
import { listSheets } from "../services/api";
import {
  profileSheet,
  runChecks,
  generateRules,
  getQualityResults,
} from "../services/data-quality";
import type { Sheet } from "../types";
import type {
  ProfileResult,
  RunChecksResult,
  DQCheck,
  QualityResults,
} from "../types/data-quality";

// ============================================================================
// Sub-components
// ============================================================================

function ScoreGauge({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s >= 90) return "text-green-600";
    if (s >= 70) return "text-amber-600";
    return "text-red-600";
  };
  const getLabel = (s: number) => {
    if (s >= 90) return "Excellent";
    if (s >= 70) return "Good";
    if (s >= 50) return "Fair";
    return "Poor";
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="56" cy="56" r="48" fill="none" stroke="#e5e7eb" strokeWidth="7" />
          <circle
            cx="56"
            cy="56"
            r="48"
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            strokeDasharray={`${2 * Math.PI * 48}`}
            strokeDashoffset={`${2 * Math.PI * 48 * (1 - score / 100)}`}
            className={clsx("transition-all duration-700", getColor(score))}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={clsx("text-2xl font-bold", getColor(score))}>{score}</div>
          <div className="text-[10px] text-db-gray-400">/ 100</div>
        </div>
      </div>
      <div className={clsx("mt-1 text-xs font-medium", getColor(score))}>
        {getLabel(score)}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "pass" | "warn" | "fail" | "info" }) {
  const cfg = {
    pass: { icon: CheckCircle, cls: "bg-green-100 text-green-700", label: "Pass" },
    warn: { icon: AlertTriangle, cls: "bg-amber-100 text-amber-700", label: "Warning" },
    fail: { icon: XCircle, cls: "bg-red-100 text-red-700", label: "Failed" },
    info: { icon: AlertCircle, cls: "bg-blue-100 text-blue-700", label: "Info" },
  }[status];
  const Icon = cfg.icon;

  return (
    <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", cfg.cls)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function CheckCard({ check, failures }: { check: DQCheck; failures?: number }) {
  const status: "pass" | "warn" | "fail" | "info" =
    failures === undefined ? "info" : failures === 0 ? "pass" : "fail";

  return (
    <div
      className={clsx(
        "rounded-lg border p-4",
        status === "pass" ? "border-green-200 bg-green-50/50" :
        status === "fail" ? "border-red-200 bg-red-50/50" :
        "border-db-gray-200 bg-white"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <FileText className="w-4 h-4 text-db-gray-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-sm text-db-gray-900 truncate">
              {check.name || "Unnamed check"}
            </p>
            {check.check && (
              <p className="text-xs text-db-gray-500 font-mono mt-1 truncate">
                {check.check}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {failures !== undefined && (
            <span className="text-xs text-db-gray-500">{failures} failures</span>
          )}
          <StatusBadge status={status} />
        </div>
      </div>
      {check.criticality && (
        <div className="mt-2 ml-7">
          <span
            className={clsx(
              "text-[10px] font-medium px-1.5 py-0.5 rounded",
              check.criticality === "error"
                ? "bg-red-100 text-red-600"
                : "bg-amber-100 text-amber-600"
            )}
          >
            {check.criticality}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

interface DataQualityPageProps {
  onClose: () => void;
}

export function DataQualityPage({ onClose }: DataQualityPageProps) {
  // Sheet list
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [sheetsLoading, setSheetsLoading] = useState(true);

  // Selected sheet
  const [selectedSheet, setSelectedSheet] = useState<Sheet | null>(null);

  // Profile + checks state
  const [profile, setProfile] = useState<ProfileResult | null>(null);
  const [checks, setChecks] = useState<DQCheck[]>([]);
  const [results, setResults] = useState<RunChecksResult | null>(null);
  const [history, setHistory] = useState<QualityResults | null>(null);

  // Loading flags
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Load sheets on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listSheets({ status: "active", limit: 200 });
        if (!cancelled) setSheets(data.sheets);
      } catch {
        if (!cancelled) setError("Failed to load sheets");
      } finally {
        if (!cancelled) setSheetsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load history when a sheet is selected
  const loadHistory = useCallback(async (sheetId: string) => {
    setIsHistoryLoading(true);
    try {
      const h = await getQualityResults(sheetId);
      setHistory(h);
    } catch {
      // Non-fatal — history may not exist yet
      setHistory(null);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  const selectSheet = useCallback((sheet: Sheet) => {
    setSelectedSheet(sheet);
    setProfile(null);
    setChecks([]);
    setResults(null);
    setHistory(null);
    setError(null);
    loadHistory(sheet.id);
  }, [loadHistory]);

  // Actions
  const handleProfile = async () => {
    if (!selectedSheet) return;
    setIsProfileLoading(true);
    setError(null);
    try {
      const result = await profileSheet(selectedSheet.id);
      setProfile(result);
      if (result.suggested_checks.length > 0) {
        setChecks(result.suggested_checks);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile failed");
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleGenerateRules = async () => {
    if (!selectedSheet) return;
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateRules(
        selectedSheet.id,
        `Generate data quality rules for ${selectedSheet.name}`,
      );
      setChecks(result.checks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rule generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRunChecks = async () => {
    if (!selectedSheet || checks.length === 0) return;
    setIsRunning(true);
    setError(null);
    try {
      const result = await runChecks(selectedSheet.id, checks);
      setResults(result);
      // Refresh history
      loadHistory(selectedSheet.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check run failed");
    } finally {
      setIsRunning(false);
    }
  };

  const handleExportReport = () => {
    const report = { profile, checks, results, history };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dqx-report-${selectedSheet?.name || "unknown"}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Derived
  const overallScore = results
    ? Math.round(results.pass_rate * 100)
    : history?.pass_rate != null
      ? Math.round(history.pass_rate * 100)
      : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="bg-white border-b border-db-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Shield className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-db-gray-900">Data Quality</h1>
              <p className="text-sm text-db-gray-500">
                Profile, validate, and monitor dataset quality
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-db-gray-400 hover:text-db-gray-700 rounded-lg hover:bg-db-gray-100"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content: sidebar + main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sheet list sidebar */}
        <div className="w-72 border-r border-db-gray-200 bg-white flex flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b border-db-gray-100">
            <p className="text-xs font-medium text-db-gray-500 uppercase tracking-wider">
              Sheets
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sheetsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-db-gray-400" />
              </div>
            ) : sheets.length === 0 ? (
              <p className="text-sm text-db-gray-400 text-center py-8">No sheets found</p>
            ) : (
              sheets.map((sheet) => (
                <button
                  key={sheet.id}
                  onClick={() => selectSheet(sheet)}
                  className={clsx(
                    "w-full text-left px-4 py-3 border-b border-db-gray-50 transition-colors",
                    selectedSheet?.id === sheet.id
                      ? "bg-teal-50 border-l-2 border-l-teal-500"
                      : "hover:bg-db-gray-50 border-l-2 border-l-transparent"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-db-gray-900 truncate">
                        {sheet.name}
                      </p>
                      <p className="text-xs text-db-gray-400 truncate mt-0.5">
                        {sheet.source_table || sheet.source_volume || "—"}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-db-gray-300 flex-shrink-0 ml-2" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main panel */}
        <div className="flex-1 overflow-y-auto bg-db-gray-50 p-6">
          {!selectedSheet ? (
            <div className="flex flex-col items-center justify-center h-full text-db-gray-400">
              <Database className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium text-db-gray-500">Select a Sheet</p>
              <p className="text-sm mt-1">
                Choose a sheet from the sidebar to profile and validate its data quality
              </p>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Sheet header */}
              <div className="bg-white rounded-lg border border-db-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-db-gray-900">
                      {selectedSheet.name}
                    </h2>
                    <p className="text-sm text-db-gray-500 font-mono mt-0.5">
                      {selectedSheet.source_table || selectedSheet.source_volume || "No source configured"}
                    </p>
                  </div>
                  {overallScore !== null && <ScoreGauge score={overallScore} />}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleProfile}
                  disabled={isProfileLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-db-gray-300 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {isProfileLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <BarChart3 className="w-4 h-4" />
                  )}
                  Profile & Suggest Rules
                </button>

                <button
                  onClick={handleGenerateRules}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-db-gray-300 rounded-lg hover:bg-db-gray-50 disabled:opacity-50 text-sm font-medium"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  AI Generate Rules
                </button>

                <button
                  onClick={handleRunChecks}
                  disabled={isRunning || checks.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-db-gray-300 rounded-lg hover:bg-db-gray-50 disabled:opacity-50 text-sm font-medium"
                >
                  {isRunning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Run Checks ({checks.length})
                </button>

                {(results || profile) && (
                  <button
                    onClick={handleExportReport}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-db-gray-300 rounded-lg hover:bg-db-gray-50 text-sm font-medium ml-auto"
                  >
                    <Download className="w-4 h-4" />
                    Export Report
                  </button>
                )}
              </div>

              {/* Profile summary */}
              {profile && (
                <div className="bg-white rounded-lg border border-db-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-db-gray-700 mb-3 flex items-center gap-2">
                    <Database className="w-4 h-4 text-teal-600" />
                    Data Profile
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-db-gray-500">Rows</span>
                      <p className="text-2xl font-bold text-db-gray-900 mt-0.5">
                        {profile.row_count.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-db-gray-500">Columns</span>
                      <p className="text-2xl font-bold text-db-gray-900 mt-0.5">
                        {profile.column_count}
                      </p>
                    </div>
                    <div>
                      <span className="text-db-gray-500">Suggested Checks</span>
                      <p className="text-2xl font-bold text-teal-700 mt-0.5">
                        {checks.length}
                      </p>
                    </div>
                    <div>
                      <span className="text-db-gray-500">Source</span>
                      <p className="font-mono text-xs text-db-gray-600 mt-1 truncate">
                        {profile.table}
                      </p>
                    </div>
                  </div>

                  {/* Column detail table */}
                  {profile.columns.length > 0 && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-db-gray-200">
                            <th className="text-left py-2 pr-4 text-xs font-medium text-db-gray-500">Column</th>
                            <th className="text-left py-2 pr-4 text-xs font-medium text-db-gray-500">Type</th>
                            <th className="text-center py-2 text-xs font-medium text-db-gray-500">Nullable</th>
                          </tr>
                        </thead>
                        <tbody>
                          {profile.columns.map((col) => (
                            <tr key={col.name} className="border-b border-db-gray-50">
                              <td className="py-1.5 pr-4 font-mono text-db-gray-800">{col.name}</td>
                              <td className="py-1.5 pr-4 text-db-gray-500">{col.type}</td>
                              <td className="py-1.5 text-center">
                                {col.nullable ? (
                                  <span className="text-amber-500 text-xs">yes</span>
                                ) : (
                                  <span className="text-green-600 text-xs">no</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Staged checks (before running) */}
              {checks.length > 0 && !results && (
                <div className="bg-white rounded-lg border border-db-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-db-gray-700 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-teal-600" />
                    Quality Checks to Run ({checks.length})
                  </h3>
                  <div className="space-y-2">
                    {checks.map((check, idx) => (
                      <CheckCard key={idx} check={check} />
                    ))}
                  </div>
                </div>
              )}

              {/* Results */}
              {results && (
                <div className="space-y-4">
                  {/* Summary cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg border border-db-gray-200 p-4 text-center">
                      <p className="text-2xl font-bold text-db-gray-900">
                        {results.total_rows.toLocaleString()}
                      </p>
                      <p className="text-xs text-db-gray-500 mt-1">Total Rows</p>
                    </div>
                    <div className="bg-white rounded-lg border border-green-200 p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {results.passed_rows.toLocaleString()}
                      </p>
                      <p className="text-xs text-db-gray-500 mt-1">Passed</p>
                    </div>
                    <div className="bg-white rounded-lg border border-red-200 p-4 text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {results.failed_rows.toLocaleString()}
                      </p>
                      <p className="text-xs text-db-gray-500 mt-1">Failed</p>
                    </div>
                  </div>

                  {/* Per-check results */}
                  {results.column_results.length > 0 && (
                    <div className="bg-white rounded-lg border border-db-gray-200 p-5">
                      <h3 className="text-sm font-semibold text-db-gray-700 mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-teal-600" />
                        Check Results
                      </h3>
                      <div className="space-y-2">
                        {results.column_results.map((cr, idx) => {
                          const matchedCheck = checks.find(
                            (c) => c.name === cr.check
                          ) || { name: cr.check };
                          return (
                            <CheckCard
                              key={idx}
                              check={matchedCheck}
                              failures={cr.failures}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Run history */}
              {history && history.results.length > 0 && (
                <div className="bg-white rounded-lg border border-db-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-db-gray-700 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-600" />
                    Run History
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-db-gray-200">
                          <th className="text-left py-2 pr-4 text-xs font-medium text-db-gray-500">Run Time</th>
                          <th className="text-right py-2 pr-4 text-xs font-medium text-db-gray-500">Total Rows</th>
                          <th className="text-right py-2 pr-4 text-xs font-medium text-db-gray-500">Passed</th>
                          <th className="text-right py-2 pr-4 text-xs font-medium text-db-gray-500">Failed</th>
                          <th className="text-right py-2 text-xs font-medium text-db-gray-500">Pass Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.results.map((run: Record<string, unknown>, idx: number) => {
                          const passRate = run.pass_rate as number | undefined;
                          return (
                            <tr key={idx} className="border-b border-db-gray-50">
                              <td className="py-2 pr-4 text-db-gray-600">
                                {run.run_at ? new Date(run.run_at as string).toLocaleString() : "—"}
                              </td>
                              <td className="py-2 pr-4 text-right font-medium">
                                {(run.total_rows as number | undefined)?.toLocaleString() ?? "—"}
                              </td>
                              <td className="py-2 pr-4 text-right text-green-600">
                                {(run.passed_rows as number | undefined)?.toLocaleString() ?? "—"}
                              </td>
                              <td className="py-2 pr-4 text-right text-red-600">
                                {(run.failed_rows as number | undefined)?.toLocaleString() ?? "—"}
                              </td>
                              <td className="py-2 text-right">
                                {passRate != null ? (
                                  <span
                                    className={clsx(
                                      "font-medium",
                                      passRate >= 0.95 ? "text-green-600" :
                                      passRate >= 0.8 ? "text-amber-600" :
                                      "text-red-600"
                                    )}
                                  >
                                    {(passRate * 100).toFixed(1)}%
                                  </span>
                                ) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {isHistoryLoading && (
                <div className="flex items-center gap-2 text-sm text-db-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading history...
                </div>
              )}

              {/* Empty state — no profile, no results, no history */}
              {!profile && !results && !history?.results.length && !isHistoryLoading && !error && (
                <div className="text-center py-12 text-db-gray-400">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">
                    Click <strong>Profile & Suggest Rules</strong> to analyze this sheet's data quality
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
