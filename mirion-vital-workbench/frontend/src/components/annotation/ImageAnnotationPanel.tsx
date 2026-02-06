/**
 * ImageAnnotationPanel - High-level wrapper for image annotation in the Curate workflow
 *
 * Provides a complete annotation experience with:
 * - Bounding box annotation
 * - Label class management
 * - Navigation between images
 * - Save/submit controls
 */

import { useState, useCallback, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  SkipForward,
  CheckCircle,
  AlertTriangle,
  Save,
} from "lucide-react";
import { SimpleAnnotator, BoundingBox } from "./SimpleAnnotator";

// ============================================================================
// Types
// ============================================================================

export interface LabelConfig {
  name: string;
  color: string;
}

export interface Annotation {
  id: string | number;
  result: BoundingBox[];
  created_at?: string;
  updated_at?: string;
}

export interface AnnotationTask {
  id: string;
  imageUrl: string;
  rowIndex: number;
  prompt?: string;
  sourceData?: Record<string, unknown>;
  existingAnnotations?: Annotation[];
  status: "pending" | "annotated" | "reviewed" | "flagged";
}

export interface ImageAnnotationPanelProps {
  /** Current task to annotate */
  task: AnnotationTask;

  /** All tasks for navigation */
  tasks: AnnotationTask[];

  /** Current task index */
  currentIndex: number;

  /** Available label classes */
  labels: LabelConfig[];

  /** Default annotation type (kept for compatibility) */
  defaultAnnotationType?: string;

  /** Callback when annotation is saved */
  onSave: (taskId: string, annotation: Annotation) => void;

  /** Callback when task is skipped */
  onSkip?: (taskId: string, reason?: string) => void;

  /** Callback when task is flagged */
  onFlag?: (taskId: string, reason: string) => void;

  /** Callback to navigate to different task */
  onNavigate: (index: number) => void;
}

// ============================================================================
// Navigation Controls
// ============================================================================

interface NavigationControlsProps {
  currentIndex: number;
  totalTasks: number;
  onPrev: () => void;
  onNext: () => void;
}

function NavigationControls({
  currentIndex,
  totalTasks,
  onPrev,
  onNext,
}: NavigationControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onPrev}
        disabled={currentIndex === 0}
        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm text-gray-600 min-w-[80px] text-center">
        {currentIndex + 1} / {totalTasks}
      </span>
      <button
        onClick={onNext}
        disabled={currentIndex === totalTasks - 1}
        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ImageAnnotationPanel({
  task,
  tasks,
  currentIndex,
  labels,
  onSave,
  onSkip,
  onFlag,
  onNavigate,
}: ImageAnnotationPanelProps) {
  const [currentBoxes, setCurrentBoxes] = useState<BoundingBox[]>(
    task.existingAnnotations?.[0]?.result || [],
  );
  const [isFlagging, setIsFlagging] = useState(false);
  const [flagReason, setFlagReason] = useState("");

  // Reset state when task changes (navigating to different image)
  useEffect(() => {
    setCurrentBoxes(task.existingAnnotations?.[0]?.result || []);
    setIsFlagging(false);
    setFlagReason("");
  }, [task.id]);

  // Handle annotation changes
  const handleAnnotationsChange = useCallback((boxes: BoundingBox[]) => {
    setCurrentBoxes(boxes);
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    const annotation: Annotation = {
      id: `ann-${Date.now()}`,
      result: currentBoxes,
      created_at: new Date().toISOString(),
    };
    onSave(task.id, annotation);
  }, [task.id, currentBoxes, onSave]);

  // Handle navigation
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    }
  }, [currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (currentIndex < tasks.length - 1) {
      onNavigate(currentIndex + 1);
    }
  }, [currentIndex, tasks.length, onNavigate]);

  // Handle skip
  const handleSkip = useCallback(() => {
    if (onSkip) {
      onSkip(task.id);
      handleNext();
    }
  }, [task.id, onSkip, handleNext]);

  // Handle flag
  const handleFlag = useCallback(() => {
    if (onFlag && flagReason.trim()) {
      onFlag(task.id, flagReason);
      setFlagReason("");
      setIsFlagging(false);
    }
  }, [task.id, flagReason, onFlag]);

  // Ensure labels have colors
  const labelsWithColors = labels.map((l, i) => ({
    name: l.name,
    color:
      l.color || ["#ef4444", "#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6"][i % 5],
  }));

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <NavigationControls
          currentIndex={currentIndex}
          totalTasks={tasks.length}
          onPrev={handlePrev}
          onNext={handleNext}
        />

        <div className="flex items-center gap-2">
          {onSkip && (
            <button
              onClick={handleSkip}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            >
              <SkipForward className="w-4 h-4" />
              Skip
            </button>
          )}
          {onFlag && (
            <button
              onClick={() => setIsFlagging(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-amber-600 hover:text-amber-700 rounded-lg hover:bg-amber-50"
            >
              <AlertTriangle className="w-4 h-4" />
              Flag
            </button>
          )}
        </div>
      </div>

      {/* Task Info */}
      {task.prompt && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
          <p className="text-sm text-blue-800">
            <strong>Task:</strong> {task.prompt}
          </p>
        </div>
      )}

      {/* Annotation Area */}
      <div className="flex-1 p-4 overflow-auto">
        <SimpleAnnotator
          key={task.id}
          imageUrl={task.imageUrl}
          labels={labelsWithColors}
          existingBoxes={currentBoxes}
          onAnnotationsChange={handleAnnotationsChange}
          height={400}
        />
      </div>

      {/* Footer with Save */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              task.status === "annotated"
                ? "bg-green-100 text-green-700"
                : task.status === "reviewed"
                  ? "bg-blue-100 text-blue-700"
                  : task.status === "flagged"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-700"
            }`}
          >
            {task.status === "annotated" && <CheckCircle className="w-3 h-3" />}
            {task.status === "flagged" && <AlertTriangle className="w-3 h-3" />}
            {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
          </span>
          <span className="text-xs text-gray-500">Row {task.rowIndex}</span>
          {currentBoxes.length > 0 && (
            <span className="text-xs text-gray-500">
              · {currentBoxes.length} annotation(s)
            </span>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={currentBoxes.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          Save & Continue
        </button>
      </div>

      {/* Flag Modal */}
      {isFlagging && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Flag this task
            </h3>
            <textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Why are you flagging this task?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
              rows={3}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setIsFlagging(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleFlag}
                disabled={!flagReason.trim()}
                className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
              >
                Flag Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageAnnotationPanel;
