/**
 * GovernancePage - Admin page for RBAC Roles, Teams, Data Domains, and Projects
 *
 * Four tabs: Roles | Teams | Domains | Projects
 * Follows the RegistriesPage tabbed pattern.
 */

import { useState } from "react";
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
} from "../types/governance";

type TabId = "roles" | "teams" | "domains" | "projects" | "contracts" | "policies";

interface GovernancePageProps {
  onClose: () => void;
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

  const { data: domains = [] } = useQuery({
    queryKey: ["governance-domains"],
    queryFn: listDomains,
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
// Main Page
// ============================================================================

const TABS: { id: TabId; label: string; icon: typeof Shield }[] = [
  { id: "roles", label: "Roles", icon: Shield },
  { id: "teams", label: "Teams", icon: Users },
  { id: "domains", label: "Domains", icon: FolderTree },
  { id: "projects", label: "Projects", icon: Briefcase },
  { id: "contracts", label: "Contracts", icon: FileCheck },
  { id: "policies", label: "Policies", icon: ShieldAlert },
];

export function GovernancePage({ onClose }: GovernancePageProps) {
  const [activeTab, setActiveTab] = useState<TabId>("roles");

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
        </div>
      </div>
    </div>
  );
}
