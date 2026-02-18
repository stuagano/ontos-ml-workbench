-- ============================================================================
-- Migration: Add flagged column to feedback_items table
-- ============================================================================
-- Purpose: Add the missing flagged column to feedback_items table
--          for tracking problematic feedback entries
--
-- Usage:
--   Execute against your Databricks workspace SQL warehouse
--   Replace ${catalog} and ${schema} with actual values
--
-- ============================================================================

-- Add flagged column if it doesn't exist
ALTER TABLE `${catalog}`.`${schema}`.feedback_items
ADD COLUMN flagged BOOLEAN DEFAULT FALSE;

-- Verify the column was added
DESCRIBE TABLE EXTENDED `${catalog}`.`${schema}`.feedback_items;
