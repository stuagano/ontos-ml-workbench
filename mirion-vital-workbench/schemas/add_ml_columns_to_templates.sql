-- ============================================================================
-- Migration: Add ML column configuration to templates table
-- ============================================================================
-- Adds feature_columns and target_column to explicitly define:
--   - Independent variables (features) - columns used as input
--   - Dependent variable (target) - the column we're trying to predict
--
-- This enables proper supervised learning workflows where we know:
--   "Predict [target_column] based on [feature_columns]"
-- ============================================================================

ALTER TABLE home_stuart_gano.ontos_ml_workbench.templates
ADD COLUMN feature_columns ARRAY<STRING> COMMENT 'Independent variables (input features) - columns used to make predictions';

ALTER TABLE home_stuart_gano.ontos_ml_workbench.templates
ADD COLUMN target_column STRING COMMENT 'Dependent variable (output/target) - the column we are trying to predict';
