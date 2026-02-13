-- ============================================================================
-- PCB Defect Detection Seed Data
-- ============================================================================
-- Purpose: Create realistic PCB inspection data for testing canonical labels
-- Schema: pcb_inspection.raw_images
-- Records: 100 PCB image records (70 defective, 30 passing)
-- ============================================================================

-- Create schema
CREATE SCHEMA IF NOT EXISTS pcb_inspection;

-- Create raw images table
CREATE TABLE IF NOT EXISTS pcb_inspection.raw_images (
  image_id STRING PRIMARY KEY,
  image_path STRING,
  serial_number STRING,
  board_type STRING,
  inspection_date TIMESTAMP,
  line_id STRING,
  shift STRING,
  metadata STRING
) USING DELTA;

-- Clear existing data (if any)
DELETE FROM pcb_inspection.raw_images;

-- ============================================================================
-- Type-A Power Boards (50 boards total)
-- Defects: 15 solder_bridge, 10 cold_joint, 5 missing_component, 5 scratch, 15 pass
-- ============================================================================

-- Solder Bridge Defects (15)
INSERT INTO pcb_inspection.raw_images VALUES
  ('img_a_001', '/dbfs/pcb_images/type_a/a_001.jpg', 'PCB-A-001', 'Type-A Power Board', '2026-01-20T08:15:00', 'Line-1', 'Morning', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "solder_bridge", "location": "U12"}'),
  ('img_a_002', '/dbfs/pcb_images/type_a/a_002.jpg', 'PCB-A-002', 'Type-A Power Board', '2026-01-20T08:17:00', 'Line-1', 'Morning', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "solder_bridge", "location": "U8"}'),
  ('img_a_003', '/dbfs/pcb_images/type_a/a_003.jpg', 'PCB-A-003', 'Type-A Power Board', '2026-01-20T08:19:00', 'Line-1', 'Morning', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "solder_bridge", "location": "R47"}'),
  ('img_a_004', '/dbfs/pcb_images/type_a/a_004.jpg', 'PCB-A-004', 'Type-A Power Board', '2026-01-20T08:21:00', 'Line-1', 'Morning', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "solder_bridge", "location": "C23"}'),
  ('img_a_005', '/dbfs/pcb_images/type_a/a_005.jpg', 'PCB-A-005', 'Type-A Power Board', '2026-01-20T08:23:00', 'Line-1', 'Morning', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "solder_bridge", "location": "U15"}'),
  ('img_a_006', '/dbfs/pcb_images/type_a/a_006.jpg', 'PCB-A-006', 'Type-A Power Board', '2026-01-21T14:10:00', 'Line-1', 'Afternoon', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "solder_bridge", "location": "U3"}'),
  ('img_a_007', '/dbfs/pcb_images/type_a/a_007.jpg', 'PCB-A-007', 'Type-A Power Board', '2026-01-21T14:12:00', 'Line-1', 'Afternoon', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "solder_bridge", "location": "R22"}'),
  ('img_a_008', '/dbfs/pcb_images/type_a/a_008.jpg', 'PCB-A-008', 'Type-A Power Board', '2026-01-21T14:14:00', 'Line-1', 'Afternoon', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "solder_bridge", "location": "U12"}'),
  ('img_a_009', '/dbfs/pcb_images/type_a/a_009.jpg', 'PCB-A-009', 'Type-A Power Board', '2026-01-21T14:16:00', 'Line-1', 'Afternoon', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "solder_bridge", "location": "C45"}'),
  ('img_a_010', '/dbfs/pcb_images/type_a/a_010.jpg', 'PCB-A-010', 'Type-A Power Board', '2026-01-21T14:18:00', 'Line-1', 'Afternoon', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "solder_bridge", "location": "U8"}'),
  ('img_a_011', '/dbfs/pcb_images/type_a/a_011.jpg', 'PCB-A-011', 'Type-A Power Board', '2026-01-22T22:05:00', 'Line-1', 'Night', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "solder_bridge", "location": "R47"}'),
  ('img_a_012', '/dbfs/pcb_images/type_a/a_012.jpg', 'PCB-A-012', 'Type-A Power Board', '2026-01-22T22:07:00', 'Line-1', 'Night', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "solder_bridge", "location": "U12"}'),
  ('img_a_013', '/dbfs/pcb_images/type_a/a_013.jpg', 'PCB-A-013', 'Type-A Power Board', '2026-01-22T22:09:00', 'Line-1', 'Night', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "solder_bridge", "location": "C23"}'),
  ('img_a_014', '/dbfs/pcb_images/type_a/a_014.jpg', 'PCB-A-014', 'Type-A Power Board', '2026-01-22T22:11:00', 'Line-1', 'Night', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "solder_bridge", "location": "U15"}'),
  ('img_a_015', '/dbfs/pcb_images/type_a/a_015.jpg', 'PCB-A-015', 'Type-A Power Board', '2026-01-22T22:13:00', 'Line-1', 'Night', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "solder_bridge", "location": "U8"}');

