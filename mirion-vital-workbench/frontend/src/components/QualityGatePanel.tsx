/**
 * QualityGatePanel — Pre-training quality gate check via Ontos DQX proxy.
 *
 * Displays check results (blocking/warning/info) with pass/fail status,
 * summary stats, and Ontos sync indicator.
 */

import { useState } from "react";
import {
  Shield,
  Loader2,
  CheckCircle,
  XCircle,
  Play,
  CloudOff,
  Cloud,
} from "lucide-react";
import { clsx } from "clsx";
import { runQualityProxy } from "../services/quality-proxy";
import type { QualityProxyRunResponse } from "../types/quality-proxy";

interface QualityGatePanelProps {
  collectionId: string;
}

const criticalityConfig = {
  blocking: { label: "Blocking", color: "bg-red-100 text-red-700" },
  warning: { label: "Warning", color: "bg-amber-100 text-amber-700" },
  info: { label: "Info", color: "bg-blue-100 text-blue-700" },
} as const;

export function QualityGatePanel({ collectionId }: QualityGatePanelProps) {
  const [results, setResults] = useState<QualityProxyRunResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const result = await runQualityProxy(collectionId);
      setResults(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Quality gate check failed",
      );
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-white border border-db-gray-200 rounded-lg p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 rounded-lg">
            <Shield className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold text-db-gray-900">
              Training Data Quality Gate
            </h3>
            <p className="text-sm text-db-gray-500">
              Run Ontos DQX checks before training
            </p>
          </div>
        </div>

        {/* Pass rate badge */}
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

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={isRunning}
        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-db-gray-300 disabled:cursor-not-allowed text-sm"
      >
        {isRunning ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4" />
        )}
        Run Quality Gate
      </button>

      {/* Summary stats */}
      {results && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-db-gray-50 rounded-lg border border-db-gray-200 p-3 text-center">
            <p className="text-2xl font-bold text-db-gray-900">
              {results.total_pairs.toLocaleString()}
            </p>
            <p className="text-xs text-db-gray-500">Total Pairs</p>
          </div>
          <div
            className={clsx(
              "rounded-lg border p-3 text-center",
              results.pass_rate >= 0.95
                ? "bg-green-50 border-green-200"
                : results.pass_rate >= 0.8
                  ? "bg-amber-50 border-amber-200"
                  : "bg-red-50 border-red-200",
            )}
          >
            <p
              className={clsx(
                "text-2xl font-bold",
                results.pass_rate >= 0.95
                  ? "text-green-600"
                  : results.pass_rate >= 0.8
                    ? "text-amber-600"
                    : "text-red-600",
              )}
            >
              {(results.pass_rate * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-db-gray-500">Pass Rate</p>
          </div>
          <div className="bg-db-gray-50 rounded-lg border border-db-gray-200 p-3 text-center">
            <p className="text-2xl font-bold text-db-gray-900">
              {(results.quality_score * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-db-gray-500">Quality Score</p>
          </div>
        </div>
      )}

      {/* Check results table */}
      {results && results.check_results.length > 0 && (
        <div className="bg-white rounded-lg border border-db-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-db-gray-50 border-b border-db-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-db-gray-600">
                  Check
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-db-gray-600">
                  Criticality
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-db-gray-600">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-db-gray-600">
                  Message
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-db-gray-200">
              {results.check_results.map((cr) => {
                const crit = criticalityConfig[cr.criticality];
                return (
                  <tr key={cr.check_id}>
                    <td className="px-4 py-2 font-medium text-db-gray-900">
                      {cr.check_name}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span
                        className={clsx(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          crit.color,
                        )}
                      >
                        {crit.label}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {cr.passed ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-2 text-db-gray-600">
                      {cr.message}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Ontos sync indicator */}
      {results && (
        <div className="flex items-center gap-2 text-sm">
          {results.pushed_to_ontos ? (
            <>
              <Cloud className="w-4 h-4 text-green-600" />
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                Pushed to Ontos
              </span>
            </>
          ) : (
            <>
              <CloudOff className="w-4 h-4 text-db-gray-400" />
              <span className="px-2 py-0.5 bg-db-gray-100 text-db-gray-500 rounded-full text-xs font-medium">
                Ontos offline
              </span>
            </>
          )}
        </div>
      )}

      {/* Empty state */}
      {!results && !error && (
        <div className="text-center py-6 text-db-gray-500">
          <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">
            Run quality gate checks to validate training data before starting a
            job
          </p>
        </div>
      )}
    </div>
  );
}
