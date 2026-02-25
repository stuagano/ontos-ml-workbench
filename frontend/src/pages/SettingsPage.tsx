import { useEffect, useState } from "react";
import {
  Database,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Table,
  Server,
  Clock,
  Info,
  X,
} from "lucide-react";
import { api } from "../services/api";

interface SchemaStatus {
  connection: {
    status: "connected" | "warning" | "error";
    message: string;
  };
  catalog: string;
  schema: string;
  warehouse_id: string;
  table_health: {
    total_expected: number;
    total_existing: number;
    health_percentage: number;
    tables: Array<{
      name: string;
      exists: boolean;
      row_count: number | null;
      status: "healthy" | "missing" | "error";
      error?: string;
    }>;
  };
  version: {
    current_version: string;
    last_updated: string;
    description: string;
    tables_in_version: number;
  };
  timestamp: string;
}

interface SettingsPageProps {
  onClose?: () => void;
}

export function SettingsPage({ onClose }: SettingsPageProps = {}) {
  const [status, setStatus] = useState<SchemaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"overview" | "tables">("overview");

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<SchemaStatus>("/schema/status");
      setStatus(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schema status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-slate-600">Loading schema status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <XCircle className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-semibold text-slate-800">Error Loading Status</h2>
          </div>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={fetchStatus}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const { connection, catalog, schema, warehouse_id, table_health, version, timestamp } = status;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-slate-800">Database Settings</h1>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                title="Close Settings (Esc)"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
          <p className="text-slate-600">Unity Catalog schema health and deployment status</p>
        </div>

        {/* Connection Status Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Server className="w-5 h-5" />
              Connection Status
            </h2>
            <button
              onClick={fetchStatus}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Connection */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
              {connection.status === "connected" ? (
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
              ) : connection.status === "warning" ? (
                <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-xs text-slate-500 mb-1">Status</div>
                <div className="font-semibold text-slate-800 truncate">{connection.message}</div>
              </div>
            </div>

            {/* Catalog */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
              <Database className="w-6 h-6 text-blue-500 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-slate-500 mb-1">Catalog</div>
                <div className="font-semibold text-slate-800 truncate">{catalog}</div>
              </div>
            </div>

            {/* Schema */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
              <Table className="w-6 h-6 text-purple-500 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-slate-500 mb-1">Schema</div>
                <div className="font-semibold text-slate-800 truncate">{schema}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Table Health Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Table className="w-5 h-5" />
              Table Health
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-blue-600">
                {table_health.health_percentage}%
              </span>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>
                {table_health.total_existing} / {table_health.total_expected} tables
              </span>
              <span>{table_health.health_percentage}% healthy</span>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                style={{ width: `${table_health.health_percentage}%` }}
              />
            </div>
          </div>

          {table_health.total_existing < table_health.total_expected && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <strong>Warning:</strong> {table_health.total_expected - table_health.total_existing} tables are missing.
                Run schema deployment to create them.
              </div>
            </div>
          )}
        </div>

        {/* Schema Version Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Schema Version
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Version */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">Current Version</div>
              <div className="text-2xl font-bold text-slate-800">{version.current_version}</div>
            </div>

            {/* Last Updated */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last Updated
              </div>
              <div className="font-semibold text-slate-800">
                {new Date(version.last_updated).toLocaleDateString()}
              </div>
            </div>

            {/* Tables */}
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="text-xs text-slate-500 mb-1">Tables in Version</div>
              <div className="text-2xl font-bold text-slate-800">{version.tables_in_version}</div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-900">{version.description}</div>
          </div>
        </div>

        {/* Tabs for Overview/Tables */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setSelectedTab("overview")}
              className={`px-6 py-3 font-medium transition-colors ${
                selectedTab === "overview"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedTab("tables")}
              className={`px-6 py-3 font-medium transition-colors ${
                selectedTab === "tables"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              All Tables ({table_health.total_existing})
            </button>
          </div>

          <div className="p-6">
            {selectedTab === "overview" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-600 mb-4">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">
                    Last checked: {new Date(timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-900">Healthy Tables</span>
                    </div>
                    <div className="text-3xl font-bold text-green-600">
                      {table_health.tables.filter((t) => t.status === "healthy").length}
                    </div>
                  </div>

                  {table_health.tables.filter((t) => t.status === "missing").length > 0 && (
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center gap-3 mb-2">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <span className="font-semibold text-red-900">Missing Tables</span>
                      </div>
                      <div className="text-3xl font-bold text-red-600">
                        {table_health.tables.filter((t) => t.status === "missing").length}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                  <h3 className="font-semibold text-slate-800 mb-2">Connection Details</h3>
                  <div className="space-y-1 text-sm text-slate-600 font-mono">
                    <div>Catalog: {catalog}</div>
                    <div>Schema: {schema}</div>
                    <div>Warehouse: {warehouse_id}</div>
                  </div>
                </div>
              </div>
            )}

            {selectedTab === "tables" && (
              <div className="space-y-2">
                {table_health.tables.map((table) => (
                  <div
                    key={table.name}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {table.status === "healthy" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : table.status === "missing" ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                      )}
                      <span className="font-medium text-slate-800">{table.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {table.exists && table.row_count !== null && (
                        <span className="text-sm text-slate-600">
                          {table.row_count.toLocaleString()} rows
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          table.status === "healthy"
                            ? "bg-green-100 text-green-700"
                            : table.status === "missing"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {table.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
