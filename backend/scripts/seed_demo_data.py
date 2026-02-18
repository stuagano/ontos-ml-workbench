#!/usr/bin/env python3
"""
Seed demo data for Ontos ML Workbench.

This script populates the database with sample templates, tools, agents,
and curation items for demonstration purposes.

Usage:
    python scripts/seed_demo_data.py
"""

import json
import sys
import uuid
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(__file__).rsplit("/scripts/", 1)[0])

from app.services.sql_service import get_sql_service  # noqa: E402


def escape_sql(s: str) -> str:
    """Escape single quotes for SQL."""
    return s.replace("'", "''") if s else s


def seed_templates(sql_service) -> list[str]:
    """Create sample templates."""
    templates = [
        {
            "name": "Document Classifier",
            "description": "Classify documents into predefined categories based on content analysis",
            "prompt_template": """Classify the following document into one of these categories: {categories}

Document:
{document}

Respond with a JSON object containing:
- category: the most appropriate category
- confidence: a score from 0 to 1
- reasoning: brief explanation""",
            "system_prompt": "You are a document classification expert. Analyze documents carefully and provide accurate classifications.",
            "input_schema": json.dumps([
                {"name": "document", "type": "string", "description": "The document text to classify", "required": True},
                {"name": "categories", "type": "string", "description": "Comma-separated list of categories", "required": True},
            ]),
            "output_schema": json.dumps([
                {"name": "category", "type": "string", "description": "The assigned category", "required": True},
                {"name": "confidence", "type": "number", "description": "Confidence score 0-1", "required": True},
                {"name": "reasoning", "type": "string", "description": "Explanation", "required": False},
            ]),
            "examples": json.dumps([
                {
                    "input": {"document": "Q3 revenue increased by 15%...", "categories": "Financial,Legal,Technical,HR"},
                    "output": {"category": "Financial", "confidence": 0.95, "reasoning": "Contains revenue metrics"},
                }
            ]),
            "base_model": "databricks-meta-llama-3-1-70b-instruct",
            "status": "published",
        },
        {
            "name": "Sentiment Analyzer",
            "description": "Analyze sentiment in customer feedback and reviews",
            "prompt_template": """Analyze the sentiment of the following text:

{text}

Provide a sentiment analysis with:
- sentiment: positive, negative, or neutral
- score: -1 (very negative) to 1 (very positive)
- key_phrases: list of phrases that influenced the sentiment""",
            "system_prompt": "You are a sentiment analysis expert. Be objective and thorough in your analysis.",
            "input_schema": json.dumps([
                {"name": "text", "type": "string", "description": "Text to analyze", "required": True},
            ]),
            "output_schema": json.dumps([
                {"name": "sentiment", "type": "string", "description": "positive/negative/neutral", "required": True},
                {"name": "score", "type": "number", "description": "Score from -1 to 1", "required": True},
                {"name": "key_phrases", "type": "array", "description": "Influential phrases", "required": False},
            ]),
            "examples": json.dumps([
                {
                    "input": {"text": "Great product! Fast shipping and excellent quality."},
                    "output": {"sentiment": "positive", "score": 0.9, "key_phrases": ["Great product", "excellent quality"]},
                }
            ]),
            "base_model": "databricks-meta-llama-3-1-8b-instruct",
            "status": "published",
        },
        {
            "name": "Entity Extractor",
            "description": "Extract named entities (people, organizations, locations) from text",
            "prompt_template": """Extract all named entities from the following text:

{text}

Identify and categorize:
- PERSON: Names of people
- ORG: Organizations and companies
- LOC: Locations and places
- DATE: Dates and times
- MONEY: Monetary values""",
            "system_prompt": "You are an expert at named entity recognition. Be thorough and accurate.",
            "input_schema": json.dumps([
                {"name": "text", "type": "string", "description": "Text to extract entities from", "required": True},
            ]),
            "output_schema": json.dumps([
                {"name": "entities", "type": "array", "description": "List of extracted entities", "required": True},
            ]),
            "examples": json.dumps([]),
            "base_model": "databricks-meta-llama-3-1-70b-instruct",
            "status": "draft",
        },
        {
            "name": "Code Reviewer",
            "description": "Review code for bugs, style issues, and security vulnerabilities",
            "prompt_template": """Review the following code and provide feedback:

Language: {language}
Code:
```
{code}
```

Identify:
1. Potential bugs
2. Style issues
3. Security concerns
4. Performance improvements
5. Best practice violations""",
            "system_prompt": "You are a senior software engineer conducting code reviews. Be constructive and thorough.",
            "input_schema": json.dumps([
                {"name": "code", "type": "string", "description": "Code to review", "required": True},
                {"name": "language", "type": "string", "description": "Programming language", "required": True},
            ]),
            "output_schema": json.dumps([
                {"name": "issues", "type": "array", "description": "List of identified issues", "required": True},
                {"name": "suggestions", "type": "array", "description": "Improvement suggestions", "required": False},
            ]),
            "examples": json.dumps([]),
            "base_model": "databricks-meta-llama-3-1-70b-instruct",
            "status": "draft",
        },
    ]

    template_ids = []
    for t in templates:
        template_id = str(uuid.uuid4())
        template_ids.append(template_id)

        sql = f"""
        INSERT INTO templates (
            id, name, description, version, status,
            input_schema, output_schema, prompt_template, system_prompt, examples,
            base_model, temperature, max_tokens,
            created_by, created_at, updated_at
        ) VALUES (
            '{template_id}',
            '{escape_sql(t["name"])}',
            '{escape_sql(t["description"])}',
            '1.0.0',
            '{t["status"]}',
            '{escape_sql(t["input_schema"])}',
            '{escape_sql(t["output_schema"])}',
            '{escape_sql(t["prompt_template"])}',
            '{escape_sql(t["system_prompt"])}',
            '{escape_sql(t["examples"])}',
            '{t["base_model"]}',
            0.7,
            1024,
            'demo_seed',
            current_timestamp(),
            current_timestamp()
        )
        """
        try:
            sql_service.execute_update(sql)
            print(f"  Created template: {t['name']}")
        except Exception as e:
            print(f"  Skipped template {t['name']}: {e}")

    return template_ids