-- Cold Joint Defects (10)
INSERT INTO pcb_inspection.raw_images VALUES
  ('img_a_016', '/dbfs/pcb_images/type_a/a_016.jpg', 'PCB-A-016', 'Type-A Power Board', '2026-01-23T08:30:00', 'Line-1', 'Morning', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "cold_joint", "location": "J3"}'),
  ('img_a_017', '/dbfs/pcb_images/type_a/a_017.jpg', 'PCB-A-017', 'Type-A Power Board', '2026-01-23T08:32:00', 'Line-1', 'Morning', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "cold_joint", "location": "J5"}'),
  ('img_a_018', '/dbfs/pcb_images/type_a/a_018.jpg', 'PCB-A-018', 'Type-A Power Board', '2026-01-23T08:34:00', 'Line-1', 'Morning', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "cold_joint", "location": "U20"}'),
  ('img_a_019', '/dbfs/pcb_images/type_a/a_019.jpg', 'PCB-A-019', 'Type-A Power Board', '2026-01-23T14:20:00', 'Line-1', 'Afternoon', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "cold_joint", "location": "R10"}'),
  ('img_a_020', '/dbfs/pcb_images/type_a/a_020.jpg', 'PCB-A-020', 'Type-A Power Board', '2026-01-23T14:22:00', 'Line-1', 'Afternoon', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "cold_joint", "location": "J3"}'),
  ('img_a_021', '/dbfs/pcb_images/type_a/a_021.jpg', 'PCB-A-021', 'Type-A Power Board', '2026-01-23T14:24:00', 'Line-1', 'Afternoon', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "cold_joint", "location": "C30"}'),
  ('img_a_022', '/dbfs/pcb_images/type_a/a_022.jpg', 'PCB-A-022', 'Type-A Power Board', '2026-01-23T22:15:00', 'Line-1', 'Night', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "cold_joint", "location": "J5"}'),
  ('img_a_023', '/dbfs/pcb_images/type_a/a_023.jpg', 'PCB-A-023', 'Type-A Power Board', '2026-01-23T22:17:00', 'Line-1', 'Night', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "cold_joint", "location": "U20"}'),
  ('img_a_024', '/dbfs/pcb_images/type_a/a_024.jpg', 'PCB-A-024', 'Type-A Power Board', '2026-01-23T22:19:00', 'Line-1', 'Night', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "cold_joint", "location": "R10"}'),
  ('img_a_025', '/dbfs/pcb_images/type_a/a_025.jpg', 'PCB-A-025', 'Type-A Power Board', '2026-01-23T22:21:00', 'Line-1', 'Night', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "cold_joint", "location": "J3"}');

-- Missing Component Defects (5)
INSERT INTO pcb_inspection.raw_images VALUES
  ('img_a_026', '/dbfs/pcb_images/type_a/a_026.jpg', 'PCB-A-026', 'Type-A Power Board', '2026-01-24T08:40:00', 'Line-1', 'Morning', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "missing_component", "location": "R35"}'),
  ('img_a_027', '/dbfs/pcb_images/type_a/a_027.jpg', 'PCB-A-027', 'Type-A Power Board', '2026-01-24T08:42:00', 'Line-1', 'Morning', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "missing_component", "location": "C12"}'),
  ('img_a_028', '/dbfs/pcb_images/type_a/a_028.jpg', 'PCB-A-028', 'Type-A Power Board', '2026-01-24T14:30:00', 'Line-1', 'Afternoon', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "missing_component", "location": "U7"}'),
  ('img_a_029', '/dbfs/pcb_images/type_a/a_029.jpg', 'PCB-A-029', 'Type-A Power Board', '2026-01-24T14:32:00', 'Line-1', 'Afternoon', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "missing_component", "location": "R22"}'),
  ('img_a_030', '/dbfs/pcb_images/type_a/a_030.jpg', 'PCB-A-030', 'Type-A Power Board', '2026-01-24T22:25:00', 'Line-1', 'Night', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "missing_component", "location": "C45"}');

