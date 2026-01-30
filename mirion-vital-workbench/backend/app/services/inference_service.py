"""
Inference Service for Databricks Foundation Model API (FMAPI).

Handles AI generation for sheet columns, including:
- Building prompts with {{column_name}} variable substitution
- Collecting few-shot examples from manually-edited cells
- Calling FMAPI for text and multimodal generation
- Processing Volume file paths for image inputs
"""

import base64
import json
import logging
import re
from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.databricks import get_workspace_client

logger = logging.getLogger(__name__)


@dataclass
class FewShotExample:
    """A few-shot example from a manually-edited cell."""

    input_values: dict[str, Any]  # Column name -> value for this row
    output_value: Any  # The human-provided label/value


@dataclass
class GenerationResult:
    """Result of a single cell generation."""

    row_index: int
    column_id: str
    value: Any
    success: bool
    error: str | None = None


class InferenceService:
    """Service for AI inference via Databricks FMAPI."""

    # Default model for text generation
    DEFAULT_TEXT_MODEL = "databricks-meta-llama-3-3-70b-instruct"
    # Default model for multimodal (vision) generation
    DEFAULT_VISION_MODEL = "databricks-meta-llama-3-2-90b-vision-instruct"

    def __init__(self):
        self.settings = get_settings()
        self._client = None

    def _get_client(self) -> httpx.Client:
        """Get or create HTTP client for FMAPI calls."""
        if self._client is None:
            workspace_client = get_workspace_client()
            # Get the host and token from workspace client config
            host = workspace_client.config.host
            token = workspace_client.config.token

            self._client = httpx.Client(
                base_url=f"{host}/serving-endpoints",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                timeout=120.0,  # Long timeout for model inference
            )
        return self._client

    def _substitute_variables(self, template: str, row_data: dict[str, Any]) -> str:
        """
        Substitute {{column_name}} variables in a prompt template.

        Args:
            template: Prompt template with {{variable}} placeholders
            row_data: Dictionary of column_name -> value for the current row

        Returns:
            Prompt with variables substituted
        """

        def replace_var(match):
            var_name = match.group(1).strip()
            if var_name in row_data:
                value = row_data[var_name]
                # Handle None values
                if value is None:
                    return "[empty]"
                return str(value)
            else:
                logger.warning(f"Variable '{var_name}' not found in row data")
                return f"[missing: {var_name}]"

        # Match {{variable_name}} pattern
        pattern = r"\{\{([^}]+)\}\}"
        return re.sub(pattern, replace_var, template)

    def _build_few_shot_prompt(
        self,
        base_prompt: str,
        examples: list[FewShotExample],
        current_row: dict[str, Any],
    ) -> str:
        """
        Build a prompt that includes few-shot examples.

        Args:
            base_prompt: The user's prompt template
            examples: List of few-shot examples from manual edits
            current_row: The row to generate for

        Returns:
            Complete prompt with examples
        """
        if not examples:
            # No examples, just substitute variables
            return self._substitute_variables(base_prompt, current_row)

        # Build few-shot section
        examples_text = "Here are some examples of correct outputs:\n\n"
        for i, ex in enumerate(examples, 1):
            # Substitute variables for the example's input
            example_prompt = self._substitute_variables(base_prompt, ex.input_values)
            examples_text += f"Example {i}:\n"
            examples_text += f"Input: {example_prompt}\n"
            examples_text += f"Output: {ex.output_value}\n\n"

        # Build the full prompt
        current_prompt = self._substitute_variables(base_prompt, current_row)

        full_prompt = f"""{examples_text}
Now, following the same pattern as the examples above, provide the output for:

Input: {current_prompt}
Output:"""

        return full_prompt

    def _is_image_column(self, value: Any) -> bool:
        """Check if a value appears to be an image path."""
        if not isinstance(value, str):
            return False
        # Check for Volume paths or common image extensions
        return value.startswith("/Volumes/") and any(
            value.lower().endswith(ext)
            for ext in [".jpg", ".jpeg", ".png", ".gif", ".webp"]
        )

    def _load_image_from_volume(self, volume_path: str) -> str | None:
        """
        Load an image from a Unity Catalog Volume and return base64 encoded.

        Args:
            volume_path: Path like /Volumes/catalog/schema/volume/file.jpg

        Returns:
            Base64 encoded image data, or None if failed
        """
        try:
            workspace_client = get_workspace_client()

            # Read file from volume using Files API
            # Volume paths need to be converted: /Volumes/cat/schema/vol/file -> /cat/schema/vol/file
            api_path = volume_path.replace("/Volumes/", "/")

            response = workspace_client.files.download(f"/Volumes{api_path}")
            image_bytes = response.read()

            return base64.b64encode(image_bytes).decode("utf-8")
        except Exception as e:
            logger.error(f"Failed to load image from volume {volume_path}: {e}")
            return None

    def _detect_image_columns(self, row_data: dict[str, Any]) -> list[str]:
        """Find columns that contain image paths."""
        return [
            col_name
            for col_name, value in row_data.items()
            if self._is_image_column(value)
        ]

    async def generate_cell(
        self,
        prompt_template: str,
        system_prompt: str | None,
        row_data: dict[str, Any],
        examples: list[FewShotExample],
        model: str | None = None,
        temperature: float = 0.1,
        max_tokens: int = 1024,
    ) -> str:
        """
        Generate a value for a single cell.

        Args:
            prompt_template: Prompt with {{column}} variables
            system_prompt: Optional system prompt
            row_data: Column values for this row
            examples: Few-shot examples from manual edits
            model: Model to use (auto-detected if None)
            temperature: Generation temperature
            max_tokens: Maximum tokens to generate

        Returns:
            Generated value as string
        """
        # Check for image columns to decide on model
        image_columns = self._detect_image_columns(row_data)
        use_vision = len(image_columns) > 0

        # Select model
        if model:
            selected_model = model
        else:
            selected_model = (
                self.DEFAULT_VISION_MODEL if use_vision else self.DEFAULT_TEXT_MODEL
            )

        # Build the prompt with few-shot examples
        user_prompt = self._build_few_shot_prompt(prompt_template, examples, row_data)

        # Build messages
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        # For vision models, we need to structure content differently
        if use_vision and image_columns:
            # Build multimodal content
            content_parts = []

            # Add text prompt
            content_parts.append(
                {
                    "type": "text",
                    "text": user_prompt,
                }
            )

            # Add images
            for col_name in image_columns:
                image_path = row_data[col_name]
                image_b64 = self._load_image_from_volume(image_path)
                if image_b64:
                    # Determine media type
                    if image_path.lower().endswith(".png"):
                        media_type = "image/png"
                    elif image_path.lower().endswith(".gif"):
                        media_type = "image/gif"
                    elif image_path.lower().endswith(".webp"):
                        media_type = "image/webp"
                    else:
                        media_type = "image/jpeg"

                    content_parts.append(
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{media_type};base64,{image_b64}"
                            },
                        }
                    )
                else:
                    content_parts.append(
                        {
                            "type": "text",
                            "text": f"[Image could not be loaded: {image_path}]",
                        }
                    )

            messages.append({"role": "user", "content": content_parts})
        else:
            # Text-only
            messages.append({"role": "user", "content": user_prompt})

        # Call FMAPI
        client = self._get_client()

        payload = {
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        logger.info(f"Calling FMAPI model {selected_model}")

        response = client.post(
            f"/{selected_model}/invocations",
            json=payload,
        )
        response.raise_for_status()

        result = response.json()

        # Extract the generated text
        if "choices" in result and len(result["choices"]) > 0:
            return result["choices"][0]["message"]["content"].strip()
        else:
            raise ValueError(f"Unexpected FMAPI response format: {result}")

    async def generate_batch(
        self,
        prompt_template: str,
        system_prompt: str | None,
        rows: list[dict[str, Any]],
        examples: list[FewShotExample],
        column_id: str,
        model: str | None = None,
        temperature: float = 0.1,
        max_tokens: int = 1024,
    ) -> list[GenerationResult]:
        """
        Generate values for multiple rows.

        Args:
            prompt_template: Prompt with {{column}} variables
            system_prompt: Optional system prompt
            rows: List of row data dicts (must include 'row_index')
            examples: Few-shot examples from manual edits
            column_id: ID of the column being generated
            model: Model to use
            temperature: Generation temperature
            max_tokens: Maximum tokens to generate

        Returns:
            List of GenerationResult objects
        """
        results = []

        for row in rows:
            row_index = row.get("row_index", 0)
            try:
                value = await self.generate_cell(
                    prompt_template=prompt_template,
                    system_prompt=system_prompt,
                    row_data=row,
                    examples=examples,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                results.append(
                    GenerationResult(
                        row_index=row_index,
                        column_id=column_id,
                        value=value,
                        success=True,
                    )
                )
            except Exception as e:
                logger.error(f"Generation failed for row {row_index}: {e}")
                results.append(
                    GenerationResult(
                        row_index=row_index,
                        column_id=column_id,
                        value=None,
                        success=False,
                        error=str(e),
                    )
                )

        return results


# Singleton instance
_inference_service: InferenceService | None = None


def get_inference_service() -> InferenceService:
    """Get the singleton inference service instance."""
    global _inference_service
    if _inference_service is None:
        _inference_service = InferenceService()
    return _inference_service