def seed_tools(sql_service) -> list[str]:
    """Create sample tools."""
    tools = [
        {
            "name": "get_weather",
            "description": "Get current weather conditions for a location",
            "uc_function_path": "main.default.get_weather",
            "parameters_schema": json.dumps({
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "City name or coordinates"},
                    "units": {"type": "string", "enum": ["celsius", "fahrenheit"], "default": "celsius"},
                },
                "required": ["location"],
            }),
            "return_type": "object",
            "documentation": "Returns temperature, humidity, and conditions for the specified location.",
        },
        {
            "name": "search_database",
            "description": "Search the knowledge base for relevant documents",
            "uc_function_path": "main.default.search_database",
            "parameters_schema": json.dumps({
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "limit": {"type": "integer", "description": "Max results", "default": 10},
                    "filters": {"type": "object", "description": "Optional filters"},
                },
                "required": ["query"],
            }),
            "return_type": "array",
            "documentation": "Performs semantic search over the document index.",
        },
        {
            "name": "send_notification",
            "description": "Send a notification to a user or channel",
            "uc_function_path": "main.default.send_notification",
            "parameters_schema": json.dumps({
                "type": "object",
                "properties": {
                    "recipient": {"type": "string", "description": "User ID or channel name"},
                    "message": {"type": "string", "description": "Notification message"},
                    "priority": {"type": "string", "enum": ["low", "normal", "high"], "default": "normal"},
                },
                "required": ["recipient", "message"],
            }),
            "return_type": "boolean",
            "documentation": "Sends notifications via Slack or email based on recipient format.",
        },
    ]

    tool_ids = []
    for t in tools:
        tool_id = str(uuid.uuid4())
        tool_ids.append(tool_id)

        sql = f"""
        INSERT INTO tools_registry (
            id, name, description, uc_function_path,
            parameters_schema, return_type, documentation,
            version, status, created_by, created_at, updated_at
        ) VALUES (
            '{tool_id}',
            '{escape_sql(t["name"])}',
            '{escape_sql(t["description"])}',
            '{t["uc_function_path"]}',
            '{escape_sql(t["parameters_schema"])}',
            '{t["return_type"]}',
            '{escape_sql(t["documentation"])}',
            '1.0.0',
            'published',
            'demo_seed',
            current_timestamp(),
            current_timestamp()
        )
        """
        try:
            sql_service.execute_update(sql)
            print(f"  Created tool: {t['name']}")
        except Exception as e:
            print(f"  Skipped tool {t['name']}: {e}")

    return tool_ids


def seed_agents(sql_service, tool_ids: list[str]) -> list[str]:
    """Create sample agents."""
    agents = [
        {
            "name": "Research Assistant",
            "description": "Helps with research by searching documents and summarizing findings",
            "system_prompt": """You are a helpful research assistant. Use the available tools to find information and provide clear, well-organized summaries.

When answering questions:
1. Search for relevant documents first
2. Synthesize information from multiple sources
3. Cite your sources
4. Ask clarifying questions if needed""",
            "tools": json.dumps(tool_ids[:2]) if tool_ids else "[]",
            "model_endpoint": "databricks-meta-llama-3-1-70b-instruct",
        },
        {
            "name": "Customer Support Bot",
            "description": "Handles customer inquiries and routes complex issues to humans",
            "system_prompt": """You are a friendly customer support representative. Help customers with their questions while maintaining a professional and empathetic tone.

Guidelines:
- Always greet the customer warmly
- Ask clarifying questions before making assumptions
- Escalate to a human agent if the issue is complex or the customer is frustrated
- End conversations with a satisfaction check""",
            "tools": json.dumps([tool_ids[2]] if len(tool_ids) > 2 else []),
            "model_endpoint": "databricks-meta-llama-3-1-8b-instruct",
        },
    ]

    agent_ids = []
    for a in agents:
        agent_id = str(uuid.uuid4())
        agent_ids.append(agent_id)

        sql = f"""
        INSERT INTO agents_registry (
            id, name, description, system_prompt,
            tools, model_endpoint, temperature, max_tokens,
            version, status, created_by, created_at, updated_at
        ) VALUES (
            '{agent_id}',
            '{escape_sql(a["name"])}',
            '{escape_sql(a["description"])}',
            '{escape_sql(a["system_prompt"])}',
            '{escape_sql(a["tools"])}',
            '{a["model_endpoint"]}',
            0.7,
            2048,
            '1.0.0',
            'draft',
            'demo_seed',
            current_timestamp(),
            current_timestamp()
        )
        """
        try:
            sql_service.execute_update(sql)
            print(f"  Created agent: {a['name']}")
        except Exception as e:
            print(f"  Skipped agent {a['name']}: {e}")

    return agent_ids


