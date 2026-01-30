/**
 * LabelingWorkflow - Main component that orchestrates the labeling flow
 *
 * This component manages navigation between:
 * - LabelingJobsPage (job list)
 * - TaskBoardView (task management for a job)
 * - AnnotationInterface (labeling items)
 * - ReviewInterface (reviewing labeled items)
 */

import { useState, useCallback } from "react";
import { LabelingJobsPage } from "../../pages/LabelingJobsPage";
import { TaskBoardView } from "./TaskBoardView";
import { AnnotationInterface } from "./AnnotationInterface";
import { ReviewInterface } from "./ReviewInterface";
import type { LabelingJob, LabelingTask } from "../../types";

type View =
  | { type: "jobs" }
  | { type: "tasks"; job: LabelingJob }
  | { type: "annotate"; task: LabelingTask }
  | { type: "review"; task: LabelingTask };

export function LabelingWorkflow() {
  const [view, setView] = useState<View>({ type: "jobs" });

  const handleViewTasks = useCallback((job: LabelingJob) => {
    setView({ type: "tasks", job });
  }, []);

  const handleAnnotate = useCallback((task: LabelingTask) => {
    setView({ type: "annotate", task });
  }, []);

  const handleReview = useCallback((task: LabelingTask) => {
    setView({ type: "review", task });
  }, []);

  const handleBackToJobs = useCallback(() => {
    setView({ type: "jobs" });
  }, []);

  const handleBackToTasks = useCallback(() => {
    if (view.type === "annotate" || view.type === "review") {
      // Need to get the job - fetch it or store in state
      // For now, go back to jobs list
      setView({ type: "jobs" });
    }
  }, [view]);

  switch (view.type) {
    case "jobs":
      return <LabelingJobsPage onViewTasks={handleViewTasks} />;

    case "tasks":
      return (
        <TaskBoardView
          job={view.job}
          onBack={handleBackToJobs}
          onAnnotate={handleAnnotate}
          onReview={handleReview}
        />
      );

    case "annotate":
      return (
        <AnnotationInterface
          task={view.task}
          onBack={handleBackToTasks}
          onComplete={handleBackToTasks}
        />
      );

    case "review":
      return (
        <ReviewInterface
          task={view.task}
          onBack={handleBackToTasks}
          onComplete={handleBackToTasks}
        />
      );

    default:
      return <LabelingJobsPage onViewTasks={handleViewTasks} />;
  }
}

// Re-export components for direct use
export { LabelingJobsPage } from "../../pages/LabelingJobsPage";
export { TaskBoardView } from "./TaskBoardView";
export { AnnotationInterface } from "./AnnotationInterface";
export { ReviewInterface } from "./ReviewInterface";
