"""Database model for RDF triples storage.

This table stores all RDF triples from ontologies, taxonomies, and semantic links,
making the database the source of truth for the knowledge graph.
"""
import uuid
from sqlalchemy import Column, String, Text, Boolean, TIMESTAMP, Index
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.sql import func

from src.common.database import Base


class RdfTripleDb(Base):
    """Stores RDF triples for the knowledge graph.
    
    Each row represents a single RDF triple (subject, predicate, object) with
    optional context (named graph) and metadata about its source.
    
    Uniqueness is enforced by a PostgreSQL index with NULLS NOT DISTINCT
    to properly handle NULL values in object_language and object_datatype.
    The index is created/managed by Alembic migration u1688q502ss5.
    """
    __tablename__ = "rdf_triples"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # RDF triple components
    subject_uri = Column(Text, nullable=False, index=True)
    predicate_uri = Column(Text, nullable=False, index=True)
    object_value = Column(Text, nullable=False)
    
    # Object type information
    object_is_uri = Column(Boolean, nullable=False, default=True)
    object_language = Column(String(10), nullable=True)  # e.g., "en", "de" for lang-tagged literals
    object_datatype = Column(Text, nullable=True)  # e.g., xsd:integer for typed literals
    
    # Named graph / context
    context_name = Column(Text, nullable=False, default='default', index=True)
    
    # Source tracking
    source_type = Column(String(20), nullable=True)  # file, upload, demo, link
    source_identifier = Column(Text, nullable=True)  # filename, model_id, entity info
    
    # Audit fields
    created_by = Column(String, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    # NOTE: The actual unique index is created via Alembic migration with:
    #   CREATE UNIQUE INDEX uq_rdf_triple_nulls_not_distinct ON rdf_triples (...)
    #   NULLS NOT DISTINCT
    # This is required because PostgreSQL treats NULL != NULL for uniqueness,
    # which would allow duplicate triples when object_language/object_datatype are NULL.
    # SQLAlchemy's UniqueConstraint/Index don't support NULLS NOT DISTINCT yet,
    # so we document it here for reference. The index name used in ON CONFLICT
    # operations in the repository is 'uq_rdf_triple_nulls_not_distinct'.
    __table_args__ = (
        # Composite index for SPO lookups (created by Alembic)
        Index('ix_rdf_triples_spo', 'subject_uri', 'predicate_uri', 'object_value'),
    )

    def __repr__(self):
        obj_display = self.object_value[:50] + '...' if len(self.object_value) > 50 else self.object_value
        return f"<RdfTripleDb(s='{self.subject_uri}', p='{self.predicate_uri}', o='{obj_display}')>"

