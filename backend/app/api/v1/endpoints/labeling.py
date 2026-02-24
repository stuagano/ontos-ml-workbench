"""
Labeling workflow API endpoints.

Provides endpoints for:
- Labeling Jobs: Create, manage, and track annotation projects
- Tasks: Batch management and assignment
- Items: Individual annotations with AI assist
- Users: Labeler/reviewer management
"""

import json
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from app.models.labeling import (
    BulkLabelRequest,
    ItemStatus,
    # Enums
    JobStatus,
    LabeledItemFlag,
    LabeledItemList,
    LabeledItemResponse,
    LabeledItemSkip,
    # Item models
    LabeledItemUpdate,
    # Job models
    LabelingJobCreate,
    LabelingJobList,
    LabelingJobResponse,
    LabelingJobStats,
    LabelingJobUpdate,
    LabelingTaskAssign,
    LabelingTaskBulkCreate,
    # Task models
    LabelingTaskCreate,
    LabelingTaskList,
    LabelingTaskResponse,
    # Schema models
    LabelSchema,
    Priority,
    ReviewStatus,
    TaskReviewAction,
    TaskStatus,
    UserRole,
    UserStats,
    # User models
    WorkspaceUserCreate,
    WorkspaceUserList,
    WorkspaceUserResponse,
    WorkspaceUserUpdate,
)
from app.services.sql_service import get_sql_service

router = APIRouter(prefix="/labeling", tags=["labeling"])


# =============================================================================
# Helper Functions
# =============================================================================


