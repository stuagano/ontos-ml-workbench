"""Embedding generation service for Example Store.

Generates vector embeddings for examples using Databricks Foundation Model API
or falls back to local sentence-transformers for development.
"""

import logging
import os
from typing import Any

from app.core.config import get_settings
from app.core.databricks import get_workspace_client

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Generate embeddings for text content.

    Uses Databricks Foundation Model API when available, with fallback
    to sentence-transformers for local development.
    """

    # Supported embedding models and their dimensions
    MODEL_DIMENSIONS = {
        "databricks-bge-large-en": 1024,
        "databricks-gte-large-en": 1024,
        "databricks-e5-large-v2": 1024,
        "text-embedding-ada-002": 1536,
        "text-embedding-3-small": 1536,
        "text-embedding-3-large": 3072,
        # Local models (sentence-transformers)
        "BAAI/bge-large-en-v1.5": 1024,
        "BAAI/bge-base-en-v1.5": 768,
        "sentence-transformers/all-MiniLM-L6-v2": 384,
    }

    def __init__(self, model: str | None = None):
        """Initialize embedding service.

        Args:
            model: Embedding model to use. If None, uses EMBEDDING_MODEL env var
                   or defaults to databricks-bge-large-en.
        """
        self.settings = get_settings()
        self.model = model or os.getenv("EMBEDDING_MODEL", "databricks-bge-large-en")
        self._local_model = None
        self._use_local = False

        # Check if we should use local models
        if self.model.startswith("BAAI/") or self.model.startswith("sentence-transformers/"):
            self._use_local = True

    @property
    def dimension(self) -> int:
        """Get the embedding dimension for the current model."""
        return self.MODEL_DIMENSIONS.get(self.model, 1024)

    def _get_local_model(self):
        """Lazy load sentence-transformers model."""
        if self._local_model is None:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info(f"Loading local embedding model: {self.model}")
                self._local_model = SentenceTransformer(self.model)
            except ImportError:
                raise RuntimeError(
                    "sentence-transformers not installed. "
                    "Install with: pip install sentence-transformers"
                )
        return self._local_model

    def compute_embedding(self, text: str) -> list[float]:
        """Compute embedding for a single text.

        Args:
            text: Text to embed.

        Returns:
            List of floats representing the embedding vector.
        """
        if self._use_local:
            return self._compute_local_embedding(text)
        return self._compute_fmapi_embedding(text)

    def compute_embeddings_batch(
        self,
        texts: list[str],
        batch_size: int = 32
    ) -> list[list[float]]:
        """Compute embeddings for multiple texts.

        Args:
            texts: List of texts to embed.
            batch_size: Number of texts to process at once (for local models).

        Returns:
            List of embedding vectors.
        """
        if self._use_local:
            return self._compute_local_embeddings_batch(texts, batch_size)
        return self._compute_fmapi_embeddings_batch(texts)

    def _compute_fmapi_embedding(self, text: str) -> list[float]:
        """Compute embedding using Databricks Foundation Model API."""
        try:
            client = get_workspace_client()

            # Use the serving endpoints API for embeddings
            response = client.serving_endpoints.query(
                name=self.model,
                input=text,
            )

            # Extract embedding from response
            if hasattr(response, 'data') and response.data:
                return response.data[0].embedding
            elif hasattr(response, 'embedding'):
                return response.embedding
            else:
                raise ValueError(f"Unexpected response format: {response}")

        except Exception as e:
            logger.warning(f"FMAPI embedding failed, falling back to local: {e}")
            self._use_local = True
            self.model = "BAAI/bge-large-en-v1.5"
            return self._compute_local_embedding(text)

    def _compute_fmapi_embeddings_batch(self, texts: list[str]) -> list[list[float]]:
        """Compute embeddings using Databricks FMAPI (batch)."""
        try:
            client = get_workspace_client()

            # FMAPI supports batch requests
            response = client.serving_endpoints.query(
                name=self.model,
                input=texts,
            )

            if hasattr(response, 'data') and response.data:
                return [item.embedding for item in response.data]
            else:
                raise ValueError(f"Unexpected response format: {response}")

        except Exception as e:
            logger.warning(f"FMAPI batch embedding failed, falling back to local: {e}")
            self._use_local = True
            self.model = "BAAI/bge-large-en-v1.5"
            return self._compute_local_embeddings_batch(texts)

    def _compute_local_embedding(self, text: str) -> list[float]:
        """Compute embedding using local sentence-transformers."""
        model = self._get_local_model()
        embedding = model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    def _compute_local_embeddings_batch(
        self,
        texts: list[str],
        batch_size: int = 32
    ) -> list[list[float]]:
        """Compute embeddings using local sentence-transformers (batch)."""
        model = self._get_local_model()
        embeddings = model.encode(
            texts,
            batch_size=batch_size,
            convert_to_numpy=True,
            show_progress_bar=len(texts) > 100,
        )
        return embeddings.tolist()

    def embed_example_input(self, example_input: dict[str, Any]) -> list[float]:
        """Generate embedding for an example's input.

        Converts the input dict to a searchable text representation,
        then computes the embedding.

        Args:
            example_input: The input field of an example (dict).

        Returns:
            Embedding vector.
        """
        # Convert dict to text for embedding
        text = self._dict_to_text(example_input)
        return self.compute_embedding(text)

    def embed_search_keys(self, search_keys: list[str]) -> list[float]:
        """Generate embedding from search keys.

        Args:
            search_keys: List of semantic search keys.

        Returns:
            Embedding vector (average of key embeddings).
        """
        if not search_keys:
            raise ValueError("search_keys cannot be empty")

        # Combine search keys into a single text
        combined_text = " ".join(search_keys)
        return self.compute_embedding(combined_text)

    def _dict_to_text(self, d: dict[str, Any], prefix: str = "") -> str:
        """Convert a dictionary to searchable text.

        Recursively flattens nested dicts and formats for embedding.
        """
        parts = []
        for key, value in d.items():
            if isinstance(value, dict):
                nested = self._dict_to_text(value, f"{prefix}{key}.")
                parts.append(nested)
            elif isinstance(value, list):
                list_text = ", ".join(str(v) for v in value)
                parts.append(f"{prefix}{key}: {list_text}")
            else:
                parts.append(f"{prefix}{key}: {value}")
        return " | ".join(parts)


# Singleton instance
_embedding_service: EmbeddingService | None = None


def get_embedding_service(model: str | None = None) -> EmbeddingService:
    """Get or create embedding service singleton.

    Args:
        model: Optional model override. If None, uses default.

    Returns:
        EmbeddingService instance.
    """
    global _embedding_service
    if _embedding_service is None or (model and _embedding_service.model != model):
        _embedding_service = EmbeddingService(model)
    return _embedding_service


def compute_embedding(text: str, model: str | None = None) -> list[float]:
    """Convenience function to compute a single embedding.

    Args:
        text: Text to embed.
        model: Optional model override.

    Returns:
        Embedding vector.
    """
    service = get_embedding_service(model)
    return service.compute_embedding(text)


def compute_embeddings_batch(
    texts: list[str],
    model: str | None = None
) -> list[list[float]]:
    """Convenience function to compute batch embeddings.

    Args:
        texts: List of texts to embed.
        model: Optional model override.

    Returns:
        List of embedding vectors.
    """
    service = get_embedding_service(model)
    return service.compute_embeddings_batch(texts)