def seed_curation_items(sql_service, template_ids: list[str]):
    """Create sample curation items for the first template."""
    if not template_ids:
        print("  No templates to add curation items to")
        return

    template_id = template_ids[0]  # Add items to first template (Document Classifier)

    items = [
        {
            "item_ref": "doc_001",
            "item_data": json.dumps({"document": "Annual revenue grew 12% year over year...", "categories": "Financial,Legal,Technical,HR"}),
            "agent_label": json.dumps({"category": "Financial", "confidence": 0.92}),
            "agent_confidence": 0.92,
            "agent_model": "databricks-meta-llama-3-1-70b-instruct",
            "status": "auto_approved",
        },
        {
            "item_ref": "doc_002",
            "item_data": json.dumps({"document": "Employee handbook section 3.2 vacation policy...", "categories": "Financial,Legal,Technical,HR"}),
            "agent_label": json.dumps({"category": "HR", "confidence": 0.88}),
            "agent_confidence": 0.88,
            "agent_model": "databricks-meta-llama-3-1-70b-instruct",
            "status": "auto_approved",
        },
        {
            "item_ref": "doc_003",
            "item_data": json.dumps({"document": "System architecture overview for microservices...", "categories": "Financial,Legal,Technical,HR"}),
            "agent_label": json.dumps({"category": "Technical", "confidence": 0.95}),
            "agent_confidence": 0.95,
            "agent_model": "databricks-meta-llama-3-1-70b-instruct",
            "status": "approved",
            "human_label": json.dumps({"category": "Technical"}),
        },
        {
            "item_ref": "doc_004",
            "item_data": json.dumps({"document": "Terms and conditions of service agreement...", "categories": "Financial,Legal,Technical,HR"}),
            "agent_label": json.dumps({"category": "Legal", "confidence": 0.78}),
            "agent_confidence": 0.78,
            "agent_model": "databricks-meta-llama-3-1-70b-instruct",
            "status": "needs_review",
        },
        {
            "item_ref": "doc_005",
            "item_data": json.dumps({"document": "Meeting notes from Q4 planning session...", "categories": "Financial,Legal,Technical,HR"}),
            "agent_label": json.dumps({"category": "Financial", "confidence": 0.52}),
            "agent_confidence": 0.52,
            "agent_model": "databricks-meta-llama-3-1-70b-instruct",
            "status": "pending",
        },
        {
            "item_ref": "doc_006",
            "item_data": json.dumps({"document": "Bug report: Login failing intermittently...", "categories": "Financial,Legal,Technical,HR"}),
            "agent_label": json.dumps({"category": "Technical", "confidence": 0.91}),
            "agent_confidence": 0.91,
            "agent_model": "databricks-meta-llama-3-1-70b-instruct",
            "status": "rejected",
            "human_label": json.dumps({"category": "Support"}),
        },
    ]

    for item in items:
        item_id = str(uuid.uuid4())

        sql = f"""
        INSERT INTO curation_items (
            id, template_id, item_ref, item_data,
            agent_label, agent_confidence, agent_model,
            human_label, status, quality_score,
            created_at, updated_at
        ) VALUES (
            '{item_id}',
            '{template_id}',
            '{item["item_ref"]}',
            '{escape_sql(item["item_data"])}',
            '{escape_sql(item["agent_label"])}',
            {item["agent_confidence"]},
            '{item["agent_model"]}',
            {f"'{escape_sql(item.get('human_label', ''))}'" if item.get("human_label") else "NULL"},
            '{item["status"]}',
            {round(item["agent_confidence"] * 5, 1)},
            current_timestamp(),
            current_timestamp()
        )
        """
        try:
            sql_service.execute_update(sql)
            print(f"  Created curation item: {item['item_ref']}")
        except Exception as e:
            print(f"  Skipped item {item['item_ref']}: {e}")


