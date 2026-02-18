/**
 * TaskBoardView - Kanban-style task management for labeling jobs
 *
 * Features:
 * - Column-based view by task status (Pending, In Progress, Submitted, Approved)
 * - Drag-and-drop task assignment (future)
 * - Task details with progress indicators
 * - Quick actions (assign, start, review)
 */

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  User,
  AlertCircle,
  Loader2,
  MoreHorizontal,
  Play,
  Eye,
  UserPlus,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import {
  listLabelingTasks,
  bulkCreateLabelingTasks,
  assignLabelingTask,
  claimLabelingTask,
  startLabelingTask,
  listWorkspaceUsers,
} from "../../services/api";
import { useToast } from "../Toast";
import type {
  LabelingJob,
  LabelingTask,
  LabelingTaskStatus,
  WorkspaceUser,
} from "../../types";

// ============================================================================
// Status Configuration
// ============================================================================

const BOARD_COLUMNS: {
  status: LabelingTaskStatus | "pending_assigned";
  label: string;
  color: string;
  bgColor: string;
}[] = [
  {
    status: "pending",
    label: "Pending",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
  {
    status: "pending_assigned",
    label: "Assigned",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    status: "in_progress",
    label: "In Progress",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
  {
    status: "submitted",
    label: "Submitted",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  {
    status: "approved",
    label: "Approved",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
];

// ============================================================================
// Task Card Component
// ============================================================================

interface TaskCardProps {
  task: LabelingTask;
  onAssign: (task: LabelingTask) => void;
  onClaim: (task: LabelingTask) => void;
  onStart: (task: LabelingTask) => void;
  onAnnotate: (task: LabelingTask) => void;
  onReview: (task: LabelingTask) => void;
}

function TaskCard({
  task,
  onAssign,
  onClaim,
  onStart,
  onAnnotate,
  onReview,
}: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const progress =
    task.item_count > 0 ? (task.labeled_count / task.item_count) * 100 : 0;

  return (
    <div className="bg-white rounded-lg border border-db-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm text-db-gray-800">
          {task.name}
        </span>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded hover:bg-db-gray-100 text-db-gray-400"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-db-gray-200 py-1 z-20">
                {!task.assigned_to && (
                  <>
                    <button
                      onClick={() => {
                        onAssign(task);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-db-gray-50 flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Assign
                    </button>
                    <button
                      onClick={() => {
                        onClaim(task);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-db-gray-50 flex items-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      Claim
                    </button>
                  </>
                )}
                {task.status === "assigned" && (
                  <button
                    onClick={() => {
                      onStart(task);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-db-gray-50 flex items-center gap-2 text-green-600"
                  >
                    <Play className="w-4 h-4" />
                    Start
                  </button>
                )}
                {task.status === "in_progress" && (
                  <button
                    onClick={() => {
                      onAnnotate(task);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-db-gray-50 flex items-center gap-2 text-amber-600"
                  >
                    <Play className="w-4 h-4" />
                    Continue
                  </button>
                )}
                {task.status === "submitted" && (
                  <button
                    onClick={() => {
                      onReview(task);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-db-gray-50 flex items-center gap-2 text-purple-600"
                  >
                    <Eye className="w-4 h-4" />
                    Review
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="mb-2">
        <div className="h-1.5 bg-db-gray-100 rounded-full overflow-hidden">
          <div
            className={clsx(
              "h-full transition-all duration-300",
              progress === 100 ? "bg-green-500" : "bg-amber-400",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1 text-xs text-db-gray-500">
          <span>
            {task.labeled_count}/{task.item_count} items
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        {task.assigned_to ? (
          <span className="flex items-center gap-1 text-db-gray-600">
            <User className="w-3 h-3" />
            {task.assigned_to.split("@")[0]}
          </span>
        ) : (
          <span className="text-db-gray-400">Unassigned</span>
        )}

        {task.priority !== "normal" && (
          <span
            className={clsx(
              "px-1.5 py-0.5 rounded text-xs font-medium",
              task.priority === "urgent"
                ? "bg-red-100 text-red-700"
                : task.priority === "high"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-gray-100 text-gray-600",
            )}
          >
            {task.priority}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Board Column Component
// ============================================================================

interface BoardColumnProps {
  title: string;
  color: string;
  bgColor: string;
  tasks: LabelingTask[];
  onAssign: (task: LabelingTask) => void;
  onClaim: (task: LabelingTask) => void;
  onStart: (task: LabelingTask) => void;
  onAnnotate: (task: LabelingTask) => void;
  onReview: (task: LabelingTask) => void;
}

function BoardColumn({
  title,
  color,
  bgColor,
  tasks,
  onAssign,
  onClaim,
  onStart,
  onAnnotate,
  onReview,
}: BoardColumnProps) {
  return (
    <div className="flex-1 min-w-[280px] max-w-[350px]">
      {/* Column Header */}
      <div
        className={clsx(
          "flex items-center justify-between px-3 py-2 rounded-t-lg",
          bgColor,
        )}
      >
        <span className={clsx("font-medium text-sm", color)}>{title}</span>
        <span
          className={clsx(
            "px-2 py-0.5 rounded-full text-xs font-medium",
            bgColor,
            color,
          )}
        >
          {tasks.length}
        </span>
      </div>

      {/* Column Content */}
      <div className="bg-db-gray-50 rounded-b-lg p-2 min-h-[400px] space-y-2">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-db-gray-400 text-sm">
            No tasks
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onAssign={onAssign}
              onClaim={onClaim}
              onStart={onStart}
              onAnnotate={onAnnotate}
              onReview={onReview}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Create Batches Modal
// ============================================================================

interface CreateBatchesModalProps {
  job: LabelingJob;
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function CreateBatchesModal({
  job,
  isOpen,
  onClose,
  onCreated,
}: CreateBatchesModalProps) {
  const toast = useToast();
  const [batchSize, setBatchSize] = useState(job.default_batch_size);
  const [strategy, setStrategy] = useState<"manual" | "round_robin">("manual");

  // Fetch users for assignment
  const { data: usersData } = useQuery({
    queryKey: ["workspace-users"],
    queryFn: () => listWorkspaceUsers({ is_active: true }),
    enabled: isOpen && strategy === "round_robin",
  });

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const createMutation = useMutation({
    mutationFn: () =>
      bulkCreateLabelingTasks(job.id, {
        batch_size: batchSize,
        assignment_strategy: strategy,
        assignees: strategy === "round_robin" ? selectedUsers : undefined,
      }),
    onSuccess: (tasks) => {
      toast.success("Batches Created", `Created ${tasks.length} task batches`);
      onCreated();
      onClose();
    },
    onError: (error: Error) => {
      toast.error("Error", error.message);
    },
  });

  if (!isOpen) return null;

  const estimatedBatches = Math.ceil(job.total_items / batchSize);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-db-gray-200">
          <h2 className="text-lg font-semibold text-db-gray-800">
            Create Task Batches
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-db-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-db-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-db-gray-700 mb-1">
              Batch Size
            </label>
            <input
              type="number"
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value) || 50)}
              min={1}
              max={500}
              className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-db-orange focus:border-db-orange"
            />
            <p className="text-xs text-db-gray-500 mt-1">
              This will create ~{estimatedBatches} batches from{" "}
              {job.total_items} items
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-db-gray-700 mb-1">
              Assignment Strategy
            </label>
            <select
              value={strategy}
              onChange={(e) =>
                setStrategy(e.target.value as "manual" | "round_robin")
              }
              className="w-full px-3 py-2 border border-db-gray-300 rounded-lg focus:ring-2 focus:ring-db-orange focus:border-db-orange"
            >
              <option value="manual">Manual (assign later)</option>
              <option value="round_robin">Round Robin (auto-assign)</option>
            </select>
          </div>

          {strategy === "round_robin" && usersData && (
            <div>
              <label className="block text-sm font-medium text-db-gray-700 mb-1">
                Assign to Users
              </label>
              <div className="space-y-2 max-h-40 overflow-auto border border-db-gray-200 rounded-lg p-2">
                {usersData.users.map((user: WorkspaceUser) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.email)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, user.email]);
                        } else {
                          setSelectedUsers(
                            selectedUsers.filter((u) => u !== user.email),
                          );
                        }
                      }}
                      className="rounded text-db-orange focus:ring-db-orange"
                    />
                    <span className="text-sm text-db-gray-700">
                      {user.display_name}
                    </span>
                    <span className="text-xs text-db-gray-400">
                      ({user.email})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-db-gray-200 bg-db-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-db-gray-600 hover:text-db-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={
              createMutation.isPending ||
              (strategy === "round_robin" && selectedUsers.length === 0)
            }
            className="px-4 py-2 bg-db-orange text-white rounded-lg hover:bg-db-red disabled:opacity-50 flex items-center gap-2"
          >
            {createMutation.isPending && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            Create Batches
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Assign Modal
// ============================================================================

interface AssignModalProps {
  task: LabelingTask | null;
  isOpen: boolean;
  onClose: () => void;
  onAssigned: () => void;
}

function AssignModal({ task, isOpen, onClose, onAssigned }: AssignModalProps) {
  const toast = useToast();
  const [selectedUser, setSelectedUser] = useState<string>("");

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["workspace-users"],
    queryFn: () => listWorkspaceUsers({ is_active: true }),
    enabled: isOpen,
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      assignLabelingTask(task!.id, { assigned_to: selectedUser }),
    onSuccess: () => {
      toast.success("Task Assigned", `Task assigned to ${selectedUser}`);
      onAssigned();
      onClose();
    },
    onError: (error: Error) => {
      toast.error("Error", error.message);
    },
  });

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-db-gray-200">
          <h2 className="text-lg font-semibold text-db-gray-800">
            Assign Task
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-db-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-db-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-db-orange" />
            </div>
          ) : (
            <div className="space-y-2">
              {usersData?.users.map((user: WorkspaceUser) => (
                <label
                  key={user.id}
                  className={clsx(
                    "flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors",
                    selectedUser === user.email
                      ? "border-db-orange bg-amber-50"
                      : "border-db-gray-200 hover:border-db-gray-300",
                  )}
                >
                  <input
                    type="radio"
                    name="user"
                    value={user.email}
                    checked={selectedUser === user.email}
                    onChange={() => setSelectedUser(user.email)}
                    className="text-db-orange focus:ring-db-orange"
                  />
                  <div>
                    <div className="font-medium text-sm text-db-gray-800">
                      {user.display_name}
                    </div>
                    <div className="text-xs text-db-gray-500">
                      {user.current_task_count} active tasks
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-db-gray-200 bg-db-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-db-gray-600 hover:text-db-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => assignMutation.mutate()}
            disabled={!selectedUser || assignMutation.isPending}
            className="px-4 py-2 bg-db-orange text-white rounded-lg hover:bg-db-red disabled:opacity-50 flex items-center gap-2"
          >
            {assignMutation.isPending && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main TaskBoardView Component
// ============================================================================

interface TaskBoardViewProps {
  job: LabelingJob;
  onBack: () => void;
  onAnnotate?: (task: LabelingTask) => void;
  onReview?: (task: LabelingTask) => void;
}

export function TaskBoardView({
  job,
  onBack,
  onAnnotate,
  onReview,
}: TaskBoardViewProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showCreateBatches, setShowCreateBatches] = useState(false);
  const [assignTask, setAssignTask] = useState<LabelingTask | null>(null);

  // Fetch all tasks for this job
  const { data, isLoading, error } = useQuery({
    queryKey: ["labeling-tasks", job.id],
    queryFn: () => listLabelingTasks(job.id, { limit: 200 }),
  });

  // Claim mutation
  const claimMutation = useMutation({
    mutationFn: (taskId: string) => claimLabelingTask(taskId),
    onSuccess: () => {
      toast.success("Task Claimed", "You are now assigned to this task");
      queryClient.invalidateQueries({ queryKey: ["labeling-tasks", job.id] });
    },
    onError: (error: Error) => {
      toast.error("Error", error.message);
    },
  });

  // Start mutation
  const startMutation = useMutation({
    mutationFn: (taskId: string) => startLabelingTask(taskId),
    onSuccess: (task) => {
      toast.success("Task Started", "You can now begin labeling");
      queryClient.invalidateQueries({ queryKey: ["labeling-tasks", job.id] });
      if (onAnnotate) onAnnotate(task);
    },
    onError: (error: Error) => {
      toast.error("Error", error.message);
    },
  });

  // Group tasks by status
  const groupedTasks = useCallback(() => {
    if (!data?.tasks) return {};

    const groups: Record<string, LabelingTask[]> = {
      pending: [],
      pending_assigned: [],
      in_progress: [],
      submitted: [],
      approved: [],
    };

    for (const task of data.tasks) {
      if (task.status === "pending" && !task.assigned_to) {
        groups.pending.push(task);
      } else if (task.status === "pending" || task.status === "assigned") {
        groups.pending_assigned.push(task);
      } else if (task.status === "in_progress" || task.status === "rework") {
        groups.in_progress.push(task);
      } else if (task.status === "submitted" || task.status === "review") {
        groups.submitted.push(task);
      } else if (task.status === "approved") {
        groups.approved.push(task);
      }
    }

    return groups;
  }, [data?.tasks]);

  const handleAnnotate = useCallback(
    (task: LabelingTask) => {
      if (onAnnotate) {
        onAnnotate(task);
      } else {
        toast.info("Coming Soon", "Annotation interface is under development");
      }
    },
    [onAnnotate, toast],
  );

  const handleReview = useCallback(
    (task: LabelingTask) => {
      if (onReview) {
        onReview(task);
      } else {
        toast.info("Coming Soon", "Review interface is under development");
      }
    },
    [onReview, toast],
  );

  const groups = groupedTasks();

  return (
    <div className="flex-1 flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-db-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-db-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-db-gray-800">{job.name}</h1>
            <p className="text-sm text-db-gray-500">
              {data?.total || 0} tasks • {job.total_items} items
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateBatches(true)}
          className="flex items-center gap-2 px-4 py-2 bg-db-orange text-white rounded-lg hover:bg-db-red transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Batches
        </button>
      </div>

      {/* Board */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-db-orange" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-db-gray-600">Failed to load tasks</p>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-4">
            {BOARD_COLUMNS.map((col) => (
              <BoardColumn
                key={col.status}
                title={col.label}
                color={col.color}
                bgColor={col.bgColor}
                tasks={groups[col.status] || []}
                onAssign={(task) => setAssignTask(task)}
                onClaim={(task) => claimMutation.mutate(task.id)}
                onStart={(task) => startMutation.mutate(task.id)}
                onAnnotate={handleAnnotate}
                onReview={handleReview}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateBatchesModal
        job={job}
        isOpen={showCreateBatches}
        onClose={() => setShowCreateBatches(false)}
        onCreated={() =>
          queryClient.invalidateQueries({
            queryKey: ["labeling-tasks", job.id],
          })
        }
      />

      <AssignModal
        task={assignTask}
        isOpen={!!assignTask}
        onClose={() => setAssignTask(null)}
        onAssigned={() =>
          queryClient.invalidateQueries({
            queryKey: ["labeling-tasks", job.id],
          })
        }
      />
    </div>
  );
}