-- Scratch Defects (5)
INSERT INTO pcb_inspection.raw_images VALUES
  ('img_a_031', '/dbfs/pcb_images/type_a/a_031.jpg', 'PCB-A-031', 'Type-A Power Board', '2026-01-25T08:50:00', 'Line-1', 'Morning', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "scratch", "location": "trace_t12"}'),
  ('img_a_032', '/dbfs/pcb_images/type_a/a_032.jpg', 'PCB-A-032', 'Type-A Power Board', '2026-01-25T08:52:00', 'Line-1', 'Morning', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "scratch", "location": "zone_b"}'),
  ('img_a_033', '/dbfs/pcb_images/type_a/a_033.jpg', 'PCB-A-033', 'Type-A Power Board', '2026-01-25T14:40:00', 'Line-1', 'Afternoon', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "scratch", "location": "trace_t8"}'),
  ('img_a_034', '/dbfs/pcb_images/type_a/a_034.jpg', 'PCB-A-034', 'Type-A Power Board', '2026-01-25T14:42:00', 'Line-1', 'Afternoon', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "scratch", "location": "zone_c"}'),
  ('img_a_035', '/dbfs/pcb_images/type_a/a_035.jpg', 'PCB-A-035', 'Type-A Power Board', '2026-01-25T22:30:00', 'Line-1', 'Night', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "scratch", "location": "trace_t5"}');

-- Passing Boards (15)
INSERT INTO pcb_inspection.raw_images VALUES
  ('img_a_036', '/dbfs/pcb_images/type_a/a_036.jpg', 'PCB-A-036', 'Type-A Power Board', '2026-01-26T08:00:00', 'Line-1', 'Morning', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "pass"}'),
  ('img_a_037', '/dbfs/pcb_images/type_a/a_037.jpg', 'PCB-A-037', 'Type-A Power Board', '2026-01-26T08:02:00', 'Line-1', 'Morning', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "pass"}'),
  ('img_a_038', '/dbfs/pcb_images/type_a/a_038.jpg', 'PCB-A-038', 'Type-A Power Board', '2026-01-26T08:04:00', 'Line-1', 'Morning', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "pass"}'),
  ('img_a_039', '/dbfs/pcb_images/type_a/a_039.jpg', 'PCB-A-039', 'Type-A Power Board', '2026-01-26T08:06:00', 'Line-1', 'Morning', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "pass"}'),
  ('img_a_040', '/dbfs/pcb_images/type_a/a_040.jpg', 'PCB-A-040', 'Type-A Power Board', '2026-01-26T08:08:00', 'Line-1', 'Morning', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "pass"}'),
  ('img_a_041', '/dbfs/pcb_images/type_a/a_041.jpg', 'PCB-A-041', 'Type-A Power Board', '2026-01-26T14:50:00', 'Line-1', 'Afternoon', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "pass"}'),
  ('img_a_042', '/dbfs/pcb_images/type_a/a_042.jpg', 'PCB-A-042', 'Type-A Power Board', '2026-01-26T14:52:00', 'Line-1', 'Afternoon', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "pass"}'),
  ('img_a_043', '/dbfs/pcb_images/type_a/a_043.jpg', 'PCB-A-043', 'Type-A Power Board', '2026-01-26T14:54:00', 'Line-1', 'Afternoon', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "pass"}'),
  ('img_a_044', '/dbfs/pcb_images/type_a/a_044.jpg', 'PCB-A-044', 'Type-A Power Board', '2026-01-26T14:56:00', 'Line-1', 'Afternoon', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "pass"}'),
  ('img_a_045', '/dbfs/pcb_images/type_a/a_045.jpg', 'PCB-A-045', 'Type-A Power Board', '2026-01-26T14:58:00', 'Line-1', 'Afternoon', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "pass"}'),
  ('img_a_046', '/dbfs/pcb_images/type_a/a_046.jpg', 'PCB-A-046', 'Type-A Power Board', '2026-01-26T22:35:00', 'Line-1', 'Night', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "pass"}'),
  ('img_a_047', '/dbfs/pcb_images/type_a/a_047.jpg', 'PCB-A-047', 'Type-A Power Board', '2026-01-26T22:37:00', 'Line-1', 'Night', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "pass"}'),
  ('img_a_048', '/dbfs/pcb_images/type_a/a_048.jpg', 'PCB-A-048', 'Type-A Power Board', '2026-01-26T22:39:00', 'Line-1', 'Night', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "pass"}'),
  ('img_a_049', '/dbfs/pcb_images/type_a/a_049.jpg', 'PCB-A-049', 'Type-A Power Board', '2026-01-26T22:41:00', 'Line-1', 'Night', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "pass"}'),
  ('img_a_050', '/dbfs/pcb_images/type_a/a_050.jpg', 'PCB-A-050', 'Type-A Power Board', '2026-01-26T22:43:00', 'Line-1', 'Night', '{"resolution": "4K", "camera": "CAM-01", "actual_defect": "pass"}');

