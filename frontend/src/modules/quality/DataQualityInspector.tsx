/**
 * Data Quality Inspector — Module component.
 *
 * Wired to the real DQX backend endpoints (profile, suggest, run, history).
 * Opened from the module system when a sheet is selected in the DATA stage.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Database,
  FileText,
  Download,
  RefreshCw,
  AlertCircle,
  Play,
  Wand2,
  Loader2,
  Clock,
} from "lucide-react";
import { clsx } from "clsx";
import type { ModuleComponentProps } from "../types";
import {
  profileSheet,
  runChecks,
  generateRules,
  getQualityResults,
} from "../../services/data-quality";
import type {
  ProfileResult,
  RunChecksResult,
  DQCheck,
  QualityResults,
} from "../../types/data-quality";

// ============================================================================
// Sub-components
// ============================================================================

type CheckStatus = "pass" | "warn" | "fail" | "info";

function StatusBadge({ status }: { status: CheckStatus }) {
  const config = {
    pass: { icon: CheckCircle, className: "bg-green-100 text-green-700", label: "Pass" },
    warn: { icon: AlertTriangle, className: "bg-amber-100 text-amber-700", label: "Warning" },
    fail: { icon: XCircle, className: "bg-red-100 text-red-700", label: "Failed" },
    info: { icon: AlertCircle, className: "bg-blue-100 text-blue-700", label: "Info" },
  }[status];

  const Icon = config.icon;

  return (
    <span className={clsx("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", config.className)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function QualityCheckCard({ check, failures }: { check: DQCheck; failures?: number }) {
  const status: CheckStatus =
    failures === undefined
      ? "info"
      : failures === 0
        ? "pass"
        : "fail";

  return (
    <div className={clsx(
      "rounded-lg border-2 p-4 transition-all",
      status === "pass" ? "border-green-200 bg-green-50/50" :
      status === "fail" ? "border-red-200 bg-red-50/50" :
      "border-db-gray-200 bg-white"
    )}>
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-start gap-3 flex-1">
          <FileText className="w-5 h-5 text-db-gray-500 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-db-gray-900">
              {check.name || "Unnamed check"}
            </h4>
            {check.check && (
              <p className="text-xs text-db-gray-500 font-mono mt-1">{check.check}</p>
            )}
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {failures !== undefined && failures > 0 && (
        <div className="flex gap-4 mt-2 text-sm ml-8">
          <div>
            <span className="text-db-gray-500">Failures:</span>
            <span className="ml-2 font-medium text-red-600">{failures.toLocaleString()}</span>
          </div>
        </div>
      )}

      {check.criticality && (
        <div className="mt-2 ml-8">
          <span className={clsx(
            "text-[10px] font-medium px-1.5 py-0.5 rounded",
            check.criticality === "error" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
          )}>
            {check.criticality}
          </span>
        </div>
      )}
    </div>
  );
}

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
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="64" cy="64" r="56" fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="64"
            cy="64"
            r="56"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 56}`}
            strokeDashoffset={`${2 * Math.PI * 56 * (1 - score / 100)}`}
            className={clsx("transition-all duration-1000", getColor(score))}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={clsx("text-3xl font-bold", getColor(score))}>{score}</div>
          <div className="text-xs text-db-gray-500">/ 100</div>
        </div>
      </div>
      <div className={clsx("mt-2 text-sm font-medium", getColor(score))}>
        {getLabel(score)}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DataQualityInspector({ context, onClose }: ModuleComponentProps) {
  const sheetId = context.sheetId as string | undefined;
  const sheetName = (context.sheetName as string) || "Unknown sheet";

  const [profile, setProfile] = useState<ProfileResult | null>(null);
  const [checks, setChecks] = useState<DQCheck[]>([]);
  const [results, setResults] = useState<RunChecksResult | null>(null);
  const [history, setHistory] = useState<QualityResults | null>(null);

  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load history on mount
  const loadHistory = useCallback(async () => {
    if (!sheetId) return;
    try {
      const h = await getQualityResults(sheetId);
      setHistory(h);
    } catch {
      // History may not exist yet — non-fatal
    }
  }, [sheetId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleProfile = async () => {
    if (!sheetId) return;
    setIsProfileLoading(true);
    setError(null);
    try {
      const result = await profileSheet(sheetId);
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
    if (!sheetId) return;
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateRules(sheetId, `Generate data quality rules for ${sheetName}`);
      setChecks(result.checks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rule generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRunChecks = async () => {
    if (!sheetId || checks.length === 0) return;
    setIsRunning(true);
    setError(null);
    try {
      const result = await runChecks(sheetId, checks);
      setResults(result);
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check run failed");
    } finally {
      setIsRunning(false);
    }
  };

  const handleExportReport = () => {
    const report = { sheetName, profile, checks, results, history, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quality-report-${sheetName}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const overallScore = results
    ? Math.round(results.pass_rate * 100)
    : history?.pass_rate != null
      ? Math.round(history.pass_rate * 100)
      : null;

  if (!sheetId) {
    return (
      <div className="h-full flex items-center justify-center text-db-gray-400">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No sheet selected. Open a sheet first to inspect data quality.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-db-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-db-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-db-gray-900">
              Data Quality Inspector
            </h2>
            <p className="text-sm text-db-gray-500 mt-0.5">{sheetName}</p>
          </div>
          <div className="flex items-center gap-2">
            {overallScore !== null && (
              <span className={clsx(
                "px-3 py-1 rounded-full text-sm font-semibold",
                overallScore >= 95 ? "bg-green-100 text-green-700" :
                overallScore >= 80 ? "bg-amber-100 text-amber-700" :
                "bg-red-100 text-red-700"
              )}>
                {overallScore}% pass rate
              </span>
            )}
            <button
              onClick={handleProfile}
              disabled={isProfileLoading}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                isProfileLoading
                  ? "bg-db-gray-100 text-db-gray-400"
                  : "bg-teal-600 text-white hover:bg-teal-700"
              )}
            >
              <RefreshCw className={clsx("w-4 h-4", isProfileLoading && "animate-spin")} />
              {profile ? "Re-profile" : "Profile"}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Summary + Score */}
          {overallScore !== null && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-db-gray-200 p-6 flex items-center justify-center">
                <ScoreGauge score={overallScore} />
              </div>
              <div className="lg:col-span-3 grid grid-cols-3 gap-4">
                {results ? (
                  <>
                    <div className="bg-white rounded-lg border border-db-gray-200 p-4">
                      <div className="text-sm text-db-gray-500 mb-1">Total Rows</div>
                      <div className="text-2xl font-bold text-db-gray-900">
                        {results.total_rows.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border border-green-200 p-4">
                      <div className="flex items-center gap-1 text-sm text-db-gray-500 mb-1">
                        <CheckCircle className="w-4 h-4 text-green-600" /> Passed
                      </div>
                      <div className="text-2xl font-bold text-green-700">
                        {results.passed_rows.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border border-red-200 p-4">
                      <div className="flex items-center gap-1 text-sm text-db-gray-500 mb-1">
                        <XCircle className="w-4 h-4 text-red-600" /> Failed
                      </div>
                      <div className="text-2xl font-bold text-red-700">
                        {results.failed_rows.toLocaleString()}
                      </div>
                    </div>
                  </>
                ) : history?.results[0] ? (
                  <>
                    <div className="bg-white rounded-lg border border-db-gray-200 p-4">
                      <div className="text-sm text-db-gray-500 mb-1">Last Run</div>
                      <div className="text-sm font-medium text-db-gray-700">
                        {history.last_run_at ? new Date(history.last_run_at).toLocaleString() : "—"}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border border-db-gray-200 p-4">
                      <div className="text-sm text-db-gray-500 mb-1">Checks Run</div>
                      <div className="text-2xl font-bold text-db-gray-900">
                        {history.total_checks}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border border-db-gray-200 p-4">
                      <div className="text-sm text-db-gray-500 mb-1">History</div>
                      <div className="text-2xl font-bold text-db-gray-900">
                        {history.results.length} runs
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleGenerateRules}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-db-gray-300 rounded-lg hover:bg-db-gray-50 disabled:opacity-50 text-sm"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              AI Generate Rules
            </button>

            <button
              onClick={handleRunChecks}
              disabled={isRunning || checks.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-db-gray-300 rounded-lg hover:bg-db-gray-50 disabled:opacity-50 text-sm"
            >
              {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Run Checks ({checks.length})
            </button>

            {(results || profile) && (
              <button
                onClick={handleExportReport}
                className="flex items-center gap-2 px-4 py-2 border border-db-gray-300 text-db-gray-700 rounded-lg hover:bg-db-gray-50 text-sm ml-auto"
              >
                <Download className="w-4 h-4" />
                Export Report
              </button>
            )}
          </div>

          {/* Profile */}
          {profile && (
            <div className="bg-white rounded-lg border border-db-gray-200 p-6">
              <h3 className="font-semibold text-db-gray-900 mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-teal-600" />
                Data Profile — {profile.table}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-db-gray-500">Rows</div>
                  <div className="text-2xl font-bold text-db-gray-900 mt-1">
                    {profile.row_count.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-db-gray-500">Columns</div>
                  <div className="text-2xl font-bold text-db-gray-900 mt-1">
                    {profile.column_count}
                  </div>
                </div>
                <div>
                  <div className="text-db-gray-500">Suggested Checks</div>
                  <div className="text-2xl font-bold text-teal-700 mt-1">
                    {checks.length}
                  </div>
                </div>
                <div>
                  <div className="text-db-gray-500">Nullable Columns</div>
                  <div className="text-2xl font-bold text-db-gray-900 mt-1">
                    {profile.columns.filter(c => c.nullable).length}
                  </div>
                </div>
              </div>

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

          {/* Staged checks */}
          {checks.length > 0 && !results && (
            <div className="bg-white rounded-lg border border-db-gray-200 p-6">
              <h3 className="font-semibold text-db-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-teal-600" />
                Quality Checks ({checks.length})
              </h3>
              <div className="space-y-3">
                {checks.map((check, idx) => (
                  <QualityCheckCard key={idx} check={check} />
                ))}
              </div>
            </div>
          )}

          {/* Results — per-check */}
          {results && results.column_results.length > 0 && (
            <div className="bg-white rounded-lg border border-db-gray-200 p-6">
              <h3 className="font-semibold text-db-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-teal-600" />
                Check Results
              </h3>
              <div className="space-y-3">
                {results.column_results.map((cr, idx) => {
                  const matched = checks.find(c => c.name === cr.check) || { name: cr.check };
                  return (
                    <QualityCheckCard key={idx} check={matched} failures={cr.failures} />
                  );
                })}
              </div>
            </div>
          )}

          {/* Run history */}
          {history && history.results.length > 0 && (
            <div className="bg-white rounded-lg border border-db-gray-200 p-6">
              <h3 className="font-semibold text-db-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-600" />
                Run History ({history.results.length} runs)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-db-gray-200">
                      <th className="text-left py-2 pr-4 text-xs font-medium text-db-gray-500">Run Time</th>
                      <th className="text-right py-2 pr-4 text-xs font-medium text-db-gray-500">Rows</th>
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
                              <span className={clsx(
                                "font-medium",
                                passRate >= 0.95 ? "text-green-600" :
                                passRate >= 0.8 ? "text-amber-600" :
                                "text-red-600"
                              )}>
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

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-db-gray-900 text-white rounded-lg hover:bg-db-gray-800 transition-colors"
            >
              Close
            </button>
          </div>

          {/* Empty state */}
          {!profile && !results && !history?.results.length && !error && (
            <div className="text-center py-8 text-db-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Click <strong>Profile</strong> above to analyze data quality</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DataQualityInspector;
