"""Agent Framework API endpoints - few-shot example retrieval for agents.

Provides a REST API that agents call to retrieve relevant examples
for prompt injection with automatic usage tracking.
"""

from fastapi import APIRouter, HTTPException

from app.models.agent_models import (
    AgentExampleRequest,
    AgentExampleResponse,
    AgentOutcomeRequest,
    AgentOutcomeResponse,
)
from app.services.agent_retriever_service import get_agent_retriever_service

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("/examples/retrieve", response_model=AgentExampleResponse)
async def retrieve_examples(request: AgentExampleRequest):
    """Retrieve examples for agent prompt injection.

    Agents call this endpoint to get relevant few-shot examples formatted
    for inclusion in their prompts. The response includes a retrieval_id
    for tracking usage outcomes.

    **Usage Flow:**
    1. Agent sends query + filters
    2. Service searches Example Store for relevant examples
    3. Examples are formatted (XML/markdown/JSON) for prompt injection
    4. Retrieval is logged for effectiveness tracking
    5. Agent later reports outcome via /examples/outcome

    **Example Request:**
    ```json
    {
        "query": "What is the radiation level in zone 3?",
        "agent_id": "support-agent-v1",
        "domain": "anomaly_detection",
        "max_examples": 3,
        "format_style": "xml"
    }
    ```

    **Example Response:**
    ```json
    {
        "retrieval_id": "ret_abc123",
        "examples": [...],
        "formatted_prompt": "<examples>...</examples>",
        "metadata": {"search_type": "metadata", "total_matches": 15}
    }
    ```
    """
    service = get_agent_retriever_service()

    try:
        return service.retrieve_examples(request)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve examples: {str(e)}"
        )


@router.post("/examples/outcome", response_model=AgentOutcomeResponse)
async def record_outcome(request: AgentOutcomeRequest):
    """Record the outcome of using retrieved examples.

    After using examples in a prompt, agents should report the outcome
    to help improve example effectiveness tracking over time.

    **Outcome Types:**
    - `success`: The examples helped produce a correct response
    - `failure`: The examples did not help or led to incorrect response
    - `partial`: Mixed results or uncertain outcome

    **Example Request:**
    ```json
    {
        "retrieval_id": "ret_abc123",
        "outcome": "success",
        "confidence": 0.92,
        "feedback_notes": "Examples helped with sensor interpretation"
    }
    ```

    This updates effectiveness scores for the retrieved examples,
    enabling the system to learn which examples work best over time.
    """
    service = get_agent_retriever_service()

    try:
        return service.record_outcome(request)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to record outcome: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Health check for agent integration.

    Agents can call this to verify the API is available before
    making retrieval requests.
    """
    return {"status": "healthy", "service": "agent-retriever"}
