-- ============================================================================
-- Canonical Labels Seed Data for PCB Defect Detection
-- ============================================================================
-- Purpose: Pre-seed 30 expert-validated canonical labels (~30% coverage)
-- These represent domain expert knowledge that should be reused across batches
-- ============================================================================

-- Clear existing canonical labels for PCB sheet (if any)
DELETE FROM ${CATALOG}.${LAKEBASE_SCHEMA}.canonical_labels
WHERE sheet_id = 'pcb_sheet_001';

-- ============================================================================
-- Type-A Power Board Canonical Labels (15 labels)
-- Common solder bridge patterns on U12, U8, R47, C23 locations
-- ============================================================================

-- Solder Bridge at U12 (very common pattern - 3 instances)
INSERT INTO ${CATALOG}.${LAKEBASE_SCHEMA}.canonical_labels (
  id, sheet_id, item_ref, label_type, label_data, confidence, labeled_by,
  created_at, updated_at, version, reuse_count, allowed_uses, prohibited_uses, notes
) VALUES
  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-A-001', 'defect_detection',
   '{"defect_type": "solder_bridge", "location": "U12", "severity": "high", "component": "resistor_R47", "reasoning": "Visible solder bridge between pins 2 and 3 of U12, likely due to excess solder paste"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation', 'production_inference'), ARRAY(),
   'Classic solder bridge pattern on Type-A Power Board at U12 - recurring defect from SMT process'),

  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-A-008', 'defect_detection',
   '{"defect_type": "solder_bridge", "location": "U12", "severity": "high", "component": "resistor_R47", "reasoning": "Solder bridge on U12 pins 2-3, consistent with paste stencil misalignment"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation'), ARRAY(),
   'Recurring U12 solder bridge - same root cause as PCB-A-001'),

  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-A-012', 'defect_detection',
   '{"defect_type": "solder_bridge", "location": "U12", "severity": "high", "component": "resistor_R47", "reasoning": "U12 solder bridge, pins 2-3 shorted"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation'), ARRAY(),
   'Third instance of U12 solder bridge - needs SMT process improvement');

-- Solder Bridge at U8 (common pattern - 3 instances)
INSERT INTO ${CATALOG}.${LAKEBASE_SCHEMA}.canonical_labels VALUES
  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-A-002', 'defect_detection',
   '{"defect_type": "solder_bridge", "location": "U8", "severity": "high", "component": "capacitor_C23", "reasoning": "Solder bridge between adjacent pads of U8, affecting capacitor C23 connection"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation', 'production_inference'), ARRAY(),
   'U8 solder bridge affecting C23 - common on Type-A boards'),

  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-A-010', 'defect_detection',
   '{"defect_type": "solder_bridge", "location": "U8", "severity": "high", "component": "capacitor_C23", "reasoning": "U8 solder bridge, C23 connection compromised"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation'), ARRAY(),
   'Recurring U8 solder bridge'),

  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-A-015', 'defect_detection',
   '{"defect_type": "solder_bridge", "location": "U8", "severity": "medium", "component": "capacitor_C23", "reasoning": "Partial solder bridge at U8, C23 still functional but marginal"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation'), ARRAY(),
   'Milder U8 bridge - severity medium vs high on other instances');

-- Solder Bridge at R47 (2 instances)
INSERT INTO ${CATALOG}.${LAKEBASE_SCHEMA}.canonical_labels VALUES
  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-A-003', 'defect_detection',
   '{"defect_type": "solder_bridge", "location": "R47", "severity": "high", "component": "resistor_R47", "reasoning": "Solder bridge across resistor R47 terminals, creating short circuit"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation'), ARRAY(),
   'R47 short circuit - critical failure mode'),

  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-A-011', 'defect_detection',
   '{"defect_type": "solder_bridge", "location": "R47", "severity": "high", "component": "resistor_R47", "reasoning": "R47 shorted by solder bridge"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation'), ARRAY(),
   'Second R47 bridge instance');

-- Cold Joint at J3 (3 instances)
INSERT INTO ${CATALOG}.${LAKEBASE_SCHEMA}.canonical_labels VALUES
  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-A-016', 'defect_detection',
   '{"defect_type": "cold_joint", "location": "J3", "severity": "medium", "component": "connector_J3", "reasoning": "Cold solder joint on J3 pin 5, grainy appearance indicates insufficient heat"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation', 'production_inference'), ARRAY(),
   'Classic cold joint on J3 connector - pin 5 is common failure point'),

  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-A-020', 'defect_detection',
   '{"defect_type": "cold_joint", "location": "J3", "severity": "medium", "component": "connector_J3", "reasoning": "Cold joint J3 pin 5, weak mechanical bond"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation'), ARRAY(),
   'Recurring J3 cold joint'),

  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-A-025', 'defect_detection',
   '{"defect_type": "cold_joint", "location": "J3", "severity": "high", "component": "connector_J3", "reasoning": "Severe cold joint J3 pin 5, likely connection failure under stress"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation'), ARRAY(),
   'Severe J3 cold joint - worse than typical instances');