def seed_sheets_and_assemblies(sql_service) -> tuple[list[str], list[str]]:
    """Create sample sheets and assemblies for the Curate stage.

    Returns tuple of (sheet_ids, assembly_ids).
    """
    # -------------------------------------------------------------------------
    # Create a Sheet (Defect Detection use case)
    # -------------------------------------------------------------------------
    sheet_id = str(uuid.uuid4())
    sheet_columns = json.dumps([
        {"id": "col_1", "name": "image_url", "data_type": "string", "source_type": "imported", "order": 0},
        {"id": "col_2", "name": "equipment_id", "data_type": "string", "source_type": "imported", "order": 1},
        {"id": "col_3", "name": "inspection_date", "data_type": "string", "source_type": "imported", "order": 2},
        {"id": "col_4", "name": "sensor_readings", "data_type": "string", "source_type": "imported", "order": 3},
        {"id": "col_5", "name": "defect_classification", "data_type": "string", "source_type": "imported", "order": 4},
    ])

    sheet_sql = f"""
    INSERT INTO sheets (
        id, name, description, version, status, columns, row_count, created_by, created_at, updated_at
    ) VALUES (
        '{sheet_id}',
        'Radiation Equipment Inspections',
        'Inspection images and sensor data for defect detection training',
        '1.0.0',
        'published',
        '{escape_sql(sheet_columns)}',
        10,
        'demo_seed',
        current_timestamp(),
        current_timestamp()
    )
    """
    try:
        sql_service.execute_update(sheet_sql)
        print(f"  Created sheet: Radiation Equipment Inspections")
    except Exception as e:
        print(f"  Skipped sheet: {e}")
        return [], []

    # -------------------------------------------------------------------------
    # Create an Assembly for Defect Detection
    # -------------------------------------------------------------------------
    assembly_id = str(uuid.uuid4())
    template_config = json.dumps({
        "name": "Defect Detection Classifier",
        "description": "Classify radiation equipment defects from inspection images and sensor data",
        "system_instruction": "You are a radiation safety expert analyzing equipment inspection data. Classify defects accurately based on visual inspection images and sensor readings. Categories: NORMAL, MINOR_WEAR, CONTAMINATION, STRUCTURAL_DAMAGE, CALIBRATION_DRIFT, CRITICAL_FAILURE.",
        "prompt_template": "Analyze this radiation equipment inspection:\\n\\nEquipment ID: {{equipment_id}}\\nInspection Date: {{inspection_date}}\\nSensor Readings: {{sensor_readings}}\\nImage: {{image_url}}\\n\\nClassify the equipment condition and explain your reasoning.",
        "response_source_mode": "ai_generated",
        "model": "databricks-meta-llama-3-1-70b-instruct",
        "temperature": 0.3,
        "max_tokens": 512
    })

    assembly_sql = f"""
    INSERT INTO assemblies (
        id, sheet_id, sheet_name, template_config, status,
        total_rows, ai_generated_count, human_labeled_count, human_verified_count, flagged_count,
        created_by, created_at, updated_at
    ) VALUES (
        '{assembly_id}',
        '{sheet_id}',
        'Radiation Equipment Inspections',
        '{escape_sql(template_config)}',
        'ready',
        10, 5, 2, 1, 1,
        'demo_seed',
        current_timestamp(),
        current_timestamp()
    )
    """
    try:
        sql_service.execute_update(assembly_sql)
        print(f"  Created assembly: Defect Detection Classifier")
    except Exception as e:
        print(f"  Skipped assembly: {e}")
        return [sheet_id], []

    # -------------------------------------------------------------------------
    # Create Assembly Rows (sample prompt/response pairs)
    # -------------------------------------------------------------------------
    assembly_rows = [
        {
            "row_index": 0,
            "source_data": {"equipment_id": "RAD-2024-001", "inspection_date": "2024-01-15", "sensor_readings": "Gamma: 0.12 mSv/h, Beta: 0.08 mSv/h", "image_url": "/images/inspection_001.jpg"},
            "prompt": "Analyze this radiation equipment inspection:\n\nEquipment ID: RAD-2024-001\nInspection Date: 2024-01-15\nSensor Readings: Gamma: 0.12 mSv/h, Beta: 0.08 mSv/h\nImage: /images/inspection_001.jpg\n\nClassify the equipment condition and explain your reasoning.",
            "response": "Classification: NORMAL\n\nReasoning: Sensor readings are within normal operating parameters. Gamma radiation at 0.12 mSv/h and Beta at 0.08 mSv/h are both well below the threshold limits. Visual inspection shows no signs of wear, contamination, or structural damage.",
            "response_source": "human_verified",
        },
        {
            "row_index": 1,
            "source_data": {"equipment_id": "RAD-2024-002", "inspection_date": "2024-01-16", "sensor_readings": "Gamma: 0.45 mSv/h, Beta: 0.22 mSv/h", "image_url": "/images/inspection_002.jpg"},
            "prompt": "Analyze this radiation equipment inspection:\n\nEquipment ID: RAD-2024-002\nInspection Date: 2024-01-16\nSensor Readings: Gamma: 0.45 mSv/h, Beta: 0.22 mSv/h\nImage: /images/inspection_002.jpg\n\nClassify the equipment condition and explain your reasoning.",
            "response": "Classification: CALIBRATION_DRIFT\n\nReasoning: Gamma readings elevated at 0.45 mSv/h compared to baseline of 0.15 mSv/h for this equipment type. Beta readings also above normal. Pattern suggests gradual sensor drift rather than actual contamination. Recommend recalibration within 48 hours.",
            "response_source": "human_labeled",
        },
        {
            "row_index": 2,
            "source_data": {"equipment_id": "RAD-2024-003", "inspection_date": "2024-01-17", "sensor_readings": "Gamma: 2.1 mSv/h, Beta: 1.8 mSv/h", "image_url": "/images/inspection_003.jpg"},
            "prompt": "Analyze this radiation equipment inspection:\n\nEquipment ID: RAD-2024-003\nInspection Date: 2024-01-17\nSensor Readings: Gamma: 2.1 mSv/h, Beta: 1.8 mSv/h\nImage: /images/inspection_003.jpg\n\nClassify the equipment condition and explain your reasoning.",
            "response": "Classification: CONTAMINATION\n\nReasoning: Both Gamma (2.1 mSv/h) and Beta (1.8 mSv/h) readings significantly elevated. Visual inspection reveals surface deposits consistent with radioactive contamination. Immediate isolation and decontamination procedures required. Notify radiation safety officer.",
            "response_source": "ai_generated",
        },
        {
            "row_index": 3,
            "source_data": {"equipment_id": "RAD-2024-004", "inspection_date": "2024-01-18", "sensor_readings": "Gamma: 0.11 mSv/h, Beta: 0.09 mSv/h", "image_url": "/images/inspection_004.jpg"},
            "prompt": "Analyze this radiation equipment inspection:\n\nEquipment ID: RAD-2024-004\nInspection Date: 2024-01-18\nSensor Readings: Gamma: 0.11 mSv/h, Beta: 0.09 mSv/h\nImage: /images/inspection_004.jpg\n\nClassify the equipment condition and explain your reasoning.",
            "response": "Classification: MINOR_WEAR\n\nReasoning: Radiation readings normal. However, visual inspection shows minor surface wear on the protective shielding. No immediate safety concern, but schedule preventive maintenance within 30 days to address before degradation progresses.",
            "response_source": "ai_generated",
        },
        {
            "row_index": 4,
            "source_data": {"equipment_id": "RAD-2024-005", "inspection_date": "2024-01-19", "sensor_readings": "Gamma: ERROR, Beta: ERROR", "image_url": "/images/inspection_005.jpg"},
            "prompt": "Analyze this radiation equipment inspection:\n\nEquipment ID: RAD-2024-005\nInspection Date: 2024-01-19\nSensor Readings: Gamma: ERROR, Beta: ERROR\nImage: /images/inspection_005.jpg\n\nClassify the equipment condition and explain your reasoning.",
            "response": "Classification: CRITICAL_FAILURE\n\nReasoning: Sensor system failure indicated by ERROR readings. This is a safety-critical condition. Equipment must be taken offline immediately. Manual radiation survey required using calibrated handheld instruments before any further assessment.",
            "response_source": "ai_generated",
            "is_flagged": True,
            "flag_reason": "Needs expert review - sensor failure scenario",
        },
        {
            "row_index": 5,
            "source_data": {"equipment_id": "RAD-2024-006", "inspection_date": "2024-01-20", "sensor_readings": "Gamma: 0.14 mSv/h, Beta: 0.07 mSv/h", "image_url": "/images/inspection_006.jpg"},
            "prompt": "Analyze this radiation equipment inspection:\n\nEquipment ID: RAD-2024-006\nInspection Date: 2024-01-20\nSensor Readings: Gamma: 0.14 mSv/h, Beta: 0.07 mSv/h\nImage: /images/inspection_006.jpg\n\nClassify the equipment condition and explain your reasoning.",
            "response": "Classification: NORMAL\n\nReasoning: All readings within acceptable limits. Equipment operating as expected.",
            "response_source": "ai_generated",
        },
        {
            "row_index": 6,
            "source_data": {"equipment_id": "RAD-2024-007", "inspection_date": "2024-01-21", "sensor_readings": "Gamma: 0.88 mSv/h, Beta: 0.65 mSv/h", "image_url": "/images/inspection_007.jpg"},
            "prompt": "Analyze this radiation equipment inspection:\n\nEquipment ID: RAD-2024-007\nInspection Date: 2024-01-21\nSensor Readings: Gamma: 0.88 mSv/h, Beta: 0.65 mSv/h\nImage: /images/inspection_007.jpg\n\nClassify the equipment condition and explain your reasoning.",
            "response": "Classification: STRUCTURAL_DAMAGE\n\nReasoning: Elevated readings (Gamma 0.88, Beta 0.65) suggest shielding compromise. Visual inspection confirms hairline fracture in lead shielding panel. Recommend immediate repair or replacement of affected shielding section.",
            "response_source": "ai_generated",
        },
        {
            "row_index": 7,
            "source_data": {"equipment_id": "RAD-2024-008", "inspection_date": "2024-01-22", "sensor_readings": "Gamma: 0.10 mSv/h, Beta: 0.06 mSv/h", "image_url": "/images/inspection_008.jpg"},
            "prompt": "Analyze this radiation equipment inspection:\n\nEquipment ID: RAD-2024-008\nInspection Date: 2024-01-22\nSensor Readings: Gamma: 0.10 mSv/h, Beta: 0.06 mSv/h\nImage: /images/inspection_008.jpg\n\nClassify the equipment condition and explain your reasoning.",
            "response": None,
            "response_source": "empty",
        },
        {
            "row_index": 8,
            "source_data": {"equipment_id": "RAD-2024-009", "inspection_date": "2024-01-23", "sensor_readings": "Gamma: 0.13 mSv/h, Beta: 0.08 mSv/h", "image_url": "/images/inspection_009.jpg"},
            "prompt": "Analyze this radiation equipment inspection:\n\nEquipment ID: RAD-2024-009\nInspection Date: 2024-01-23\nSensor Readings: Gamma: 0.13 mSv/h, Beta: 0.08 mSv/h\nImage: /images/inspection_009.jpg\n\nClassify the equipment condition and explain your reasoning.",
            "response": None,
            "response_source": "empty",
        },
        {
            "row_index": 9,
            "source_data": {"equipment_id": "RAD-2024-010", "inspection_date": "2024-01-24", "sensor_readings": "Gamma: 0.55 mSv/h, Beta: 0.33 mSv/h", "image_url": "/images/inspection_010.jpg"},
            "prompt": "Analyze this radiation equipment inspection:\n\nEquipment ID: RAD-2024-010\nInspection Date: 2024-01-24\nSensor Readings: Gamma: 0.55 mSv/h, Beta: 0.33 mSv/h\nImage: /images/inspection_010.jpg\n\nClassify the equipment condition and explain your reasoning.",
            "response": "Classification: MINOR_WEAR\n\nReasoning: Readings slightly elevated but not critical. Surface inspection shows normal operational wear. Continue monitoring on standard schedule.",
            "response_source": "human_labeled",
        },
    ]

    for row in assembly_rows:
        row_id = str(uuid.uuid4())
        source_data_json = json.dumps(row["source_data"])
        response_val = f"'{escape_sql(row['response'])}'" if row["response"] else "NULL"
        is_flagged = str(row.get("is_flagged", False)).upper()
        flag_reason = f"'{escape_sql(row.get('flag_reason', ''))}'" if row.get("flag_reason") else "NULL"

        row_sql = f"""
        INSERT INTO assembly_rows (
            id, assembly_id, row_index, prompt, source_data,
            response, response_source, is_flagged, flag_reason,
            created_at
        ) VALUES (
            '{row_id}',
            '{assembly_id}',
            {row["row_index"]},
            '{escape_sql(row["prompt"])}',
            '{escape_sql(source_data_json)}',
            {response_val},
            '{row["response_source"]}',
            {is_flagged},
            {flag_reason},
            current_timestamp()
        )
        """
        try:
            sql_service.execute_update(row_sql)
        except Exception as e:
            print(f"    Skipped row {row['row_index']}: {e}")

    print(f"    Created {len(assembly_rows)} assembly rows")

    return [sheet_id], [assembly_id]