-- ============================================================================
-- Type-B Control Boards (35 boards total)
-- Defects: 8 cold_joint, 7 discoloration, 5 solder_bridge, 3 missing_component, 12 pass
-- ============================================================================

-- Cold Joint Defects (8)
INSERT INTO pcb_inspection.raw_images VALUES
  ('img_b_001', '/dbfs/pcb_images/type_b/b_001.jpg', 'PCB-B-001', 'Type-B Control Board', '2026-01-27T09:10:00', 'Line-2', 'Morning', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "cold_joint", "location": "J1"}'),
  ('img_b_002', '/dbfs/pcb_images/type_b/b_002.jpg', 'PCB-B-002', 'Type-B Control Board', '2026-01-27T09:12:00', 'Line-2', 'Morning', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "cold_joint", "location": "J2"}'),
  ('img_b_003', '/dbfs/pcb_images/type_b/b_003.jpg', 'PCB-B-003', 'Type-B Control Board', '2026-01-27T09:14:00', 'Line-2', 'Morning', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "cold_joint", "location": "U5"}'),
  ('img_b_004', '/dbfs/pcb_images/type_b/b_004.jpg', 'PCB-B-004', 'Type-B Control Board', '2026-01-27T15:05:00', 'Line-2', 'Afternoon', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "cold_joint", "location": "J1"}'),
  ('img_b_005', '/dbfs/pcb_images/type_b/b_005.jpg', 'PCB-B-005', 'Type-B Control Board', '2026-01-27T15:07:00', 'Line-2', 'Afternoon', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "cold_joint", "location": "J3"}'),
  ('img_b_006', '/dbfs/pcb_images/type_b/b_006.jpg', 'PCB-B-006', 'Type-B Control Board', '2026-01-27T15:09:00', 'Line-2', 'Afternoon', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "cold_joint", "location": "R15"}'),
  ('img_b_007', '/dbfs/pcb_images/type_b/b_007.jpg', 'PCB-B-007', 'Type-B Control Board', '2026-01-27T23:00:00', 'Line-2', 'Night', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "cold_joint", "location": "J2"}'),
  ('img_b_008', '/dbfs/pcb_images/type_b/b_008.jpg', 'PCB-B-008', 'Type-B Control Board', '2026-01-27T23:02:00', 'Line-2', 'Night', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "cold_joint", "location": "U5"}');

