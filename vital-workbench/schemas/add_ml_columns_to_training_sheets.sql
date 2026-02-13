-- ============================================================================
-- Migration: Add ML column configuration to training_sheets table
-- ============================================================================
-- Adds feature_columns and target_column to store the ML configuration
-- that was used when generating this training data.
--
-- This metadata is critical for:
-- 1. Understanding what the training data is for
-- 2. Model training - knowing inputs vs outputs
-- 3. Lineage tracking - tracing configuration
-- ============================================================================

ALTER TABLE home_stuart_gano.mirion_vital_workbench.training_sheets
ADD COLUMN feature_columns ARRAY<STRING> COMMENT 'Independent variables (input features) used';

ALTER TABLE home_stuart_gano.mirion_vital_workbench.training_sheets
ADD COLUMN target_column STRING COMMENT 'Dependent variable (output/target) being predicted';
