/**
 * Data Quality Inspector
 *
 * Automated data validation, profiling, and quality checks
 * Helps catch issues before training
 */

import { useState, useEffect } from "react";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Database,
  FileText,
  BarChart3,
  Download,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { clsx } from "clsx";
import type { ModuleComponentProps } from "../types";

// ============================================================================
// Types
// ============================================================================

interface QualityCheck {
  id: string;
  name: string;
  category: "schema" | "completeness" | "consistency" | "distribution" | "security";
  status: "pass" | "warn" | "fail" | "info";
  message: string;
  details?: string;
  count?: number;
  percentage?: number;
  recommendation?: string;
}

interface DataProfile {
  totalRows: number;
  totalColumns: number;
  nullCounts: Record<string, number>;
  uniqueCounts: Record<string, number>;
  dataTypes: Record<string, string>;
  sampleValues: Record<string, any[]>;
}

interface QualityReport {
  sheetName: string;
  analyzedAt: string;
  profile: DataProfile;
  checks: QualityCheck[];
  overallScore: number;
  summary: {
    pass: number;
    warn: number;
    fail: number;
  };
}

// ============================================================================
// Status Badge Component
// ============================================================================

function StatusBadge({ status }: { status: QualityCheck["status"] }) {
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

// ============================================================================
// Quality Check Card
// ============================================================================

function QualityCheckCard({ check }: { check: QualityCheck }) {
  const categoryIcons = {
    schema: FileText,
    completeness: Database,
    consistency: CheckCircle,
    distribution: BarChart3,
    security: Shield,
  };

  const CategoryIcon = categoryIcons[check.category];

  return (
    <div className={clsx(
      "rounded-lg border-2 p-4 transition-all",
      check.status === "pass" ? "border-green-200 bg-green-50/50" :
      check.status === "warn" ? "border-amber-200 bg-amber-50/50" :
      check.status === "fail" ? "border-red-200 bg-red-50/50" :
      "border-blue-200 bg-blue-50/50"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-3 flex-1">
          <CategoryIcon className="w-5 h-5 text-db-gray-500 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-db-gray-900">{check.name}</h4>
            <p className="text-sm text-db-gray-600 mt-1">{check.message}</p>
          </div>
        </div>
        <StatusBadge status={check.status} />
      </div>

      {/* Metrics */}
      {(check.count !== undefined || check.percentage !== undefined) && (
        <div className="flex gap-4 mt-3 text-sm">
          {check.count !== undefined && (
            <div>
              <span className="text-db-gray-500">Count:</span>
              <span className="ml-2 font-medium">{check.count.toLocaleString()}</span>
            </div>
          )}
          {check.percentage !== undefined && (
            <div>
              <span className="text-db-gray-500">Percentage:</span>
              <span className="ml-2 font-medium">{check.percentage.toFixed(1)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Details */}
      {check.details && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-db-gray-600 hover:text-db-gray-800">
            View details
          </summary>
          <pre className="mt-2 p-3 bg-white rounded border border-db-gray-200 text-xs overflow-x-auto">
            {check.details}
          </pre>
        </details>
      )}

      {/* Recommendation */}
      {check.recommendation && (check.status === "warn" || check.status === "fail") && (
        <div className="mt-3 p-3 bg-white rounded border border-db-gray-200">
          <div className="text-xs font-medium text-db-gray-700 mb-1">💡 Recommendation</div>
          <p className="text-sm text-db-gray-600">{check.recommendation}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Score Gauge Component
// ============================================================================

function ScoreGauge({ score }: { score: number }) {
  const getColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-amber-600";
    return "text-red-600";
  };

  const getLabel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 50) return "Fair";
    return "Poor";
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="56"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
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
          <div className={clsx("text-3xl font-bold", getColor(score))}>
            {score}
          </div>
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
// Distribution Chart
// ============================================================================

function DistributionChart({ data }: { data: Record<string, number> }) {
  const total = Object.values(data).reduce((sum, val) => sum + val, 0);
  const maxValue = Math.max(...Object.values(data));

  return (
    <div className="space-y-2">
      {Object.entries(data).map(([key, value]) => {
        const percentage = total > 0 ? (value / total) * 100 : 0;
        const barWidth = maxValue > 0 ? (value / maxValue) * 100 : 0;

        return (
          <div key={key} className="flex items-center gap-3">
            <div className="w-24 text-sm text-db-gray-600 truncate">{key}</div>
            <div className="flex-1 h-6 bg-db-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <div className="w-16 text-sm text-right font-medium">
              {percentage.toFixed(1)}%
            </div>
            <div className="w-20 text-sm text-right text-db-gray-500">
              ({value.toLocaleString()})
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DataQualityInspector({ context, onClose }: ModuleComponentProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<QualityReport | null>(null);

  // Simulate data analysis (replace with actual API call)
  const runAnalysis = async () => {
    setIsAnalyzing(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock report
    const mockReport: QualityReport = {
      sheetName: context.sheetName || "defect_inspections",
      analyzedAt: new Date().toISOString(),
      profile: {
        totalRows: 12547,
        totalColumns: 8,
        nullCounts: {
          image_path: 0,
          defect_type: 245,
          severity: 389,
          inspector_notes: 1523,
        },
        uniqueCounts: {
          defect_type: 12,
          severity: 4,
          equipment_id: 48,
        },
        dataTypes: {
          image_path: "string",
          defect_type: "string",
          severity: "string",
          confidence_score: "float",
          timestamp: "datetime",
        },
        sampleValues: {
          defect_type: ["crack", "corrosion", "wear", "contamination"],
          severity: ["low", "medium", "high", "critical"],
        },
      },
      checks: [
        {
          id: "1",
          name: "Schema Validation",
          category: "schema",
          status: "pass",
          message: "All columns match expected schema",
        },
        {
          id: "2",
          name: "Missing Values",
          category: "completeness",
          status: "warn",
          message: "Some optional fields have missing values",
          count: 2157,
          percentage: 17.2,
          recommendation: "Consider imputation or marking as N/A for optional fields",
        },
        {
          id: "3",
          name: "Class Balance",
          category: "distribution",
          status: "fail",
          message: "Severe class imbalance detected",
          details: JSON.stringify({
            crack: 9234,
            corrosion: 2145,
            wear: 892,
            contamination: 276
          }, null, 2),
          recommendation: "Apply oversampling (SMOTE) or class weights to balance training data",
        },
        {
          id: "4",
          name: "Duplicate Detection",
          category: "consistency",
          status: "warn",
          message: "Potential duplicate rows found",
          count: 47,
          percentage: 0.4,
          recommendation: "Review and remove duplicates before training",
        },
        {
          id: "5",
          name: "Format Consistency",
          category: "consistency",
          status: "pass",
          message: "All datetime and numeric formats are consistent",
        },
        {
          id: "6",
          name: "PII Detection",
          category: "security",
          status: "info",
          message: "No personally identifiable information detected",
        },
        {
          id: "7",
          name: "Value Range Validation",
          category: "schema",
          status: "pass",
          message: "All confidence scores are within expected range [0, 1]",
        },
        {
          id: "8",
          name: "Outlier Detection",
          category: "distribution",
          status: "warn",
          message: "Statistical outliers detected in confidence scores",
          count: 127,
          percentage: 1.0,
          recommendation: "Review outliers - may indicate labeling errors or edge cases",
        },
      ],
      overallScore: 78,
      summary: {
        pass: 4,
        warn: 3,
        fail: 1,
      },
    };

    setReport(mockReport);
    setIsAnalyzing(false);
  };

  // Auto-run on mount
  useEffect(() => {
    runAnalysis();
  }, []);

  return (
    <div className="h-full flex flex-col bg-db-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-db-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-db-gray-900">
              Data Quality Inspector
            </h2>
            <p className="text-sm text-db-gray-500 mt-0.5">
              {context.sheetName || "Analyzing data quality..."}
            </p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
              isAnalyzing
                ? "bg-db-gray-100 text-db-gray-400"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            )}
          >
            <RefreshCw className={clsx("w-4 h-4", isAnalyzing && "animate-spin")} />
            {isAnalyzing ? "Analyzing..." : "Re-analyze"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isAnalyzing && !report ? (
          <div className="flex flex-col items-center justify-center h-full">
            <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
            <p className="text-db-gray-600">Analyzing data quality...</p>
          </div>
        ) : report ? (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Score */}
              <div className="bg-white rounded-lg border border-db-gray-200 p-6 flex items-center justify-center">
                <ScoreGauge score={report.overallScore} />
              </div>

              {/* Stats */}
              <div className="lg:col-span-3 grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-db-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-db-gray-600">Passed</span>
                  </div>
                  <div className="text-3xl font-bold text-green-700">
                    {report.summary.pass}
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-db-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span className="text-sm text-db-gray-600">Warnings</span>
                  </div>
                  <div className="text-3xl font-bold text-amber-700">
                    {report.summary.warn}
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-db-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="text-sm text-db-gray-600">Failed</span>
                  </div>
                  <div className="text-3xl font-bold text-red-700">
                    {report.summary.fail}
                  </div>
                </div>
              </div>
            </div>

            {/* Data Profile */}
            <div className="bg-white rounded-lg border border-db-gray-200 p-6">
              <h3 className="font-semibold text-db-gray-900 mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                Data Profile
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-db-gray-500">Total Rows</div>
                  <div className="text-2xl font-bold text-db-gray-900 mt-1">
                    {report.profile.totalRows.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-db-gray-500">Columns</div>
                  <div className="text-2xl font-bold text-db-gray-900 mt-1">
                    {report.profile.totalColumns}
                  </div>
                </div>
                <div>
                  <div className="text-db-gray-500">Missing Values</div>
                  <div className="text-2xl font-bold text-amber-700 mt-1">
                    {Object.values(report.profile.nullCounts).reduce((a, b) => a + b, 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-db-gray-500">Unique Values</div>
                  <div className="text-2xl font-bold text-db-gray-900 mt-1">
                    {Object.values(report.profile.uniqueCounts).reduce((a, b) => a + b, 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Class Distribution (if imbalance detected) */}
            {report.checks.some(c => c.id === "3" && c.details) && (
              <div className="bg-white rounded-lg border border-db-gray-200 p-6">
                <h3 className="font-semibold text-db-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  Class Distribution
                </h3>
                <DistributionChart
                  data={JSON.parse(report.checks.find(c => c.id === "3")!.details!)}
                />
              </div>
            )}

            {/* Quality Checks */}
            <div className="space-y-4">
              <h3 className="font-semibold text-db-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                Quality Checks ({report.checks.length})
              </h3>

              {/* Group by status */}
              {report.summary.fail > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-red-700">Critical Issues</h4>
                  {report.checks.filter(c => c.status === "fail").map(check => (
                    <QualityCheckCard key={check.id} check={check} />
                  ))}
                </div>
              )}

              {report.summary.warn > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-amber-700">Warnings</h4>
                  {report.checks.filter(c => c.status === "warn").map(check => (
                    <QualityCheckCard key={check.id} check={check} />
                  ))}
                </div>
              )}

              <details>
                <summary className="text-sm font-medium text-db-gray-600 cursor-pointer hover:text-db-gray-800">
                  View all checks ({report.summary.pass} passed)
                </summary>
                <div className="mt-3 space-y-3">
                  {report.checks.filter(c => c.status === "pass" || c.status === "info").map(check => (
                    <QualityCheckCard key={check.id} check={check} />
                  ))}
                </div>
              </details>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Export report as JSON
                  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `quality-report-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2 px-4 py-2 border border-db-gray-300 text-db-gray-700 rounded-lg hover:bg-db-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export Report
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-db-gray-900 text-white rounded-lg hover:bg-db-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default DataQualityInspector;
