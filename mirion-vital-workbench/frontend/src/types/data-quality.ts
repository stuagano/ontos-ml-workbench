/**
 * Data Quality types — matches backend data_quality.py Pydantic models.
 */

export interface ColumnProfile {
  name: string;
  type: string;
  nullable: boolean;
}

export interface ProfileResult {
  table: string;
  row_count: number;
  column_count: number;
  columns: ColumnProfile[];
  suggested_checks: DQCheck[];
}

export interface DQCheck {
  name?: string;
  criticality?: string;
  check?: string;
  [key: string]: unknown;
}

export interface RunChecksResult {
  table: string;
  total_rows: number;
  passed_rows: number;
  failed_rows: number;
  pass_rate: number;
  column_results: CheckColumnResult[];
}

export interface CheckColumnResult {
  check: string;
  failures: number;
}

export interface GenerateRulesResult {
  checks: DQCheck[];
  yaml_output: string;
}

export interface QualityResults {
  sheet_id: string;
  table: string;
  last_run_at: string | null;
  pass_rate: number | null;
  total_checks: number;
  results: DQCheck[];
}
