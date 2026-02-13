-- Check if any sheets exist in the database
SELECT COUNT(*) as sheet_count FROM `erp-demonstrations`.`vital_workbench`.sheets;

-- List all sheets
SELECT id, name, status, row_count, created_at 
FROM `erp-demonstrations`.`vital_workbench`.sheets
ORDER BY created_at DESC
LIMIT 10;
