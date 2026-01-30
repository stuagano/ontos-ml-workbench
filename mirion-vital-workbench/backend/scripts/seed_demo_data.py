#!/usr/bin/env python3
"""
Seed demo data for Databits Workbench.

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


def main():
    """Main entry point."""
    print("\n=== Databits Workbench Demo Data Seeder ===\n")

    try:
        sql_service = get_sql_service()
        print("Connected to Databricks SQL\n")
    except Exception as e:
        print(f"Error: Could not connect to database: {e}")
        print("Make sure DATABRICKS_HOST and DATABRICKS_TOKEN are set.")
        sys.exit(1)

    print("Creating templates...")
    template_ids = seed_templates(sql_service)

    print("\nCreating tools...")
    tool_ids = seed_tools(sql_service)

    print("\nCreating agents...")
    seed_agents(sql_service, tool_ids)

    print("\nCreating curation items...")
    seed_curation_items(sql_service, template_ids)

    print("\n=== Demo data seeding complete! ===\n")


if __name__ == "__main__":
    main()