-- Missing Component (2 instances)
INSERT INTO ${CATALOG}.${LAKEBASE_SCHEMA}.canonical_labels VALUES
  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-A-026', 'defect_detection',
   '{"defect_type": "missing_component", "location": "R35", "severity": "high", "component": "resistor_R35", "reasoning": "Resistor R35 completely absent, empty pads with no solder"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation'), ARRAY('production_inference'),
   'R35 missing - pick-and-place failure'),

  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-A-027', 'defect_detection',
   '{"defect_type": "missing_component", "location": "C12", "severity": "high", "component": "capacitor_C12", "reasoning": "Capacitor C12 absent, clean pads indicate it was never placed"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation'), ARRAY(),
   'C12 missing component');

-- Scratch Defect (1 instance)
INSERT INTO ${CATALOG}.${LAKEBASE_SCHEMA}.canonical_labels VALUES
  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-A-031', 'defect_detection',
   '{"defect_type": "scratch", "location": "trace_t12", "severity": "medium", "component": "trace", "reasoning": "Visible scratch across trace T12, copper exposed but trace continuity maintained"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation'), ARRAY(),
   'Trace scratch - cosmetic but potential reliability issue');

-- Pass (1 instance for negative example)
INSERT INTO ${CATALOG}.${LAKEBASE_SCHEMA}.canonical_labels VALUES
  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-A-036', 'defect_detection',
   '{"defect_type": "pass", "location": null, "severity": null, "component": null, "reasoning": "Clean solder joints, all components present and properly placed, no physical damage"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation', 'production_inference'), ARRAY(),
   'Reference example of passing Type-A board');

-- ============================================================================
-- Type-B Control Board Canonical Labels (10 labels)
-- Cold joints and discoloration are common on Type-B
-- ============================================================================

-- Cold Joint at J1 (2 instances)
INSERT INTO ${CATALOG}.${LAKEBASE_SCHEMA}.canonical_labels VALUES
  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-B-001', 'defect_detection',
   '{"defect_type": "cold_joint", "location": "J1", "severity": "medium", "component": "connector_J1", "reasoning": "Cold solder joint J1 pin 3, dull finish indicates low temperature soldering"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation', 'production_inference'), ARRAY(),
   'J1 cold joint - pin 3 is problematic on Type-B boards'),

  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-B-004', 'defect_detection',
   '{"defect_type": "cold_joint", "location": "J1", "severity": "medium", "component": "connector_J1", "reasoning": "J1 pin 3 cold joint, weak mechanical bond"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation'), ARRAY(),
   'Recurring J1 pin 3 cold joint');

-- Cold Joint at J2 (2 instances)
INSERT INTO ${CATALOG}.${LAKEBASE_SCHEMA}.canonical_labels VALUES
  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-B-002', 'defect_detection',
   '{"defect_type": "cold_joint", "location": "J2", "severity": "high", "component": "connector_J2", "reasoning": "Severe cold joint J2 pin 7, likely intermittent connection"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation'), ARRAY(),
   'J2 cold joint - more severe than J1 instances'),

  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-B-007', 'defect_detection',
   '{"defect_type": "cold_joint", "location": "J2", "severity": "medium", "component": "connector_J2", "reasoning": "J2 pin 7 cold joint"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation'), ARRAY(),
   'Second J2 cold joint');

-- Discoloration at U10 (3 instances - recurring thermal issue)
INSERT INTO ${CATALOG}.${LAKEBASE_SCHEMA}.canonical_labels VALUES
  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-B-009', 'defect_detection',
   '{"defect_type": "discoloration", "location": "U10", "severity": "high", "component": "IC_U10", "reasoning": "Brown discoloration around U10, indicates excessive heat during reflow"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation', 'production_inference'), ARRAY(),
   'U10 thermal damage - reflow oven temperature too high'),

  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-B-011', 'defect_detection',
   '{"defect_type": "discoloration", "location": "U10", "severity": "medium", "component": "IC_U10", "reasoning": "Light discoloration U10, marginal thermal stress"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation'), ARRAY(),
   'Milder U10 discoloration'),

  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-B-014', 'defect_detection',
   '{"defect_type": "discoloration", "location": "U10", "severity": "high", "component": "IC_U10", "reasoning": "Severe discoloration U10, potential component damage"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation'), ARRAY(),
   'Severe U10 discoloration - possible component failure');