def seed_labeling_workflow(sql_service, sheet_ids: list[str]) -> dict:
    """Create sample labeling jobs, tasks, users, and items.

    Returns dict with created IDs.
    """
    if not sheet_ids:
        print("  No sheets to create labeling jobs for")
        return {}

    sheet_id = sheet_ids[0]

    # -------------------------------------------------------------------------
    # Create Workspace Users
    # -------------------------------------------------------------------------
    users = [
        {
            "email": "alice.physicist@example.com",
            "display_name": "Alice Chen",
            "role": "labeler",
        },
        {
            "email": "bob.engineer@example.com",
            "display_name": "Bob Martinez",
            "role": "labeler",
        },
        {
            "email": "carol.safety@example.com",
            "display_name": "Carol Williams",
            "role": "reviewer",
        },
        {
            "email": "david.manager@example.com",
            "display_name": "David Kim",
            "role": "manager",
        },
    ]

    user_ids = {}
    for user in users:
        user_id = str(uuid.uuid4())
        user_ids[user["email"]] = user_id

        sql = f"""
        INSERT INTO workspace_users (
            id, email, display_name, role, max_concurrent_tasks,
            current_task_count, total_labeled, total_reviewed,
            is_active, created_at, updated_at
        ) VALUES (
            '{user_id}',
            '{user["email"]}',
            '{escape_sql(user["display_name"])}',
            '{user["role"]}',
            5, 0, 0, 0, TRUE,
            current_timestamp(),
            current_timestamp()
        )
        """
        try:
            sql_service.execute_update(sql)
            print(f"  Created user: {user['display_name']} ({user['role']})")
        except Exception as e:
            print(f"  Skipped user {user['email']}: {e}")

    # -------------------------------------------------------------------------
    # Create Labeling Job
    # -------------------------------------------------------------------------
    job_id = str(uuid.uuid4())
    label_schema = json.dumps({
        "fields": [
            {
                "name": "defect_type",
                "type": "single_select",
                "required": True,
                "options": ["NORMAL", "MINOR_WEAR", "CONTAMINATION", "STRUCTURAL_DAMAGE", "CALIBRATION_DRIFT", "CRITICAL_FAILURE"],
                "description": "Primary defect classification"
            },
            {
                "name": "severity",
                "type": "single_select",
                "required": True,
                "options": ["none", "low", "medium", "high", "critical"],
                "description": "Severity level of the issue"
            },
            {
                "name": "confidence",
                "type": "slider",
                "required": False,
                "min": 0,
                "max": 100,
                "description": "Labeler confidence in classification (0-100%)"
            },
            {
                "name": "notes",
                "type": "text",
                "required": False,
                "description": "Additional observations or reasoning"
            }
        ]
    })
    target_columns = json.dumps(["defect_classification"])
    instructions = """## Defect Classification Guidelines

### Categories:
- **NORMAL**: Equipment functioning within specifications
- **MINOR_WEAR**: Surface wear that doesn't affect function
- **CONTAMINATION**: Radioactive contamination detected
- **STRUCTURAL_DAMAGE**: Physical damage to shielding or housing
- **CALIBRATION_DRIFT**: Sensor readings don't match expected values
- **CRITICAL_FAILURE**: Immediate safety concern, equipment must be isolated

### Tips:
- Always check both sensor readings AND image
- If readings show ERROR, classify as CRITICAL_FAILURE
- Contamination usually shows elevated readings + visible deposits
- When uncertain, flag for discussion"""

    job_sql = f"""
    INSERT INTO labeling_jobs (
        id, name, description, sheet_id, target_columns, label_schema,
        instructions, ai_assist_enabled, ai_model, assignment_strategy,
        default_batch_size, status, total_items, labeled_items, reviewed_items,
        approved_items, created_by, created_at, updated_at
    ) VALUES (
        '{job_id}',
        'Defect Classification - Batch 1',
        'Classify radiation equipment inspection images for defect detection model training',
        '{sheet_id}',
        '{escape_sql(target_columns)}',
        '{escape_sql(label_schema)}',
        '{escape_sql(instructions)}',
        TRUE,
        'databricks-meta-llama-3-1-70b-instruct',
        'manual',
        5,
        'active',
        10, 4, 2, 1,
        'demo_seed',
        current_timestamp(),
        current_timestamp()
    )
    """
    try:
        sql_service.execute_update(job_sql)
        print(f"  Created labeling job: Defect Classification - Batch 1")
    except Exception as e:
        print(f"  Skipped labeling job: {e}")
        return {"user_ids": user_ids}

    # -------------------------------------------------------------------------
    # Create Labeling Tasks
    # -------------------------------------------------------------------------
    tasks = [
        {
            "name": "Batch 1 - Initial Review",
            "item_indices": [0, 1, 2, 3, 4],
            "assigned_to": "alice.physicist@example.com",
            "status": "in_progress",
            "labeled_count": 3,
            "priority": "high",
        },
        {
            "name": "Batch 2 - Secondary Review",
            "item_indices": [5, 6, 7, 8, 9],
            "assigned_to": "bob.engineer@example.com",
            "status": "assigned",
            "labeled_count": 0,
            "priority": "normal",
        },
    ]

    task_ids = []
    for task in tasks:
        task_id = str(uuid.uuid4())
        task_ids.append(task_id)
        item_indices_json = json.dumps(task["item_indices"])

        task_sql = f"""
        INSERT INTO labeling_tasks (
            id, job_id, name, item_indices, item_count,
            assigned_to, assigned_at, status, labeled_count,
            priority, created_at, updated_at
        ) VALUES (
            '{task_id}',
            '{job_id}',
            '{escape_sql(task["name"])}',
            '{item_indices_json}',
            {len(task["item_indices"])},
            '{task["assigned_to"]}',
            current_timestamp(),
            '{task["status"]}',
            {task["labeled_count"]},
            '{task["priority"]}',
            current_timestamp(),
            current_timestamp()
        )
        """
        try:
            sql_service.execute_update(task_sql)
            print(f"  Created task: {task['name']} -> {task['assigned_to']}")
        except Exception as e:
            print(f"  Skipped task {task['name']}: {e}")

    # -------------------------------------------------------------------------
    # Create Labeled Items
    # -------------------------------------------------------------------------
    items = [
        # Task 1 items (Alice's batch)
        {"task_idx": 0, "row_index": 0, "status": "human_labeled",
         "human_labels": {"defect_type": "NORMAL", "severity": "none", "confidence": 95, "notes": "All readings normal, no visible issues"},
         "labeled_by": "alice.physicist@example.com", "review_status": "approved"},
        {"task_idx": 0, "row_index": 1, "status": "human_labeled",
         "human_labels": {"defect_type": "CALIBRATION_DRIFT", "severity": "medium", "confidence": 88, "notes": "Readings elevated but consistent with drift pattern"},
         "labeled_by": "alice.physicist@example.com", "review_status": "approved"},
        {"task_idx": 0, "row_index": 2, "status": "human_labeled",
         "human_labels": {"defect_type": "CONTAMINATION", "severity": "high", "confidence": 92, "notes": "Clear surface deposits visible, high readings confirm"},
         "labeled_by": "alice.physicist@example.com", "review_status": None},
        {"task_idx": 0, "row_index": 3, "status": "ai_labeled",
         "ai_labels": {"defect_type": "MINOR_WEAR", "severity": "low", "confidence": 78},
         "ai_confidence": 0.78, "human_labels": None, "labeled_by": None},
        {"task_idx": 0, "row_index": 4, "status": "flagged",
         "ai_labels": {"defect_type": "CRITICAL_FAILURE", "severity": "critical", "confidence": 85},
         "ai_confidence": 0.85, "human_labels": None, "labeled_by": None,
         "is_difficult": True, "needs_discussion": True},
        # Task 2 items (Bob's batch - all pending)
        {"task_idx": 1, "row_index": 5, "status": "pending"},
        {"task_idx": 1, "row_index": 6, "status": "pending"},
        {"task_idx": 1, "row_index": 7, "status": "pending"},
        {"task_idx": 1, "row_index": 8, "status": "pending"},
        {"task_idx": 1, "row_index": 9, "status": "ai_labeled",
         "ai_labels": {"defect_type": "MINOR_WEAR", "severity": "low", "confidence": 72},
         "ai_confidence": 0.72},
    ]

    for item in items:
        item_id = str(uuid.uuid4())
        task_id = task_ids[item["task_idx"]]

        ai_labels_val = f"'{escape_sql(json.dumps(item.get('ai_labels')))}'" if item.get("ai_labels") else "NULL"
        human_labels_val = f"'{escape_sql(json.dumps(item.get('human_labels')))}'" if item.get("human_labels") else "NULL"
        ai_confidence_val = item.get("ai_confidence", "NULL")
        labeled_by_val = f"'{item['labeled_by']}'" if item.get("labeled_by") else "NULL"
        review_status_val = f"'{item['review_status']}'" if item.get("review_status") else "NULL"
        is_difficult = str(item.get("is_difficult", False)).upper()
        needs_discussion = str(item.get("needs_discussion", False)).upper()

        item_sql = f"""
        INSERT INTO labeled_items (
            id, task_id, job_id, row_index,
            ai_labels, ai_confidence, human_labels,
            labeled_by, labeled_at, status, review_status,
            is_difficult, needs_discussion,
            created_at, updated_at
        ) VALUES (
            '{item_id}',
            '{task_id}',
            '{job_id}',
            {item["row_index"]},
            {ai_labels_val},
            {ai_confidence_val},
            {human_labels_val},
            {labeled_by_val},
            {"current_timestamp()" if item.get("labeled_by") else "NULL"},
            '{item["status"]}',
            {review_status_val},
            {is_difficult},
            {needs_discussion},
            current_timestamp(),
            current_timestamp()
        )
        """
        try:
            sql_service.execute_update(item_sql)
        except Exception as e:
            print(f"    Skipped item {item['row_index']}: {e}")

    print(f"    Created {len(items)} labeled items across {len(tasks)} tasks")

    return {
        "user_ids": user_ids,
        "job_id": job_id,
        "task_ids": task_ids,
    }


