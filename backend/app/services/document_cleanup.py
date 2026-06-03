import logging

from app.services.llm import pinecone_index
from app.services.storage import build_processed_key, delete_file_from_s3


logger = logging.getLogger(__name__)


def delete_document_vectors(document_id: str, user_id: str) -> None:
    """Remove all Pinecone vectors for one document inside the user's namespace."""
    pinecone_index.delete(
        namespace=user_id,
        filter={"document_id": {"$eq": document_id}},
    )


def delete_document_objects(
    user_id: str, document_id: str, raw_object_key: str | None
) -> None:
    """Delete raw and processed MinIO objects for a document."""
    keys = [key for key in [raw_object_key, build_processed_key(user_id, document_id)] if key]

    for key in keys:
        try:
            delete_file_from_s3(key)
        except Exception:
            logger.exception("Failed to delete document object %s", key)
            raise
