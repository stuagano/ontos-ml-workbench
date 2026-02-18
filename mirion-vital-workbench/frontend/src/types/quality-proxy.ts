/**
 * TypeScript types for the VITAL → Ontos DQX quality proxy.
 *
 * Mirrors backend models in dqx_quality_proxy.py.
 */

export type CheckCriticality = "blocking" | "warning" | "info";

export interface CheckResult {
  check_id: string;
  check_name: string;
  passed: boolean;
  criticality: CheckCriticality;
  message: string;
  details?: Record<string, unknown>;
}

export interface QualityProxyRunResponse {
  collection_id: string;
  ontos_run_id: string | null;
  total_pairs: number;
  pass_rate: number;
  quality_score: number;
  check_results: CheckResult[];
  pushed_to_ontos: boolean;
}
