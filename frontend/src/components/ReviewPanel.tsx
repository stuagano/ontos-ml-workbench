/**
 * ReviewPanel - Embeddable asset review workflow panel (G4)
 *
 * Drop this into any asset detail view to enable steward review.
 * Shows current review status, allows requesting review, assigning
 * reviewers, and submitting decisions.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Send,
  Loader2,
  UserCheck,
} from "lucide-react";
import { clsx } from "clsx";
import {
  listReviews,
  requestReview,
  assignReviewer,
  submitDecision,
} from "../services/governance";
import { useToast } from "./Toast";
import type { AssetType, ReviewStatus, AssetReview } from "../types/governance";

interface ReviewPanelProps {
  assetType: AssetType;
  assetId: string;
  assetName?: string;
}

const STATUS_CONFIG: Record<ReviewStatus, {
  label: string;
  icon: typeof Clock;
  bg: string;
  text: string;
}> = {
  pending: {
    label: "Pending Review",
    icon: Clock,
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
  },
  in_review: {
    label: "In Review",
    icon: Eye,
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-400",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    bg: "bg-green-50 dark:bg-green-950/30",
    text: "text-green-700 dark:text-green-400",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-400",
  },
  changes_requested: {
    label: "Changes Requested",
    icon: AlertTriangle,
    bg: "bg-orange-50 dark:bg-orange-950/30",
    text: "text-orange-700 dark:text-orange-400",
  },
};

function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", config.bg, config.text)}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

export function ReviewPanel({ assetType, assetId, assetName }: ReviewPanelProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [reviewerInput, setReviewerInput] = useState("");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [showDecisionForm, setShowDecisionForm] = useState(false);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["asset-reviews", assetType, assetId],
    queryFn: () => listReviews({ asset_type: assetType, asset_id: assetId }),
  });

  const latest: AssetReview | undefined = reviews[0];

  const requestMutation = useMutation({
    mutationFn: () =>
      requestReview({
        asset_type: assetType,
        asset_id: assetId,
        asset_name: assetName,
        reviewer_email: reviewerInput || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-reviews", assetType, assetId] });
      toast.success("Review Requested", "Asset submitted for review");
      setReviewerInput("");
    },
    onError: (err: Error) => toast.error("Request Failed", err.message),
  });

  const assignMutation = useMutation({
    mutationFn: (email: string) => assignReviewer(latest!.id, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-reviews", assetType, assetId] });
      toast.success("Reviewer Assigned", "Reviewer has been assigned");
      setReviewerInput("");
    },
    onError: (err: Error) => toast.error("Assign Failed", err.message),
  });

  const decisionMutation = useMutation({
    mutationFn: (decision: { status: "approved" | "rejected" | "changes_requested"; review_notes?: string }) =>
      submitDecision(latest!.id, decision),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["asset-reviews", assetType, assetId] });
      toast.success("Decision Submitted", `Review ${variables.status.replace("_", " ")}`);
      setShowDecisionForm(false);
      setDecisionNotes("");
    },
    onError: (err: Error) => toast.error("Decision Failed", err.message),
  });

  if (isLoading) {
    return (
      <div className="border border-db-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm text-db-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading review status...
        </div>
      </div>
    );
  }

  const canRequestReview = !latest || latest.status === "approved" || latest.status === "rejected" || latest.status === "changes_requested";
  const canAssign = latest?.status === "pending" && !latest.reviewer_email;
  const canDecide = latest?.status === "in_review";

  return (
    <div className="border border-db-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-db-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2 text-sm font-medium text-db-gray-700 dark:text-gray-300">
          <ClipboardCheck className="w-4 h-4" />
          Asset Review
        </div>
        {latest && <ReviewStatusBadge status={latest.status as ReviewStatus} />}
      </div>

      <div className="p-4 space-y-4">
        {/* Current review details */}
        {latest && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-db-gray-600 dark:text-gray-400">
              <span>Requested by</span>
              <span className="font-medium text-db-gray-800 dark:text-white">{latest.requested_by}</span>
            </div>
            {latest.reviewer_email && (
              <div className="flex justify-between text-db-gray-600 dark:text-gray-400">
                <span>Reviewer</span>
                <span className="font-medium text-db-gray-800 dark:text-white">{latest.reviewer_email}</span>
              </div>
            )}
            {latest.review_notes && (
              <div className="mt-2 p-3 bg-db-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="text-xs font-medium text-db-gray-500 dark:text-gray-500 mb-1">Review Notes</div>
                <div className="text-sm text-db-gray-800 dark:text-white">{latest.review_notes}</div>
              </div>
            )}
            {latest.decision_at && (
              <div className="flex justify-between text-db-gray-600 dark:text-gray-400">
                <span>Decided</span>
                <span className="text-xs">{new Date(latest.decision_at).toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {/* No review yet */}
        {!latest && (
          <p className="text-sm text-db-gray-500 dark:text-gray-500">
            No reviews yet. Submit this asset for steward review.
          </p>
        )}

        {/* Assign reviewer (pending, no reviewer) */}
        {canAssign && (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">Assign Reviewer</label>
              <input
                type="email"
                value={reviewerInput}
                onChange={(e) => setReviewerInput(e.target.value)}
                placeholder="reviewer@example.com"
                className="w-full px-3 py-1.5 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
              />
            </div>
            <button
              onClick={() => reviewerInput && assignMutation.mutate(reviewerInput)}
              disabled={!reviewerInput || assignMutation.isPending}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" /> Assign
            </button>
          </div>
        )}

        {/* Decision form (in_review) */}
        {canDecide && !showDecisionForm && (
          <button
            onClick={() => setShowDecisionForm(true)}
            className="w-full px-3 py-2 text-sm bg-db-orange text-white rounded-lg hover:bg-db-red transition-colors flex items-center justify-center gap-2"
          >
            <ClipboardCheck className="w-4 h-4" /> Submit Decision
          </button>
        )}

        {canDecide && showDecisionForm && (
          <div className="space-y-3 p-3 border border-db-gray-200 dark:border-gray-700 rounded-lg">
            <textarea
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder="Review notes (optional)..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => decisionMutation.mutate({ status: "approved", review_notes: decisionNotes || undefined })}
                disabled={decisionMutation.isPending}
                className="flex-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
              </button>
              <button
                onClick={() => decisionMutation.mutate({ status: "changes_requested", review_notes: decisionNotes || undefined })}
                disabled={decisionMutation.isPending}
                className="flex-1 px-3 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Changes
              </button>
              <button
                onClick={() => decisionMutation.mutate({ status: "rejected", review_notes: decisionNotes || undefined })}
                disabled={decisionMutation.isPending}
                className="flex-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
            </div>
            <button
              onClick={() => { setShowDecisionForm(false); setDecisionNotes(""); }}
              className="w-full text-xs text-db-gray-500 hover:text-db-gray-700 dark:hover:text-gray-300"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Request review (new or re-review) */}
        {canRequestReview && (
          <div className="space-y-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-db-gray-600 dark:text-gray-400 mb-1">
                  {latest ? "Request Re-review" : "Request Review"}
                </label>
                <input
                  type="email"
                  value={reviewerInput}
                  onChange={(e) => setReviewerInput(e.target.value)}
                  placeholder="Reviewer email (optional)"
                  className="w-full px-3 py-1.5 text-sm border border-db-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-db-gray-800 dark:text-white"
                />
              </div>
              <button
                onClick={() => requestMutation.mutate()}
                disabled={requestMutation.isPending}
                className="px-3 py-1.5 text-sm bg-db-orange text-white rounded-lg hover:bg-db-red disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {requestMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {latest ? "Re-review" : "Submit"}
              </button>
            </div>
          </div>
        )}

        {/* History (show count if > 1) */}
        {reviews.length > 1 && (
          <div className="text-xs text-db-gray-400 dark:text-gray-600 pt-2 border-t border-db-gray-100 dark:border-gray-800">
            {reviews.length} review{reviews.length === 1 ? "" : "s"} on record
          </div>
        )}
      </div>
    </div>
  );
}