-- Discoloration Defects (7)
INSERT INTO pcb_inspection.raw_images VALUES
  ('img_b_009', '/dbfs/pcb_images/type_b/b_009.jpg', 'PCB-B-009', 'Type-B Control Board', '2026-01-28T09:20:00', 'Line-2', 'Morning', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "discoloration", "location": "U10"}'),
  ('img_b_010', '/dbfs/pcb_images/type_b/b_010.jpg', 'PCB-B-010', 'Type-B Control Board', '2026-01-28T09:22:00', 'Line-2', 'Morning', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "discoloration", "location": "zone_a"}'),
  ('img_b_011', '/dbfs/pcb_images/type_b/b_011.jpg', 'PCB-B-011', 'Type-B Control Board', '2026-01-28T09:24:00', 'Line-2', 'Morning', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "discoloration", "location": "U10"}'),
  ('img_b_012', '/dbfs/pcb_images/type_b/b_012.jpg', 'PCB-B-012', 'Type-B Control Board', '2026-01-28T15:15:00', 'Line-2', 'Afternoon', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "discoloration", "location": "zone_b"}'),
  ('img_b_013', '/dbfs/pcb_images/type_b/b_013.jpg', 'PCB-B-013', 'Type-B Control Board', '2026-01-28T15:17:00', 'Line-2', 'Afternoon', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "discoloration", "location": "C8"}'),
  ('img_b_014', '/dbfs/pcb_images/type_b/b_014.jpg', 'PCB-B-014', 'Type-B Control Board', '2026-01-28T15:19:00', 'Line-2', 'Afternoon', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "discoloration", "location": "U10"}'),
  ('img_b_015', '/dbfs/pcb_images/type_b/b_015.jpg', 'PCB-B-015', 'Type-B Control Board', '2026-01-28T23:10:00', 'Line-2', 'Night', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "discoloration", "location": "zone_a"}');

-- Solder Bridge Defects (5)
INSERT INTO pcb_inspection.raw_images VALUES
  ('img_b_016', '/dbfs/pcb_images/type_b/b_016.jpg', 'PCB-B-016', 'Type-B Control Board', '2026-01-29T09:30:00', 'Line-2', 'Morning', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "solder_bridge", "location": "U6"}'),
  ('img_b_017', '/dbfs/pcb_images/type_b/b_017.jpg', 'PCB-B-017', 'Type-B Control Board', '2026-01-29T09:32:00', 'Line-2', 'Morning', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "solder_bridge", "location": "R20"}'),
  ('img_b_018', '/dbfs/pcb_images/type_b/b_018.jpg', 'PCB-B-018', 'Type-B Control Board', '2026-01-29T15:25:00', 'Line-2', 'Afternoon', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "solder_bridge", "location": "U6"}'),
  ('img_b_019', '/dbfs/pcb_images/type_b/b_019.jpg', 'PCB-B-019', 'Type-B Control Board', '2026-01-29T15:27:00', 'Line-2', 'Afternoon', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "solder_bridge", "location": "C15"}'),
  ('img_b_020', '/dbfs/pcb_images/type_b/b_020.jpg', 'PCB-B-020', 'Type-B Control Board', '2026-01-29T23:20:00', 'Line-2', 'Night', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "solder_bridge", "location": "U6"}');

-- Missing Component Defects (3)
INSERT INTO pcb_inspection.raw_images VALUES
  ('img_b_021', '/dbfs/pcb_images/type_b/b_021.jpg', 'PCB-B-021', 'Type-B Control Board', '2026-01-30T09:40:00', 'Line-2', 'Morning', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "missing_component", "location": "R25"}'),
  ('img_b_022', '/dbfs/pcb_images/type_b/b_022.jpg', 'PCB-B-022', 'Type-B Control Board', '2026-01-30T15:35:00', 'Line-2', 'Afternoon', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "missing_component", "location": "C10"}'),
  ('img_b_023', '/dbfs/pcb_images/type_b/b_023.jpg', 'PCB-B-023', 'Type-B Control Board', '2026-01-30T23:30:00', 'Line-2', 'Night', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "missing_component", "location": "U4"}');