def seed_examples(sql_service, examples_dir: str = None):
    """Load examples from JSON files into Example Store.

    Args:
        sql_service: SQL service instance.
        examples_dir: Path to examples directory. Defaults to synthetic_data/examples.
    """
    import os
    from pathlib import Path

    if examples_dir is None:
        # Default to synthetic_data/examples relative to project root
        project_root = Path(__file__).parent.parent.parent
        examples_dir = project_root / "synthetic_data" / "examples"

    examples_dir = Path(examples_dir)
    if not examples_dir.exists():
        print(f"  Examples directory not found: {examples_dir}")
        return

    # Process each JSON file
    for json_file in examples_dir.glob("*.json"):
        print(f"  Loading examples from {json_file.name}...")

        try:
            with open(json_file) as f:
                data = json.load(f)
        except Exception as e:
            print(f"    Error reading {json_file.name}: {e}")
            continue

        domain = data.get("domain", "general")
        examples = data.get("examples", [])

        for i, ex in enumerate(examples):
            example_id = str(uuid.uuid4())

            # Extract fields
            input_data = json.dumps(ex.get("input", {}))
            output_data = json.dumps(ex.get("expected_output", {}))
            explanation = ex.get("explanation", "")
            difficulty = ex.get("difficulty", "medium")
            capability_tags = ex.get("capability_tags", [])
            search_keys = ex.get("search_keys", [])

            # Format arrays for SQL
            def sql_array(arr):
                if not arr:
                    return "NULL"
                items = ", ".join(f"'{escape_sql(str(v))}'" for v in arr)
                return f"ARRAY({items})"

            sql = f"""
            INSERT INTO example_store (
                example_id, version, input, expected_output, explanation,
                databit_id, domain, function_name, difficulty, capability_tags,
                search_keys, source, created_by, created_at, updated_at
            ) VALUES (
                '{example_id}',
                1,
                '{escape_sql(input_data)}',
                '{escape_sql(output_data)}',
                '{escape_sql(explanation)}',
                NULL,
                '{domain}',
                NULL,
                '{difficulty}',
                {sql_array(capability_tags)},
                {sql_array(search_keys)},
                'extracted_from_data',
                'demo_seed',
                current_timestamp(),
                current_timestamp()
            )
            """

            try:
                sql_service.execute_update(sql)
                print(f"    Created example {i + 1}/{len(examples)}: {explanation[:50]}...")
            except Exception as e:
                print(f"    Skipped example {i + 1}: {e}")


