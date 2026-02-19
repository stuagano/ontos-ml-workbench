/**
 * GovernancePage - Admin page for RBAC Roles, Teams, and Data Domains
 *
 * Three tabs: Roles | Teams | Domains
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
} from "../services/governance";
import { useToast } from "../components/Toast";
import type {
  AccessLevel,
  DomainTreeNode,
} from "../types/governance";

type TabId = "roles" | "teams" | "domains";

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
// Main Page
// ============================================================================

const TABS: { id: TabId; label: string; icon: typeof Shield }[] = [
  { id: "roles", label: "Roles", icon: Shield },
  { id: "teams", label: "Teams", icon: Users },
  { id: "domains", label: "Domains", icon: FolderTree },
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
              Governance
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
        </div>
      </div>
    </div>
  );
}