def _row_to_job(row: dict) -> LabelingJobResponse:
    """Convert database row to job response"""
    target_columns = json.loads(row.get("target_columns") or "[]")
    label_schema_raw = json.loads(row.get("label_schema") or '{"fields": []}')
    label_schema = LabelSchema(**label_schema_raw)

    return LabelingJobResponse(
        id=row["id"],
        name=row["name"],
        description=row.get("description"),
        sheet_id=row["sheet_id"],
        target_columns=target_columns,
        label_schema=label_schema,
        instructions=row.get("instructions"),
        ai_assist_enabled=row.get("ai_assist_enabled", True),
        ai_model=row.get("ai_model"),
        assignment_strategy=row.get("assignment_strategy", "manual"),
        default_batch_size=row.get("default_batch_size", 50),
        status=JobStatus(row.get("status", "draft")),
        total_items=row.get("total_items", 0),
        labeled_items=row.get("labeled_items", 0),
        reviewed_items=row.get("reviewed_items", 0),
        approved_items=row.get("approved_items", 0),
        created_by=row.get("created_by"),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


def _row_to_task(row: dict) -> LabelingTaskResponse:
    """Convert database row to task response"""
    item_indices = json.loads(row.get("item_indices") or "[]")

    return LabelingTaskResponse(
        id=row["id"],
        job_id=row["job_id"],
        name=row.get("name"),
        item_indices=item_indices,
        item_count=row.get("item_count", len(item_indices)),
        assigned_to=row.get("assigned_to"),
        assigned_at=row.get("assigned_at"),
        status=TaskStatus(row.get("status", "pending")),
        labeled_count=row.get("labeled_count", 0),
        started_at=row.get("started_at"),
        submitted_at=row.get("submitted_at"),
        reviewer=row.get("reviewer"),
        reviewed_at=row.get("reviewed_at"),
        review_notes=row.get("review_notes"),
        rejection_reason=row.get("rejection_reason"),
        priority=Priority(row.get("priority", "normal")),
        due_date=row.get("due_date"),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


def _row_to_item(row: dict, row_data: dict | None = None) -> LabeledItemResponse:
    """Convert database row to item response"""
    ai_labels = json.loads(row.get("ai_labels") or "null")
    human_labels = json.loads(row.get("human_labels") or "null")

    return LabeledItemResponse(
        id=row["id"],
        task_id=row["task_id"],
        job_id=row["job_id"],
        row_index=row["row_index"],
        ai_labels=ai_labels,
        ai_confidence=row.get("ai_confidence"),
        human_labels=human_labels,
        labeled_by=row.get("labeled_by"),
        labeled_at=row.get("labeled_at"),
        status=ItemStatus(row.get("status", "pending")),
        review_status=ReviewStatus(row["review_status"])
        if row.get("review_status")
        else None,
        review_notes=row.get("review_notes"),
        reviewed_by=row.get("reviewed_by"),
        reviewed_at=row.get("reviewed_at"),
        is_difficult=row.get("is_difficult", False),
        needs_discussion=row.get("needs_discussion", False),
        skip_reason=row.get("skip_reason"),
        row_data=row_data,
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


def _row_to_user(row: dict) -> WorkspaceUserResponse:
    """Convert database row to user response"""
    return WorkspaceUserResponse(
        id=row["id"],
        email=row["email"],
        display_name=row.get("display_name", row["email"]),
        role=UserRole(row.get("role", "labeler")),
        max_concurrent_tasks=row.get("max_concurrent_tasks", 5),
        current_task_count=row.get("current_task_count", 0),
        total_labeled=row.get("total_labeled", 0),
        total_reviewed=row.get("total_reviewed", 0),
        accuracy_score=row.get("accuracy_score"),
        avg_time_per_item=row.get("avg_time_per_item"),
        is_active=row.get("is_active", True),
        last_active_at=row.get("last_active_at"),
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


# =============================================================================
# Labeling Jobs Endpoints
# =============================================================================


@router.post("/jobs", response_model=LabelingJobResponse, status_code=201)
async def create_job(job: LabelingJobCreate):
    """Create a new labeling job from a sheet"""
    sql = get_sql_service()

    job_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    # Get total items from sheet
    sheet_query = f"SELECT row_count FROM sheets WHERE id = '{job.sheet_id}'"
    sheet_rows = sql.execute(sheet_query)
    if not sheet_rows:
        raise HTTPException(status_code=404, detail=f"Sheet {job.sheet_id} not found")

    total_items = sheet_rows[0].get("row_count", 0) or 0

    # Serialize JSON fields
    target_columns_json = json.dumps(job.target_columns)
    label_schema_json = json.dumps(job.label_schema.model_dump())

    esc_name = job.name.replace("'", "''")
    esc_desc = job.description.replace("'", "''") if job.description else None
    esc_targets = target_columns_json.replace("'", "''")
    esc_schema = label_schema_json.replace("'", "''")
    esc_instructions = job.instructions.replace("'", "''") if job.instructions else None

    insert_sql = f"""
    INSERT INTO labeling_jobs (
        id, name, description, sheet_id, target_columns, label_schema,
        instructions, ai_assist_enabled, ai_model, assignment_strategy,
        default_batch_size, status, total_items, labeled_items, reviewed_items,
        approved_items, created_at, updated_at
    ) VALUES (
        '{job_id}', '{esc_name}',
        {f"'{esc_desc}'" if esc_desc else "NULL"},
        '{job.sheet_id}', '{esc_targets}',
        '{esc_schema}',
        {f"'{esc_instructions}'" if esc_instructions else "NULL"},
        {job.ai_assist_enabled}, {f"'{job.ai_model}'" if job.ai_model else "NULL"},
        '{job.assignment_strategy.value}', {job.default_batch_size},
        'draft', {total_items}, 0, 0, 0,
        '{now}', '{now}'
    )
    """
    sql.execute_update(insert_sql)

    # Return created job
    return LabelingJobResponse(
        id=job_id,
        name=job.name,
        description=job.description,
        sheet_id=job.sheet_id,
        target_columns=job.target_columns,
        label_schema=job.label_schema,
        instructions=job.instructions,
        ai_assist_enabled=job.ai_assist_enabled,
        ai_model=job.ai_model,
        assignment_strategy=job.assignment_strategy,
        default_batch_size=job.default_batch_size,
        status=JobStatus.DRAFT,
        total_items=total_items,
        created_at=datetime.fromisoformat(now),
        updated_at=datetime.fromisoformat(now),
    )


@router.get("/jobs", response_model=LabelingJobList)
async def list_jobs(
    status: JobStatus | None = None,
    search: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    """List labeling jobs with filtering"""
    sql = get_sql_service()

    # Build WHERE clause
    conditions = []
    if status:
        conditions.append(f"status = '{status.value}'")
    if search:
        conditions.append(f"LOWER(name) LIKE '%{search.lower()}%'")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    # Get total count
    count_query = f"SELECT COUNT(*) as count FROM labeling_jobs {where_clause}"
    count_result = sql.execute(count_query)
    total = count_result[0]["count"] if count_result else 0

    # Get paginated results
    offset = (page - 1) * page_size
    query = f"""
    SELECT * FROM labeling_jobs
    {where_clause}
    ORDER BY created_at DESC
    LIMIT {page_size} OFFSET {offset}
    """
    rows = sql.execute(query)

    jobs = [_row_to_job(row) for row in rows]

    return LabelingJobList(jobs=jobs, total=total, page=page, page_size=page_size)


@router.get("/jobs/{job_id}", response_model=LabelingJobResponse)
async def get_job(job_id: str):
    """Get a labeling job by ID"""
    sql = get_sql_service()

    query = f"SELECT * FROM labeling_jobs WHERE id = '{job_id}'"
    rows = sql.execute(query)

    if not rows:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    return _row_to_job(rows[0])


@router.put("/jobs/{job_id}", response_model=LabelingJobResponse)
async def update_job(job_id: str, update: LabelingJobUpdate):
    """Update a labeling job"""
    sql = get_sql_service()

    # Check job exists
    existing = sql.execute(f"SELECT * FROM labeling_jobs WHERE id = '{job_id}'")
    if not existing:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    # Build update fields
    updates = []
    if update.name is not None:
        updates.append(f"name = '{update.name.replace(chr(39), chr(39) + chr(39))}'")
    if update.description is not None:
        updates.append(
            f"description = '{update.description.replace(chr(39), chr(39) + chr(39))}'"
        )
    if update.instructions is not None:
        updates.append(
            f"instructions = '{update.instructions.replace(chr(39), chr(39) + chr(39))}'"
        )
    if update.ai_assist_enabled is not None:
        updates.append(f"ai_assist_enabled = {update.ai_assist_enabled}")
    if update.ai_model is not None:
        updates.append(f"ai_model = '{update.ai_model}'")
    if update.assignment_strategy is not None:
        updates.append(f"assignment_strategy = '{update.assignment_strategy.value}'")
    if update.default_batch_size is not None:
        updates.append(f"default_batch_size = {update.default_batch_size}")

    if updates:
        updates.append(f"updated_at = '{datetime.utcnow().isoformat()}'")
        update_sql = (
            f"UPDATE labeling_jobs SET {', '.join(updates)} WHERE id = '{job_id}'"
        )
        sql.execute_update(update_sql)

    return await get_job(job_id)


@router.delete("/jobs/{job_id}", status_code=204)
async def delete_job(job_id: str):
    """Delete a labeling job (only if draft)"""
    sql = get_sql_service()

    # Check job exists and is draft
    existing = sql.execute(f"SELECT status FROM labeling_jobs WHERE id = '{job_id}'")
    if not existing:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    if existing[0]["status"] != "draft":
        raise HTTPException(status_code=400, detail="Can only delete draft jobs")

    # Delete related items and tasks first
    sql.execute_update(f"DELETE FROM labeled_items WHERE job_id = '{job_id}'")
    sql.execute_update(f"DELETE FROM labeling_tasks WHERE job_id = '{job_id}'")
    sql.execute_update(f"DELETE FROM labeling_jobs WHERE id = '{job_id}'")


@router.post("/jobs/{job_id}/start", response_model=LabelingJobResponse)
async def start_job(job_id: str):
    """Start a labeling job (change status to active)"""
    sql = get_sql_service()

    # Check job exists and is draft
    existing = sql.execute(f"SELECT * FROM labeling_jobs WHERE id = '{job_id}'")
    if not existing:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    if existing[0]["status"] != "draft":
        raise HTTPException(
            status_code=400, detail="Job must be in draft status to start"
        )

    now = datetime.utcnow().isoformat()
    sql.execute_update(
        f"UPDATE labeling_jobs SET status = 'active', updated_at = '{now}' WHERE id = '{job_id}'"
    )

    return await get_job(job_id)


@router.post("/jobs/{job_id}/pause", response_model=LabelingJobResponse)
async def pause_job(job_id: str):
    """Pause an active labeling job"""
    sql = get_sql_service()

    existing = sql.execute(f"SELECT status FROM labeling_jobs WHERE id = '{job_id}'")
    if not existing:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    if existing[0]["status"] != "active":
        raise HTTPException(status_code=400, detail="Job must be active to pause")

    now = datetime.utcnow().isoformat()
    sql.execute_update(
        f"UPDATE labeling_jobs SET status = 'paused', updated_at = '{now}' WHERE id = '{job_id}'"
    )

    return await get_job(job_id)


@router.post("/jobs/{job_id}/resume", response_model=LabelingJobResponse)
async def resume_job(job_id: str):
    """Resume a paused labeling job"""
    sql = get_sql_service()

    existing = sql.execute(f"SELECT status FROM labeling_jobs WHERE id = '{job_id}'")
    if not existing:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    if existing[0]["status"] != "paused":
        raise HTTPException(status_code=400, detail="Job must be paused to resume")

    now = datetime.utcnow().isoformat()
    sql.execute_update(
        f"UPDATE labeling_jobs SET status = 'active', updated_at = '{now}' WHERE id = '{job_id}'"
    )

    return await get_job(job_id)


@router.post("/jobs/{job_id}/complete", response_model=LabelingJobResponse)
async def complete_job(job_id: str):
    """Mark a labeling job as completed"""
    sql = get_sql_service()

    existing = sql.execute(f"SELECT status FROM labeling_jobs WHERE id = '{job_id}'")
    if not existing:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    now = datetime.utcnow().isoformat()
    sql.execute_update(
        f"UPDATE labeling_jobs SET status = 'completed', updated_at = '{now}' WHERE id = '{job_id}'"
    )

    return await get_job(job_id)


@router.get("/jobs/{job_id}/stats", response_model=LabelingJobStats)
async def get_job_stats(job_id: str):
    """Get detailed statistics for a labeling job"""
    sql = get_sql_service()

    # Get job
    job_rows = sql.execute(f"SELECT * FROM labeling_jobs WHERE id = '{job_id}'")
    if not job_rows:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    job = job_rows[0]

    # Get item counts by status
    item_stats_query = f"""
    SELECT status, COUNT(*) as count
    FROM labeled_items
    WHERE job_id = '{job_id}'
    GROUP BY status
    """
    item_stats = sql.execute(item_stats_query)
    item_counts = {row["status"]: row["count"] for row in item_stats}

    # Get task counts by status
    task_stats_query = f"""
    SELECT status, COUNT(*) as count
    FROM labeling_tasks
    WHERE job_id = '{job_id}'
    GROUP BY status
    """
    task_stats = sql.execute(task_stats_query)
    task_counts = {row["status"]: row["count"] for row in task_stats}

    # Calculate rates
    total_labeled = item_counts.get("human_labeled", 0) + item_counts.get("reviewed", 0)
    total_reviewed = item_counts.get("reviewed", 0)

    return LabelingJobStats(
        job_id=job_id,
        total_items=job.get("total_items", 0),
        pending_items=item_counts.get("pending", 0),
        ai_labeled_items=item_counts.get("ai_labeled", 0),
        human_labeled_items=item_counts.get("human_labeled", 0),
        reviewed_items=total_reviewed,
        approved_items=job.get("approved_items", 0),
        rejected_items=item_counts.get("rejected", 0),
        flagged_items=item_counts.get("flagged", 0),
        skipped_items=item_counts.get("skipped", 0),
        total_tasks=sum(task_counts.values()),
        pending_tasks=task_counts.get("pending", 0),
        in_progress_tasks=task_counts.get("in_progress", 0),
        submitted_tasks=task_counts.get("submitted", 0),
        approved_tasks=task_counts.get("approved", 0),
    )


# =============================================================================
# Tasks Endpoints
# =============================================================================


@router.get("/jobs/{job_id}/tasks", response_model=LabelingTaskList)
async def list_tasks(
    job_id: str,
    status: TaskStatus | None = None,
    assigned_to: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
):
    """List tasks for a labeling job"""
    sql = get_sql_service()

    conditions = [f"job_id = '{job_id}'"]
    if status:
        conditions.append(f"status = '{status.value}'")
    if assigned_to:
        conditions.append(f"assigned_to = '{assigned_to}'")

    where_clause = f"WHERE {' AND '.join(conditions)}"

    # Get total
    count_query = f"SELECT COUNT(*) as count FROM labeling_tasks {where_clause}"
    total = sql.execute(count_query)[0]["count"]

    # Get tasks
    offset = (page - 1) * page_size
    query = f"""
    SELECT * FROM labeling_tasks
    {where_clause}
    ORDER BY created_at DESC
    LIMIT {page_size} OFFSET {offset}
    """
    rows = sql.execute(query)

    tasks = [_row_to_task(row) for row in rows]

    return LabelingTaskList(tasks=tasks, total=total, page=page, page_size=page_size)


@router.post(
    "/jobs/{job_id}/tasks", response_model=LabelingTaskResponse, status_code=201
)
async def create_task(job_id: str, task: LabelingTaskCreate):
    """Create a single task with specific items"""
    sql = get_sql_service()

    # Check job exists
    job = sql.execute(f"SELECT * FROM labeling_jobs WHERE id = '{job_id}'")
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    task_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    # Determine task name
    task_count = sql.execute(
        f"SELECT COUNT(*) as count FROM labeling_tasks WHERE job_id = '{job_id}'"
    )[0]["count"]
    task_name = task.name or f"Batch {task_count + 1}"

    # Insert task
    item_indices_json = json.dumps(task.item_indices)
    insert_sql = f"""
    INSERT INTO labeling_tasks (
        id, job_id, name, item_indices, item_count, status,
        priority, due_date, created_at, updated_at
    ) VALUES (
        '{task_id}', '{job_id}', '{task_name}',
        '{item_indices_json}', {len(task.item_indices)}, 'pending',
        '{task.priority.value}', {f"'{task.due_date.isoformat()}'" if task.due_date else "NULL"},
        '{now}', '{now}'
    )
    """
    sql.execute_update(insert_sql)

    # Create labeled_items records for each item
    for row_idx in task.item_indices:
        item_id = str(uuid.uuid4())
        item_sql = f"""
        INSERT INTO labeled_items (
            id, task_id, job_id, row_index, status, created_at, updated_at
        ) VALUES (
            '{item_id}', '{task_id}', '{job_id}', {row_idx}, 'pending', '{now}', '{now}'
        )
        """
        sql.execute_update(item_sql)

    return LabelingTaskResponse(
        id=task_id,
        job_id=job_id,
        name=task_name,
        item_indices=task.item_indices,
        item_count=len(task.item_indices),
        status=TaskStatus.PENDING,
        priority=task.priority,
        due_date=task.due_date,
        created_at=datetime.fromisoformat(now),
        updated_at=datetime.fromisoformat(now),
    )


@router.post(
    "/jobs/{job_id}/tasks/bulk",
    response_model=list[LabelingTaskResponse],
    status_code=201,
)
async def create_tasks_bulk(job_id: str, bulk: LabelingTaskBulkCreate):
    """Create multiple tasks by splitting all items into batches"""
    sql = get_sql_service()

    # Check job exists
    job_rows = sql.execute(f"SELECT * FROM labeling_jobs WHERE id = '{job_id}'")
    if not job_rows:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    job = job_rows[0]
    total_items = job.get("total_items", 0)

    if total_items == 0:
        raise HTTPException(status_code=400, detail="Job has no items to batch")

    # Create batches
    tasks = []
    now = datetime.utcnow().isoformat()
    batch_num = 1

    for start_idx in range(0, total_items, bulk.batch_size):
        end_idx = min(start_idx + bulk.batch_size, total_items)
        item_indices = list(range(start_idx, end_idx))

        task_id = str(uuid.uuid4())
        task_name = f"Batch {batch_num}"
        item_indices_json = json.dumps(item_indices)

        insert_sql = f"""
        INSERT INTO labeling_tasks (
            id, job_id, name, item_indices, item_count, status,
            priority, created_at, updated_at
        ) VALUES (
            '{task_id}', '{job_id}', '{task_name}',
            '{item_indices_json}', {len(item_indices)}, 'pending',
            '{bulk.priority.value}', '{now}', '{now}'
        )
        """
        sql.execute_update(insert_sql)

        # Create labeled_items records
        for row_idx in item_indices:
            item_id = str(uuid.uuid4())
            item_sql = f"""
            INSERT INTO labeled_items (
                id, task_id, job_id, row_index, status, created_at, updated_at
            ) VALUES (
                '{item_id}', '{task_id}', '{job_id}', {row_idx}, 'pending', '{now}', '{now}'
            )
            """
            sql.execute_update(item_sql)

        tasks.append(
            LabelingTaskResponse(
                id=task_id,
                job_id=job_id,
                name=task_name,
                item_indices=item_indices,
                item_count=len(item_indices),
                status=TaskStatus.PENDING,
                priority=bulk.priority,
                created_at=datetime.fromisoformat(now),
                updated_at=datetime.fromisoformat(now),
            )
        )

        batch_num += 1

    return tasks


@router.get("/tasks/{task_id}", response_model=LabelingTaskResponse)
async def get_task(task_id: str):
    """Get a task by ID"""
    sql = get_sql_service()

    rows = sql.execute(f"SELECT * FROM labeling_tasks WHERE id = '{task_id}'")
    if not rows:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    return _row_to_task(rows[0])


@router.post("/tasks/{task_id}/assign", response_model=LabelingTaskResponse)
async def assign_task(task_id: str, assignment: LabelingTaskAssign):
    """Assign a task to a user"""
    sql = get_sql_service()

    # Check task exists and is assignable
    task_rows = sql.execute(f"SELECT * FROM labeling_tasks WHERE id = '{task_id}'")
    if not task_rows:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    task = task_rows[0]
    if task["status"] not in ["pending", "assigned"]:
        raise HTTPException(
            status_code=400,
            detail=f"Task cannot be assigned in {task['status']} status",
        )

    now = datetime.utcnow().isoformat()
    sql.execute_update(f"""
        UPDATE labeling_tasks
        SET assigned_to = '{assignment.assigned_to}',
            assigned_at = '{now}',
            status = 'assigned',
            updated_at = '{now}'
        WHERE id = '{task_id}'
    """)

    return await get_task(task_id)


@router.post("/tasks/{task_id}/claim", response_model=LabelingTaskResponse)
async def claim_task(task_id: str, user_email: str = Query(...)):
    """Self-assign a task (for labelers)"""
    return await assign_task(task_id, LabelingTaskAssign(assigned_to=user_email))


@router.post("/tasks/{task_id}/release", response_model=LabelingTaskResponse)
async def release_task(task_id: str):
    """Unassign a task"""
    sql = get_sql_service()

    task_rows = sql.execute(f"SELECT status FROM labeling_tasks WHERE id = '{task_id}'")
    if not task_rows:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    if task_rows[0]["status"] not in ["assigned"]:
        raise HTTPException(
            status_code=400,
            detail="Can only release assigned tasks that haven't started",
        )

    now = datetime.utcnow().isoformat()
    sql.execute_update(f"""
        UPDATE labeling_tasks
        SET assigned_to = NULL,
            assigned_at = NULL,
            status = 'pending',
            updated_at = '{now}'
        WHERE id = '{task_id}'
    """)

    return await get_task(task_id)


@router.post("/tasks/{task_id}/start", response_model=LabelingTaskResponse)
async def start_task(task_id: str):
    """Mark task as in progress (labeler started working)"""
    sql = get_sql_service()

    task_rows = sql.execute(f"SELECT status FROM labeling_tasks WHERE id = '{task_id}'")
    if not task_rows:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    if task_rows[0]["status"] not in ["assigned", "rework"]:
        raise HTTPException(status_code=400, detail="Task must be assigned to start")

    now = datetime.utcnow().isoformat()
    sql.execute_update(f"""
        UPDATE labeling_tasks
        SET status = 'in_progress',
            started_at = COALESCE(started_at, '{now}'),
            updated_at = '{now}'
        WHERE id = '{task_id}'
    """)

    return await get_task(task_id)


@router.post("/tasks/{task_id}/submit", response_model=LabelingTaskResponse)
async def submit_task(task_id: str):
    """Submit task for review"""
    sql = get_sql_service()

    task_rows = sql.execute(f"SELECT status FROM labeling_tasks WHERE id = '{task_id}'")
    if not task_rows:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    if task_rows[0]["status"] != "in_progress":
        raise HTTPException(
            status_code=400, detail="Task must be in progress to submit"
        )

    now = datetime.utcnow().isoformat()
    sql.execute_update(f"""
        UPDATE labeling_tasks
        SET status = 'submitted',
            submitted_at = '{now}',
            updated_at = '{now}'
        WHERE id = '{task_id}'
    """)

    return await get_task(task_id)


@router.post("/tasks/{task_id}/review", response_model=LabelingTaskResponse)
async def review_task(
    task_id: str, review: TaskReviewAction, reviewer: str = Query(...)
):
    """Review a submitted task (approve, reject, or request rework)"""
    sql = get_sql_service()

    task_rows = sql.execute(f"SELECT * FROM labeling_tasks WHERE id = '{task_id}'")
    if not task_rows:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    task = task_rows[0]
    if task["status"] not in ["submitted", "review"]:
        raise HTTPException(status_code=400, detail="Task must be submitted to review")

    now = datetime.utcnow().isoformat()

    if review.action == "approve":
        new_status = "approved"
        # Update job approved count
        job_id = task["job_id"]
        item_count = task["item_count"]
        sql.execute_update(f"""
            UPDATE labeling_jobs
            SET approved_items = approved_items + {item_count},
                updated_at = '{now}'
            WHERE id = '{job_id}'
        """)
    elif review.action == "reject":
        new_status = "rejected"
    elif review.action == "rework":
        new_status = "rework"
    else:
        raise HTTPException(
            status_code=400, detail=f"Invalid review action: {review.action}"
        )

    sql.execute_update(f"""
        UPDATE labeling_tasks
        SET status = '{new_status}',
            reviewer = '{reviewer}',
            reviewed_at = '{now}',
            review_notes = {f"'{review.notes.replace(chr(39), chr(39) + chr(39))}'" if review.notes else "NULL"},
            rejection_reason = {f"'{review.rejection_reason.replace(chr(39), chr(39) + chr(39))}'" if review.rejection_reason else "NULL"},
            updated_at = '{now}'
        WHERE id = '{task_id}'
    """)

    return await get_task(task_id)


# =============================================================================
# Items Endpoints
# =============================================================================


@router.get("/tasks/{task_id}/items", response_model=LabeledItemList)
async def list_items(
    task_id: str,
    status: ItemStatus | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
):
    """List items in a task"""
    sql = get_sql_service()

    conditions = [f"task_id = '{task_id}'"]
    if status:
        conditions.append(f"status = '{status.value}'")

    where_clause = f"WHERE {' AND '.join(conditions)}"

    # Get total
    total = sql.execute(f"SELECT COUNT(*) as count FROM labeled_items {where_clause}")[
        0
    ]["count"]

    # Get items
    offset = (page - 1) * page_size
    rows = sql.execute(f"""
        SELECT * FROM labeled_items
        {where_clause}
        ORDER BY row_index ASC
        LIMIT {page_size} OFFSET {offset}
    """)

    items = [_row_to_item(row) for row in rows]

    return LabeledItemList(items=items, total=total, page=page, page_size=page_size)


@router.get("/items/{item_id}", response_model=LabeledItemResponse)
async def get_item(item_id: str):
    """Get a labeled item by ID"""
    sql = get_sql_service()

    rows = sql.execute(f"SELECT * FROM labeled_items WHERE id = '{item_id}'")
    if not rows:
        raise HTTPException(status_code=404, detail=f"Item {item_id} not found")

    return _row_to_item(rows[0])


@router.put("/items/{item_id}/label", response_model=LabeledItemResponse)
async def label_item(
    item_id: str, update: LabeledItemUpdate, labeler: str = Query(...)
):
    """Save labels for an item"""
    sql = get_sql_service()

    item_rows = sql.execute(f"SELECT * FROM labeled_items WHERE id = '{item_id}'")
    if not item_rows:
        raise HTTPException(status_code=404, detail=f"Item {item_id} not found")

    now = datetime.utcnow().isoformat()
    human_labels_json = json.dumps(update.human_labels)
    esc_labels = human_labels_json.replace("'", "''")

    sql.execute_update(f"""
        UPDATE labeled_items
        SET human_labels = '{esc_labels}',
            labeled_by = '{labeler}',
            labeled_at = '{now}',
            status = 'human_labeled',
            is_difficult = {update.is_difficult},
            needs_discussion = {update.needs_discussion},
            updated_at = '{now}'
        WHERE id = '{item_id}'
    """)

    # Update task labeled count
    item = item_rows[0]
    task_id = item["task_id"]
    labeled_count = sql.execute(f"""
        SELECT COUNT(*) as count FROM labeled_items
        WHERE task_id = '{task_id}' AND status = 'human_labeled'
    """)[0]["count"]

    sql.execute_update(f"""
        UPDATE labeling_tasks
        SET labeled_count = {labeled_count},
            updated_at = '{now}'
        WHERE id = '{task_id}'
    """)

    # Update job labeled count
    job_id = item["job_id"]
    job_labeled = sql.execute(f"""
        SELECT COUNT(*) as count FROM labeled_items
        WHERE job_id = '{job_id}' AND status IN ('human_labeled', 'reviewed')
    """)[0]["count"]

    sql.execute_update(f"""
        UPDATE labeling_jobs
        SET labeled_items = {job_labeled},
            updated_at = '{now}'
        WHERE id = '{job_id}'
    """)

    return await get_item(item_id)


@router.post("/items/{item_id}/skip", response_model=LabeledItemResponse)
async def skip_item(item_id: str, skip: LabeledItemSkip):
    """Skip an item with reason"""
    sql = get_sql_service()

    now = datetime.utcnow().isoformat()
    esc_reason = skip.skip_reason.replace("'", "''")
    sql.execute_update(f"""
        UPDATE labeled_items
        SET status = 'skipped',
            skip_reason = '{esc_reason}',
            updated_at = '{now}'
        WHERE id = '{item_id}'
    """)

    return await get_item(item_id)


@router.post("/items/{item_id}/flag", response_model=LabeledItemResponse)
async def flag_item(item_id: str, flag: LabeledItemFlag):
    """Flag an item as difficult or needing discussion"""
    sql = get_sql_service()

    now = datetime.utcnow().isoformat()
    sql.execute_update(f"""
        UPDATE labeled_items
        SET is_difficult = {flag.is_difficult},
            needs_discussion = {flag.needs_discussion},
            status = 'flagged',
            updated_at = '{now}'
        WHERE id = '{item_id}'
    """)

    return await get_item(item_id)


# =============================================================================
# Users Endpoints
# =============================================================================


@router.get("/users", response_model=WorkspaceUserList)
async def list_users(
    role: UserRole | None = None,
    is_active: bool | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
):
    """List workspace users"""
    sql = get_sql_service()

    conditions = []
    if role:
        conditions.append(f"role = '{role.value}'")
    if is_active is not None:
        conditions.append(f"is_active = {is_active}")

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    total = sql.execute(
        f"SELECT COUNT(*) as count FROM workspace_users {where_clause}"
    )[0]["count"]

    offset = (page - 1) * page_size
    rows = sql.execute(f"""
        SELECT * FROM workspace_users
        {where_clause}
        ORDER BY display_name ASC
        LIMIT {page_size} OFFSET {offset}
    """)

    users = [_row_to_user(row) for row in rows]

    return WorkspaceUserList(users=users, total=total, page=page, page_size=page_size)


@router.post("/users", response_model=WorkspaceUserResponse, status_code=201)
async def create_user(user: WorkspaceUserCreate):
    """Create a new workspace user"""
    sql = get_sql_service()

    # Check if user already exists
    existing = sql.execute(
        f"SELECT id FROM workspace_users WHERE email = '{user.email}'"
    )
    if existing:
        raise HTTPException(
            status_code=400, detail=f"User with email {user.email} already exists"
        )

    user_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    esc_display_name = user.display_name.replace("'", "''")

    sql.execute_update(f"""
        INSERT INTO workspace_users (
            id, email, display_name, role, max_concurrent_tasks,
            current_task_count, total_labeled, total_reviewed,
            is_active, created_at, updated_at
        ) VALUES (
            '{user_id}', '{user.email}', '{esc_display_name}',
            '{user.role.value}', {user.max_concurrent_tasks},
            0, 0, 0, TRUE, '{now}', '{now}'
        )
    """)

    return WorkspaceUserResponse(
        id=user_id,
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        max_concurrent_tasks=user.max_concurrent_tasks,
        created_at=datetime.fromisoformat(now),
        updated_at=datetime.fromisoformat(now),
    )


@router.get("/users/me", response_model=WorkspaceUserResponse)
async def get_current_user(email: str = Query(...)):
    """Get current user by email (or create if doesn't exist)"""
    sql = get_sql_service()

    rows = sql.execute(f"SELECT * FROM workspace_users WHERE email = '{email}'")

    if not rows:
        # Auto-create user
        return await create_user(
            WorkspaceUserCreate(
                email=email,
                display_name=email.split("@")[0],
                role=UserRole.LABELER,
            )
        )

    return _row_to_user(rows[0])


@router.get("/users/{user_id}", response_model=WorkspaceUserResponse)
async def get_user(user_id: str):
    """Get a user by ID"""
    sql = get_sql_service()

    rows = sql.execute(f"SELECT * FROM workspace_users WHERE id = '{user_id}'")
    if not rows:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")

    return _row_to_user(rows[0])


@router.put("/users/{user_id}", response_model=WorkspaceUserResponse)
async def update_user(user_id: str, update: WorkspaceUserUpdate):
    """Update a user"""
    sql = get_sql_service()

    existing = sql.execute(f"SELECT * FROM workspace_users WHERE id = '{user_id}'")
    if not existing:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")

    updates = []
    if update.display_name is not None:
        updates.append(
            f"display_name = '{update.display_name.replace(chr(39), chr(39) + chr(39))}'"
        )
    if update.role is not None:
        updates.append(f"role = '{update.role.value}'")
    if update.max_concurrent_tasks is not None:
        updates.append(f"max_concurrent_tasks = {update.max_concurrent_tasks}")
    if update.is_active is not None:
        updates.append(f"is_active = {update.is_active}")

    if updates:
        updates.append(f"updated_at = '{datetime.utcnow().isoformat()}'")
        sql.execute_update(
            f"UPDATE workspace_users SET {', '.join(updates)} WHERE id = '{user_id}'"
        )

    return await get_user(user_id)


@router.get("/users/{user_id}/stats", response_model=UserStats)
async def get_user_stats(user_id: str):
    """Get detailed statistics for a user"""
    sql = get_sql_service()

    user_rows = sql.execute(f"SELECT * FROM workspace_users WHERE id = '{user_id}'")
    if not user_rows:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")

    user = user_rows[0]
    email = user["email"]

    # Get labeling stats
    labeled_stats = sql.execute(f"""
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN review_status = 'approved' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN review_status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM labeled_items
        WHERE labeled_by = '{email}'
    """)[0]

    # Get active tasks
    active_tasks = sql.execute(f"""
        SELECT COUNT(*) as count FROM labeling_tasks
        WHERE assigned_to = '{email}' AND status IN ('assigned', 'in_progress')
    """)[0]["count"]

    # Get pending review (tasks submitted by this user)
    pending_review = sql.execute(f"""
        SELECT COUNT(*) as count FROM labeling_tasks
        WHERE assigned_to = '{email}' AND status = 'submitted'
    """)[0]["count"]

    total_labeled = labeled_stats["total"] or 0
    total_approved = labeled_stats["approved"] or 0
    total_rejected = labeled_stats["rejected"] or 0

    return UserStats(
        user_id=user_id,
        email=email,
        total_labeled=total_labeled,
        total_approved=total_approved,
        total_rejected=total_rejected,
        total_reviewed=user.get("total_reviewed", 0),
        accuracy_rate=total_approved / total_labeled if total_labeled > 0 else None,
        approval_rate=total_approved / (total_approved + total_rejected)
        if (total_approved + total_rejected) > 0
        else None,
        avg_time_per_item=user.get("avg_time_per_item"),
        active_tasks=active_tasks,
        pending_review=pending_review,
    )


@router.get("/users/{user_id}/tasks", response_model=LabelingTaskList)
async def get_user_tasks(
    user_id: str,
    status: TaskStatus | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    """Get tasks assigned to a user"""
    sql = get_sql_service()

    user_rows = sql.execute(f"SELECT email FROM workspace_users WHERE id = '{user_id}'")
    if not user_rows:
        raise HTTPException(status_code=404, detail=f"User {user_id} not found")

    email = user_rows[0]["email"]

    conditions = [f"assigned_to = '{email}'"]
    if status:
        conditions.append(f"status = '{status.value}'")

    where_clause = f"WHERE {' AND '.join(conditions)}"

    total = sql.execute(f"SELECT COUNT(*) as count FROM labeling_tasks {where_clause}")[
        0
    ]["count"]

    offset = (page - 1) * page_size
    rows = sql.execute(f"""
        SELECT * FROM labeling_tasks
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
    """)

    tasks = [_row_to_task(row) for row in rows]

    return LabelingTaskList(tasks=tasks, total=total, page=page, page_size=page_size)