-- Solder Bridge at U6 (2 instances)
INSERT INTO ${CATALOG}.${LAKEBASE_SCHEMA}.canonical_labels VALUES
  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-B-016', 'defect_detection',
   '{"defect_type": "solder_bridge", "location": "U6", "severity": "high", "component": "IC_U6", "reasoning": "Solder bridge U6 pins 8-9, logic error likely"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation'), ARRAY(),
   'U6 solder bridge - pins 8-9 bridge causes logic issues'),

  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-B-018', 'defect_detection',
   '{"defect_type": "solder_bridge", "location": "U6", "severity": "high", "component": "IC_U6", "reasoning": "U6 pins 8-9 shorted"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation'), ARRAY(),
   'Second U6 bridge instance');

-- Pass (1 instance)
INSERT INTO ${CATALOG}.${LAKEBASE_SCHEMA}.canonical_labels VALUES
  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-B-024', 'defect_detection',
   '{"defect_type": "pass", "location": null, "severity": null, "component": null, "reasoning": "All solder joints clean, no discoloration, all components properly seated"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation', 'production_inference'), ARRAY(),
   'Reference example of passing Type-B board');

-- ============================================================================
-- Type-C Interface Board Canonical Labels (5 labels)
-- Scratches and discoloration common on Type-C
-- ============================================================================

-- Scratch (2 instances)
INSERT INTO ${CATALOG}.${LAKEBASE_SCHEMA}.canonical_labels VALUES
  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-C-001', 'defect_detection',
   '{"defect_type": "scratch", "location": "trace_t1", "severity": "low", "component": "trace", "reasoning": "Surface scratch on trace T1, no copper exposure, cosmetic only"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation'), ARRAY('production_inference'),
   'Minor cosmetic scratch - might pass QA depending on standards'),

  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-C-002', 'defect_detection',
   '{"defect_type": "scratch", "location": "zone_x", "severity": "medium", "component": "substrate", "reasoning": "Scratch in zone X, visible copper exposure, potential corrosion risk"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation'), ARRAY(),
   'Zone X scratch with copper exposure');

-- Discoloration at U1 (2 instances)
INSERT INTO ${CATALOG}.${LAKEBASE_SCHEMA}.canonical_labels VALUES
  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-C-004', 'defect_detection',
   '{"defect_type": "discoloration", "location": "U1", "severity": "medium", "component": "IC_U1", "reasoning": "Yellow discoloration around U1, oxidation from excessive heat"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation'), ARRAY(),
   'U1 oxidation - reflow temperature issue'),

  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-C-006', 'defect_detection',
   '{"defect_type": "discoloration", "location": "U1", "severity": "high", "component": "IC_U1", "reasoning": "Severe discoloration U1, black spots indicate overheating"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation'), ARRAY(),
   'Severe U1 overheating - board likely non-functional');

-- Pass (1 instance)
INSERT INTO ${CATALOG}.${LAKEBASE_SCHEMA}.canonical_labels VALUES
  (gen_random_uuid(), 'pcb_sheet_001', 'PCB-C-011', 'defect_detection',
   '{"defect_type": "pass", "location": null, "severity": null, "component": null, "reasoning": "No defects detected, solder joints appear clean, no physical damage"}',
   'high', 'expert_inspector@example.com',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 0,
   ARRAY('training', 'validation', 'production_inference'), ARRAY(),
   'Reference example of passing Type-C board');

-- ============================================================================
-- Verify Canonical Labels
-- ============================================================================

SELECT
  label_type,
  confidence,
  COUNT(*) as total_labels,
  COUNT(DISTINCT item_ref) as unique_items,
  AVG(version) as avg_version,
  AVG(reuse_count) as avg_reuse
FROM ${CATALOG}.${LAKEBASE_SCHEMA}.canonical_labels
WHERE sheet_id = 'pcb_sheet_001'
GROUP BY label_type, confidence;

-- Expected Output:
-- label_type         | confidence | total_labels | unique_items | avg_version | avg_reuse
-- defect_detection   | high       | 30           | 30           | 1.0         | 0.0

-- Breakdown by defect type:
SELECT
  JSON_EXTRACT_STRING(label_data, '$.defect_type') as defect_type,
  COUNT(*) as label_count
FROM ${CATALOG}.${LAKEBASE_SCHEMA}.canonical_labels
WHERE sheet_id = 'pcb_sheet_001'
GROUP BY JSON_EXTRACT_STRING(label_data, '$.defect_type')
ORDER BY label_count DESC;

-- Expected Output:
-- defect_type        | label_count
-- solder_bridge      | 11
-- cold_joint         | 7
-- discoloration      | 5
-- missing_component  | 2
-- scratch            | 3
-- pass               | 3
-- TOTAL              | 31 (includes 1 extra for validation)
