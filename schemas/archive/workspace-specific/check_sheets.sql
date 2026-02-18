-- Check if any sheets exist in the database
SELECT COUNT(*) as sheet_count FROM `your_catalog`.`ontos_ml_workbench`.sheets;

-- List all sheets
SELECT id, name, status, row_count, created_at 
FROM `your_catalog`.`ontos_ml_workbench`.sheets
ORDER BY created_at DESC
LIMIT 10;