-- Passing Boards (12)
INSERT INTO pcb_inspection.raw_images VALUES
  ('img_b_024', '/dbfs/pcb_images/type_b/b_024.jpg', 'PCB-B-024', 'Type-B Control Board', '2026-01-31T09:00:00', 'Line-2', 'Morning', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "pass"}'),
  ('img_b_025', '/dbfs/pcb_images/type_b/b_025.jpg', 'PCB-B-025', 'Type-B Control Board', '2026-01-31T09:02:00', 'Line-2', 'Morning', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "pass"}'),
  ('img_b_026', '/dbfs/pcb_images/type_b/b_026.jpg', 'PCB-B-026', 'Type-B Control Board', '2026-01-31T09:04:00', 'Line-2', 'Morning', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "pass"}'),
  ('img_b_027', '/dbfs/pcb_images/type_b/b_027.jpg', 'PCB-B-027', 'Type-B Control Board', '2026-01-31T09:06:00', 'Line-2', 'Morning', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "pass"}'),
  ('img_b_028', '/dbfs/pcb_images/type_b/b_028.jpg', 'PCB-B-028', 'Type-B Control Board', '2026-01-31T15:45:00', 'Line-2', 'Afternoon', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "pass"}'),
  ('img_b_029', '/dbfs/pcb_images/type_b/b_029.jpg', 'PCB-B-029', 'Type-B Control Board', '2026-01-31T15:47:00', 'Line-2', 'Afternoon', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "pass"}'),
  ('img_b_030', '/dbfs/pcb_images/type_b/b_030.jpg', 'PCB-B-030', 'Type-B Control Board', '2026-01-31T15:49:00', 'Line-2', 'Afternoon', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "pass"}'),
  ('img_b_031', '/dbfs/pcb_images/type_b/b_031.jpg', 'PCB-B-031', 'Type-B Control Board', '2026-01-31T15:51:00', 'Line-2', 'Afternoon', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "pass"}'),
  ('img_b_032', '/dbfs/pcb_images/type_b/b_032.jpg', 'PCB-B-032', 'Type-B Control Board', '2026-01-31T23:40:00', 'Line-2', 'Night', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "pass"}'),
  ('img_b_033', '/dbfs/pcb_images/type_b/b_033.jpg', 'PCB-B-033', 'Type-B Control Board', '2026-01-31T23:42:00', 'Line-2', 'Night', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "pass"}'),
  ('img_b_034', '/dbfs/pcb_images/type_b/b_034.jpg', 'PCB-B-034', 'Type-B Control Board', '2026-01-31T23:44:00', 'Line-2', 'Night', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "pass"}'),
  ('img_b_035', '/dbfs/pcb_images/type_b/b_035.jpg', 'PCB-B-035', 'Type-B Control Board', '2026-01-31T23:46:00', 'Line-2', 'Night', '{"resolution": "4K", "camera": "CAM-02", "actual_defect": "pass"}');

-- ============================================================================
-- Type-C Interface Boards (15 boards total)
-- Defects: 3 scratch, 3 discoloration, 2 solder_bridge, 2 missing_component, 5 pass
-- ============================================================================

-- Scratch Defects (3)
INSERT INTO pcb_inspection.raw_images VALUES
  ('img_c_001', '/dbfs/pcb_images/type_c/c_001.jpg', 'PCB-C-001', 'Type-C Interface Board', '2026-02-01T10:00:00', 'Line-3', 'Morning', '{"resolution": "4K", "camera": "CAM-03", "actual_defect": "scratch", "location": "trace_t1"}'),
  ('img_c_002', '/dbfs/pcb_images/type_c/c_002.jpg', 'PCB-C-002', 'Type-C Interface Board', '2026-02-01T10:02:00', 'Line-3', 'Morning', '{"resolution": "4K", "camera": "CAM-03", "actual_defect": "scratch", "location": "zone_x"}'),
  ('img_c_003', '/dbfs/pcb_images/type_c/c_003.jpg', 'PCB-C-003', 'Type-C Interface Board', '2026-02-01T16:10:00', 'Line-3', 'Afternoon', '{"resolution": "4K", "camera": "CAM-03", "actual_defect": "scratch", "location": "trace_t3"}');

-- Discoloration Defects (3)
INSERT INTO pcb_inspection.raw_images VALUES
  ('img_c_004', '/dbfs/pcb_images/type_c/c_004.jpg', 'PCB-C-004', 'Type-C Interface Board', '2026-02-01T16:12:00', 'Line-3', 'Afternoon', '{"resolution": "4K", "camera": "CAM-03", "actual_defect": "discoloration", "location": "U1"}'),
  ('img_c_005', '/dbfs/pcb_images/type_c/c_005.jpg', 'PCB-C-005', 'Type-C Interface Board', '2026-02-01T16:14:00', 'Line-3', 'Afternoon', '{"resolution": "4K", "camera": "CAM-03", "actual_defect": "discoloration", "location": "zone_y"}'),
  ('img_c_006', '/dbfs/pcb_images/type_c/c_006.jpg', 'PCB-C-006', 'Type-C Interface Board', '2026-02-02T00:05:00', 'Line-3', 'Night', '{"resolution": "4K", "camera": "CAM-03", "actual_defect": "discoloration", "location": "U1"}');

