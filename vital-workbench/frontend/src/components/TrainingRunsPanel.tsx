/**
 * TrainingRunsPanel - Display active and recent training runs with status
 */

import { useQuery } from '@tanstack/react-query';
import {
  ExternalLink,
  Play,
  Timer,
  Cpu,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { clsx } from 'clsx';
import { listJobRuns, getJobRun } from '../services/api';
import { databricksLinks } from '../services/databricksLinks';
import type { JobRun } from '../types';
import { JOB_STATUS_CONFIG, getStatusConfig } from '../constants/statusConfig';

interface TrainingRunCardProps {
  run: JobRun;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '--';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return '--';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function TrainingRunCard({ run }: TrainingRunCardProps) {
  // Poll for status if running
  const { data: liveRun } = useQuery({
    queryKey: ['jobRun', run.id],
    queryFn: () => getJobRun(run.id),
    refetchInterval: run.status === 'running' ? 5000 : false,
    enabled: run.status === 'running',
  });

  const currentRun = liveRun || run;
  const currentConfig = getStatusConfig(currentRun.status, JOB_STATUS_CONFIG, 'pending');
  const CurrentIcon = currentConfig.icon;

  // Extract training config
  const baseModel = currentRun.config?.base_model as string | undefined;
  const epochs = currentRun.config?.epochs as string | undefined;

  return (
    <div className="bg-white rounded-lg border border-db-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={clsx('p-2 rounded-lg', currentConfig.bgColor)}>
            <CurrentIcon
              className={clsx(
                'w-5 h-5',
                currentConfig.color,
                currentRun.status === 'running' && 'animate-spin'
              )}
            />
          </div>
          <div>
            <div className="font-medium text-db-gray-900">
              {currentRun.job_name || 'Fine-tune Job'}
            </div>
            <div className="text-sm text-db-gray-500 mt-0.5">
              {currentConfig.label}
              {currentRun.status === 'running' && currentRun.progress > 0 && (
                <span className="ml-2 text-blue-600">{currentRun.progress}%</span>
              )}
            </div>
          </div>
        </div>
        {currentRun.databricks_run_id && (
          <button
            onClick={() => window.open(
              `${databricksLinks.jobs()}?run_id=${currentRun.databricks_run_id}`,
              '_blank'
            )}
            className="p-1.5 text-db-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
            title="View in Databricks"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Progress bar for running jobs */}
      {currentRun.status === 'running' && (
        <div className="mt-3">
          <div className="h-1.5 bg-db-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${currentRun.progress || 10}%` }}
            />
          </div>
        </div>
      )}

      {/* Config details */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        {baseModel && (
          <div className="flex items-center gap-1 text-db-gray-500">
            <Cpu className="w-3 h-3" />
            <span className="truncate" title={baseModel}>
              {baseModel.replace('databricks-', '').replace('-instruct', '')}
            </span>
          </div>
        )}
        {epochs && (
          <div className="flex items-center gap-1 text-db-gray-500">
            <TrendingUp className="w-3 h-3" />
            <span>{epochs} epochs</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-db-gray-500">
          <Timer className="w-3 h-3" />
          <span>
            {currentRun.status === 'running'
              ? formatTimeAgo(currentRun.started_at)
              : formatDuration(currentRun.duration_seconds)}
          </span>
        </div>
      </div>

      {/* Error message */}
      {currentRun.status === 'failed' && currentRun.error_message && (
        <div className="mt-3 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-700">
          {currentRun.error_message}
        </div>
      )}

      {/* Success metrics */}
      {currentRun.status === 'succeeded' && currentRun.result && (
        <div className="mt-3 p-2 bg-green-50 border border-green-100 rounded">
          <div className="text-xs font-medium text-green-800 mb-1">Training Complete</div>
          <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
            {'model_name' in currentRun.result && (
              <div>Model: {String(currentRun.result.model_name)}</div>
            )}
            {'final_loss' in currentRun.result && (
              <div>Final Loss: {Number(currentRun.result.final_loss).toFixed(4)}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface TrainingRunsPanelProps {
  templateId?: string;
  limit?: number;
}

export function TrainingRunsPanel({ templateId, limit = 5 }: TrainingRunsPanelProps) {
  const { data: runs, isLoading } = useQuery({
    queryKey: ['jobRuns', 'training', templateId],
    queryFn: () => listJobRuns({
      job_type: 'finetune_fmapi',
      template_id: templateId,
      limit,
    }),
    refetchInterval: 10000, // Refresh every 10s
  });

  const trainingRuns = runs || [];
  const activeRuns = trainingRuns.filter(r => r.status === 'running' || r.status === 'pending');
  const completedRuns = trainingRuns.filter(r => r.status !== 'running' && r.status !== 'pending');

  return (
    <div className="bg-white rounded-lg border border-db-gray-200">
      <div className="px-4 py-3 border-b border-db-gray-200">
        <h3 className="font-semibold text-db-gray-800">Training Runs</h3>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-db-gray-400" />
          </div>
        ) : trainingRuns.length === 0 ? (
          <div className="text-center py-8">
            <Play className="w-8 h-8 text-db-gray-300 mx-auto mb-2" />
            <p className="text-sm text-db-gray-500">No training runs yet</p>
            <p className="text-xs text-db-gray-400 mt-1">Start a training job to see runs here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Active runs first */}
            {activeRuns.length > 0 && (
              <div>
                <div className="text-xs font-medium text-db-gray-500 uppercase tracking-wide mb-2">
                  Active ({activeRuns.length})
                </div>
                <div className="space-y-3">
                  {activeRuns.map(run => (
                    <TrainingRunCard key={run.id} run={run} />
                  ))}
                </div>
              </div>
            )}

            {/* Completed runs */}
            {completedRuns.length > 0 && (
              <div>
                <div className="text-xs font-medium text-db-gray-500 uppercase tracking-wide mb-2">
                  Recent ({completedRuns.length})
                </div>
                <div className="space-y-3">
                  {completedRuns.map(run => (
                    <TrainingRunCard key={run.id} run={run} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MLflow link */}
        <div className="mt-4 pt-4 border-t border-db-gray-200">
          <button
            onClick={() => window.open(databricksLinks.mlflowExperiments(), '_blank')}
            className="flex items-center justify-center gap-2 w-full py-2 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg"
          >
            <ExternalLink className="w-4 h-4" />
            View All in MLflow
          </button>
        </div>
      </div>
    </div>
  );
}
