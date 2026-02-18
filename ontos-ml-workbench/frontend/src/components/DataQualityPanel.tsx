/**
 * DataQualityPanel — Inline quality panel for the DATA stage sheet detail.
 *
 * Shows quality score, profile/suggest/run buttons, and per-column results.
 */

import { useState } from "react";
import {
  Shield,
  Loader2,
  CheckCircle,
  XCircle,
  Wand2,
  Play,
  BarChart3,
} from "lucide-react";
import { clsx } from "clsx";
import {
  profileSheet,
  runChecks,
  generateRules,
} from "../services/data-quality";
import type {
  ProfileResult,
  RunChecksResult,
  DQCheck,
} from "../types/data-quality";

interface DataQualityPanelProps {
  sheetId: string;
  sheetName?: string;
}

export function DataQualityPanel({ sheetId, sheetName }: DataQualityPanelProps) {
  const [profile, setProfile] = useState<ProfileResult | null>(null);
  const [checks, setChecks] = useState<DQCheck[]>([]);
  const [results, setResults] = useState<RunChecksResult | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProfile = async () => {
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
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateRules(
        sheetId,
        `Generate data quality rules for ${sheetName || "this dataset"}`,
      );
      setChecks(result.checks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rule generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRunChecks = async () => {
    if (checks.length === 0) return;
    setIsRunning(true);
    setError(null);
    try {
      const result = await runChecks(sheetId, checks);
      setResults(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check run failed");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 rounded-lg">
            <Shield className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold text-db-gray-900">Data Quality</h3>
            <p className="text-sm text-db-gray-500">
              Profile, validate, and monitor data quality
            </p>
          </div>
        </div>

        {/* Score Badge */}
        {results && (
          <div
            className={clsx(
              "px-4 py-2 rounded-full text-sm font-semibold",
              results.pass_rate >= 0.95
                ? "bg-green-100 text-green-700"
                : results.pass_rate >= 0.8
                  ? "bg-amber-100 text-amber-700"
                  : "bg-red-100 text-red-700",
            )}
          >
            {(results.pass_rate * 100).toFixed(1)}% pass rate
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleProfile}
          disabled={isProfileLoading}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-db-gray-300 disabled:cursor-not-allowed text-sm"
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
          className="flex items-center gap-2 px-4 py-2 bg-white border border-db-gray-300 rounded-lg hover:bg-db-gray-50 disabled:opacity-50 text-sm"
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
          className="flex items-center gap-2 px-4 py-2 bg-white border border-db-gray-300 rounded-lg hover:bg-db-gray-50 disabled:opacity-50 text-sm"
        >
          {isRunning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          Run Checks ({checks.length})
        </button>
      </div>

      {/* Profile Summary */}
      {profile && (
        <div className="bg-db-gray-50 rounded-lg border border-db-gray-200 p-4">
          <h4 className="text-sm font-medium text-db-gray-700 mb-2">
            Profile: {profile.table}
          </h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-db-gray-500">Rows</span>
              <p className="font-semibold">
                {profile.row_count.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-db-gray-500">Columns</span>
              <p className="font-semibold">{profile.column_count}</p>
            </div>
            <div>
              <span className="text-db-gray-500">Suggested Checks</span>
              <p className="font-semibold">{checks.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Check Results */}
      {results && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-db-gray-700">
            Check Results
          </h4>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-db-gray-200 p-3 text-center">
              <p className="text-2xl font-bold text-db-gray-900">
                {results.total_rows.toLocaleString()}
              </p>
              <p className="text-xs text-db-gray-500">Total Rows</p>
            </div>
            <div className="bg-white rounded-lg border border-green-200 p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {results.passed_rows.toLocaleString()}
              </p>
              <p className="text-xs text-db-gray-500">Passed</p>
            </div>
            <div className="bg-white rounded-lg border border-red-200 p-3 text-center">
              <p className="text-2xl font-bold text-red-600">
                {results.failed_rows.toLocaleString()}
              </p>
              <p className="text-xs text-db-gray-500">Failed</p>
            </div>
          </div>

          {/* Per-check results */}
          {results.column_results.length > 0 && (
            <div className="bg-white rounded-lg border border-db-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-db-gray-50 border-b border-db-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-db-gray-600">
                      Check
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-db-gray-600">
                      Failures
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-db-gray-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-db-gray-200">
                  {results.column_results.map((cr, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-db-gray-900">
                        {cr.check}
                      </td>
                      <td className="px-4 py-2 text-right text-db-gray-600">
                        {cr.failures}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {cr.failures === 0 ? (
                          <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 mx-auto" />
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

      {/* Empty state */}
      {!profile && !results && !error && (
        <div className="text-center py-8 text-db-gray-500">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Click "Profile & Suggest Rules" to get started</p>
        </div>
      )}
    </div>
  );
}