def main():
    """Main entry point."""
    print("\n=== Ontos ML Workbench Demo Data Seeder ===\n")

    try:
        sql_service = get_sql_service()
        print("Connected to Databricks SQL\n")
    except Exception as e:
        print(f"Error: Could not connect to database: {e}")
        print("Make sure DATABRICKS_HOST and DATABRICKS_TOKEN are set.")
        sys.exit(1)

    print("Creating sheets and assemblies (for Curate stage)...")
    sheet_ids, assembly_ids = seed_sheets_and_assemblies(sql_service)

    print("\nCreating labeling workflow (for Label stage)...")
    labeling_result = seed_labeling_workflow(sql_service, sheet_ids)

    print("\nCreating templates (legacy)...")
    template_ids = seed_templates(sql_service)

    print("\nCreating tools...")
    tool_ids = seed_tools(sql_service)

    print("\nCreating agents...")
    seed_agents(sql_service, tool_ids)

    print("\nCreating curation items (legacy)...")
    seed_curation_items(sql_service, template_ids)

    print("\nCreating Example Store examples...")
    seed_examples(sql_service)

    print("\n=== Demo data seeding complete! ===")
    print(f"\nCreated:")
    print(f"  - {len(sheet_ids)} sheets")
    print(f"  - {len(assembly_ids)} assemblies with 10 rows each")
    print(f"  - {len(labeling_result.get('user_ids', {}))} workspace users")
    print(f"  - 1 labeling job with {len(labeling_result.get('task_ids', []))} tasks")
    print(f"  - {len(template_ids)} templates")
    print(f"  - {len(tool_ids)} tools")
    print(f"\nYou can now test:")
    print(f"  - Curate stage: Select the 'Defect Detection Classifier' assembly")
    print(f"  - Label stage: View jobs with tasks assigned to demo users\n")


if __name__ == "__main__":
    main()
