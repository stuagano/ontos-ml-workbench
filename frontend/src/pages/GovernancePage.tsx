/**
 * GovernancePage - Admin page for RBAC Roles, Teams, Data Domains, and Projects
 *
 * Four tabs: Roles | Teams | Domains | Projects
 * Follows the RegistriesPage tabbed pattern.
 */

import { useState, useEffect, lazy, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  ArrowLeft,
  Shield,
  Users,
  FolderTree,
  Loader2,
  UserPlus,
  X,
  ChevronRight,
  Wrench,
  Briefcase,
  FileCheck,
  Play,
  Archive,
  XCircle,
  ShieldAlert,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Info,
  Zap,
  GitBranch,
  CircleDot,
  PlayCircle,
  StopCircle,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Tag,
  UserCheck,
  XOctagon,
  Ban,
  Brain,
  Link2,
  Box,
  Hash,
  Type,
  CheckCircle2,
  AlertCircle,
  Truck,
  Clock,
  Key,
  Cpu,
  Plug,
  RefreshCw,
  Eye,
  Copy,
  LayoutList,
  Network,
} from "lucide-react";
import { clsx } from "clsx";
import {
  listRoles,
  listUserAssignments,
  assignUserRole,
  listTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  listTeamMembers,
  addTeamMember,
  removeTeamMember,
  listDomains,
  getDomainTree,
  createDomain,
  deleteDomain,
  listProjects,
  createProject,
  deleteProject,
  listProjectMembers,
  addProjectMember,
  removeProjectMember,
  listContracts,
  createContract,
  updateContract,
  transitionContractStatus,
  deleteContract,
  listPolicies,
  createPolicy,
  updatePolicy,
  togglePolicy,
  deletePolicy,
  runEvaluation,
  listWorkflows,
  createWorkflow,
  updateWorkflow,
  activateWorkflow,
  disableWorkflow,
  deleteWorkflow,
  listWorkflowExecutions,
  startWorkflowExecution,
  cancelWorkflowExecution,
  listDataProducts,
  createDataProduct,
  transitionProductStatus,
  deleteDataProduct,
  addProductPort,
  removeProductPort,
  listProductSubscriptions,
  approveSubscription,
  rejectSubscription,
  revokeSubscription,
  listSemanticModels,
  createSemanticModel,
  publishSemanticModel,
  archiveSemanticModel,
  deleteSemanticModel,
  createConcept,
  deleteConcept,
  addConceptProperty,
  removeConceptProperty,
  createSemanticLink,
  deleteSemanticLink,
  listNamingConventions,
  createNamingConvention,
  deleteNamingConvention,
  toggleNamingConvention,
  validateName,
  listDeliveryModes,
  createDeliveryMode,
  deleteDeliveryMode,
  listDeliveryRecords,
  createDeliveryRecord,
  transitionDeliveryRecord,
  getMCPStats,
  listMCPTokens,
  createMCPToken,
  revokeMCPToken,
  deleteMCPToken,
  listMCPTools,
  createMCPTool,
  deleteMCPTool,
  listMCPInvocations,
  getConnectorStats,
  listConnectors,
  createConnector,
  deleteConnector,
  testConnector,
  listConnectorAssets,
  syncConnector,
  listConnectorSyncs,
} from "../services/governance";
import { useToast } from "../components/Toast";
import type {
  AccessLevel,
  DomainTreeNode,
  ContractColumnSpec,
  ContractQualityRule,
  ContractStatus,
  PolicyCategory,
  PolicySeverity,
  PolicyRuleCondition,
  WorkflowStep,
  WorkflowTriggerType,
  WorkflowStepType,
  DataProductType,
  DataProductStatus,
  DataProductPort,
  ConceptType,
  SemanticModelStatus,
  NamingEntityType,
  DeliveryModeType,
  MCPTokenScope,
  MCPToolCategory,
  ConnectorPlatform,
  SyncDirection,
} from "../types/governance";

const UnifiedGraphView = lazy(() => import("../components/semantic/UnifiedGraphView"));

export type TabId = "roles" | "teams" | "domains" | "projects" | "contracts" | "policies" | "workflows" | "products" | "semantic" | "naming" | "delivery" | "mcp" | "connectors";

interface GovernancePageProps {
  onClose: () => void;
  initialTab?: TabId;
}

// ============================================================================
// Permission Matrix
// ============================================================================

const FEATURES = [
  "sheets", "templates", "labels", "training", "deploy",
  "monitor", "improve", "labeling_jobs", "registries", "admin", "governance",
];

const LEVEL_COLORS: Record<AccessLevel, string> = {
  none: "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600",
  read: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  write: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  admin: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
};

function PermissionBadge({ level }: { level: AccessLevel }) {
  return (
    <span className={clsx("px-2 py-0.5 rounded text-xs font-medium", LEVEL_COLORS[level])}>
      {level}
    </span>
  );
}

// ============================================================================
// Roles Tab
// ============================================================================

function RolesTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [assignEmail, setAssignEmail] = useState("");
  const [assignRoleId, setAssignRoleId] = useState("");

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["governance-roles"],
    queryFn: listRoles,
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["governance-user-assignments"],
    queryFn: listUserAssignments,
  });

  const assignMutation = useMutation({
    mutationFn: (data: { user_email: string; role_id: string }) =>
      assignUserRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-user-assignments"] });
      toast.success("Role Assigned", "User role updated successfully");
      setAssignEmail("");
      setAssignRoleId("");
    },
    onError: (err: Error) => toast.error("Assignment Failed", err.message),
  });

  if (rolesLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-db-orange" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* Permission Matrix */}
      <div>
        <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white mb-4">
          Role Permission Matrix
        </h3>
        <div className="overflow-x-auto border border-db-gray-200 dark:border-gray-700 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-db-gray-50 dark:bg-gray-800">
                <th className="text-left p-3 font-medium text-db-gray-600 dark:text-gray-400 sticky left-0 bg-db-gray-50 dark:bg-gray-800">Role</th>
                {FEATURES.map((f) => (
                  <th key={f} className="text-center p-3 font-medium text-db-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {f.replace("_", " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id} className="border-t border-db-gray-100 dark:border-gray-800">
                  <td className="p-3 font-medium text-db-gray-800 dark:text-white sticky left-0 bg-white dark:bg-gray-900">
                    <div>{role.name}</div>
                    {role.description && (
                      <div className="text-xs text-db-gray-500 dark:text-gray-500 mt-0.5">{role.description}</div>
                    )}
                  </td>
                  {FEATURES.map((f) => (
                    <td key={f} className="text-center p-3">
                      <PermissionBadge level={(role.feature_permissions[f] || "none") as AccessLevel} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Assignments */}
      <div>
        <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white mb-4">
          User Role Assignments
        </h3>

        {/* Assign form */}
        <div className="flex items-end gap-3 mb-4 p-4 bg-db-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex-1">
            <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={assignEmail}
              onChange={(e) => setAssignEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
            />
          </div>
          <div className="w-48">
            <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Role</label>
            <select
              value={assignRoleId}
              onChange={(e) => setAssignRoleId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
            >
              <option value="">Select role...</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => assignEmail && assignRoleId && assignMutation.mutate({ user_email: assignEmail, role_id: assignRoleId })}
            disabled={!assignEmail || !assignRoleId || assignMutation.isPending}
            className="px-4 py-2 text-sm bg-db-orange text-white rounded-lg hover:bg-db-red disabled:opacity-50 transition-colors"
          >
            {assignMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign"}
          </button>
        </div>

        {/* Assignments list */}
        {assignmentsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-db-orange" /></div>
        ) : assignments.length === 0 ? (
          <p className="text-sm text-db-gray-500 dark:text-gray-500 py-4">No user assignments yet. New users auto-receive the data_consumer role.</p>
        ) : (
          <div className="border border-db-gray-200 dark:border-gray-700 rounded-lg divide-y divide-db-gray-100 dark:divide-gray-800">
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-db-gray-800 dark:text-white">{a.user_email}</div>
                  {a.user_display_name && (
                    <div className="text-xs text-db-gray-500 dark:text-gray-500">{a.user_display_name}</div>
                  )}
                </div>
                <span className="px-3 py-1 text-xs font-medium bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 rounded-full">
                  {a.role_name || a.role_id}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Teams Tab
// ============================================================================

function TeamsTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newTool, setNewTool] = useState("");

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ["governance-teams"],
    queryFn: listTeams,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["governance-team-members", selectedTeam],
    queryFn: () => listTeamMembers(selectedTeam!),
    enabled: !!selectedTeam,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => createTeam(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-teams"] });
      toast.success("Team Created", "New team created successfully");
      setShowCreate(false);
      setNewTeamName("");
      setNewTeamDesc("");
    },
    onError: (err: Error) => toast.error("Create Failed", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-teams"] });
      toast.success("Team Deleted", "Team removed successfully");
      setSelectedTeam(null);
    },
    onError: (err: Error) => toast.error("Delete Failed", err.message),
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({ teamId, data }: { teamId: string; data: Partial<{ metadata: { tools: string[] } }> }) =>
      updateTeam(teamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-teams"] });
      toast.success("Team Updated", "Team metadata updated");
    },
    onError: (err: Error) => toast.error("Update Failed", err.message),
  });

  const addMemberMutation = useMutation({
    mutationFn: (data: { user_email: string }) => addTeamMember(selectedTeam!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-team-members", selectedTeam] });
      queryClient.invalidateQueries({ queryKey: ["governance-teams"] });
      toast.success("Member Added", "Team member added");
      setNewMemberEmail("");
    },
    onError: (err: Error) => toast.error("Add Failed", err.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => removeTeamMember(selectedTeam!, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-team-members", selectedTeam] });
      queryClient.invalidateQueries({ queryKey: ["governance-teams"] });
      toast.success("Member Removed", "Team member removed");
    },
    onError: (err: Error) => toast.error("Remove Failed", err.message),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-db-orange" /></div>;
  }

  // Detail view
  if (selectedTeam) {
    const team = teams.find((t) => t.id === selectedTeam);
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedTeam(null)} className="flex items-center gap-2 text-sm text-db-gray-600 dark:text-gray-400 hover:text-db-gray-800 dark:hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to teams
        </button>

        {team && (
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white">{team.name}</h3>
              {team.description && <p className="text-sm text-db-gray-500 dark:text-gray-500 mt-1">{team.description}</p>}
            </div>
            <button
              onClick={() => { if (confirm("Delete this team?")) deleteMutation.mutate(team.id); }}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tools metadata */}
        {team && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-db-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Wrench className="w-4 h-4" /> Tools
            </h4>
            <div className="flex flex-wrap gap-2">
              {(team.metadata?.tools ?? []).map((tool) => (
                <span
                  key={tool}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-sm bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-full"
                >
                  {tool}
                  <button
                    onClick={() => {
                      const updated = (team.metadata?.tools ?? []).filter((t) => t !== tool);
                      updateTeamMutation.mutate({ teamId: team.id, data: { metadata: { tools: updated } } });
                    }}
                    className="p-0.5 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {(team.metadata?.tools ?? []).length === 0 && (
                <span className="text-xs text-db-gray-400 dark:text-gray-600">No tools assigned</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={newTool}
                onChange={(e) => setNewTool(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTool.trim()) {
                    const current = team.metadata?.tools ?? [];
                    if (!current.includes(newTool.trim())) {
                      updateTeamMutation.mutate({ teamId: team.id, data: { metadata: { tools: [...current, newTool.trim()] } } });
                    }
                    setNewTool("");
                  }
                }}
                placeholder="Add tool (e.g., MLflow, DSPy, DQX)..."
                className="flex-1 px-3 py-1.5 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
              />
              <button
                onClick={() => {
                  if (newTool.trim()) {
                    const current = team.metadata?.tools ?? [];
                    if (!current.includes(newTool.trim())) {
                      updateTeamMutation.mutate({ teamId: team.id, data: { metadata: { tools: [...current, newTool.trim()] } } });
                    }
                    setNewTool("");
                  }
                }}
                disabled={!newTool.trim() || updateTeamMutation.isPending}
                className="px-3 py-1.5 text-sm bg-db-orange text-white rounded-lg hover:bg-db-red disabled:opacity-50 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* Add member */}
        <div className="flex items-end gap-3 p-4 bg-db-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex-1">
            <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Add Member</label>
            <input
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
            />
          </div>
          <button
            onClick={() => newMemberEmail && addMemberMutation.mutate({ user_email: newMemberEmail })}
            disabled={!newMemberEmail || addMemberMutation.isPending}
            className="px-4 py-2 text-sm bg-db-orange text-white rounded-lg hover:bg-db-red disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Members list */}
        {members.length === 0 ? (
          <p className="text-sm text-db-gray-500 dark:text-gray-500 py-4">No members yet.</p>
        ) : (
          <div className="border border-db-gray-200 dark:border-gray-700 rounded-lg divide-y divide-db-gray-100 dark:divide-gray-800">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-db-gray-800 dark:text-white">{m.user_email}</div>
                  {m.role_override_name && (
                    <div className="text-xs text-db-gray-500 dark:text-gray-500">Override: {m.role_override_name}</div>
                  )}
                </div>
                <button
                  onClick={() => removeMemberMutation.mutate(m.id)}
                  className="p-1.5 text-db-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white">Teams</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-1.5 text-sm bg-db-orange text-white rounded-lg hover:bg-db-red transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Team
        </button>
      </div>

      {showCreate && (
        <div className="p-4 border border-db-gray-200 dark:border-gray-700 rounded-lg space-y-3">
          <input
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="Team name"
            className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
          />
          <input
            value={newTeamDesc}
            onChange={(e) => setNewTeamDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
          />
          <div className="flex gap-2">
            <button
              onClick={() => newTeamName && createMutation.mutate({ name: newTeamName, description: newTeamDesc || undefined })}
              disabled={!newTeamName || createMutation.isPending}
              className="px-4 py-2 text-sm bg-db-orange text-white rounded-lg hover:bg-db-red disabled:opacity-50"
            >
              Create
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-db-gray-600 dark:text-gray-400">
              Cancel
            </button>
          </div>
        </div>
      )}

      {teams.length === 0 ? (
        <p className="text-sm text-db-gray-500 dark:text-gray-500 py-8 text-center">No teams created yet.</p>
      ) : (
        <div className="border border-db-gray-200 dark:border-gray-700 rounded-lg divide-y divide-db-gray-100 dark:divide-gray-800">
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => setSelectedTeam(team.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-db-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div>
                <div className="text-sm font-medium text-db-gray-800 dark:text-white">{team.name}</div>
                {team.description && (
                  <div className="text-xs text-db-gray-500 dark:text-gray-500 mt-0.5">{team.description}</div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {(team.metadata?.tools ?? []).length > 0 && (
                  <div className="flex items-center gap-1">
                    <Wrench className="w-3 h-3 text-db-gray-400" />
                    <span className="text-xs text-db-gray-400 dark:text-gray-600">
                      {team.metadata.tools.slice(0, 3).join(", ")}
                      {team.metadata.tools.length > 3 && ` +${team.metadata.tools.length - 3}`}
                    </span>
                  </div>
                )}
                <span className="text-xs text-db-gray-500 dark:text-gray-500">{team.member_count} members</span>
                <ChevronRight className="w-4 h-4 text-db-gray-400" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Domains Tab
// ============================================================================

function DomainNode({
  node,
  depth = 0,
  onDelete,
}: {
  node: DomainTreeNode;
  depth?: number;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <div
        className="group flex items-center gap-2 px-4 py-2.5 hover:bg-db-gray-50 dark:hover:bg-gray-800/50"
        style={{ paddingLeft: `${16 + depth * 24}px` }}
      >
        {node.color && (
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: node.color }} />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-db-gray-800 dark:text-white truncate">{node.name}</div>
          {node.description && (
            <div className="text-xs text-db-gray-500 dark:text-gray-500 truncate">{node.description}</div>
          )}
        </div>
        {node.owner_email && (
          <span className="text-xs text-db-gray-400 dark:text-gray-600 truncate max-w-[200px]">{node.owner_email}</span>
        )}
        <button
          onClick={() => { if (confirm(`Delete domain "${node.name}"?`)) onDelete(node.id); }}
          className="p-1 text-db-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {node.children.map((child) => (
        <DomainNode key={child.id} node={child} depth={depth + 1} onDelete={onDelete} />
      ))}
    </>
  );
}

function DomainsTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newParentId, setNewParentId] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [newColor, setNewColor] = useState("#3B82F6");

  const { data: tree = [], isLoading: treeLoading } = useQuery({
    queryKey: ["governance-domain-tree"],
    queryFn: getDomainTree,
  });

  const { data: flatDomains = [] } = useQuery({
    queryKey: ["governance-domains"],
    queryFn: listDomains,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; parent_id?: string; owner_email?: string; color?: string }) =>
      createDomain(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-domain-tree"] });
      queryClient.invalidateQueries({ queryKey: ["governance-domains"] });
      toast.success("Domain Created", "New data domain created");
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      setNewParentId("");
      setNewOwner("");
    },
    onError: (err: Error) => toast.error("Create Failed", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDomain,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-domain-tree"] });
      queryClient.invalidateQueries({ queryKey: ["governance-domains"] });
      toast.success("Domain Deleted", "Data domain removed");
    },
    onError: (err: Error) => toast.error("Delete Failed", err.message),
  });

  if (treeLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-db-orange" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white">Data Domains</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-1.5 text-sm bg-db-orange text-white rounded-lg hover:bg-db-red transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Domain
        </button>
      </div>

      {showCreate && (
        <div className="p-4 border border-db-gray-200 dark:border-gray-700 rounded-lg space-y-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Domain name"
            className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Parent Domain</label>
              <select
                value={newParentId}
                onChange={(e) => setNewParentId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
              >
                <option value="">None (root)</option>
                {flatDomains.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Owner Email</label>
              <input
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                placeholder="owner@example.com"
                className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-db-gray-600 dark:text-gray-400">Color</label>
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => newName && createMutation.mutate({
                name: newName,
                description: newDesc || undefined,
                parent_id: newParentId || undefined,
                owner_email: newOwner || undefined,
                color: newColor,
              })}
              disabled={!newName || createMutation.isPending}
              className="px-4 py-2 text-sm bg-db-orange text-white rounded-lg hover:bg-db-red disabled:opacity-50"
            >
              Create
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-db-gray-600 dark:text-gray-400">
              Cancel
            </button>
          </div>
        </div>
      )}

      {tree.length === 0 ? (
        <p className="text-sm text-db-gray-500 dark:text-gray-500 py-8 text-center">No domains created yet.</p>
      ) : (
        <div className="border border-db-gray-200 dark:border-gray-700 rounded-lg divide-y divide-db-gray-100 dark:divide-gray-800">
          {tree.map((node) => (
            <DomainNode key={node.id} node={node} onDelete={(id) => deleteMutation.mutate(id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Projects Tab (G8)
// ============================================================================

function ProjectsTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState<"personal" | "team">("team");
  const [newMemberEmail, setNewMemberEmail] = useState("");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["governance-projects"],
    queryFn: listProjects,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["governance-teams"],
    queryFn: listTeams,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["governance-project-members", selectedProject],
    queryFn: () => listProjectMembers(selectedProject!),
    enabled: !!selectedProject,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; project_type?: "personal" | "team" }) =>
      createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-projects"] });
      toast.success("Project Created", "New project created successfully");
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      setNewType("team");
    },
    onError: (err: Error) => toast.error("Create Failed", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-projects"] });
      toast.success("Project Deleted", "Project removed successfully");
      setSelectedProject(null);
    },
    onError: (err: Error) => toast.error("Delete Failed", err.message),
  });

  const addMemberMutation = useMutation({
    mutationFn: (data: { user_email: string }) => addProjectMember(selectedProject!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-project-members", selectedProject] });
      queryClient.invalidateQueries({ queryKey: ["governance-projects"] });
      toast.success("Member Added", "Project member added");
      setNewMemberEmail("");
    },
    onError: (err: Error) => toast.error("Add Failed", err.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => removeProjectMember(selectedProject!, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-project-members", selectedProject] });
      queryClient.invalidateQueries({ queryKey: ["governance-projects"] });
      toast.success("Member Removed", "Project member removed");
    },
    onError: (err: Error) => toast.error("Remove Failed", err.message),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-db-orange" /></div>;
  }

  // Detail view
  if (selectedProject) {
    const project = projects.find((p) => p.id === selectedProject);
    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedProject(null)} className="flex items-center gap-2 text-sm text-db-gray-600 dark:text-gray-400 hover:text-db-gray-800 dark:hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to projects
        </button>

        {project && (
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white flex items-center gap-2">
                {project.name}
                <span className={clsx(
                  "px-2 py-0.5 text-xs rounded-full font-medium",
                  project.project_type === "personal"
                    ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400"
                    : "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400",
                )}>
                  {project.project_type}
                </span>
              </h3>
              {project.description && <p className="text-sm text-db-gray-500 dark:text-gray-500 mt-1">{project.description}</p>}
              <p className="text-xs text-db-gray-400 dark:text-gray-600 mt-1">
                Owner: {project.owner_email}
                {project.team_name && <> · Team: {project.team_name}</>}
              </p>
            </div>
            <button
              onClick={() => { if (confirm("Delete this project?")) deleteMutation.mutate(project.id); }}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Add member */}
        <div className="flex items-end gap-3 p-4 bg-db-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex-1">
            <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Add Member</label>
            <input
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
            />
          </div>
          <button
            onClick={() => newMemberEmail && addMemberMutation.mutate({ user_email: newMemberEmail })}
            disabled={!newMemberEmail || addMemberMutation.isPending}
            className="px-4 py-2 text-sm bg-db-orange text-white rounded-lg hover:bg-db-red disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Members list */}
        {members.length === 0 ? (
          <p className="text-sm text-db-gray-500 dark:text-gray-500 py-4">No members yet.</p>
        ) : (
          <div className="border border-db-gray-200 dark:border-gray-700 rounded-lg divide-y divide-db-gray-100 dark:divide-gray-800">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-sm font-medium text-db-gray-800 dark:text-white">{m.user_email}</div>
                  </div>
                  <span className={clsx(
                    "px-2 py-0.5 text-xs rounded-full font-medium",
                    m.role === "owner" ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
                      : m.role === "admin" ? "bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400"
                      : "bg-db-gray-100 dark:bg-gray-800 text-db-gray-600 dark:text-gray-400",
                  )}>
                    {m.role}
                  </span>
                </div>
                {m.role !== "owner" && (
                  <button
                    onClick={() => removeMemberMutation.mutate(m.id)}
                    className="p-1.5 text-db-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white">Projects</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-1.5 text-sm bg-db-orange text-white rounded-lg hover:bg-db-red transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {showCreate && (
        <div className="p-4 border border-db-gray-200 dark:border-gray-700 rounded-lg space-y-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Project name"
            className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as "personal" | "team")}
                className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
              >
                <option value="team">Team</option>
                <option value="personal">Personal</option>
              </select>
            </div>
            {newType === "team" && (
              <div>
                <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Team (optional)</label>
                <select
                  className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
                  onChange={(e) => {/* team_id would be passed on create */}}
                  defaultValue=""
                >
                  <option value="">None</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => newName && createMutation.mutate({ name: newName, description: newDesc || undefined, project_type: newType })}
              disabled={!newName || createMutation.isPending}
              className="px-4 py-2 text-sm bg-db-orange text-white rounded-lg hover:bg-db-red disabled:opacity-50"
            >
              Create
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-db-gray-600 dark:text-gray-400">
              Cancel
            </button>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <p className="text-sm text-db-gray-500 dark:text-gray-500 py-8 text-center">No projects created yet.</p>
      ) : (
        <div className="border border-db-gray-200 dark:border-gray-700 rounded-lg divide-y divide-db-gray-100 dark:divide-gray-800">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedProject(project.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-db-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div>
                <div className="text-sm font-medium text-db-gray-800 dark:text-white flex items-center gap-2">
                  {project.name}
                  <span className={clsx(
                    "px-1.5 py-0.5 text-[10px] rounded font-medium",
                    project.project_type === "personal"
                      ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                      : "bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400",
                  )}>
                    {project.project_type}
                  </span>
                </div>
                {project.description && (
                  <div className="text-xs text-db-gray-500 dark:text-gray-500 mt-0.5">{project.description}</div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {project.team_name && (
                  <span className="text-xs text-db-gray-400 dark:text-gray-600">{project.team_name}</span>
                )}
                <span className="text-xs text-db-gray-500 dark:text-gray-500">{project.member_count} members</span>
                <ChevronRight className="w-4 h-4 text-db-gray-400" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Contracts Tab (G5)
// ============================================================================

const STATUS_COLORS: Record<ContractStatus, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  active: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  deprecated: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  retired: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
};

const COLUMN_TYPES = ["STRING", "INT", "BIGINT", "DOUBLE", "FLOAT", "BOOLEAN", "TIMESTAMP", "DATE", "BINARY", "ARRAY", "MAP", "STRUCT"];
const QUALITY_METRICS = ["completeness", "freshness", "accuracy", "uniqueness", "consistency", "validity"];
const QUALITY_OPERATORS = [">=", "<=", "==", ">", "<"];

function ContractsTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Create form state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newVersion, setNewVersion] = useState("1.0.0");
  const [newOwner, setNewOwner] = useState("");

  // Schema editor state (for detail view)
  const [editColumns, setEditColumns] = useState<ContractColumnSpec[]>([]);
  const [editRules, setEditRules] = useState<ContractQualityRule[]>([]);
  const [editPurpose, setEditPurpose] = useState("");
  const [editLimitations, setEditLimitations] = useState("");
  const [editRetention, setEditRetention] = useState("");

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["governance-contracts", filterStatus],
    queryFn: () => listContracts(filterStatus ? { status: filterStatus as ContractStatus } : undefined),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; version?: string; owner_email?: string }) =>
      createContract(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-contracts"] });
      toast.success("Contract Created", "New data contract created as draft");
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      setNewVersion("1.0.0");
      setNewOwner("");
    },
    onError: (err: Error) => toast.error("Create Failed", err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateContract(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-contracts"] });
      toast.success("Contract Updated", "Data contract updated");
    },
    onError: (err: Error) => toast.error("Update Failed", err.message),
  });

  const transitionMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "deprecated" | "retired" }) =>
      transitionContractStatus(id, status),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["governance-contracts"] });
      toast.success("Status Changed", `Contract is now ${vars.status}`);
    },
    onError: (err: Error) => toast.error("Transition Failed", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-contracts"] });
      toast.success("Contract Deleted", "Data contract removed");
      setSelectedContract(null);
    },
    onError: (err: Error) => toast.error("Delete Failed", err.message),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-db-orange" /></div>;
  }

  // Detail view
  if (selectedContract) {
    const contract = contracts.find((c) => c.id === selectedContract);
    if (!contract) return null;

    // Sync local state on first render of detail
    const syncSchema = () => {
      setEditColumns(contract.schema_definition ?? []);
      setEditRules(contract.quality_rules ?? []);
      setEditPurpose(contract.terms?.purpose ?? "");
      setEditLimitations(contract.terms?.limitations ?? "");
      setEditRetention(contract.terms?.retention_days?.toString() ?? "");
    };

    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedContract(null)} className="flex items-center gap-2 text-sm text-db-gray-600 dark:text-gray-400 hover:text-db-gray-800 dark:hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to contracts
        </button>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white flex items-center gap-2">
              {contract.name}
              <span className="text-xs text-db-gray-400 font-normal">v{contract.version}</span>
              <span className={clsx("px-2 py-0.5 text-xs rounded-full font-medium", STATUS_COLORS[contract.status as ContractStatus])}>
                {contract.status}
              </span>
            </h3>
            {contract.description && <p className="text-sm text-db-gray-500 dark:text-gray-500 mt-1">{contract.description}</p>}
            <p className="text-xs text-db-gray-400 dark:text-gray-600 mt-1">
              {contract.owner_email && <>Owner: {contract.owner_email}</>}
              {contract.domain_name && <> · Domain: {contract.domain_name}</>}
              {contract.dataset_name && <> · Dataset: {contract.dataset_name}</>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Lifecycle transitions */}
            {contract.status === "draft" && (
              <button
                onClick={() => transitionMutation.mutate({ id: contract.id, status: "active" })}
                disabled={transitionMutation.isPending}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" /> Activate
              </button>
            )}
            {contract.status === "active" && (
              <button
                onClick={() => transitionMutation.mutate({ id: contract.id, status: "deprecated" })}
                disabled={transitionMutation.isPending}
                className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-1.5"
              >
                <Archive className="w-3.5 h-3.5" /> Deprecate
              </button>
            )}
            {contract.status === "deprecated" && (
              <button
                onClick={() => transitionMutation.mutate({ id: contract.id, status: "retired" })}
                disabled={transitionMutation.isPending}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" /> Retire
              </button>
            )}
            <button
              onClick={() => { if (confirm("Delete this contract?")) deleteMutation.mutate(contract.id); }}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Schema Definition */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-db-gray-700 dark:text-gray-300">Schema Definition</h4>
            <div className="flex gap-2">
              <button
                onClick={syncSchema}
                className="px-2 py-1 text-xs text-db-gray-500 hover:text-db-gray-700 dark:hover:text-gray-300"
              >
                Reset
              </button>
              <button
                onClick={() => {
                  updateMutation.mutate({
                    id: contract.id,
                    data: {
                      schema_definition: editColumns,
                      quality_rules: editRules,
                      terms: {
                        purpose: editPurpose || null,
                        limitations: editLimitations || null,
                        retention_days: editRetention ? parseInt(editRetention) : null,
                      },
                    },
                  });
                }}
                disabled={updateMutation.isPending}
                className="px-3 py-1 text-xs bg-db-orange text-white rounded-lg hover:bg-db-red disabled:opacity-50 transition-colors"
              >
                {updateMutation.isPending ? "Saving..." : "Save All"}
              </button>
            </div>
          </div>

          {/* Columns table */}
          <div className="border border-db-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-db-gray-50 dark:bg-gray-800">
                  <th className="text-left p-2 font-medium text-db-gray-600 dark:text-gray-400">Name</th>
                  <th className="text-left p-2 font-medium text-db-gray-600 dark:text-gray-400">Type</th>
                  <th className="text-center p-2 font-medium text-db-gray-600 dark:text-gray-400">Required</th>
                  <th className="text-left p-2 font-medium text-db-gray-600 dark:text-gray-400">Description</th>
                  <th className="w-10 p-2"></th>
                </tr>
              </thead>
              <tbody>
                {editColumns.map((col, idx) => (
                  <tr key={idx} className="border-t border-db-gray-100 dark:border-gray-800">
                    <td className="p-2">
                      <input
                        value={col.name}
                        onChange={(e) => {
                          const updated = [...editColumns];
                          updated[idx] = { ...col, name: e.target.value };
                          setEditColumns(updated);
                        }}
                        className="w-full px-2 py-1 text-sm border border-db-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
                        placeholder="column_name"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={col.type}
                        onChange={(e) => {
                          const updated = [...editColumns];
                          updated[idx] = { ...col, type: e.target.value };
                          setEditColumns(updated);
                        }}
                        className="w-full px-2 py-1 text-sm border border-db-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
                      >
                        {COLUMN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={col.required}
                        onChange={(e) => {
                          const updated = [...editColumns];
                          updated[idx] = { ...col, required: e.target.checked };
                          setEditColumns(updated);
                        }}
                        className="rounded"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        value={col.description ?? ""}
                        onChange={(e) => {
                          const updated = [...editColumns];
                          updated[idx] = { ...col, description: e.target.value || null };
                          setEditColumns(updated);
                        }}
                        className="w-full px-2 py-1 text-sm border border-db-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
                        placeholder="Description..."
                      />
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => setEditColumns(editColumns.filter((_, i) => i !== idx))}
                        className="p-1 text-db-gray-400 hover:text-red-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              onClick={() => setEditColumns([...editColumns, { name: "", type: "STRING", required: false, description: null, constraints: null }])}
              className="w-full px-4 py-2 text-sm text-db-gray-500 hover:bg-db-gray-50 dark:hover:bg-gray-800/50 border-t border-db-gray-100 dark:border-gray-800 flex items-center gap-1.5 justify-center"
            >
              <Plus className="w-3.5 h-3.5" /> Add Column
            </button>
          </div>
        </div>

        {/* Quality Rules (SLOs) */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-db-gray-700 dark:text-gray-300">Quality Rules (SLOs)</h4>
          <div className="space-y-2">
            {editRules.map((rule, idx) => (
              <div key={idx} className="flex items-center gap-2 p-3 bg-db-gray-50 dark:bg-gray-800/50 rounded-lg">
                <select
                  value={rule.metric}
                  onChange={(e) => {
                    const updated = [...editRules];
                    updated[idx] = { ...rule, metric: e.target.value };
                    setEditRules(updated);
                  }}
                  className="px-2 py-1.5 text-sm border border-db-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
                >
                  {QUALITY_METRICS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select
                  value={rule.operator}
                  onChange={(e) => {
                    const updated = [...editRules];
                    updated[idx] = { ...rule, operator: e.target.value };
                    setEditRules(updated);
                  }}
                  className="w-20 px-2 py-1.5 text-sm border border-db-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
                >
                  {QUALITY_OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={rule.threshold}
                  onChange={(e) => {
                    const updated = [...editRules];
                    updated[idx] = { ...rule, threshold: parseFloat(e.target.value) || 0 };
                    setEditRules(updated);
                  }}
                  className="w-24 px-2 py-1.5 text-sm border border-db-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
                />
                <input
                  value={rule.description ?? ""}
                  onChange={(e) => {
                    const updated = [...editRules];
                    updated[idx] = { ...rule, description: e.target.value || null };
                    setEditRules(updated);
                  }}
                  placeholder="Description..."
                  className="flex-1 px-2 py-1.5 text-sm border border-db-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
                />
                <button
                  onClick={() => setEditRules(editRules.filter((_, i) => i !== idx))}
                  className="p-1 text-db-gray-400 hover:text-red-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setEditRules([...editRules, { metric: "completeness", operator: ">=", threshold: 0.95, description: null }])}
              className="px-3 py-1.5 text-sm text-db-gray-500 hover:text-db-gray-700 dark:hover:text-gray-300 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Rule
            </button>
          </div>
        </div>

        {/* Usage Terms */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-db-gray-700 dark:text-gray-300">Usage Terms</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Purpose</label>
              <input
                value={editPurpose}
                onChange={(e) => setEditPurpose(e.target.value)}
                placeholder="Intended use of the data..."
                className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Limitations</label>
              <input
                value={editLimitations}
                onChange={(e) => setEditLimitations(e.target.value)}
                placeholder="Usage restrictions..."
                className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
              />
            </div>
          </div>
          <div className="w-48">
            <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Retention (days)</label>
            <input
              type="number"
              value={editRetention}
              onChange={(e) => setEditRetention(e.target.value)}
              placeholder="365"
              className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
            />
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white">Data Contracts</h3>
        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="deprecated">Deprecated</option>
            <option value="retired">Retired</option>
          </select>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-3 py-1.5 text-sm bg-db-orange text-white rounded-lg hover:bg-db-red transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Contract
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="p-4 border border-db-gray-200 dark:border-gray-700 rounded-lg space-y-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Contract name"
            className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Version</label>
              <input
                value={newVersion}
                onChange={(e) => setNewVersion(e.target.value)}
                placeholder="1.0.0"
                className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Owner Email</label>
              <input
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                placeholder="owner@example.com"
                className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => newName && createMutation.mutate({
                name: newName,
                description: newDesc || undefined,
                version: newVersion || undefined,
                owner_email: newOwner || undefined,
              })}
              disabled={!newName || createMutation.isPending}
              className="px-4 py-2 text-sm bg-db-orange text-white rounded-lg hover:bg-db-red disabled:opacity-50"
            >
              Create
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-db-gray-600 dark:text-gray-400">
              Cancel
            </button>
          </div>
        </div>
      )}

      {contracts.length === 0 ? (
        <p className="text-sm text-db-gray-500 dark:text-gray-500 py-8 text-center">
          {filterStatus ? `No ${filterStatus} contracts.` : "No data contracts created yet."}
        </p>
      ) : (
        <div className="border border-db-gray-200 dark:border-gray-700 rounded-lg divide-y divide-db-gray-100 dark:divide-gray-800">
          {contracts.map((contract) => (
            <button
              key={contract.id}
              onClick={() => {
                setSelectedContract(contract.id);
                setEditColumns(contract.schema_definition ?? []);
                setEditRules(contract.quality_rules ?? []);
                setEditPurpose(contract.terms?.purpose ?? "");
                setEditLimitations(contract.terms?.limitations ?? "");
                setEditRetention(contract.terms?.retention_days?.toString() ?? "");
              }}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-db-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div>
                <div className="text-sm font-medium text-db-gray-800 dark:text-white flex items-center gap-2">
                  {contract.name}
                  <span className="text-xs text-db-gray-400 font-normal">v{contract.version}</span>
                  <span className={clsx("px-1.5 py-0.5 text-[10px] rounded font-medium", STATUS_COLORS[contract.status as ContractStatus])}>
                    {contract.status}
                  </span>
                </div>
                {contract.description && (
                  <div className="text-xs text-db-gray-500 dark:text-gray-500 mt-0.5">{contract.description}</div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {contract.schema_definition.length > 0 && (
                  <span className="text-xs text-db-gray-400 dark:text-gray-600">
                    {contract.schema_definition.length} cols
                  </span>
                )}
                {contract.quality_rules.length > 0 && (
                  <span className="text-xs text-db-gray-400 dark:text-gray-600">
                    {contract.quality_rules.length} SLOs
                  </span>
                )}
                {contract.domain_name && (
                  <span className="text-xs text-db-gray-400 dark:text-gray-600">{contract.domain_name}</span>
                )}
                <ChevronRight className="w-4 h-4 text-db-gray-400" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Policies Tab (G6)
// ============================================================================

const CATEGORY_LABELS: Record<PolicyCategory, string> = {
  data_quality: "Data Quality",
  access_control: "Access Control",
  retention: "Retention",
  naming: "Naming",
  lineage: "Lineage",
};

const SEVERITY_CONFIG: Record<PolicySeverity, { icon: typeof Info; color: string }> = {
  info: { icon: Info, color: "text-blue-500" },
  warning: { icon: AlertTriangle, color: "text-amber-500" },
  critical: { icon: Zap, color: "text-red-500" },
};

const RULE_OPERATORS = [">=", "<=", "==", "!=", ">", "<", "contains", "matches"];

function PoliciesTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("");

  // Create form state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<PolicyCategory>("data_quality");
  const [newSeverity, setNewSeverity] = useState<PolicySeverity>("warning");
  const [newRules, setNewRules] = useState<PolicyRuleCondition[]>([
    { field: "", operator: ">=", value: 0, message: null },
  ]);

  // Detail edit state
  const [editRules, setEditRules] = useState<PolicyRuleCondition[]>([]);

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["governance-policies", filterCategory],
    queryFn: () => listPolicies(filterCategory ? { category: filterCategory as PolicyCategory } : undefined),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; category?: string; severity?: string; rules: PolicyRuleCondition[] }) =>
      createPolicy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-policies"] });
      toast.success("Policy Created", "Compliance policy created and enabled");
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      setNewCategory("data_quality");
      setNewSeverity("warning");
      setNewRules([{ field: "", operator: ">=", value: 0, message: null }]);
    },
    onError: (err: Error) => toast.error("Create Failed", err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updatePolicy(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-policies"] });
      toast.success("Policy Updated", "Compliance policy updated");
    },
    onError: (err: Error) => toast.error("Update Failed", err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      togglePolicy(id, enabled),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["governance-policies"] });
      toast.success("Policy Toggled", `Policy ${vars.enabled ? "enabled" : "disabled"}`);
    },
    onError: (err: Error) => toast.error("Toggle Failed", err.message),
  });

  const evaluateMutation = useMutation({
    mutationFn: (policyId: string) => runEvaluation(policyId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["governance-policies"] });
      toast.success("Evaluation Complete", `Result: ${result.status} (${result.passed_checks}/${result.total_checks} passed)`);
    },
    onError: (err: Error) => toast.error("Evaluation Failed", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-policies"] });
      toast.success("Policy Deleted", "Compliance policy removed");
      setSelectedPolicy(null);
    },
    onError: (err: Error) => toast.error("Delete Failed", err.message),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-db-orange" /></div>;
  }

  // Detail view
  if (selectedPolicy) {
    const policy = policies.find((p) => p.id === selectedPolicy);
    if (!policy) return null;
    const SevIcon = SEVERITY_CONFIG[policy.severity]?.icon || Info;

    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedPolicy(null)} className="flex items-center gap-2 text-sm text-db-gray-600 dark:text-gray-400 hover:text-db-gray-800 dark:hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to policies
        </button>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white flex items-center gap-2">
              <SevIcon className={clsx("w-5 h-5", SEVERITY_CONFIG[policy.severity]?.color)} />
              {policy.name}
              <span className={clsx(
                "px-2 py-0.5 text-xs rounded-full font-medium",
                policy.status === "enabled"
                  ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500",
              )}>
                {policy.status}
              </span>
            </h3>
            {policy.description && <p className="text-sm text-db-gray-500 dark:text-gray-500 mt-1">{policy.description}</p>}
            <p className="text-xs text-db-gray-400 dark:text-gray-600 mt-1">
              {CATEGORY_LABELS[policy.category]} · {policy.severity}
              {policy.owner_email && <> · Owner: {policy.owner_email}</>}
              {policy.schedule && <> · Schedule: {policy.schedule}</>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleMutation.mutate({ id: policy.id, enabled: policy.status !== "enabled" })}
              disabled={toggleMutation.isPending}
              className="px-3 py-1.5 text-sm text-db-gray-600 dark:text-gray-400 hover:bg-db-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {policy.status === "enabled"
                ? <><ToggleRight className="w-4 h-4 text-green-500" /> Enabled</>
                : <><ToggleLeft className="w-4 h-4 text-gray-400" /> Disabled</>
              }
            </button>
            <button
              onClick={() => evaluateMutation.mutate(policy.id)}
              disabled={evaluateMutation.isPending}
              className="px-3 py-1.5 text-sm bg-db-orange text-white rounded-lg hover:bg-db-red transition-colors flex items-center gap-1.5"
            >
              {evaluateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Evaluate
            </button>
            <button
              onClick={() => { if (confirm("Delete this policy?")) deleteMutation.mutate(policy.id); }}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Last Evaluation */}
        {policy.last_evaluation && (
          <div className={clsx(
            "p-4 rounded-lg border",
            policy.last_evaluation.status === "passed"
              ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
              : policy.last_evaluation.status === "failed"
                ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700",
          )}>
            <div className="flex items-center justify-between mb-2">
              <span className={clsx(
                "text-sm font-medium",
                policy.last_evaluation.status === "passed" ? "text-green-700 dark:text-green-400"
                  : policy.last_evaluation.status === "failed" ? "text-red-700 dark:text-red-400"
                    : "text-gray-600 dark:text-gray-400",
              )}>
                Last Evaluation: {policy.last_evaluation.status.toUpperCase()}
              </span>
              <span className="text-xs text-db-gray-400">
                {policy.last_evaluation.passed_checks}/{policy.last_evaluation.total_checks} passed
                {policy.last_evaluation.duration_ms != null && <> · {policy.last_evaluation.duration_ms}ms</>}
              </span>
            </div>
            {policy.last_evaluation.results.length > 0 && (
              <div className="space-y-1">
                {policy.last_evaluation.results.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className={r.passed ? "text-green-600" : "text-red-600"}>{r.passed ? "PASS" : "FAIL"}</span>
                    <span className="text-db-gray-600 dark:text-gray-400">{r.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rules */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-db-gray-700 dark:text-gray-300">Rule Conditions</h4>
            <div className="flex gap-2">
              <button
                onClick={() => setEditRules(policy.rules ?? [])}
                className="px-2 py-1 text-xs text-db-gray-500 hover:text-db-gray-700 dark:hover:text-gray-300"
              >
                Reset
              </button>
              <button
                onClick={() => updateMutation.mutate({ id: policy.id, data: { rules: editRules } })}
                disabled={updateMutation.isPending}
                className="px-3 py-1 text-xs bg-db-orange text-white rounded-lg hover:bg-db-red disabled:opacity-50 transition-colors"
              >
                {updateMutation.isPending ? "Saving..." : "Save Rules"}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {editRules.map((rule, idx) => (
              <div key={idx} className="flex items-center gap-2 p-3 bg-db-gray-50 dark:bg-gray-800/50 rounded-lg">
                <input
                  value={rule.field}
                  onChange={(e) => {
                    const updated = [...editRules];
                    updated[idx] = { ...rule, field: e.target.value };
                    setEditRules(updated);
                  }}
                  placeholder="field / metric"
                  className="flex-1 px-2 py-1.5 text-sm border border-db-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
                />
                <select
                  value={rule.operator}
                  onChange={(e) => {
                    const updated = [...editRules];
                    updated[idx] = { ...rule, operator: e.target.value };
                    setEditRules(updated);
                  }}
                  className="w-24 px-2 py-1.5 text-sm border border-db-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
                >
                  {RULE_OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <input
                  value={String(rule.value)}
                  onChange={(e) => {
                    const updated = [...editRules];
                    const numVal = parseFloat(e.target.value);
                    updated[idx] = { ...rule, value: isNaN(numVal) ? e.target.value : numVal };
                    setEditRules(updated);
                  }}
                  placeholder="value"
                  className="w-28 px-2 py-1.5 text-sm border border-db-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
                />
                <input
                  value={rule.message ?? ""}
                  onChange={(e) => {
                    const updated = [...editRules];
                    updated[idx] = { ...rule, message: e.target.value || null };
                    setEditRules(updated);
                  }}
                  placeholder="Violation message..."
                  className="flex-1 px-2 py-1.5 text-sm border border-db-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
                />
                <button
                  onClick={() => setEditRules(editRules.filter((_, i) => i !== idx))}
                  className="p-1 text-db-gray-400 hover:text-red-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              onClick={() => setEditRules([...editRules, { field: "", operator: ">=", value: 0, message: null }])}
              className="px-3 py-1.5 text-sm text-db-gray-500 hover:text-db-gray-700 dark:hover:text-gray-300 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Rule
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white">Compliance Policies</h3>
        <div className="flex items-center gap-3">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
          >
            <option value="">All categories</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-3 py-1.5 text-sm bg-db-orange text-white rounded-lg hover:bg-db-red transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Policy
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="p-4 border border-db-gray-200 dark:border-gray-700 rounded-lg space-y-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Policy name"
            className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as PolicyCategory)}
                className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Severity</label>
              <select
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value as PolicySeverity)}
                className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Rules for new policy */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400">Rules (at least one required)</label>
            {newRules.map((rule, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  value={rule.field}
                  onChange={(e) => {
                    const updated = [...newRules];
                    updated[idx] = { ...rule, field: e.target.value };
                    setNewRules(updated);
                  }}
                  placeholder="field"
                  className="flex-1 px-2 py-1.5 text-sm border border-db-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
                />
                <select
                  value={rule.operator}
                  onChange={(e) => {
                    const updated = [...newRules];
                    updated[idx] = { ...rule, operator: e.target.value };
                    setNewRules(updated);
                  }}
                  className="w-20 px-2 py-1.5 text-sm border border-db-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
                >
                  {RULE_OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <input
                  value={String(rule.value)}
                  onChange={(e) => {
                    const updated = [...newRules];
                    const numVal = parseFloat(e.target.value);
                    updated[idx] = { ...rule, value: isNaN(numVal) ? e.target.value : numVal };
                    setNewRules(updated);
                  }}
                  placeholder="value"
                  className="w-24 px-2 py-1.5 text-sm border border-db-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
                />
                {newRules.length > 1 && (
                  <button onClick={() => setNewRules(newRules.filter((_, i) => i !== idx))} className="p-1 text-db-gray-400 hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setNewRules([...newRules, { field: "", operator: ">=", value: 0, message: null }])}
              className="px-2 py-1 text-xs text-db-gray-500 hover:text-db-gray-700 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add Rule
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                const validRules = newRules.filter((r) => r.field.trim());
                if (newName && validRules.length > 0) {
                  createMutation.mutate({
                    name: newName,
                    description: newDesc || undefined,
                    category: newCategory,
                    severity: newSeverity,
                    rules: validRules,
                  });
                }
              }}
              disabled={!newName || !newRules.some((r) => r.field.trim()) || createMutation.isPending}
              className="px-4 py-2 text-sm bg-db-orange text-white rounded-lg hover:bg-db-red disabled:opacity-50"
            >
              Create
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-db-gray-600 dark:text-gray-400">
              Cancel
            </button>
          </div>
        </div>
      )}

      {policies.length === 0 ? (
        <p className="text-sm text-db-gray-500 dark:text-gray-500 py-8 text-center">
          {filterCategory ? `No ${CATEGORY_LABELS[filterCategory as PolicyCategory] || filterCategory} policies.` : "No compliance policies created yet."}
        </p>
      ) : (
        <div className="border border-db-gray-200 dark:border-gray-700 rounded-lg divide-y divide-db-gray-100 dark:divide-gray-800">
          {policies.map((policy) => {
            const SevIcon = SEVERITY_CONFIG[policy.severity]?.icon || Info;
            return (
              <button
                key={policy.id}
                onClick={() => {
                  setSelectedPolicy(policy.id);
                  setEditRules(policy.rules ?? []);
                }}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-db-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <SevIcon className={clsx("w-4 h-4 flex-shrink-0", SEVERITY_CONFIG[policy.severity]?.color)} />
                  <div>
                    <div className="text-sm font-medium text-db-gray-800 dark:text-white flex items-center gap-2">
                      {policy.name}
                      <span className={clsx(
                        "px-1.5 py-0.5 text-[10px] rounded font-medium",
                        policy.status === "enabled"
                          ? "bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500",
                      )}>
                        {policy.status}
                      </span>
                    </div>
                    {policy.description && (
                      <div className="text-xs text-db-gray-500 dark:text-gray-500 mt-0.5">{policy.description}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-db-gray-400 dark:text-gray-600">
                    {CATEGORY_LABELS[policy.category]}
                  </span>
                  <span className="text-xs text-db-gray-400 dark:text-gray-600">
                    {policy.rules.length} rules
                  </span>
                  {policy.last_evaluation && (
                    <span className={clsx(
                      "px-1.5 py-0.5 text-[10px] rounded font-medium",
                      policy.last_evaluation.status === "passed"
                        ? "bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400"
                        : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400",
                    )}>
                      {policy.last_evaluation.status}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-db-gray-400" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Workflows Tab (G7)
// ============================================================================

const TRIGGER_LABELS: Record<WorkflowTriggerType, string> = {
  manual: "Manual",
  on_create: "On Create",
  on_update: "On Update",
  on_review: "On Review",
  scheduled: "Scheduled",
};

const STEP_TYPE_ICONS: Record<WorkflowStepType, { label: string; color: string }> = {
  action: { label: "Action", color: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400" },
  approval: { label: "Approval", color: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
  notification: { label: "Notify", color: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400" },
  condition: { label: "Condition", color: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400" },
};

const STEP_ACTIONS = [
  "request_review", "run_policy", "send_notification", "update_status",
  "create_task", "assign_reviewer", "approve_asset", "reject_asset",
];

function WorkflowsTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newTrigger, setNewTrigger] = useState<WorkflowTriggerType>("manual");
  const [newSteps, setNewSteps] = useState<WorkflowStep[]>([
    { step_id: "step-1", name: "", type: "action", action: "request_review", config: null, next_step: null, on_reject: null },
  ]);

  // Detail edit state
  const [editSteps, setEditSteps] = useState<WorkflowStep[]>([]);

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["governance-workflows"],
    queryFn: () => listWorkflows(),
  });

  const { data: executions = [] } = useQuery({
    queryKey: ["governance-workflow-executions", selectedWorkflow],
    queryFn: () => listWorkflowExecutions(selectedWorkflow!),
    enabled: !!selectedWorkflow,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; trigger_type?: WorkflowTriggerType; steps: WorkflowStep[] }) =>
      createWorkflow(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-workflows"] });
      toast.success("Workflow Created", "New workflow created as draft");
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      setNewTrigger("manual");
      setNewSteps([{ step_id: "step-1", name: "", type: "action", action: "request_review", config: null, next_step: null, on_reject: null }]);
    },
    onError: (err: Error) => toast.error("Create Failed", err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateWorkflow(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-workflows"] });
      toast.success("Workflow Updated", "Workflow steps updated");
    },
    onError: (err: Error) => toast.error("Update Failed", err.message),
  });

  const activateMutation = useMutation({
    mutationFn: activateWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-workflows"] });
      toast.success("Workflow Activated", "Workflow is now active");
    },
    onError: (err: Error) => toast.error("Activate Failed", err.message),
  });

  const disableMutation = useMutation({
    mutationFn: disableWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-workflows"] });
      toast.success("Workflow Disabled", "Workflow has been disabled");
    },
    onError: (err: Error) => toast.error("Disable Failed", err.message),
  });

  const executeMutation = useMutation({
    mutationFn: startWorkflowExecution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-workflow-executions", selectedWorkflow] });
      queryClient.invalidateQueries({ queryKey: ["governance-workflows"] });
      toast.success("Execution Started", "Workflow execution has been triggered");
    },
    onError: (err: Error) => toast.error("Execute Failed", err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelWorkflowExecution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-workflow-executions", selectedWorkflow] });
      toast.success("Execution Cancelled", "Workflow execution cancelled");
    },
    onError: (err: Error) => toast.error("Cancel Failed", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-workflows"] });
      toast.success("Workflow Deleted", "Workflow removed");
      setSelectedWorkflow(null);
    },
    onError: (err: Error) => toast.error("Delete Failed", err.message),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-db-orange" /></div>;
  }

  // Step editor helper
  const renderStepEditor = (steps: WorkflowStep[], setSteps: (s: WorkflowStep[]) => void) => (
    <div className="space-y-2">
      {steps.map((step, idx) => (
        <div key={idx} className="flex items-start gap-2 p-3 bg-db-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex items-center gap-1 mt-1.5 text-db-gray-400">
            <CircleDot className="w-3.5 h-3.5" />
            <span className="text-xs font-mono">{idx + 1}</span>
          </div>
          <div className="flex-1 grid grid-cols-4 gap-2">
            <input
              value={step.name}
              onChange={(e) => {
                const updated = [...steps];
                updated[idx] = { ...step, name: e.target.value };
                setSteps(updated);
              }}
              placeholder="Step name"
              className="px-2 py-1.5 text-sm border border-db-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
            />
            <select
              value={step.type}
              onChange={(e) => {
                const updated = [...steps];
                updated[idx] = { ...step, type: e.target.value as WorkflowStepType };
                setSteps(updated);
              }}
              className="px-2 py-1.5 text-sm border border-db-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
            >
              <option value="action">Action</option>
              <option value="approval">Approval</option>
              <option value="notification">Notification</option>
              <option value="condition">Condition</option>
            </select>
            <select
              value={step.action ?? ""}
              onChange={(e) => {
                const updated = [...steps];
                updated[idx] = { ...step, action: e.target.value || null };
                setSteps(updated);
              }}
              className="px-2 py-1.5 text-sm border border-db-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
            >
              <option value="">No action</option>
              {STEP_ACTIONS.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
            </select>
            <div className="flex items-center gap-1">
              {step.type === "approval" && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400">Blocks</span>
              )}
              <button
                onClick={() => setSteps(steps.filter((_, i) => i !== idx))}
                className="ml-auto p-1 text-db-gray-400 hover:text-red-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
      <button
        onClick={() => {
          const nextId = `step-${steps.length + 1}`;
          // Wire previous step's next_step
          const updated = steps.map((s, i) =>
            i === steps.length - 1 ? { ...s, next_step: nextId } : s
          );
          setSteps([...updated, { step_id: nextId, name: "", type: "action", action: null, config: null, next_step: null, on_reject: null }]);
        }}
        className="px-3 py-1.5 text-sm text-db-gray-500 hover:text-db-gray-700 dark:hover:text-gray-300 flex items-center gap-1.5"
      >
        <Plus className="w-3.5 h-3.5" /> Add Step
      </button>
    </div>
  );

  // Detail view
  if (selectedWorkflow) {
    const workflow = workflows.find((w) => w.id === selectedWorkflow);
    if (!workflow) return null;

    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedWorkflow(null)} className="flex items-center gap-2 text-sm text-db-gray-600 dark:text-gray-400 hover:text-db-gray-800 dark:hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to workflows
        </button>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white flex items-center gap-2">
              {workflow.name}
              <span className={clsx(
                "px-2 py-0.5 text-xs rounded-full font-medium",
                workflow.status === "active" ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400"
                  : workflow.status === "disabled" ? "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500",
              )}>
                {workflow.status}
              </span>
            </h3>
            {workflow.description && <p className="text-sm text-db-gray-500 dark:text-gray-500 mt-1">{workflow.description}</p>}
            <p className="text-xs text-db-gray-400 dark:text-gray-600 mt-1">
              Trigger: {TRIGGER_LABELS[workflow.trigger_type]}
              {workflow.owner_email && <> · Owner: {workflow.owner_email}</>}
              · {workflow.execution_count} executions
            </p>
          </div>
          <div className="flex items-center gap-2">
            {workflow.status === "draft" && (
              <button
                onClick={() => activateMutation.mutate(workflow.id)}
                disabled={activateMutation.isPending}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" /> Activate
              </button>
            )}
            {workflow.status === "active" && (
              <>
                <button
                  onClick={() => executeMutation.mutate(workflow.id)}
                  disabled={executeMutation.isPending}
                  className="px-3 py-1.5 text-sm bg-db-orange text-white rounded-lg hover:bg-db-red transition-colors flex items-center gap-1.5"
                >
                  {executeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
                  Run
                </button>
                <button
                  onClick={() => disableMutation.mutate(workflow.id)}
                  disabled={disableMutation.isPending}
                  className="px-3 py-1.5 text-sm text-db-gray-600 dark:text-gray-400 hover:bg-db-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <StopCircle className="w-3.5 h-3.5" /> Disable
                </button>
              </>
            )}
            {workflow.status === "disabled" && (
              <button
                onClick={() => activateMutation.mutate(workflow.id)}
                disabled={activateMutation.isPending}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" /> Re-activate
              </button>
            )}
            <button
              onClick={() => { if (confirm("Delete this workflow?")) deleteMutation.mutate(workflow.id); }}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-db-gray-700 dark:text-gray-300">Workflow Steps</h4>
            <div className="flex gap-2">
              <button
                onClick={() => setEditSteps(workflow.steps ?? [])}
                className="px-2 py-1 text-xs text-db-gray-500 hover:text-db-gray-700 dark:hover:text-gray-300"
              >
                Reset
              </button>
              <button
                onClick={() => updateMutation.mutate({ id: workflow.id, data: { steps: editSteps } })}
                disabled={updateMutation.isPending}
                className="px-3 py-1 text-xs bg-db-orange text-white rounded-lg hover:bg-db-red disabled:opacity-50 transition-colors"
              >
                {updateMutation.isPending ? "Saving..." : "Save Steps"}
              </button>
            </div>
          </div>

          {/* Visual step flow */}
          <div className="space-y-1">
            {editSteps.map((step, idx) => (
              <div key={idx}>
                <div className="flex items-center gap-3 p-3 border border-db-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-db-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-mono text-db-gray-600 dark:text-gray-400">
                      {idx + 1}
                    </span>
                  </div>
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <input
                      value={step.name}
                      onChange={(e) => {
                        const updated = [...editSteps];
                        updated[idx] = { ...step, name: e.target.value };
                        setEditSteps(updated);
                      }}
                      placeholder="Step name"
                      className="px-2 py-1.5 text-sm border border-db-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
                    />
                    <select
                      value={step.type}
                      onChange={(e) => {
                        const updated = [...editSteps];
                        updated[idx] = { ...step, type: e.target.value as WorkflowStepType };
                        setEditSteps(updated);
                      }}
                      className="px-2 py-1.5 text-sm border border-db-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
                    >
                      <option value="action">Action</option>
                      <option value="approval">Approval</option>
                      <option value="notification">Notification</option>
                      <option value="condition">Condition</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <select
                        value={step.action ?? ""}
                        onChange={(e) => {
                          const updated = [...editSteps];
                          updated[idx] = { ...step, action: e.target.value || null };
                          setEditSteps(updated);
                        }}
                        className="flex-1 px-2 py-1.5 text-sm border border-db-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
                      >
                        <option value="">No action</option>
                        {STEP_ACTIONS.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
                      </select>
                      <button
                        onClick={() => setEditSteps(editSteps.filter((_, i) => i !== idx))}
                        className="p-1 text-db-gray-400 hover:text-red-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <span className={clsx("px-2 py-0.5 text-[10px] rounded font-medium", STEP_TYPE_ICONS[step.type as WorkflowStepType]?.color || "bg-gray-100 text-gray-500")}>
                    {STEP_TYPE_ICONS[step.type as WorkflowStepType]?.label || step.type}
                  </span>
                </div>
                {idx < editSteps.length - 1 && (
                  <div className="flex justify-center py-0.5">
                    <div className="w-px h-4 bg-db-gray-300 dark:bg-gray-600" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              const nextId = `step-${editSteps.length + 1}`;
              const updated = editSteps.map((s, i) =>
                i === editSteps.length - 1 ? { ...s, next_step: nextId } : s
              );
              setEditSteps([...updated, { step_id: nextId, name: "", type: "action", action: null, config: null, next_step: null, on_reject: null }]);
            }}
            className="px-3 py-1.5 text-sm text-db-gray-500 hover:text-db-gray-700 dark:hover:text-gray-300 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Step
          </button>
        </div>

        {/* Execution History */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-db-gray-700 dark:text-gray-300">Execution History</h4>
          {executions.length === 0 ? (
            <p className="text-sm text-db-gray-500 dark:text-gray-500 py-4">No executions yet.</p>
          ) : (
            <div className="border border-db-gray-200 dark:border-gray-700 rounded-lg divide-y divide-db-gray-100 dark:divide-gray-800">
              {executions.map((exec) => (
                <div key={exec.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={clsx(
                      "px-2 py-0.5 text-xs rounded-full font-medium",
                      exec.status === "completed" ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400"
                        : exec.status === "running" ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400"
                          : exec.status === "failed" ? "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-500",
                    )}>
                      {exec.status}
                    </span>
                    <div>
                      <span className="text-xs text-db-gray-500 dark:text-gray-500">
                        {exec.step_results.length} steps completed
                      </span>
                      {exec.current_step && (
                        <span className="text-xs text-db-gray-400 dark:text-gray-600 ml-2">
                          Current: {exec.current_step}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-db-gray-400 dark:text-gray-600">
                      {exec.started_by}
                    </span>
                    {exec.status === "running" && (
                      <button
                        onClick={() => cancelMutation.mutate(exec.id)}
                        disabled={cancelMutation.isPending}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white">Process Workflows</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-1.5 text-sm bg-db-orange text-white rounded-lg hover:bg-db-red transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Workflow
        </button>
      </div>

      {showCreate && (
        <div className="p-4 border border-db-gray-200 dark:border-gray-700 rounded-lg space-y-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Workflow name"
            className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
          />
          <div>
            <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Trigger</label>
            <select
              value={newTrigger}
              onChange={(e) => setNewTrigger(e.target.value as WorkflowTriggerType)}
              className="w-48 px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
            >
              {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Steps</label>
            {renderStepEditor(newSteps, setNewSteps)}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const validSteps = newSteps.filter((s) => s.name.trim());
                if (newName && validSteps.length > 0) {
                  createMutation.mutate({
                    name: newName,
                    description: newDesc || undefined,
                    trigger_type: newTrigger,
                    steps: validSteps,
                  });
                }
              }}
              disabled={!newName || !newSteps.some((s) => s.name.trim()) || createMutation.isPending}
              className="px-4 py-2 text-sm bg-db-orange text-white rounded-lg hover:bg-db-red disabled:opacity-50"
            >
              Create
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-db-gray-600 dark:text-gray-400">
              Cancel
            </button>
          </div>
        </div>
      )}

      {workflows.length === 0 ? (
        <p className="text-sm text-db-gray-500 dark:text-gray-500 py-8 text-center">No workflows created yet.</p>
      ) : (
        <div className="border border-db-gray-200 dark:border-gray-700 rounded-lg divide-y divide-db-gray-100 dark:divide-gray-800">
          {workflows.map((workflow) => (
            <button
              key={workflow.id}
              onClick={() => {
                setSelectedWorkflow(workflow.id);
                setEditSteps(workflow.steps ?? []);
              }}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-db-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <GitBranch className="w-4 h-4 text-db-gray-400 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-db-gray-800 dark:text-white flex items-center gap-2">
                    {workflow.name}
                    <span className={clsx(
                      "px-1.5 py-0.5 text-[10px] rounded font-medium",
                      workflow.status === "active" ? "bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400"
                        : workflow.status === "disabled" ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500",
                    )}>
                      {workflow.status}
                    </span>
                  </div>
                  {workflow.description && (
                    <div className="text-xs text-db-gray-500 dark:text-gray-500 mt-0.5">{workflow.description}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-db-gray-400 dark:text-gray-600">
                  {TRIGGER_LABELS[workflow.trigger_type]}
                </span>
                <span className="text-xs text-db-gray-400 dark:text-gray-600">
                  {workflow.steps.length} steps
                </span>
                <span className="text-xs text-db-gray-400 dark:text-gray-600">
                  {workflow.execution_count} runs
                </span>
                <ChevronRight className="w-4 h-4 text-db-gray-400" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Data Products Tab (G9)
// ============================================================================

const PRODUCT_TYPE_LABELS: Record<DataProductType, string> = {
  source: "Source",
  source_aligned: "Source-Aligned",
  aggregate: "Aggregate",
  consumer_aligned: "Consumer-Aligned",
};

const PRODUCT_STATUS_COLORS: Record<DataProductStatus, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  published: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  deprecated: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  retired: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
};

const PRODUCT_TYPE_COLORS: Record<DataProductType, string> = {
  source: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  source_aligned: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400",
  aggregate: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
  consumer_aligned: "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400",
};

const ENTITY_TYPES = ["dataset", "contract", "model", "endpoint"];

function DataProductsTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Create form state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState<string>("source");
  const [newOwner, setNewOwner] = useState("");
  const [newTagInput, setNewTagInput] = useState("");
  const [newTags, setNewTags] = useState<string[]>([]);

  // Port editor state (for detail view)
  const [showAddPort, setShowAddPort] = useState(false);
  const [portName, setPortName] = useState("");
  const [portDesc, setPortDesc] = useState("");
  const [portType, setPortType] = useState<string>("output");
  const [portEntityType, setPortEntityType] = useState<string>("");
  const [portEntityName, setPortEntityName] = useState("");

  // Subscription view
  const [showSubs, setShowSubs] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["governance-products", filterType, filterStatus],
    queryFn: () => listDataProducts({
      ...(filterType ? { product_type: filterType as DataProductType } : {}),
      ...(filterStatus ? { status: filterStatus as DataProductStatus } : {}),
    }),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; product_type?: string; owner_email?: string; tags?: string[] }) =>
      createDataProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-products"] });
      toast.success("Product Created", "New data product created as draft");
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      setNewType("source");
      setNewOwner("");
      setNewTags([]);
    },
    onError: (err: Error) => toast.error("Create Failed", err.message),
  });

  const transitionMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "published" | "deprecated" | "retired" }) =>
      transitionProductStatus(id, status),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["governance-products"] });
      toast.success("Status Changed", `Product is now ${vars.status}`);
    },
    onError: (err: Error) => toast.error("Transition Failed", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDataProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-products"] });
      toast.success("Product Deleted", "Data product removed");
      setSelectedProduct(null);
    },
    onError: (err: Error) => toast.error("Delete Failed", err.message),
  });

  const addPortMutation = useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: { name: string; description?: string; port_type?: string; entity_type?: string; entity_name?: string } }) =>
      addProductPort(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-products"] });
      toast.success("Port Added", "Port added to data product");
      setShowAddPort(false);
      setPortName("");
      setPortDesc("");
      setPortType("output");
      setPortEntityType("");
      setPortEntityName("");
    },
    onError: (err: Error) => toast.error("Add Port Failed", err.message),
  });

  const removePortMutation = useMutation({
    mutationFn: removeProductPort,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-products"] });
      toast.success("Port Removed", "Port removed from data product");
    },
    onError: (err: Error) => toast.error("Remove Port Failed", err.message),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-db-orange" /></div>;
  }

  // Detail view
  if (selectedProduct) {
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return null;

    const inputPorts = (product.ports || []).filter((p) => p.port_type === "input");
    const outputPorts = (product.ports || []).filter((p) => p.port_type === "output");

    return (
      <div className="space-y-6">
        <button onClick={() => { setSelectedProduct(null); setShowSubs(false); }} className="flex items-center gap-2 text-sm text-db-gray-600 dark:text-gray-400 hover:text-db-gray-800 dark:hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to products
        </button>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-500" />
              {product.name}
              <span className={clsx("px-2 py-0.5 text-xs rounded-full font-medium", PRODUCT_TYPE_COLORS[product.product_type])}>
                {PRODUCT_TYPE_LABELS[product.product_type]}
              </span>
              <span className={clsx("px-2 py-0.5 text-xs rounded-full font-medium", PRODUCT_STATUS_COLORS[product.status])}>
                {product.status}
              </span>
            </h3>
            {product.description && <p className="text-sm text-db-gray-500 dark:text-gray-500 mt-1">{product.description}</p>}
            <p className="text-xs text-db-gray-400 dark:text-gray-600 mt-1">
              {product.owner_email && <>Owner: {product.owner_email}</>}
              {product.domain_name && <> · Domain: {product.domain_name}</>}
              {product.team_name && <> · Team: {product.team_name}</>}
            </p>
            {product.tags.length > 0 && (
              <div className="flex gap-1 mt-2">
                {product.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-db-gray-100 dark:bg-gray-800 text-db-gray-600 dark:text-gray-400 rounded">
                    <Tag className="w-3 h-3" />{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {product.status === "draft" && (
              <button
                onClick={() => transitionMutation.mutate({ id: product.id, status: "published" })}
                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1"
              >
                <Play className="w-3 h-3" /> Publish
              </button>
            )}
            {product.status === "published" && (
              <button
                onClick={() => transitionMutation.mutate({ id: product.id, status: "deprecated" })}
                className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 flex items-center gap-1"
              >
                <Archive className="w-3 h-3" /> Deprecate
              </button>
            )}
            {(product.status === "deprecated" || product.status === "published") && (
              <button
                onClick={() => transitionMutation.mutate({ id: product.id, status: "retired" })}
                className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center gap-1"
              >
                <XCircle className="w-3 h-3" /> Retire
              </button>
            )}
            <button
              onClick={() => setShowSubs(!showSubs)}
              className={clsx("px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 border",
                showSubs ? "bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800" : "border-db-gray-200 dark:border-gray-700 text-db-gray-600 dark:text-gray-400 hover:bg-db-gray-50 dark:hover:bg-gray-800"
              )}
            >
              <Users className="w-3 h-3" /> Subscriptions ({product.subscription_count})
            </button>
            <button
              onClick={() => { if (confirm("Delete this data product?")) deleteMutation.mutate(product.id); }}
              className="px-3 py-1.5 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        </div>

        {/* Subscriptions Panel */}
        {showSubs && <SubscriptionsPanel productId={product.id} />}

        {/* Ports Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-db-gray-700 dark:text-gray-300">Input/Output Ports</h4>
            <button
              onClick={() => setShowAddPort(!showAddPort)}
              className="px-3 py-1.5 bg-db-orange text-white text-sm rounded-lg hover:bg-db-orange/90 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add Port
            </button>
          </div>

          {showAddPort && (
            <div className="bg-db-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3 border border-db-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Port Name *</label>
                  <input value={portName} onChange={(e) => setPortName(e.target.value)} className="w-full px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Direction</label>
                  <select value={portType} onChange={(e) => setPortType(e.target.value)} className="w-full px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white">
                    <option value="input">Input</option>
                    <option value="output">Output</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Description</label>
                <input value={portDesc} onChange={(e) => setPortDesc(e.target.value)} className="w-full px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Entity Type</label>
                  <select value={portEntityType} onChange={(e) => setPortEntityType(e.target.value)} className="w-full px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white">
                    <option value="">None</option>
                    {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Entity Name</label>
                  <input value={portEntityName} onChange={(e) => setPortEntityName(e.target.value)} className="w-full px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white" placeholder="e.g., sensor_readings" />
                </div>
              </div>
              <button
                onClick={() => {
                  if (!portName.trim()) return;
                  addPortMutation.mutate({
                    productId: product.id,
                    data: {
                      name: portName.trim(),
                      description: portDesc || undefined,
                      port_type: portType,
                      entity_type: portEntityType || undefined,
                      entity_name: portEntityName || undefined,
                    },
                  });
                }}
                disabled={!portName.trim()}
                className="px-4 py-1.5 bg-db-orange text-white text-sm rounded-lg hover:bg-db-orange/90 disabled:opacity-50"
              >
                Add Port
              </button>
            </div>
          )}

          {/* Input Ports */}
          {inputPorts.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-db-gray-500 dark:text-gray-500 mb-2 flex items-center gap-1">
                <ArrowDownToLine className="w-3 h-3" /> Input Ports ({inputPorts.length})
              </h5>
              <div className="space-y-1">
                {inputPorts.map((port) => (
                  <PortRow key={port.id} port={port} onRemove={() => removePortMutation.mutate(port.id)} />
                ))}
              </div>
            </div>
          )}

          {/* Output Ports */}
          {outputPorts.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-db-gray-500 dark:text-gray-500 mb-2 flex items-center gap-1">
                <ArrowUpFromLine className="w-3 h-3" /> Output Ports ({outputPorts.length})
              </h5>
              <div className="space-y-1">
                {outputPorts.map((port) => (
                  <PortRow key={port.id} port={port} onRemove={() => removePortMutation.mutate(port.id)} />
                ))}
              </div>
            </div>
          )}

          {inputPorts.length === 0 && outputPorts.length === 0 && (
            <p className="text-sm text-db-gray-400 dark:text-gray-600 italic">No ports defined yet. Add input/output ports to describe data flow.</p>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-700 dark:text-gray-300"
          >
            <option value="">All Types</option>
            {(Object.keys(PRODUCT_TYPE_LABELS) as DataProductType[]).map((t) => (
              <option key={t} value={t}>{PRODUCT_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-700 dark:text-gray-300"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="deprecated">Deprecated</option>
            <option value="retired">Retired</option>
          </select>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-db-orange text-white text-sm rounded-lg hover:bg-db-orange/90"
        >
          <Plus className="w-4 h-4" /> New Product
        </button>
      </div>

      {showCreate && (
        <div className="bg-db-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3 border border-db-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Name *</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Type</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value)} className="w-full px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white">
                {(Object.keys(PRODUCT_TYPE_LABELS) as DataProductType[]).map((t) => (
                  <option key={t} value={t}>{PRODUCT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Description</label>
            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="w-full px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Owner Email</label>
              <input value={newOwner} onChange={(e) => setNewOwner(e.target.value)} className="w-full px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Tags</label>
              <div className="flex items-center gap-1">
                <input
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTagInput.trim()) {
                      setNewTags([...newTags, newTagInput.trim()]);
                      setNewTagInput("");
                    }
                  }}
                  placeholder="Press Enter to add"
                  className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
                />
              </div>
              {newTags.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {newTags.map((tag, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-db-gray-200 dark:bg-gray-700 text-db-gray-600 dark:text-gray-400 rounded">
                      {tag}
                      <button onClick={() => setNewTags(newTags.filter((_, j) => j !== i))} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => createMutation.mutate({
              name: newName.trim(),
              description: newDesc || undefined,
              product_type: newType,
              owner_email: newOwner || undefined,
              tags: newTags.length > 0 ? newTags : undefined,
            })}
            disabled={!newName.trim() || createMutation.isPending}
            className="px-4 py-2 bg-db-orange text-white text-sm rounded-lg hover:bg-db-orange/90 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create Product"}
          </button>
        </div>
      )}

      {/* Product List */}
      {products.length === 0 ? (
        <p className="text-center text-sm text-db-gray-400 dark:text-gray-600 py-8">No data products found.</p>
      ) : (
        <div className="space-y-2">
          {products.map((product) => (
            <div
              key={product.id}
              onClick={() => setSelectedProduct(product.id)}
              className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-db-gray-200 dark:border-gray-700 cursor-pointer hover:border-db-orange/50 dark:hover:border-db-orange/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span className="font-medium text-sm text-db-gray-800 dark:text-white truncate">{product.name}</span>
                    <span className={clsx("px-1.5 py-0.5 text-[10px] rounded font-medium", PRODUCT_TYPE_COLORS[product.product_type])}>
                      {PRODUCT_TYPE_LABELS[product.product_type]}
                    </span>
                    <span className={clsx("px-1.5 py-0.5 text-[10px] rounded font-medium", PRODUCT_STATUS_COLORS[product.status])}>
                      {product.status}
                    </span>
                  </div>
                  {product.description && (
                    <div className="text-xs text-db-gray-500 dark:text-gray-500 mt-0.5 ml-6">{product.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {product.port_count > 0 && (
                    <span className="text-xs text-db-gray-400 dark:text-gray-600">{product.port_count} port{product.port_count !== 1 ? "s" : ""}</span>
                  )}
                  {product.subscription_count > 0 && (
                    <span className="text-xs text-db-gray-400 dark:text-gray-600">{product.subscription_count} sub{product.subscription_count !== 1 ? "s" : ""}</span>
                  )}
                  {product.tags.length > 0 && (
                    <div className="flex gap-1">
                      {product.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-db-gray-100 dark:bg-gray-800 text-db-gray-500 dark:text-gray-500 rounded">{tag}</span>
                      ))}
                      {product.tags.length > 3 && <span className="text-[10px] text-db-gray-400">+{product.tags.length - 3}</span>}
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-db-gray-400 dark:text-gray-600" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PortRow({ port, onRemove }: { port: DataProductPort; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded border border-db-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        {port.port_type === "input" ? (
          <ArrowDownToLine className="w-4 h-4 text-blue-500" />
        ) : (
          <ArrowUpFromLine className="w-4 h-4 text-green-500" />
        )}
        <span className="text-sm font-medium text-db-gray-800 dark:text-white">{port.name}</span>
        {port.entity_type && (
          <span className="text-[10px] px-1.5 py-0.5 bg-db-gray-100 dark:bg-gray-800 text-db-gray-500 dark:text-gray-500 rounded">{port.entity_type}</span>
        )}
        {port.entity_name && (
          <span className="text-xs text-db-gray-400 dark:text-gray-600">{port.entity_name}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {port.description && <span className="text-xs text-db-gray-400 dark:text-gray-600 max-w-xs truncate">{port.description}</span>}
        <button onClick={onRemove} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

function SubscriptionsPanel({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ["governance-product-subs", productId],
    queryFn: () => listProductSubscriptions(productId),
  });

  const approveMutation = useMutation({
    mutationFn: approveSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-product-subs", productId] });
      queryClient.invalidateQueries({ queryKey: ["governance-products"] });
      toast.success("Subscription Approved", "Consumer access granted");
    },
    onError: (err: Error) => toast.error("Approve Failed", err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: rejectSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-product-subs", productId] });
      queryClient.invalidateQueries({ queryKey: ["governance-products"] });
      toast.success("Subscription Rejected", "Access request denied");
    },
    onError: (err: Error) => toast.error("Reject Failed", err.message),
  });

  const revokeMutation = useMutation({
    mutationFn: revokeSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-product-subs", productId] });
      queryClient.invalidateQueries({ queryKey: ["governance-products"] });
      toast.success("Subscription Revoked", "Consumer access revoked");
    },
    onError: (err: Error) => toast.error("Revoke Failed", err.message),
  });

  const SUB_STATUS_COLORS: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    approved: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
    rejected: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
    revoked: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };

  if (isLoading) {
    return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-db-orange" /></div>;
  }

  return (
    <div className="bg-purple-50/50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
      <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-3 flex items-center gap-1">
        <Users className="w-4 h-4" /> Subscriptions ({subs.length})
      </h4>
      {subs.length === 0 ? (
        <p className="text-xs text-db-gray-400 dark:text-gray-600 italic">No subscriptions yet.</p>
      ) : (
        <div className="space-y-2">
          {subs.map((sub) => (
            <div key={sub.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded border border-db-gray-200 dark:border-gray-700">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-db-gray-800 dark:text-white">{sub.subscriber_email}</span>
                  <span className={clsx("px-1.5 py-0.5 text-[10px] rounded font-medium", SUB_STATUS_COLORS[sub.status])}>
                    {sub.status}
                  </span>
                </div>
                {sub.purpose && <p className="text-xs text-db-gray-400 dark:text-gray-600 mt-0.5">{sub.purpose}</p>}
              </div>
              <div className="flex items-center gap-1">
                {sub.status === "pending" && (
                  <>
                    <button
                      onClick={() => approveMutation.mutate(sub.id)}
                      className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                    >
                      <UserCheck className="w-3 h-3" /> Approve
                    </button>
                    <button
                      onClick={() => rejectMutation.mutate(sub.id)}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                    >
                      <XOctagon className="w-3 h-3" /> Reject
                    </button>
                  </>
                )}
                {sub.status === "approved" && (
                  <button
                    onClick={() => revokeMutation.mutate(sub.id)}
                    className="px-2 py-1 text-xs text-red-600 border border-red-200 dark:border-red-800 rounded hover:bg-red-50 dark:hover:bg-red-950 flex items-center gap-1"
                  >
                    <Ban className="w-3 h-3" /> Revoke
                  </button>
                )}
                {sub.approved_by && sub.status === "approved" && (
                  <span className="text-[10px] text-db-gray-400 dark:text-gray-600 ml-2">by {sub.approved_by}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Semantic Models Tab (G10)
// ============================================================================

const CONCEPT_TYPE_LABELS: Record<ConceptType, string> = {
  entity: "Entity",
  event: "Event",
  metric: "Metric",
  dimension: "Dimension",
};

const CONCEPT_TYPE_COLORS: Record<ConceptType, string> = {
  entity: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  event: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  metric: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  dimension: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
};

const LINK_TYPE_LABELS: Record<string, string> = {
  maps_to: "Maps To",
  derived_from: "Derived From",
  aggregates: "Aggregates",
  represents: "Represents",
};

const SEMANTIC_STATUS_COLORS: Record<SemanticModelStatus, string> = {
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  published: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  archived: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
};

const DATA_TYPES = ["string", "number", "boolean", "date", "enum"];
const TARGET_TYPES = ["table", "column", "sheet", "contract", "product"];

function SemanticModelsTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [viewMode, setViewMode] = useState<"list" | "graph">("list");

  // Create form
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newVersion, setNewVersion] = useState("1.0.0");
  const [newOwner, setNewOwner] = useState("");

  // Concept form (in detail view)
  const [showAddConcept, setShowAddConcept] = useState(false);
  const [conceptName, setConceptName] = useState("");
  const [conceptDesc, setConceptDesc] = useState("");
  const [conceptType, setConceptType] = useState<string>("entity");

  // Property form
  const [addPropConceptId, setAddPropConceptId] = useState<string | null>(null);
  const [propName, setPropName] = useState("");
  const [propDesc, setPropDesc] = useState("");
  const [propDataType, setPropDataType] = useState<string>("string");
  const [propRequired, setPropRequired] = useState(false);

  // Link form
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkSourceType, setLinkSourceType] = useState<string>("concept");
  const [linkSourceId, setLinkSourceId] = useState("");
  const [linkTargetType, setLinkTargetType] = useState<string>("table");
  const [linkTargetName, setLinkTargetName] = useState("");
  const [linkType, setLinkType] = useState<string>("maps_to");
  const [linkConfidence, setLinkConfidence] = useState("");

  const { data: models = [], isLoading } = useQuery({
    queryKey: ["governance-semantic", filterStatus],
    queryFn: () => listSemanticModels(filterStatus ? { status: filterStatus as SemanticModelStatus } : undefined),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; version?: string; owner_email?: string }) =>
      createSemanticModel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-semantic"] });
      toast.success("Model Created", "New semantic model created as draft");
      setShowCreate(false);
      setNewName(""); setNewDesc(""); setNewVersion("1.0.0"); setNewOwner("");
    },
    onError: (err: Error) => toast.error("Create Failed", err.message),
  });

  const publishMutation = useMutation({
    mutationFn: publishSemanticModel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-semantic"] });
      toast.success("Model Published", "Semantic model is now published");
    },
    onError: (err: Error) => toast.error("Publish Failed", err.message),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveSemanticModel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-semantic"] });
      toast.success("Model Archived", "Semantic model archived");
    },
    onError: (err: Error) => toast.error("Archive Failed", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSemanticModel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-semantic"] });
      toast.success("Model Deleted", "Semantic model removed");
      setSelectedModel(null);
    },
    onError: (err: Error) => toast.error("Delete Failed", err.message),
  });

  const createConceptMutation = useMutation({
    mutationFn: ({ modelId, data }: { modelId: string; data: { name: string; description?: string; concept_type?: string } }) =>
      createConcept(modelId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-semantic"] });
      toast.success("Concept Added", "Business concept created");
      setShowAddConcept(false);
      setConceptName(""); setConceptDesc(""); setConceptType("entity");
    },
    onError: (err: Error) => toast.error("Add Concept Failed", err.message),
  });

  const deleteConceptMutation = useMutation({
    mutationFn: deleteConcept,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-semantic"] });
      toast.success("Concept Deleted", "Business concept and its properties removed");
    },
    onError: (err: Error) => toast.error("Delete Failed", err.message),
  });

  const addPropertyMutation = useMutation({
    mutationFn: ({ modelId, conceptId, data }: { modelId: string; conceptId: string; data: { name: string; description?: string; data_type?: string; is_required?: boolean } }) =>
      addConceptProperty(modelId, conceptId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-semantic"] });
      toast.success("Property Added", "Business property created");
      setAddPropConceptId(null);
      setPropName(""); setPropDesc(""); setPropDataType("string"); setPropRequired(false);
    },
    onError: (err: Error) => toast.error("Add Property Failed", err.message),
  });

  const removePropertyMutation = useMutation({
    mutationFn: removeConceptProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-semantic"] });
      toast.success("Property Removed", "Business property removed");
    },
    onError: (err: Error) => toast.error("Remove Failed", err.message),
  });

  const createLinkMutation = useMutation({
    mutationFn: ({ modelId, data }: { modelId: string; data: { source_type: string; source_id: string; target_type: string; target_name?: string; link_type?: string; confidence?: number } }) =>
      createSemanticLink(modelId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-semantic"] });
      toast.success("Link Created", "Semantic link established");
      setShowAddLink(false);
      setLinkSourceType("concept"); setLinkSourceId(""); setLinkTargetType("table"); setLinkTargetName(""); setLinkType("maps_to"); setLinkConfidence("");
    },
    onError: (err: Error) => toast.error("Create Link Failed", err.message),
  });

  const deleteLinkMutation = useMutation({
    mutationFn: deleteSemanticLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-semantic"] });
      toast.success("Link Deleted", "Semantic link removed");
    },
    onError: (err: Error) => toast.error("Delete Failed", err.message),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-db-orange" /></div>;
  }

  // Detail view
  if (selectedModel) {
    const model = models.find((m) => m.id === selectedModel);
    if (!model) return null;

    // Build flat list of all concepts + properties for link source picker
    const allSources: { id: string; label: string; type: "concept" | "property" }[] = [];
    for (const c of model.concepts || []) {
      allSources.push({ id: c.id, label: `[${CONCEPT_TYPE_LABELS[c.concept_type]}] ${c.name}`, type: "concept" });
      for (const p of c.properties || []) {
        allSources.push({ id: p.id, label: `  ${c.name}.${p.name}`, type: "property" });
      }
    }

    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedModel(null)} className="flex items-center gap-2 text-sm text-db-gray-600 dark:text-gray-400 hover:text-db-gray-800 dark:hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back to semantic models
        </button>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-500" />
              {model.name}
              <span className="text-xs text-db-gray-400 font-normal">v{model.version}</span>
              <span className={clsx("px-2 py-0.5 text-xs rounded-full font-medium", SEMANTIC_STATUS_COLORS[model.status])}>
                {model.status}
              </span>
            </h3>
            {model.description && <p className="text-sm text-db-gray-500 dark:text-gray-500 mt-1">{model.description}</p>}
            <p className="text-xs text-db-gray-400 dark:text-gray-600 mt-1">
              {model.owner_email && <>Owner: {model.owner_email}</>}
              {model.domain_name && <> · Domain: {model.domain_name}</>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 mr-2">
              <button
                onClick={() => setViewMode("list")}
                className={clsx("px-2.5 py-1 text-xs rounded-md flex items-center gap-1 transition-colors", viewMode === "list" ? "bg-white dark:bg-gray-700 shadow-sm text-gray-800 dark:text-white font-medium" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300")}
              >
                <LayoutList className="w-3.5 h-3.5" /> List
              </button>
              <button
                onClick={() => setViewMode("graph")}
                className={clsx("px-2.5 py-1 text-xs rounded-md flex items-center gap-1 transition-colors", viewMode === "graph" ? "bg-white dark:bg-gray-700 shadow-sm text-gray-800 dark:text-white font-medium" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300")}
              >
                <Network className="w-3.5 h-3.5" /> Graph
              </button>
            </div>
            {model.status === "draft" && (
              <button onClick={() => publishMutation.mutate(model.id)} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1">
                <Play className="w-3 h-3" /> Publish
              </button>
            )}
            {model.status === "published" && (
              <button onClick={() => archiveMutation.mutate(model.id)} className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 flex items-center gap-1">
                <Archive className="w-3 h-3" /> Archive
              </button>
            )}
            <button
              onClick={() => { if (confirm("Delete this semantic model?")) deleteMutation.mutate(model.id); }}
              className="px-3 py-1.5 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        </div>

        {viewMode === "graph" && (
          <Suspense fallback={<div className="h-[500px] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-db-orange" /></div>}>
            <UnifiedGraphView model={model} />
          </Suspense>
        )}

        {viewMode === "list" && <>
        {/* Concepts Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-db-gray-700 dark:text-gray-300 flex items-center gap-1">
              <Box className="w-4 h-4" /> Business Concepts ({(model.concepts || []).length})
            </h4>
            <button onClick={() => setShowAddConcept(!showAddConcept)} className="px-3 py-1.5 bg-db-orange text-white text-sm rounded-lg hover:bg-db-orange/90 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Concept
            </button>
          </div>

          {showAddConcept && (
            <div className="bg-db-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3 border border-db-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Name *</label>
                  <input value={conceptName} onChange={(e) => setConceptName(e.target.value)} className="w-full px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white" placeholder="e.g., Equipment" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Type</label>
                  <select value={conceptType} onChange={(e) => setConceptType(e.target.value)} className="w-full px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white">
                    {(Object.keys(CONCEPT_TYPE_LABELS) as ConceptType[]).map((t) => (
                      <option key={t} value={t}>{CONCEPT_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Description</label>
                  <input value={conceptDesc} onChange={(e) => setConceptDesc(e.target.value)} className="w-full px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white" />
                </div>
              </div>
              <button
                onClick={() => { if (conceptName.trim()) createConceptMutation.mutate({ modelId: model.id, data: { name: conceptName.trim(), description: conceptDesc || undefined, concept_type: conceptType } }); }}
                disabled={!conceptName.trim()}
                className="px-4 py-1.5 bg-db-orange text-white text-sm rounded-lg hover:bg-db-orange/90 disabled:opacity-50"
              >
                Add Concept
              </button>
            </div>
          )}

          {(model.concepts || []).length === 0 ? (
            <p className="text-sm text-db-gray-400 dark:text-gray-600 italic">No concepts defined yet. Add business concepts to build the knowledge graph.</p>
          ) : (
            <div className="space-y-3">
              {(model.concepts || []).map((concept) => (
                <div key={concept.id} className="bg-white dark:bg-gray-900 rounded-lg border border-db-gray-200 dark:border-gray-700 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Box className="w-4 h-4 text-indigo-500" />
                      <span className="font-medium text-sm text-db-gray-800 dark:text-white">{concept.name}</span>
                      <span className={clsx("px-1.5 py-0.5 text-[10px] rounded font-medium", CONCEPT_TYPE_COLORS[concept.concept_type])}>
                        {CONCEPT_TYPE_LABELS[concept.concept_type]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setAddPropConceptId(addPropConceptId === concept.id ? null : concept.id); setPropName(""); setPropDesc(""); }}
                        className="px-2 py-1 text-xs text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950"
                      >
                        <Plus className="w-3 h-3 inline" /> Property
                      </button>
                      <button onClick={() => deleteConceptMutation.mutate(concept.id)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {concept.description && <p className="text-xs text-db-gray-500 dark:text-gray-500 mb-2 ml-6">{concept.description}</p>}

                  {/* Properties */}
                  {(concept.properties || []).length > 0 && (
                    <div className="ml-6 space-y-1">
                      {concept.properties.map((prop) => (
                        <div key={prop.id} className="flex items-center justify-between py-1 px-2 bg-db-gray-50 dark:bg-gray-800 rounded text-xs">
                          <div className="flex items-center gap-2">
                            <Hash className="w-3 h-3 text-db-gray-400" />
                            <span className="font-medium text-db-gray-700 dark:text-gray-300">{prop.name}</span>
                            {prop.data_type && <span className="text-db-gray-400 dark:text-gray-600">{prop.data_type}</span>}
                            {prop.is_required && <span className="text-red-500 text-[10px]">required</span>}
                          </div>
                          <button onClick={() => removePropertyMutation.mutate(prop.id)} className="text-red-400 hover:text-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add property form */}
                  {addPropConceptId === concept.id && (
                    <div className="ml-6 mt-2 p-2 bg-indigo-50/50 dark:bg-indigo-950/20 rounded border border-indigo-200 dark:border-indigo-800 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <input value={propName} onChange={(e) => setPropName(e.target.value)} placeholder="Property name" className="px-2 py-1 text-xs rounded border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white" />
                        <select value={propDataType} onChange={(e) => setPropDataType(e.target.value)} className="px-2 py-1 text-xs rounded border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white">
                          {DATA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 text-xs text-db-gray-600 dark:text-gray-400">
                            <input type="checkbox" checked={propRequired} onChange={(e) => setPropRequired(e.target.checked)} className="rounded" />
                            Required
                          </label>
                          <button
                            onClick={() => { if (propName.trim()) addPropertyMutation.mutate({ modelId: model.id, conceptId: concept.id, data: { name: propName.trim(), description: propDesc || undefined, data_type: propDataType, is_required: propRequired } }); }}
                            disabled={!propName.trim()}
                            className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Semantic Links Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-db-gray-700 dark:text-gray-300 flex items-center gap-1">
              <Link2 className="w-4 h-4" /> Semantic Links ({(model.links || []).length})
            </h4>
            <button onClick={() => setShowAddLink(!showAddLink)} className="px-3 py-1.5 bg-db-orange text-white text-sm rounded-lg hover:bg-db-orange/90 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Link
            </button>
          </div>

          {showAddLink && (
            <div className="bg-db-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3 border border-db-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Source (Concept/Property) *</label>
                  <select
                    value={`${linkSourceType}:${linkSourceId}`}
                    onChange={(e) => {
                      const [t, id] = e.target.value.split(":");
                      setLinkSourceType(t);
                      setLinkSourceId(id || "");
                    }}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
                  >
                    <option value=":">Select source...</option>
                    {allSources.map((s) => (
                      <option key={s.id} value={`${s.type}:${s.id}`}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Link Type</label>
                  <select value={linkType} onChange={(e) => setLinkType(e.target.value)} className="w-full px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white">
                    {Object.keys(LINK_TYPE_LABELS).map((t) => (
                      <option key={t} value={t}>{LINK_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Target Type *</label>
                  <select value={linkTargetType} onChange={(e) => setLinkTargetType(e.target.value)} className="w-full px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white">
                    {TARGET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Target Name *</label>
                  <input value={linkTargetName} onChange={(e) => setLinkTargetName(e.target.value)} placeholder="e.g., catalog.schema.table" className="w-full px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Confidence (0-1)</label>
                  <input value={linkConfidence} onChange={(e) => setLinkConfidence(e.target.value)} type="number" step="0.1" min="0" max="1" placeholder="0.9" className="w-full px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white" />
                </div>
              </div>
              <button
                onClick={() => {
                  if (!linkSourceId || !linkTargetName.trim()) return;
                  createLinkMutation.mutate({
                    modelId: model.id,
                    data: {
                      source_type: linkSourceType,
                      source_id: linkSourceId,
                      target_type: linkTargetType,
                      target_name: linkTargetName.trim(),
                      link_type: linkType,
                      confidence: linkConfidence ? parseFloat(linkConfidence) : undefined,
                    },
                  });
                }}
                disabled={!linkSourceId || !linkTargetName.trim()}
                className="px-4 py-1.5 bg-db-orange text-white text-sm rounded-lg hover:bg-db-orange/90 disabled:opacity-50"
              >
                Create Link
              </button>
            </div>
          )}

          {(model.links || []).length === 0 ? (
            <p className="text-sm text-db-gray-400 dark:text-gray-600 italic">No links defined yet. Add links to connect concepts to data assets.</p>
          ) : (
            <div className="space-y-1">
              {(model.links || []).map((link) => {
                const source = allSources.find((s) => s.id === link.source_id);
                return (
                  <div key={link.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded border border-db-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-db-gray-700 dark:text-gray-300">{source?.label || link.source_id.substring(0, 8)}</span>
                      <span className="px-1.5 py-0.5 text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded font-medium">
                        {LINK_TYPE_LABELS[link.link_type] || link.link_type}
                      </span>
                      <span className="text-db-gray-500 dark:text-gray-500">→</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-db-gray-100 dark:bg-gray-800 text-db-gray-500 dark:text-gray-500 rounded">{link.target_type}</span>
                      <span className="text-db-gray-700 dark:text-gray-300">{link.target_name || link.target_id?.substring(0, 8)}</span>
                      {link.confidence != null && (
                        <span className="text-[10px] text-db-gray-400 dark:text-gray-600">{(link.confidence * 100).toFixed(0)}%</span>
                      )}
                    </div>
                    <button onClick={() => deleteLinkMutation.mutate(link.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </>}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-700 dark:text-gray-300"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-db-orange text-white text-sm rounded-lg hover:bg-db-orange/90"
        >
          <Plus className="w-4 h-4" /> New Semantic Model
        </button>
      </div>

      {showCreate && (
        <div className="bg-db-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3 border border-db-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Name *</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Radiation Safety Ontology" className="w-full px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Version</label>
              <input value={newVersion} onChange={(e) => setNewVersion(e.target.value)} className="w-full px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Description</label>
            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="w-full px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Owner Email</label>
            <input value={newOwner} onChange={(e) => setNewOwner(e.target.value)} className="w-full px-3 py-1.5 text-sm rounded-lg border border-db-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white" />
          </div>
          <button
            onClick={() => createMutation.mutate({
              name: newName.trim(),
              description: newDesc || undefined,
              version: newVersion || undefined,
              owner_email: newOwner || undefined,
            })}
            disabled={!newName.trim() || createMutation.isPending}
            className="px-4 py-2 bg-db-orange text-white text-sm rounded-lg hover:bg-db-orange/90 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create Model"}
          </button>
        </div>
      )}

      {/* Model List */}
      {models.length === 0 ? (
        <p className="text-center text-sm text-db-gray-400 dark:text-gray-600 py-8">No semantic models found.</p>
      ) : (
        <div className="space-y-2">
          {models.map((model) => (
            <div
              key={model.id}
              onClick={() => setSelectedModel(model.id)}
              className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-db-gray-200 dark:border-gray-700 cursor-pointer hover:border-db-orange/50 dark:hover:border-db-orange/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <span className="font-medium text-sm text-db-gray-800 dark:text-white truncate">{model.name}</span>
                    <span className="text-xs text-db-gray-400 font-normal">v{model.version}</span>
                    <span className={clsx("px-1.5 py-0.5 text-[10px] rounded font-medium", SEMANTIC_STATUS_COLORS[model.status])}>
                      {model.status}
                    </span>
                  </div>
                  {model.description && (
                    <div className="text-xs text-db-gray-500 dark:text-gray-500 mt-0.5 ml-6">{model.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {model.concept_count > 0 && (
                    <span className="text-xs text-db-gray-400 dark:text-gray-600 flex items-center gap-1">
                      <Box className="w-3 h-3" /> {model.concept_count}
                    </span>
                  )}
                  {model.link_count > 0 && (
                    <span className="text-xs text-db-gray-400 dark:text-gray-600 flex items-center gap-1">
                      <Link2 className="w-3 h-3" /> {model.link_count}
                    </span>
                  )}
                  {model.domain_name && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-db-gray-100 dark:bg-gray-800 text-db-gray-500 dark:text-gray-500 rounded">{model.domain_name}</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-db-gray-400 dark:text-gray-600" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Naming Conventions Tab (G15)
// ============================================================================

const NAMING_ENTITY_TYPES: NamingEntityType[] = [
  "sheet", "template", "training_sheet", "domain", "team",
  "project", "contract", "product", "semantic_model", "role",
];

const NAMING_ENTITY_LABELS: Record<NamingEntityType, string> = {
  sheet: "Sheet",
  template: "Template",
  training_sheet: "Training Sheet",
  domain: "Domain",
  team: "Team",
  project: "Project",
  contract: "Contract",
  product: "Data Product",
  semantic_model: "Semantic Model",
  role: "Role",
};

function NamingConventionsTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [filterType, setFilterType] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [newEntityType, setNewEntityType] = useState<string>("sheet");
  const [newName, setNewName] = useState("");
  const [newPattern, setNewPattern] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newExampleValid, setNewExampleValid] = useState("");
  const [newExampleInvalid, setNewExampleInvalid] = useState("");
  const [newErrorMsg, setNewErrorMsg] = useState("");
  const [newPriority, setNewPriority] = useState(0);

  // Validate tester state
  const [testEntityType, setTestEntityType] = useState<string>("sheet");
  const [testName, setTestName] = useState("");
  const [testResult, setTestResult] = useState<{ valid: boolean; violations: { convention_id: string; convention_name: string; pattern: string; error_message: string }[]; conventions_checked: number } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const { data: conventions = [], isLoading } = useQuery({
    queryKey: ["governance-naming", filterType],
    queryFn: () => listNamingConventions(filterType ? filterType as NamingEntityType : undefined),
  });

  const createMutation = useMutation({
    mutationFn: (data: { entity_type: string; name: string; pattern: string; description?: string; example_valid?: string; example_invalid?: string; error_message?: string; priority?: number }) =>
      createNamingConvention(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-naming"] });
      toast.success("Convention Created", "Naming convention added");
      setShowCreate(false);
      setNewName("");
      setNewPattern("");
      setNewDesc("");
      setNewExampleValid("");
      setNewExampleInvalid("");
      setNewErrorMsg("");
      setNewPriority(0);
    },
    onError: (err: Error) => toast.error("Create Failed", err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNamingConvention(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-naming"] });
      toast.success("Convention Deleted", "Naming convention removed");
    },
    onError: (err: Error) => toast.error("Delete Failed", err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => toggleNamingConvention(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["governance-naming"] });
    },
    onError: (err: Error) => toast.error("Toggle Failed", err.message),
  });

  const handleTest = async () => {
    if (!testName.trim()) return;
    setTestLoading(true);
    try {
      const result = await validateName(testEntityType, testName);
      setTestResult(result);
    } catch {
      toast.error("Validation Error", "Could not validate name");
    } finally {
      setTestLoading(false);
    }
  };

  // Group conventions by entity_type
  const grouped = conventions.reduce<Record<string, typeof conventions>>((acc, conv) => {
    const key = conv.entity_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(conv);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-db-gray-500 dark:text-gray-400 py-12 justify-center">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading naming conventions...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Validate Tester */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-db-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-db-gray-800 dark:text-white mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          Name Validator
        </h3>
        <div className="flex gap-3 items-end">
          <div>
            <label className="block text-xs text-db-gray-500 dark:text-gray-400 mb-1">Entity Type</label>
            <select
              value={testEntityType}
              onChange={(e) => { setTestEntityType(e.target.value); setTestResult(null); }}
              className="px-3 py-2 border border-db-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
            >
              {NAMING_ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>{NAMING_ENTITY_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-db-gray-500 dark:text-gray-400 mb-1">Name to Validate</label>
            <input
              type="text"
              value={testName}
              onChange={(e) => { setTestName(e.target.value); setTestResult(null); }}
              placeholder="Enter a name to check..."
              className="w-full px-3 py-2 border border-db-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleTest()}
            />
          </div>
          <button
            onClick={handleTest}
            disabled={testLoading || !testName.trim()}
            className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            {testLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Validate"}
          </button>
        </div>
        {testResult && (
          <div className={clsx(
            "mt-3 p-3 rounded-lg text-sm border",
            testResult.valid
              ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
              : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400",
          )}>
            <div className="flex items-center gap-2 font-medium">
              {testResult.valid ? (
                <><CheckCircle2 className="w-4 h-4" /> Valid — passes all {testResult.conventions_checked} convention(s)</>
              ) : (
                <><AlertCircle className="w-4 h-4" /> Invalid — {testResult.violations.length} violation(s) found</>
              )}
            </div>
            {testResult.violations.length > 0 && (
              <ul className="mt-2 space-y-1">
                {testResult.violations.map((v, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className="font-mono bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded">{v.convention_name}</span>
                    <span>{v.error_message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Header + filter + create */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-db-gray-800 dark:text-white">
            Naming Conventions
          </h2>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 border border-db-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
          >
            <option value="">All Types</option>
            {NAMING_ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>{NAMING_ENTITY_LABELS[t]}</option>
            ))}
          </select>
          <span className="text-sm text-db-gray-500 dark:text-gray-400">
            {conventions.length} convention(s)
          </span>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700"
        >
          <Plus className="w-4 h-4" />
          New Convention
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-db-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-db-gray-800 dark:text-white">New Naming Convention</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-db-gray-500 dark:text-gray-400 mb-1">Entity Type *</label>
              <select
                value={newEntityType}
                onChange={(e) => setNewEntityType(e.target.value)}
                className="w-full px-3 py-2 border border-db-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              >
                {NAMING_ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>{NAMING_ENTITY_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-db-gray-500 dark:text-gray-400 mb-1">Convention Name *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Snake Case Sheets"
                className="w-full px-3 py-2 border border-db-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-db-gray-500 dark:text-gray-400 mb-1">Regex Pattern *</label>
              <input
                type="text"
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
                placeholder="e.g., ^[a-z][a-z0-9_]{2,63}$"
                className="w-full px-3 py-2 border border-db-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 font-mono text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-db-gray-500 dark:text-gray-400 mb-1">Description</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Explain the rationale..."
                className="w-full px-3 py-2 border border-db-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-db-gray-500 dark:text-gray-400 mb-1">Valid Example</label>
              <input
                type="text"
                value={newExampleValid}
                onChange={(e) => setNewExampleValid(e.target.value)}
                placeholder="defect_images_2024"
                className="w-full px-3 py-2 border border-db-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-db-gray-500 dark:text-gray-400 mb-1">Invalid Example</label>
              <input
                type="text"
                value={newExampleInvalid}
                onChange={(e) => setNewExampleInvalid(e.target.value)}
                placeholder="Defect Images"
                className="w-full px-3 py-2 border border-db-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-db-gray-500 dark:text-gray-400 mb-1">Error Message</label>
              <input
                type="text"
                value={newErrorMsg}
                onChange={(e) => setNewErrorMsg(e.target.value)}
                placeholder="Custom message on failure"
                className="w-full px-3 py-2 border border-db-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-db-gray-500 dark:text-gray-400 mb-1">Priority</label>
              <input
                type="number"
                value={newPriority}
                onChange={(e) => setNewPriority(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-db-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => createMutation.mutate({
                entity_type: newEntityType,
                name: newName,
                pattern: newPattern,
                ...(newDesc && { description: newDesc }),
                ...(newExampleValid && { example_valid: newExampleValid }),
                ...(newExampleInvalid && { example_invalid: newExampleInvalid }),
                ...(newErrorMsg && { error_message: newErrorMsg }),
                priority: newPriority,
              })}
              disabled={!newName.trim() || !newPattern.trim() || createMutation.isPending}
              className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Create Convention"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm text-db-gray-600 dark:text-gray-400 hover:text-db-gray-800 dark:hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Conventions grouped by entity type */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-db-gray-500 dark:text-gray-400">
          <Type className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No naming conventions defined yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([entityType, convs]) => (
            <div key={entityType} className="bg-white dark:bg-gray-900 rounded-xl border border-db-gray-200 dark:border-gray-700">
              <div className="px-5 py-3 border-b border-db-gray-100 dark:border-gray-800 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
                  {NAMING_ENTITY_LABELS[entityType as NamingEntityType] || entityType}
                </span>
                <span className="text-xs text-db-gray-500 dark:text-gray-400">{convs.length} rule(s)</span>
              </div>
              <div className="divide-y divide-db-gray-100 dark:divide-gray-800">
                {convs.map((conv) => (
                  <div key={conv.id} className="px-5 py-3 flex items-start gap-4 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={clsx("text-sm font-medium", conv.is_active ? "text-db-gray-800 dark:text-white" : "text-db-gray-400 dark:text-gray-600 line-through")}>{conv.name}</span>
                        {conv.priority > 0 && (
                          <span className="text-xs text-db-gray-400 dark:text-gray-500">P{conv.priority}</span>
                        )}
                      </div>
                      {conv.description && (
                        <p className="text-xs text-db-gray-500 dark:text-gray-400 mt-0.5">{conv.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1.5">
                        <code className="text-xs font-mono bg-db-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded text-db-gray-600 dark:text-gray-300">{conv.pattern}</code>
                        {conv.example_valid && (
                          <span className="text-xs text-green-600 dark:text-green-400">
                            <CheckCircle2 className="w-3 h-3 inline mr-0.5" />{conv.example_valid}
                          </span>
                        )}
                        {conv.example_invalid && (
                          <span className="text-xs text-red-500 dark:text-red-400">
                            <XCircle className="w-3 h-3 inline mr-0.5" />{conv.example_invalid}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => toggleMutation.mutate({ id: conv.id, isActive: !conv.is_active })}
                        className="p-1 text-db-gray-400 hover:text-amber-600"
                        title={conv.is_active ? "Disable" : "Enable"}
                      >
                        {conv.is_active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete convention "${conv.name}"?`)) deleteMutation.mutate(conv.id); }}
                        className="p-1 text-db-gray-400 hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Delivery Modes Tab (G12)
// ============================================================================

const MODE_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; description: string }> = {
  direct: { label: "Direct", color: "text-blue-700", bg: "bg-blue-100", description: "Deploy directly via SDK" },
  indirect: { label: "GitOps", color: "text-purple-700", bg: "bg-purple-100", description: "Push config to Git repo" },
  manual: { label: "Manual", color: "text-amber-700", bg: "bg-amber-100", description: "Manual deployment steps" },
};

const RECORD_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "text-gray-700", bg: "bg-gray-100" },
  approved: { label: "Approved", color: "text-blue-700", bg: "bg-blue-100" },
  in_progress: { label: "In Progress", color: "text-amber-700", bg: "bg-amber-100" },
  completed: { label: "Completed", color: "text-green-700", bg: "bg-green-100" },
  failed: { label: "Failed", color: "text-red-700", bg: "bg-red-100" },
  rejected: { label: "Rejected", color: "text-red-700", bg: "bg-red-100" },
};

function DeliveryModesTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showCreateMode, setShowCreateMode] = useState(false);
  const [showCreateRecord, setShowCreateRecord] = useState(false);
  const [newMode, setNewMode] = useState({
    name: "", description: "", mode_type: "direct" as DeliveryModeType,
    requires_approval: false, environment: "dev",
    git_repo_url: "", git_branch: "main", git_path: "",
    manual_instructions: "",
  });
  const [newRecord, setNewRecord] = useState({
    delivery_mode_id: "", model_name: "", model_version: "", endpoint_name: "", notes: "",
  });

  const { data: modes = [] } = useQuery({
    queryKey: ["delivery-modes"],
    queryFn: () => listDeliveryModes(),
  });

  const { data: records = [] } = useQuery({
    queryKey: ["delivery-records"],
    queryFn: () => listDeliveryRecords(),
  });

  const createModeMutation = useMutation({
    mutationFn: () => createDeliveryMode(newMode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-modes"] });
      setShowCreateMode(false);
      setNewMode({ name: "", description: "", mode_type: "direct", requires_approval: false, environment: "dev", git_repo_url: "", git_branch: "main", git_path: "", manual_instructions: "" });
      toast.success("Delivery mode created");
    },
  });

  const deleteModeMutation = useMutation({
    mutationFn: (id: string) => deleteDeliveryMode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-modes"] });
      queryClient.invalidateQueries({ queryKey: ["delivery-records"] });
      toast.success("Delivery mode deleted");
    },
  });

  const createRecordMutation = useMutation({
    mutationFn: () => createDeliveryRecord(newRecord),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-records"] });
      setShowCreateRecord(false);
      setNewRecord({ delivery_mode_id: "", model_name: "", model_version: "", endpoint_name: "", notes: "" });
      toast.success("Delivery record created");
    },
  });

  const transitionMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => transitionDeliveryRecord(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-records"] });
    },
  });

  return (
    <div className="space-y-8">
      {/* Delivery Modes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Delivery Modes</h2>
          <button
            onClick={() => setShowCreateMode(!showCreateMode)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Mode
          </button>
        </div>

        {/* Create Mode Form */}
        {showCreateMode && (
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                value={newMode.name}
                onChange={(e) => setNewMode({ ...newMode, name: e.target.value })}
                placeholder="Mode name"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800"
              />
              <select
                value={newMode.mode_type}
                onChange={(e) => setNewMode({ ...newMode, mode_type: e.target.value as DeliveryModeType })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800"
              >
                <option value="direct">Direct (SDK)</option>
                <option value="indirect">Indirect (GitOps)</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <textarea
              value={newMode.description}
              onChange={(e) => setNewMode({ ...newMode, description: e.target.value })}
              placeholder="Description"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800"
            />
            <div className="grid grid-cols-3 gap-3">
              <select
                value={newMode.environment}
                onChange={(e) => setNewMode({ ...newMode, environment: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800"
              >
                <option value="dev">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={newMode.requires_approval}
                  onChange={(e) => setNewMode({ ...newMode, requires_approval: e.target.checked })}
                />
                Requires Approval
              </label>
            </div>
            {newMode.mode_type === "indirect" && (
              <div className="grid grid-cols-3 gap-3">
                <input
                  value={newMode.git_repo_url}
                  onChange={(e) => setNewMode({ ...newMode, git_repo_url: e.target.value })}
                  placeholder="Git repo URL"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800"
                />
                <input
                  value={newMode.git_branch}
                  onChange={(e) => setNewMode({ ...newMode, git_branch: e.target.value })}
                  placeholder="Branch"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800"
                />
                <input
                  value={newMode.git_path}
                  onChange={(e) => setNewMode({ ...newMode, git_path: e.target.value })}
                  placeholder="Config path"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800"
                />
              </div>
            )}
            {newMode.mode_type === "manual" && (
              <textarea
                value={newMode.manual_instructions}
                onChange={(e) => setNewMode({ ...newMode, manual_instructions: e.target.value })}
                placeholder="Manual deployment instructions..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800"
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={() => createModeMutation.mutate()}
                disabled={!newMode.name || createModeMutation.isPending}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateMode(false)}
                className="px-3 py-1.5 text-gray-600 dark:text-gray-400 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Modes List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {modes.map((mode) => {
            const typeConfig = MODE_TYPE_CONFIG[mode.mode_type] || MODE_TYPE_CONFIG.direct;
            return (
              <div key={mode.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{mode.name}</h3>
                      {mode.is_default && (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">default</span>
                      )}
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeConfig.bg} ${typeConfig.color} mt-1`}>
                      {typeConfig.label}
                    </span>
                  </div>
                  {!mode.is_default && (
                    <button
                      onClick={() => deleteModeMutation.mutate(mode.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {mode.description || typeConfig.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  {mode.environment && (
                    <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{mode.environment}</span>
                  )}
                  {mode.requires_approval && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <Clock className="w-3 h-3" />
                      Approval required
                    </span>
                  )}
                  <span>{mode.delivery_count} deliveries</span>
                </div>
                {mode.mode_type === "indirect" && mode.git_repo_url && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 truncate">
                    <GitBranch className="w-3 h-3 inline mr-1" />
                    {mode.git_repo_url} ({mode.git_branch || "main"})
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Delivery Records */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Delivery Records</h2>
          <button
            onClick={() => setShowCreateRecord(!showCreateRecord)}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            New Delivery
          </button>
        </div>

        {/* Create Record Form */}
        {showCreateRecord && (
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <select
                value={newRecord.delivery_mode_id}
                onChange={(e) => setNewRecord({ ...newRecord, delivery_mode_id: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800"
              >
                <option value="">Select delivery mode...</option>
                {modes.filter((m) => m.is_active).map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({MODE_TYPE_CONFIG[m.mode_type]?.label || m.mode_type})</option>
                ))}
              </select>
              <input
                value={newRecord.model_name}
                onChange={(e) => setNewRecord({ ...newRecord, model_name: e.target.value })}
                placeholder="Model name (catalog.schema.model)"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={newRecord.model_version}
                onChange={(e) => setNewRecord({ ...newRecord, model_version: e.target.value })}
                placeholder="Model version (optional)"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800"
              />
              <input
                value={newRecord.endpoint_name}
                onChange={(e) => setNewRecord({ ...newRecord, endpoint_name: e.target.value })}
                placeholder="Endpoint name (optional)"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800"
              />
            </div>
            <textarea
              value={newRecord.notes}
              onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
              placeholder="Notes (optional)"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800"
            />
            <div className="flex gap-2">
              <button
                onClick={() => createRecordMutation.mutate()}
                disabled={!newRecord.delivery_mode_id || !newRecord.model_name || createRecordMutation.isPending}
                className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                Request Delivery
              </button>
              <button
                onClick={() => setShowCreateRecord(false)}
                className="px-3 py-1.5 text-gray-600 dark:text-gray-400 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Records Table */}
        {records.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Truck className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p>No delivery records yet</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Model</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Mode</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Requested</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {records.map((record) => {
                  const statusConfig = RECORD_STATUS_CONFIG[record.status] || RECORD_STATUS_CONFIG.pending;
                  const modeType = record.mode_type || "";
                  const modeConfig = MODE_TYPE_CONFIG[modeType] || { label: modeType, color: "text-gray-700", bg: "bg-gray-100" };
                  return (
                    <tr key={record.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{record.model_name}</div>
                        {record.model_version && (
                          <div className="text-xs text-gray-500">v{record.model_version}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${modeConfig.bg} ${modeConfig.color}`}>
                          {record.delivery_mode_name || modeConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {record.requested_by}
                        <br />
                        {record.requested_at ? new Date(record.requested_at).toLocaleDateString() : ""}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {record.status === "pending" && (
                            <>
                              <button
                                onClick={() => transitionMutation.mutate({ id: record.id, status: "approved" })}
                                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => transitionMutation.mutate({ id: record.id, status: "rejected" })}
                                className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {record.status === "approved" && (
                            <button
                              onClick={() => transitionMutation.mutate({ id: record.id, status: "in_progress" })}
                              className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs hover:bg-amber-200"
                            >
                              Start
                            </button>
                          )}
                          {record.status === "in_progress" && (
                            <>
                              <button
                                onClick={() => transitionMutation.mutate({ id: record.id, status: "completed" })}
                                className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                              >
                                Complete
                              </button>
                              <button
                                onClick={() => transitionMutation.mutate({ id: record.id, status: "failed" })}
                                className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                              >
                                Failed
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MCP Integration Tab (G11)
// ============================================================================

const SCOPE_CONFIG: Record<MCPTokenScope, { label: string; color: string }> = {
  read: { label: "Read", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" },
  read_write: { label: "Read/Write", color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" },
  admin: { label: "Admin", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
};

const TOOL_CATEGORY_CONFIG: Record<MCPToolCategory, { label: string; color: string }> = {
  data: { label: "Data", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" },
  training: { label: "Training", color: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400" },
  deployment: { label: "Deploy", color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" },
  monitoring: { label: "Monitor", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400" },
  governance: { label: "Governance", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
  general: { label: "General", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
};

const INVOCATION_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  success: { label: "Success", color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" },
  error: { label: "Error", color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" },
  denied: { label: "Denied", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
  rate_limited: { label: "Rate Limited", color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400" },
};

function MCPConnectionInfo() {
  const [expanded, setExpanded] = useState(false);
  const toast = useToast();
  const mcpEndpoint = `${window.location.origin}/mcp/mcp`;

  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        "ontos-ml-workbench": {
          url: mcpEndpoint,
          headers: { Authorization: "Bearer <your-token>" },
        },
      },
    },
    null,
    2,
  );

  const claudeCodeConfig = JSON.stringify(
    {
      mcpServers: {
        "ontos-ml-workbench": {
          type: "url",
          url: mcpEndpoint,
          headers: { Authorization: "Bearer <your-token>" },
        },
      },
    },
    null,
    2,
  );

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
            <Plug className="w-5 h-5 text-amber-700 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Connect AI Assistants via MCP</h3>
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Endpoint: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">{mcpEndpoint}</code>
            </p>
          </div>
        </div>
        <ChevronRight
          className={clsx(
            "w-5 h-5 text-amber-600 transition-transform",
            expanded && "rotate-90",
          )}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Create a token below, then paste it into your AI assistant&apos;s MCP config to connect.
            The server exposes 8 tools and 4 resources from this workbench.
          </p>

          {/* Claude Desktop config */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-amber-800 dark:text-amber-300">Claude Desktop</span>
              <button
                onClick={() => { navigator.clipboard.writeText(claudeDesktopConfig); toast.success("Copied"); }}
                className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 dark:text-amber-400"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
            <pre className="bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto font-mono">
              {claudeDesktopConfig}
            </pre>
          </div>

          {/* Claude Code config */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-amber-800 dark:text-amber-300">Claude Code (.mcp.json)</span>
              <button
                onClick={() => { navigator.clipboard.writeText(claudeCodeConfig); toast.success("Copied"); }}
                className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 dark:text-amber-400"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
            <pre className="bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto font-mono">
              {claudeCodeConfig}
            </pre>
          </div>

          <p className="text-xs text-amber-600 dark:text-amber-500 italic">
            Replace <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">&lt;your-token&gt;</code> with
            a token created in the Tokens tab below.
          </p>
        </div>
      )}
    </div>
  );
}

function MCPIntegrationTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const [view, setView] = useState<"tokens" | "tools" | "invocations">("tokens");
  const [showCreateToken, setShowCreateToken] = useState(false);
  const [showCreateTool, setShowCreateTool] = useState(false);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);

  // Token form state
  const [tokenName, setTokenName] = useState("");
  const [tokenDesc, setTokenDesc] = useState("");
  const [tokenScope, setTokenScope] = useState<MCPTokenScope>("read");
  const [tokenRateLimit, setTokenRateLimit] = useState(60);

  // Tool form state
  const [toolName, setToolName] = useState("");
  const [toolDesc, setToolDesc] = useState("");
  const [toolCategory, setToolCategory] = useState<MCPToolCategory>("general");
  const [toolScope, setToolScope] = useState<MCPTokenScope>("read");
  const [toolEndpoint, setToolEndpoint] = useState("");

  const statsQ = useQuery({ queryKey: ["mcp-stats"], queryFn: getMCPStats });
  const tokensQ = useQuery({ queryKey: ["mcp-tokens"], queryFn: () => listMCPTokens() });
  const toolsQ = useQuery({ queryKey: ["mcp-tools"], queryFn: () => listMCPTools() });
  const invocationsQ = useQuery({ queryKey: ["mcp-invocations"], queryFn: () => listMCPInvocations({ limit: 50 }) });

  const createTokenMut = useMutation({
    mutationFn: createMCPToken,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["mcp-tokens"] });
      qc.invalidateQueries({ queryKey: ["mcp-stats"] });
      setRevealedToken(result.token_value);
      setShowCreateToken(false);
      setTokenName(""); setTokenDesc(""); setTokenScope("read"); setTokenRateLimit(60);
      toast.success("MCP Token Created", "Copy the token value now — it won't be shown again");
    },
    onError: () => toast.error("Create Failed", "Failed to create MCP token"),
  });

  const revokeTokenMut = useMutation({
    mutationFn: revokeMCPToken,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp-tokens"] });
      qc.invalidateQueries({ queryKey: ["mcp-stats"] });
      toast.success("Token Revoked");
    },
  });

  const deleteTokenMut = useMutation({
    mutationFn: deleteMCPToken,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp-tokens"] });
      qc.invalidateQueries({ queryKey: ["mcp-stats"] });
      toast.success("Token Deleted");
    },
  });

  const createToolMut = useMutation({
    mutationFn: createMCPTool,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp-tools"] });
      qc.invalidateQueries({ queryKey: ["mcp-stats"] });
      setShowCreateTool(false);
      setToolName(""); setToolDesc(""); setToolCategory("general"); setToolScope("read"); setToolEndpoint("");
      toast.success("Tool Registered");
    },
    onError: () => toast.error("Register Failed", "Failed to register MCP tool"),
  });

  const deleteToolMut = useMutation({
    mutationFn: deleteMCPTool,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp-tools"] });
      qc.invalidateQueries({ queryKey: ["mcp-stats"] });
      toast.success("Tool Deleted");
    },
  });

  const stats = statsQ.data;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Active Tokens", value: stats.active_tokens, total: stats.total_tokens, color: "text-amber-600" },
            { label: "Active Tools", value: stats.active_tools, total: stats.total_tools, color: "text-blue-600" },
            { label: "Total Invocations", value: stats.total_invocations, color: "text-green-600" },
            { label: "Today", value: stats.invocations_today, color: "text-purple-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-gray-900 rounded-lg border border-db-gray-200 dark:border-gray-700 p-4">
              <div className="text-sm text-db-gray-500 dark:text-gray-400">{s.label}</div>
              <div className={clsx("text-2xl font-bold", s.color)}>
                {s.value}{s.total !== undefined ? <span className="text-sm text-db-gray-400 dark:text-gray-500"> / {s.total}</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MCP Connection Info */}
      <MCPConnectionInfo />

      {/* Revealed Token Banner */}
      {revealedToken && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">New Token Created — Copy Now</p>
              <code className="text-xs bg-amber-100 dark:bg-amber-900 px-2 py-1 rounded mt-1 inline-block font-mono">{revealedToken}</code>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { navigator.clipboard.writeText(revealedToken); toast.success("Copied"); }}
                className="px-3 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
              <button onClick={() => setRevealedToken(null)} className="px-3 py-1 text-xs text-amber-700 hover:text-amber-900 dark:text-amber-400">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-navigation */}
      <div className="flex gap-2 border-b border-db-gray-200 dark:border-gray-700 pb-2">
        {([["tokens", "Tokens", Key], ["tools", "Tools", Wrench], ["invocations", "Audit Log", Eye]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg",
              view === id ? "bg-white dark:bg-gray-900 border border-b-0 border-db-gray-200 dark:border-gray-700 text-amber-700 dark:text-amber-400" : "text-db-gray-500 hover:text-db-gray-700 dark:text-gray-400",
            )}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Tokens View */}
      {view === "tokens" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white">MCP Tokens</h3>
            <button
              onClick={() => setShowCreateToken(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
            >
              <Plus className="w-4 h-4" /> Create Token
            </button>
          </div>

          {showCreateToken && (
            <div className="bg-white dark:bg-gray-900 border border-db-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={tokenName} onChange={(e) => setTokenName(e.target.value)} placeholder="Token name *" className="px-3 py-2 border border-db-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-db-gray-800 dark:text-white" />
                <select value={tokenScope} onChange={(e) => setTokenScope(e.target.value as MCPTokenScope)} className="px-3 py-2 border border-db-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-db-gray-800 dark:text-white">
                  <option value="read">Read Only</option>
                  <option value="read_write">Read/Write</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <input value={tokenDesc} onChange={(e) => setTokenDesc(e.target.value)} placeholder="Description" className="w-full px-3 py-2 border border-db-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-db-gray-800 dark:text-white" />
              <div className="flex items-center gap-3">
                <label className="text-sm text-db-gray-600 dark:text-gray-400">Rate limit (req/min):</label>
                <input type="number" value={tokenRateLimit} onChange={(e) => setTokenRateLimit(Number(e.target.value))} min={1} max={1000} className="w-24 px-3 py-2 border border-db-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-db-gray-800 dark:text-white" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => createTokenMut.mutate({ name: tokenName, description: tokenDesc || undefined, scope: tokenScope, rate_limit_per_minute: tokenRateLimit })}
                  disabled={!tokenName.trim() || createTokenMut.isPending}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm disabled:opacity-50"
                >
                  {createTokenMut.isPending ? "Creating..." : "Create"}
                </button>
                <button onClick={() => setShowCreateToken(false)} className="px-4 py-2 text-sm text-db-gray-600 hover:text-db-gray-800 dark:text-gray-400">Cancel</button>
              </div>
            </div>
          )}

          {tokensQ.isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-db-gray-400" /></div>
          ) : (
            <div className="space-y-3">
              {(tokensQ.data ?? []).map((token) => (
                <div key={token.id} className="bg-white dark:bg-gray-900 border border-db-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Key className={clsx("w-5 h-5", token.is_active ? "text-amber-500" : "text-gray-400")} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-db-gray-800 dark:text-white">{token.name}</span>
                          <code className="text-xs bg-db-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono">{token.token_prefix}...</code>
                          <span className={clsx("px-2 py-0.5 rounded text-xs font-medium", SCOPE_CONFIG[token.scope as MCPTokenScope]?.color ?? "bg-gray-100 text-gray-700")}>{SCOPE_CONFIG[token.scope as MCPTokenScope]?.label ?? token.scope}</span>
                          {!token.is_active && <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">Revoked</span>}
                        </div>
                        <div className="text-xs text-db-gray-500 dark:text-gray-400 mt-0.5">
                          Owner: {token.owner_email} · Used {token.usage_count}x · Rate: {token.rate_limit_per_minute}/min
                          {token.last_used_at && ` · Last used: ${new Date(token.last_used_at).toLocaleDateString()}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {token.is_active && (
                        <button onClick={() => revokeTokenMut.mutate(token.id)} className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded" title="Revoke">
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => deleteTokenMut.mutate(token.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {(tokensQ.data ?? []).length === 0 && (
                <p className="text-center py-8 text-db-gray-500 dark:text-gray-400">No MCP tokens. Create one to enable AI assistant access.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tools View */}
      {view === "tools" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white">Registered Tools</h3>
            <button
              onClick={() => setShowCreateTool(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
            >
              <Plus className="w-4 h-4" /> Register Tool
            </button>
          </div>

          {showCreateTool && (
            <div className="bg-white dark:bg-gray-900 border border-db-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={toolName} onChange={(e) => setToolName(e.target.value)} placeholder="Tool name *" className="px-3 py-2 border border-db-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-db-gray-800 dark:text-white" />
                <select value={toolCategory} onChange={(e) => setToolCategory(e.target.value as MCPToolCategory)} className="px-3 py-2 border border-db-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-db-gray-800 dark:text-white">
                  {(Object.keys(TOOL_CATEGORY_CONFIG) as MCPToolCategory[]).map((c) => (
                    <option key={c} value={c}>{TOOL_CATEGORY_CONFIG[c].label}</option>
                  ))}
                </select>
              </div>
              <input value={toolDesc} onChange={(e) => setToolDesc(e.target.value)} placeholder="Description" className="w-full px-3 py-2 border border-db-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-db-gray-800 dark:text-white" />
              <div className="grid grid-cols-2 gap-3">
                <select value={toolScope} onChange={(e) => setToolScope(e.target.value as MCPTokenScope)} className="px-3 py-2 border border-db-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-db-gray-800 dark:text-white">
                  <option value="read">Required: Read</option>
                  <option value="read_write">Required: Read/Write</option>
                  <option value="admin">Required: Admin</option>
                </select>
                <input value={toolEndpoint} onChange={(e) => setToolEndpoint(e.target.value)} placeholder="Endpoint path (e.g., /api/v1/sheets/)" className="px-3 py-2 border border-db-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-db-gray-800 dark:text-white" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => createToolMut.mutate({ name: toolName, description: toolDesc || undefined, category: toolCategory, required_scope: toolScope, endpoint_path: toolEndpoint || undefined })}
                  disabled={!toolName.trim() || createToolMut.isPending}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm disabled:opacity-50"
                >
                  {createToolMut.isPending ? "Registering..." : "Register"}
                </button>
                <button onClick={() => setShowCreateTool(false)} className="px-4 py-2 text-sm text-db-gray-600 hover:text-db-gray-800 dark:text-gray-400">Cancel</button>
              </div>
            </div>
          )}

          {toolsQ.isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-db-gray-400" /></div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {(toolsQ.data ?? []).map((tool) => (
                <div key={tool.id} className="bg-white dark:bg-gray-900 border border-db-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-sm text-db-gray-800 dark:text-white">{tool.name}</span>
                    </div>
                    <button onClick={() => deleteToolMut.mutate(tool.id)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {tool.description && <p className="text-xs text-db-gray-500 dark:text-gray-400 mb-2">{tool.description}</p>}
                  <div className="flex flex-wrap gap-1">
                    <span className={clsx("px-2 py-0.5 rounded text-xs font-medium", TOOL_CATEGORY_CONFIG[tool.category as MCPToolCategory]?.color ?? "bg-gray-100 text-gray-700")}>{TOOL_CATEGORY_CONFIG[tool.category as MCPToolCategory]?.label ?? tool.category}</span>
                    <span className={clsx("px-2 py-0.5 rounded text-xs font-medium", SCOPE_CONFIG[tool.required_scope as MCPTokenScope]?.color ?? "bg-gray-100 text-gray-700")}>Requires: {SCOPE_CONFIG[tool.required_scope as MCPTokenScope]?.label ?? tool.required_scope}</span>
                    {tool.endpoint_path && <span className="px-2 py-0.5 rounded text-xs bg-db-gray-100 dark:bg-gray-800 font-mono text-db-gray-600 dark:text-gray-400">{tool.endpoint_path}</span>}
                    {!tool.is_active && <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">Disabled</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invocations View */}
      {view === "invocations" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white">Invocation Audit Log</h3>
          {invocationsQ.isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-db-gray-400" /></div>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-db-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-db-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-db-gray-600 dark:text-gray-400">Tool</th>
                    <th className="text-left px-4 py-2 font-medium text-db-gray-600 dark:text-gray-400">Token</th>
                    <th className="text-left px-4 py-2 font-medium text-db-gray-600 dark:text-gray-400">Status</th>
                    <th className="text-left px-4 py-2 font-medium text-db-gray-600 dark:text-gray-400">Duration</th>
                    <th className="text-left px-4 py-2 font-medium text-db-gray-600 dark:text-gray-400">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-db-gray-100 dark:divide-gray-800">
                  {(invocationsQ.data ?? []).map((inv) => {
                    const statusCfg = INVOCATION_STATUS_CONFIG[inv.status] ?? { label: inv.status, color: "bg-gray-100 text-gray-700" };
                    return (
                      <tr key={inv.id}>
                        <td className="px-4 py-2 text-db-gray-800 dark:text-white">{inv.tool_name ?? inv.tool_id}</td>
                        <td className="px-4 py-2 text-db-gray-600 dark:text-gray-400">{inv.token_name ?? inv.token_id}</td>
                        <td className="px-4 py-2">
                          <span className={clsx("px-2 py-0.5 rounded text-xs font-medium", statusCfg.color)}>{statusCfg.label}</span>
                        </td>
                        <td className="px-4 py-2 text-db-gray-600 dark:text-gray-400">{inv.duration_ms != null ? `${inv.duration_ms}ms` : "—"}</td>
                        <td className="px-4 py-2 text-db-gray-500 dark:text-gray-400 text-xs">{inv.invoked_at ? new Date(inv.invoked_at).toLocaleString() : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {(invocationsQ.data ?? []).length === 0 && (
                <p className="text-center py-8 text-db-gray-500 dark:text-gray-400">No invocations recorded yet.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Multi-Platform Connectors Tab (G13)
// ============================================================================

const PLATFORM_CONFIG: Record<ConnectorPlatform, { label: string; color: string; icon: string }> = {
  unity_catalog: { label: "Unity Catalog", color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400", icon: "UC" },
  snowflake: { label: "Snowflake", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400", icon: "SF" },
  kafka: { label: "Kafka", color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400", icon: "KF" },
  power_bi: { label: "Power BI", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400", icon: "PB" },
  s3: { label: "S3", color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400", icon: "S3" },
  custom: { label: "Custom", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400", icon: "?" },
};

const DIRECTION_CONFIG: Record<SyncDirection, { label: string; color: string }> = {
  inbound: { label: "Inbound", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" },
  outbound: { label: "Outbound", color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" },
  bidirectional: { label: "Bidirectional", color: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400" },
};

const CONNECTOR_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" },
  inactive: { label: "Inactive", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
  error: { label: "Error", color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" },
  testing: { label: "Testing", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
};

const SYNC_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
  running: { label: "Running", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" },
  failed: { label: "Failed", color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400" },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
};

function ConnectorsTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [platform, setPlatform] = useState<ConnectorPlatform>("unity_catalog");
  const [direction, setDirection] = useState<SyncDirection>("inbound");
  const [schedule, setSchedule] = useState("");

  const statsQ = useQuery({ queryKey: ["connector-stats"], queryFn: getConnectorStats });
  const connectorsQ = useQuery({ queryKey: ["connectors"], queryFn: () => listConnectors() });
  const assetsQ = useQuery({
    queryKey: ["connector-assets", selectedId],
    queryFn: () => listConnectorAssets(selectedId!),
    enabled: !!selectedId,
  });
  const syncsQ = useQuery({ queryKey: ["connector-syncs"], queryFn: () => listConnectorSyncs() });

  const createMut = useMutation({
    mutationFn: createConnector,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connectors"] });
      qc.invalidateQueries({ queryKey: ["connector-stats"] });
      setShowCreate(false);
      setName(""); setDesc(""); setPlatform("unity_catalog"); setDirection("inbound"); setSchedule("");
      toast.success("Connector Created");
    },
    onError: () => toast.error("Create Failed", "Failed to create connector"),
  });

  const deleteMut = useMutation({
    mutationFn: deleteConnector,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connectors"] });
      qc.invalidateQueries({ queryKey: ["connector-stats"] });
      if (selectedId) setSelectedId(null);
      toast.success("Connector Deleted");
    },
  });

  const testMut = useMutation({
    mutationFn: testConnector,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["connectors"] });
      if (result.status === "active") {
        toast.success("Connection Test Passed", result.message);
      } else {
        toast.error("Connection Test Failed", result.message);
      }
    },
    onError: () => toast.error("Test Failed", "Connection test failed"),
  });

  const syncMut = useMutation({
    mutationFn: syncConnector,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connector-syncs"] });
      qc.invalidateQueries({ queryKey: ["connectors"] });
      qc.invalidateQueries({ queryKey: ["connector-assets", selectedId] });
      toast.success("Sync Started");
    },
    onError: () => toast.error("Sync Failed"),
  });

  const stats = statsQ.data;

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Active Connectors", value: stats.active_connectors, total: stats.total_connectors, color: "text-green-600" },
            { label: "Total Assets", value: stats.total_assets, color: "text-blue-600" },
            { label: "Total Syncs", value: stats.total_syncs, color: "text-purple-600" },
            { label: "Platforms", value: Object.keys(stats.connectors_by_platform).length, color: "text-amber-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-gray-900 rounded-lg border border-db-gray-200 dark:border-gray-700 p-4">
              <div className="text-sm text-db-gray-500 dark:text-gray-400">{s.label}</div>
              <div className={clsx("text-2xl font-bold", s.color)}>
                {s.value}{s.total !== undefined ? <span className="text-sm text-db-gray-400 dark:text-gray-500"> / {s.total}</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connector List + Detail */}
      <div className="flex gap-6">
        {/* Left: Connector List */}
        <div className="flex-1 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-db-gray-800 dark:text-white">Platform Connectors</h3>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm">
              <Plus className="w-4 h-4" /> Add Connector
            </button>
          </div>

          {showCreate && (
            <div className="bg-white dark:bg-gray-900 border border-db-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Connector name *" className="px-3 py-2 border border-db-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-db-gray-800 dark:text-white" />
                <select value={platform} onChange={(e) => setPlatform(e.target.value as ConnectorPlatform)} className="px-3 py-2 border border-db-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-db-gray-800 dark:text-white">
                  {(Object.keys(PLATFORM_CONFIG) as ConnectorPlatform[]).map((p) => (
                    <option key={p} value={p}>{PLATFORM_CONFIG[p].label}</option>
                  ))}
                </select>
              </div>
              <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" className="w-full px-3 py-2 border border-db-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-db-gray-800 dark:text-white" />
              <div className="grid grid-cols-2 gap-3">
                <select value={direction} onChange={(e) => setDirection(e.target.value as SyncDirection)} className="px-3 py-2 border border-db-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-db-gray-800 dark:text-white">
                  <option value="inbound">Inbound</option>
                  <option value="outbound">Outbound</option>
                  <option value="bidirectional">Bidirectional</option>
                </select>
                <input value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="Sync schedule (cron, optional)" className="px-3 py-2 border border-db-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-db-gray-800 dark:text-white" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => createMut.mutate({ name, description: desc || undefined, platform, sync_direction: direction, sync_schedule: schedule || undefined })}
                  disabled={!name.trim() || createMut.isPending}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm disabled:opacity-50"
                >
                  {createMut.isPending ? "Creating..." : "Create"}
                </button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-db-gray-600 hover:text-db-gray-800 dark:text-gray-400">Cancel</button>
              </div>
            </div>
          )}

          {connectorsQ.isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-db-gray-400" /></div>
          ) : (
            <div className="space-y-3">
              {(connectorsQ.data ?? []).map((conn) => {
                const pCfg = PLATFORM_CONFIG[conn.platform as ConnectorPlatform] ?? PLATFORM_CONFIG.custom;
                const sCfg = CONNECTOR_STATUS_CONFIG[conn.status] ?? CONNECTOR_STATUS_CONFIG.inactive;
                const dCfg = DIRECTION_CONFIG[conn.sync_direction as SyncDirection] ?? DIRECTION_CONFIG.inbound;
                return (
                  <div
                    key={conn.id}
                    onClick={() => setSelectedId(conn.id === selectedId ? null : conn.id)}
                    className={clsx(
                      "bg-white dark:bg-gray-900 border rounded-lg p-4 cursor-pointer transition-colors",
                      conn.id === selectedId ? "border-amber-400 dark:border-amber-600" : "border-db-gray-200 dark:border-gray-700 hover:border-db-gray-300",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold", pCfg.color)}>{pCfg.icon}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-db-gray-800 dark:text-white">{conn.name}</span>
                            <span className={clsx("px-2 py-0.5 rounded text-xs font-medium", sCfg.color)}>{sCfg.label}</span>
                            <span className={clsx("px-2 py-0.5 rounded text-xs font-medium", dCfg.color)}>{dCfg.label}</span>
                          </div>
                          <div className="text-xs text-db-gray-500 dark:text-gray-400">
                            {pCfg.label} · {conn.asset_count} assets · {conn.sync_count} syncs
                            {conn.last_sync_at && ` · Last sync: ${new Date(conn.last_sync_at).toLocaleDateString()}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); testMut.mutate(conn.id); }} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded" title="Test">
                          <Zap className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); syncMut.mutate(conn.id); }} className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-950/30 rounded" title="Sync">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteMut.mutate(conn.id); }} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {(connectorsQ.data ?? []).length === 0 && (
                <p className="text-center py-8 text-db-gray-500 dark:text-gray-400">No connectors configured. Add one to integrate external platforms.</p>
              )}
            </div>
          )}
        </div>

        {/* Right: Detail Panel */}
        {selectedId && (
          <div className="w-96 space-y-4">
            <h4 className="text-sm font-semibold text-db-gray-700 dark:text-gray-300">Synced Assets</h4>
            {assetsQ.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-db-gray-400" /></div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-auto">
                {(assetsQ.data ?? []).map((asset) => (
                  <div key={asset.id} className="bg-white dark:bg-gray-900 border border-db-gray-200 dark:border-gray-700 rounded p-3">
                    <div className="text-sm font-medium text-db-gray-800 dark:text-white">{asset.external_name}</div>
                    <div className="text-xs text-db-gray-500 dark:text-gray-400">
                      {asset.asset_type} · ID: {asset.external_id}
                      {asset.last_synced_at && ` · Synced: ${new Date(asset.last_synced_at).toLocaleDateString()}`}
                    </div>
                  </div>
                ))}
                {(assetsQ.data ?? []).length === 0 && (
                  <p className="text-sm text-db-gray-500 dark:text-gray-400">No assets synced yet. Run a sync to discover assets.</p>
                )}
              </div>
            )}

            <h4 className="text-sm font-semibold text-db-gray-700 dark:text-gray-300 pt-4">Recent Syncs</h4>
            {syncsQ.isLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-db-gray-400" /></div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-auto">
                {(syncsQ.data ?? []).filter((s) => s.connector_id === selectedId).slice(0, 10).map((sync) => {
                  const ssCfg = SYNC_STATUS_CONFIG[sync.status] ?? SYNC_STATUS_CONFIG.pending;
                  return (
                    <div key={sync.id} className="bg-white dark:bg-gray-900 border border-db-gray-200 dark:border-gray-700 rounded p-3">
                      <div className="flex items-center justify-between">
                        <span className={clsx("px-2 py-0.5 rounded text-xs font-medium", ssCfg.color)}>{ssCfg.label}</span>
                        <span className="text-xs text-db-gray-500 dark:text-gray-400">{sync.duration_ms != null ? `${sync.duration_ms}ms` : "—"}</span>
                      </div>
                      <div className="text-xs text-db-gray-500 dark:text-gray-400 mt-1">
                        {sync.assets_synced} synced, {sync.assets_failed} failed
                        {sync.started_at && ` · ${new Date(sync.started_at).toLocaleString()}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

const TABS: { id: TabId; label: string; icon: typeof Shield }[] = [
  { id: "roles", label: "Roles", icon: Shield },
  { id: "teams", label: "Teams", icon: Users },
  { id: "domains", label: "Domains", icon: FolderTree },
  { id: "projects", label: "Projects", icon: Briefcase },
  { id: "contracts", label: "Contracts", icon: FileCheck },
  { id: "policies", label: "Policies", icon: ShieldAlert },
  { id: "workflows", label: "Workflows", icon: GitBranch },
  { id: "products", label: "Products", icon: Package },
  { id: "semantic", label: "Semantic", icon: Brain },
  { id: "naming", label: "Naming", icon: Type },
  { id: "delivery", label: "Delivery", icon: Truck },
  { id: "mcp", label: "MCP", icon: Cpu },
  { id: "connectors", label: "Connectors", icon: Plug },
];

export function GovernancePage({ onClose, initialTab }: GovernancePageProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab ?? "roles");

  // Sync with initialTab when it changes (e.g., clicking different sidebar links)
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-db-gray-200 dark:border-gray-700 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-amber-600" />
            <h1 className="text-2xl font-bold text-db-gray-800 dark:text-white">
              Governance & Projects
            </h1>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-db-gray-600 hover:text-db-gray-800 dark:text-gray-400 dark:hover:text-white"
          >
            Close
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 max-w-7xl mx-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  activeTab === tab.id
                    ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                    : "text-db-gray-600 dark:text-gray-400 hover:bg-db-gray-100 dark:hover:bg-gray-800",
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          {activeTab === "roles" && <RolesTab />}
          {activeTab === "teams" && <TeamsTab />}
          {activeTab === "domains" && <DomainsTab />}
          {activeTab === "projects" && <ProjectsTab />}
          {activeTab === "contracts" && <ContractsTab />}
          {activeTab === "policies" && <PoliciesTab />}
          {activeTab === "workflows" && <WorkflowsTab />}
          {activeTab === "products" && <DataProductsTab />}
          {activeTab === "semantic" && <SemanticModelsTab />}
          {activeTab === "naming" && <NamingConventionsTab />}
          {activeTab === "delivery" && <DeliveryModesTab />}
          {activeTab === "mcp" && <MCPIntegrationTab />}
          {activeTab === "connectors" && <ConnectorsTab />}
        </div>
      </div>
    </div>
  );
}