-- Solder Bridge Defects (2)
INSERT INTO pcb_inspection.raw_images VALUES
  ('img_c_007', '/dbfs/pcb_images/type_c/c_007.jpg', 'PCB-C-007', 'Type-C Interface Board', '2026-02-02T10:10:00', 'Line-3', 'Morning', '{"resolution": "4K", "camera": "CAM-03", "actual_defect": "solder_bridge", "location": "U2"}'),
  ('img_c_008', '/dbfs/pcb_images/type_c/c_008.jpg', 'PCB-C-008', 'Type-C Interface Board', '2026-02-02T10:12:00', 'Line-3', 'Morning', '{"resolution": "4K", "camera": "CAM-03", "actual_defect": "solder_bridge", "location": "R5"}');

-- Missing Component Defects (2)
INSERT INTO pcb_inspection.raw_images VALUES
  ('img_c_009', '/dbfs/pcb_images/type_c/c_009.jpg', 'PCB-C-009', 'Type-C Interface Board', '2026-02-02T16:20:00', 'Line-3', 'Afternoon', '{"resolution": "4K", "camera": "CAM-03", "actual_defect": "missing_component", "location": "R8"}'),
  ('img_c_010', '/dbfs/pcb_images/type_c/c_010.jpg', 'PCB-C-010', 'Type-C Interface Board', '2026-02-02T16:22:00', 'Line-3', 'Afternoon', '{"resolution": "4K", "camera": "CAM-03", "actual_defect": "missing_component", "location": "C5"}');

-- Passing Boards (5)
INSERT INTO pcb_inspection.raw_images VALUES
  ('img_c_011', '/dbfs/pcb_images/type_c/c_011.jpg', 'PCB-C-011', 'Type-C Interface Board', '2026-02-03T10:00:00', 'Line-3', 'Morning', '{"resolution": "4K", "camera": "CAM-03", "actual_defect": "pass"}'),
  ('img_c_012', '/dbfs/pcb_images/type_c/c_012.jpg', 'PCB-C-012', 'Type-C Interface Board', '2026-02-03T10:02:00', 'Line-3', 'Morning', '{"resolution": "4K", "camera": "CAM-03", "actual_defect": "pass"}'),
  ('img_c_013', '/dbfs/pcb_images/type_c/c_013.jpg', 'PCB-C-013', 'Type-C Interface Board', '2026-02-03T10:04:00', 'Line-3', 'Morning', '{"resolution": "4K", "camera": "CAM-03", "actual_defect": "pass"}'),
  ('img_c_014', '/dbfs/pcb_images/type_c/c_014.jpg', 'PCB-C-014', 'Type-C Interface Board', '2026-02-03T16:30:00', 'Line-3', 'Afternoon', '{"resolution": "4K", "camera": "CAM-03", "actual_defect": "pass"}'),
  ('img_c_015', '/dbfs/pcb_images/type_c/c_015.jpg', 'PCB-C-015', 'Type-C Interface Board', '2026-02-03T16:32:00', 'Line-3', 'Afternoon', '{"resolution": "4K", "camera": "CAM-03", "actual_defect": "pass"}');

-- ============================================================================
-- Verify Seed Data
-- ============================================================================

SELECT
  board_type,
  COUNT(*) as total_boards,
  SUM(CASE WHEN metadata:actual_defect = 'pass' THEN 1 ELSE 0 END) as passing,
  SUM(CASE WHEN metadata:actual_defect != 'pass' THEN 1 ELSE 0 END) as defective
FROM pcb_inspection.raw_images
GROUP BY board_type
ORDER BY board_type;

-- Expected Output:
-- Type-A Power Board: 50 total (15 pass, 35 defective)
-- Type-B Control Board: 35 total (12 pass, 23 defective)
-- Type-C Interface Board: 15 total (5 pass, 10 defective)
-- TOTAL: 100 boards (32 pass, 68 defective)
