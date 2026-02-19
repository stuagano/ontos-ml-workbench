/**
 * RegistriesPage - Admin page for browsing/creating/editing Tools, Agents, and Endpoints
 *
 * Three tabs: Tools | Agents | Endpoints
 * Each tab: DataTable browse with row actions (View, Edit, Delete)
 * Create/Edit as inline forms
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Settings,
  Bot,
  Globe,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";
import { DataTable, Column, RowAction } from "../components/DataTable";
import {
  listTools,
  createTool,
  updateTool,
  deleteTool,
  listAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  listEndpoints,
  createEndpoint,
  updateEndpoint,
  deleteEndpoint,
} from "../services/api";
import { useToast } from "../components/Toast";
import type {
  Tool,
  Agent,
  Endpoint,
  ToolStatus,
  AgentStatus,
  EndpointStatus,
  EndpointType,
} from "../types";

type TabId = "tools" | "agents" | "endpoints";
type ViewMode = "browse" | "create" | "detail" | "edit";

// ============================================================================
// Status Badges
// ============================================================================

const toolStatusConfig: Record<ToolStatus, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-amber-700", bg: "bg-amber-50" },
  published: { label: "Published", color: "text-green-700", bg: "bg-green-50" },
  deprecated: { label: "Deprecated", color: "text-gray-500", bg: "bg-gray-100" },
};

const agentStatusConfig: Record<AgentStatus, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "text-amber-700", bg: "bg-amber-50" },
  deployed: { label: "Deployed", color: "text-green-700", bg: "bg-green-50" },
  archived: { label: "Archived", color: "text-gray-500", bg: "bg-gray-100" },
};

const endpointStatusConfig: Record<EndpointStatus, { label: string; color: string; bg: string }> = {
  creating: { label: "Creating", color: "text-blue-700", bg: "bg-blue-50" },
  ready: { label: "Ready", color: "text-green-700", bg: "bg-green-50" },
  updating: { label: "Updating", color: "text-amber-700", bg: "bg-amber-50" },
  failed: { label: "Failed", color: "text-red-700", bg: "bg-red-50" },
  stopped: { label: "Stopped", color: "text-gray-500", bg: "bg-gray-100" },
};

function StatusBadge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span className={clsx("px-2 py-1 rounded-full text-xs font-medium", bg, color)}>
      {label}
    </span>
  );
}

// ============================================================================
// Tool Form
// ============================================================================

interface ToolFormProps {
  tool?: Tool | null;
  onSave: (data: Partial<Tool>) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function ToolForm({ tool, onSave, onCancel, isSaving }: ToolFormProps) {
  const [name, setName] = useState(tool?.name || "");
  const [description, setDescription] = useState(tool?.description || "");
  const [ucFunctionPath, setUcFunctionPath] = useState(tool?.uc_function_path || "");
  const [parametersSchema, setParametersSchema] = useState(
    tool?.parameters_schema ? JSON.stringify(tool.parameters_schema, null, 2) : ""
  );
  const [version, setVersion] = useState(tool?.version || "1.0.0");
  const [status, setStatus] = useState<ToolStatus>(tool?.status || "draft");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let parsedSchema: Record<string, unknown> | undefined;
    if (parametersSchema.trim()) {
      try {
        parsedSchema = JSON.parse(parametersSchema);
      } catch {
        return;
      }
    }
    onSave({
      name,
      description: description || undefined,
      uc_function_path: ucFunctionPath || undefined,
      parameters_schema: parsedSchema,
      version,
      status,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-db-gray-700 mb-1">Name *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-db-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-db-gray-700 mb-1">UC Function Path</label>
        <input
          value={ucFunctionPath}
          onChange={(e) => setUcFunctionPath(e.target.value)}
          placeholder="catalog.schema.function_name"
          className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-db-gray-700 mb-1">Parameters Schema (JSON)</label>
        <textarea
          value={parametersSchema}
          onChange={(e) => setParametersSchema(e.target.value)}
          rows={4}
          placeholder='{"type": "object", "properties": {...}}'
          className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-db-gray-700 mb-1">Version</label>
          <input
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-db-gray-700 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ToolStatus)}
            className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="deprecated">Deprecated</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3 pt-4 border-t border-db-gray-200">
        <button
          type="submit"
          disabled={!name || isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          {tool ? "Update" : "Create"} Tool
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-db-gray-600 hover:text-db-gray-800">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// Agent Form
// ============================================================================

interface AgentFormProps {
  agent?: Agent | null;
  onSave: (data: Partial<Agent>) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function AgentForm({ agent, onSave, onCancel, isSaving }: AgentFormProps) {
  const [name, setName] = useState(agent?.name || "");
  const [description, setDescription] = useState(agent?.description || "");
  const [modelEndpoint, setModelEndpoint] = useState(agent?.model_endpoint || "");
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt || "");
  const [temperature, setTemperature] = useState(agent?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(agent?.max_tokens ?? 1024);
  const [status, setStatus] = useState<AgentStatus>(agent?.status || "draft");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description: description || undefined,
      model_endpoint: modelEndpoint || undefined,
      system_prompt: systemPrompt || undefined,
      temperature,
      max_tokens: maxTokens,
      status,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-db-gray-700 mb-1">Name *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-db-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-db-gray-700 mb-1">Model Endpoint</label>
        <input
          value={modelEndpoint}
          onChange={(e) => setModelEndpoint(e.target.value)}
          placeholder="databricks-meta-llama-3-1-8b-instruct"
          className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-db-gray-700 mb-1">System Prompt</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-db-gray-700 mb-1">Temperature</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-db-gray-700 mb-1">Max Tokens</label>
          <input
            type="number"
            min="1"
            max="16384"
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
            className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-db-gray-700 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AgentStatus)}
            className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="draft">Draft</option>
            <option value="deployed">Deployed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3 pt-4 border-t border-db-gray-200">
        <button
          type="submit"
          disabled={!name || isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          {agent ? "Update" : "Create"} Agent
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-db-gray-600 hover:text-db-gray-800">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// Endpoint Form
// ============================================================================

interface EndpointFormProps {
  endpoint?: Endpoint | null;
  onSave: (data: Partial<Endpoint>) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function EndpointForm({ endpoint, onSave, onCancel, isSaving }: EndpointFormProps) {
  const [name, setName] = useState(endpoint?.name || "");
  const [description, setDescription] = useState(endpoint?.description || "");
  const [endpointName, setEndpointName] = useState(endpoint?.endpoint_name || "");
  const [endpointType, setEndpointType] = useState<EndpointType>(endpoint?.endpoint_type || "model");
  const [modelName, setModelName] = useState(endpoint?.model_name || "");
  const [modelVersion, setModelVersion] = useState(endpoint?.model_version || "");
  const [status, setStatus] = useState<EndpointStatus>(endpoint?.status || "creating");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description: description || undefined,
      endpoint_name: endpointName,
      endpoint_type: endpointType,
      model_name: modelName || undefined,
      model_version: modelVersion || undefined,
      status,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-db-gray-700 mb-1">Name *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-db-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-db-gray-700 mb-1">Endpoint Name *</label>
          <input
            value={endpointName}
            onChange={(e) => setEndpointName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-db-gray-700 mb-1">Endpoint Type *</label>
          <select
            value={endpointType}
            onChange={(e) => setEndpointType(e.target.value as EndpointType)}
            className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="model">Model</option>
            <option value="agent">Agent</option>
            <option value="chain">Chain</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-db-gray-700 mb-1">Model Name</label>
          <input
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-db-gray-700 mb-1">Model Version</label>
          <input
            value={modelVersion}
            onChange={(e) => setModelVersion(e.target.value)}
            className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-db-gray-700 mb-1">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as EndpointStatus)}
          className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="creating">Creating</option>
          <option value="ready">Ready</option>
          <option value="updating">Updating</option>
          <option value="failed">Failed</option>
          <option value="stopped">Stopped</option>
        </select>
      </div>
      <div className="flex items-center gap-3 pt-4 border-t border-db-gray-200">
        <button
          type="submit"
          disabled={!name || !endpointName || isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          {endpoint ? "Update" : "Create"} Endpoint
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-db-gray-600 hover:text-db-gray-800">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// Tab Components
// ============================================================================

const TABS: { id: TabId; label: string; icon: typeof Settings }[] = [
  { id: "tools", label: "Tools", icon: Settings },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "endpoints", label: "Endpoints", icon: Globe },
];

// ============================================================================
// Tools Tab
// ============================================================================

function ToolsTab() {
  const [viewMode, setViewMode] = useState<ViewMode>("browse");
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: tools = [], isLoading } = useQuery({
    queryKey: ["registry-tools"],
    queryFn: () => listTools(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Tool>) => createTool(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registry-tools"] });
      toast.success("Tool created");
      setViewMode("browse");
    },
    onError: (error) => toast.error("Create failed", error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Tool> }) => updateTool(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registry-tools"] });
      toast.success("Tool updated");
      setViewMode("browse");
    },
    onError: (error) => toast.error("Update failed", error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTool,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registry-tools"] });
      toast.success("Tool deleted");
    },
    onError: (error) => toast.error("Delete failed", error.message),
  });

  const columns: Column<Tool>[] = [
    {
      key: "name",
      header: "Name",
      width: "25%",
      render: (tool) => (
        <div>
          <div className="font-medium text-db-gray-900">{tool.name}</div>
          {tool.description && (
            <div className="text-sm text-db-gray-500 truncate">{tool.description}</div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "15%",
      render: (tool) => <StatusBadge {...toolStatusConfig[tool.status]} />,
    },
    {
      key: "version",
      header: "Version",
      width: "10%",
      render: (tool) => <span className="text-sm text-db-gray-600">v{tool.version}</span>,
    },
    {
      key: "uc_function_path",
      header: "UC Function Path",
      width: "30%",
      render: (tool) => (
        <span className="text-sm text-db-gray-600 font-mono">
          {tool.uc_function_path || "-"}
        </span>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      width: "20%",
      render: (tool) => (
        <span className="text-sm text-db-gray-500">
          {tool.updated_at ? new Date(tool.updated_at).toLocaleDateString() : "N/A"}
        </span>
      ),
    },
  ];

  const rowActions: RowAction<Tool>[] = [
    {
      label: "Edit",
      icon: Edit,
      onClick: (tool) => { setSelectedTool(tool); setViewMode("edit"); },
    },
    {
      label: "Delete",
      icon: Trash2,
      onClick: (tool) => {
        if (confirm(`Delete tool "${tool.name}"?`)) {
          deleteMutation.mutate(tool.id);
        }
      },
      className: "text-red-600",
      show: (tool) => tool.status === "draft",
    },
  ];

  if (viewMode === "create" || viewMode === "edit") {
    return (
      <div className="max-w-2xl">
        <button onClick={() => { setViewMode("browse"); setSelectedTool(null); }} className="flex items-center gap-2 text-sm text-db-gray-600 hover:text-db-gray-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Tools
        </button>
        <div className="bg-white rounded-lg border border-db-gray-200 p-6">
          <h3 className="text-lg font-semibold text-db-gray-800 mb-4">
            {viewMode === "edit" ? "Edit Tool" : "Create Tool"}
          </h3>
          <ToolForm
            tool={viewMode === "edit" ? selectedTool : null}
            onSave={(data) => {
              if (viewMode === "edit" && selectedTool) {
                updateMutation.mutate({ id: selectedTool.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
            onCancel={() => { setViewMode("browse"); setSelectedTool(null); }}
            isSaving={createMutation.isPending || updateMutation.isPending}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-db-gray-500">{tools.length} tool{tools.length !== 1 && "s"}</span>
        <button onClick={() => setViewMode("create")} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <Plus className="w-4 h-4" /> New Tool
        </button>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <DataTable
          data={tools}
          columns={columns}
          rowKey={(t) => t.id}
          rowActions={rowActions}
          emptyState={
            <div className="text-center py-16">
              <Settings className="w-12 h-12 text-db-gray-300 mx-auto mb-3" />
              <p className="text-db-gray-500">No tools registered yet</p>
            </div>
          }
        />
      )}
    </>
  );
}

// ============================================================================
// Agents Tab
// ============================================================================

function AgentsTab() {
  const [viewMode, setViewMode] = useState<ViewMode>("browse");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["registry-agents"],
    queryFn: () => listAgents(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Agent>) => createAgent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registry-agents"] });
      toast.success("Agent created");
      setViewMode("browse");
    },
    onError: (error) => toast.error("Create failed", error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Agent> }) => updateAgent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registry-agents"] });
      toast.success("Agent updated");
      setViewMode("browse");
    },
    onError: (error) => toast.error("Update failed", error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registry-agents"] });
      toast.success("Agent deleted");
    },
    onError: (error) => toast.error("Delete failed", error.message),
  });

  const columns: Column<Agent>[] = [
    {
      key: "name",
      header: "Name",
      width: "25%",
      render: (agent) => (
        <div>
          <div className="font-medium text-db-gray-900">{agent.name}</div>
          {agent.description && (
            <div className="text-sm text-db-gray-500 truncate">{agent.description}</div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "15%",
      render: (agent) => <StatusBadge {...agentStatusConfig[agent.status]} />,
    },
    {
      key: "model_endpoint",
      header: "Model Endpoint",
      width: "25%",
      render: (agent) => (
        <span className="text-sm text-db-gray-600">{agent.model_endpoint || "-"}</span>
      ),
    },
    {
      key: "temperature",
      header: "Temperature",
      width: "15%",
      render: (agent) => <span className="text-sm text-db-gray-600">{agent.temperature}</span>,
    },
    {
      key: "updated",
      header: "Updated",
      width: "20%",
      render: (agent) => (
        <span className="text-sm text-db-gray-500">
          {agent.updated_at ? new Date(agent.updated_at).toLocaleDateString() : "N/A"}
        </span>
      ),
    },
  ];

  const rowActions: RowAction<Agent>[] = [
    {
      label: "Edit",
      icon: Edit,
      onClick: (agent) => { setSelectedAgent(agent); setViewMode("edit"); },
    },
    {
      label: "Delete",
      icon: Trash2,
      onClick: (agent) => {
        if (confirm(`Delete agent "${agent.name}"?`)) {
          deleteMutation.mutate(agent.id);
        }
      },
      className: "text-red-600",
      show: (agent) => agent.status === "draft",
    },
  ];

  if (viewMode === "create" || viewMode === "edit") {
    return (
      <div className="max-w-2xl">
        <button onClick={() => { setViewMode("browse"); setSelectedAgent(null); }} className="flex items-center gap-2 text-sm text-db-gray-600 hover:text-db-gray-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Agents
        </button>
        <div className="bg-white rounded-lg border border-db-gray-200 p-6">
          <h3 className="text-lg font-semibold text-db-gray-800 mb-4">
            {viewMode === "edit" ? "Edit Agent" : "Create Agent"}
          </h3>
          <AgentForm
            agent={viewMode === "edit" ? selectedAgent : null}
            onSave={(data) => {
              if (viewMode === "edit" && selectedAgent) {
                updateMutation.mutate({ id: selectedAgent.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
            onCancel={() => { setViewMode("browse"); setSelectedAgent(null); }}
            isSaving={createMutation.isPending || updateMutation.isPending}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-db-gray-500">{agents.length} agent{agents.length !== 1 && "s"}</span>
        <button onClick={() => setViewMode("create")} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <Plus className="w-4 h-4" /> New Agent
        </button>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <DataTable
          data={agents}
          columns={columns}
          rowKey={(a) => a.id}
          rowActions={rowActions}
          emptyState={
            <div className="text-center py-16">
              <Bot className="w-12 h-12 text-db-gray-300 mx-auto mb-3" />
              <p className="text-db-gray-500">No agents registered yet</p>
            </div>
          }
        />
      )}
    </>
  );
}

// ============================================================================
// Endpoints Tab
// ============================================================================

function EndpointsTab() {
  const [viewMode, setViewMode] = useState<ViewMode>("browse");
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: endpoints = [], isLoading } = useQuery({
    queryKey: ["registry-endpoints"],
    queryFn: () => listEndpoints(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Endpoint>) => createEndpoint(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registry-endpoints"] });
      toast.success("Endpoint created");
      setViewMode("browse");
    },
    onError: (error) => toast.error("Create failed", error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Endpoint> }) => updateEndpoint(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registry-endpoints"] });
      toast.success("Endpoint updated");
      setViewMode("browse");
    },
    onError: (error) => toast.error("Update failed", error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEndpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registry-endpoints"] });
      toast.success("Endpoint deleted");
    },
    onError: (error) => toast.error("Delete failed", error.message),
  });

  const columns: Column<Endpoint>[] = [
    {
      key: "name",
      header: "Name",
      width: "25%",
      render: (ep) => (
        <div>
          <div className="font-medium text-db-gray-900">{ep.name}</div>
          {ep.description && (
            <div className="text-sm text-db-gray-500 truncate">{ep.description}</div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "15%",
      render: (ep) => <StatusBadge {...endpointStatusConfig[ep.status]} />,
    },
    {
      key: "endpoint_type",
      header: "Type",
      width: "15%",
      render: (ep) => (
        <span className="text-sm text-db-gray-600 capitalize">{ep.endpoint_type}</span>
      ),
    },
    {
      key: "model_name",
      header: "Model",
      width: "25%",
      render: (ep) => (
        <span className="text-sm text-db-gray-600">{ep.model_name || "-"}</span>
      ),
    },
    {
      key: "updated",
      header: "Updated",
      width: "20%",
      render: (ep) => (
        <span className="text-sm text-db-gray-500">
          {ep.updated_at ? new Date(ep.updated_at).toLocaleDateString() : "N/A"}
        </span>
      ),
    },
  ];

  const rowActions: RowAction<Endpoint>[] = [
    {
      label: "Edit",
      icon: Edit,
      onClick: (ep) => { setSelectedEndpoint(ep); setViewMode("edit"); },
    },
    {
      label: "Delete",
      icon: Trash2,
      onClick: (ep) => {
        if (confirm(`Delete endpoint "${ep.name}"?`)) {
          deleteMutation.mutate(ep.id);
        }
      },
      className: "text-red-600",
      show: (ep) => ep.status === "stopped" || ep.status === "failed",
    },
  ];

  if (viewMode === "create" || viewMode === "edit") {
    return (
      <div className="max-w-2xl">
        <button onClick={() => { setViewMode("browse"); setSelectedEndpoint(null); }} className="flex items-center gap-2 text-sm text-db-gray-600 hover:text-db-gray-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Endpoints
        </button>
        <div className="bg-white rounded-lg border border-db-gray-200 p-6">
          <h3 className="text-lg font-semibold text-db-gray-800 mb-4">
            {viewMode === "edit" ? "Edit Endpoint" : "Create Endpoint"}
          </h3>
          <EndpointForm
            endpoint={viewMode === "edit" ? selectedEndpoint : null}
            onSave={(data) => {
              if (viewMode === "edit" && selectedEndpoint) {
                updateMutation.mutate({ id: selectedEndpoint.id, data });
              } else {
                createMutation.mutate(data);
              }
            }}
            onCancel={() => { setViewMode("browse"); setSelectedEndpoint(null); }}
            isSaving={createMutation.isPending || updateMutation.isPending}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-db-gray-500">{endpoints.length} endpoint{endpoints.length !== 1 && "s"}</span>
        <button onClick={() => setViewMode("create")} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
          <Plus className="w-4 h-4" /> New Endpoint
        </button>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <DataTable
          data={endpoints}
          columns={columns}
          rowKey={(ep) => ep.id}
          rowActions={rowActions}
          emptyState={
            <div className="text-center py-16">
              <Globe className="w-12 h-12 text-db-gray-300 mx-auto mb-3" />
              <p className="text-db-gray-500">No endpoints registered yet</p>
            </div>
          }
        />
      )}
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface RegistriesPageProps {
  onClose?: () => void;
}

export function RegistriesPage({ onClose }: RegistriesPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("tools");
  const queryClient = useQueryClient();

  return (
    <div className="flex-1 flex flex-col bg-db-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-db-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-db-gray-900 dark:text-white">
                Registries
              </h1>
              <p className="text-db-gray-600 dark:text-gray-400 mt-1">
                Manage tools, agents, and serving endpoints
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["registry-tools"] });
                  queryClient.invalidateQueries({ queryKey: ["registry-agents"] });
                  queryClient.invalidateQueries({ queryKey: ["registry-endpoints"] });
                }}
                className="flex items-center gap-2 px-3 py-2 text-db-gray-600 dark:text-gray-400 hover:text-db-gray-800 dark:hover:text-white hover:bg-db-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-db-gray-600 dark:text-gray-400 hover:text-db-gray-800 dark:hover:text-white hover:bg-db-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 border-b border-db-gray-200 dark:border-gray-700 px-6">
        <div className="max-w-7xl mx-auto flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-db-gray-500 hover:text-db-gray-700 hover:border-db-gray-300"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 px-6 py-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {activeTab === "tools" && <ToolsTab />}
          {activeTab === "agents" && <AgentsTab />}
          {activeTab === "endpoints" && <EndpointsTab />}
        </div>
      </div>
    </div>
  );
}
