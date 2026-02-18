#!/usr/bin/env python3
"""
Run SQL file with proper statement execution and waiting
"""
import sys
from pathlib import Path
from databricks.sdk import WorkspaceClient
import time

if len(sys.argv) < 2:
    print("Usage: python3 run_sql.py <sql_file>")
    sys.exit(1)

sql_file = Path(sys.argv[1])
if not sql_file.exists():
    print(f"Error: {sql_file} not found")
    sys.exit(1)

w = WorkspaceClient()
warehouse_id = '071969b1ec9a91ca'

print(f'Running {sql_file.name}...\n')

# Read and split SQL file
content = sql_file.read_text()
statements = [s.strip() for s in content.split(';') if s.strip() and not s.strip().startswith('--')]

print(f'Found {len(statements)} statements\n')

for i, stmt in enumerate(statements, 1):
    # Show first 60 chars
    preview = stmt[:60].replace('\n', ' ')
    print(f'{i}. {preview}...')

    # Execute
    exec_result = w.statement_execution.execute_statement(
        statement=stmt,
        warehouse_id=warehouse_id
    )

    # Wait for completion (up to 30s)
    stmt_id = exec_result.statement_id
    for _ in range(30):
        status = w.statement_execution.get_statement(stmt_id)
        state = status.status.state

        if state == 'SUCCEEDED':
            if status.result and status.result.data_array:
                # SELECT statement
                print(f'   ✅ {len(status.result.data_array)} rows')
                for row in status.result.data_array[:5]:
                    print(f'      {row}')
            else:
                # INSERT/UPDATE statement
                print(f'   ✅ Success')
            break
        elif state == 'FAILED':
            print(f'   ❌ Failed')
            if status.status.error:
                msg = getattr(status.status.error, 'message', str(status.status.error))
                print(f'      {msg[:200]}')
            break
        elif state in ['CANCELED', 'CLOSED']:
            print(f'   ⚠️  {state}')
            break

        time.sleep(1)
    else:
        print(f'   ⏱  Timeout waiting for statement')

    print()

print('Done!')
