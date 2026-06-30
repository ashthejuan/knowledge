import logging

from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.user import User
from app.services.graph_db_service import delete_user_graph
from app.services.llm import pinecone_index
from app.services.storage import delete_prefix_from_s3
from app.services.tasks import process_document_task


logger = logging.getLogger(__name__)


def revoke_user_document_processing(documents: list[Document]) -> None:
    """Stop queued/running ingestion jobs before removing their backing data."""
    for document in documents:
        if document.status in {"pending", "processing"}:
            process_document_task.AsyncResult(str(document.id)).revoke(terminate=True)


def delete_user_vectors(user_id: str) -> None:
    """Remove the user's entire Pinecone namespace, including orphaned vectors."""
    pinecone_index.delete(namespace=user_id, delete_all=True)


def delete_user_objects(user_id: str) -> None:
    """Remove all object-storage files under the user's tenant prefix."""
    delete_prefix_from_s3(f"users/{user_id}/")


def delete_account_data(db: Session, user_id: str) -> None:
    """Delete all account-owned data from external stores and SQL.

    External stores are cleaned before SQL rows are removed so a transient
    Pinecone, object storage, or Neo4j failure does not hide retryable data.
    """
    documents = db.query(Document).filter(Document.user_id == user_id).all()
    revoke_user_document_processing(documents)

    for document in documents:
        if document.status in {"pending", "processing"}:
            document.status = "cancelled"
    db.commit()

    delete_user_vectors(user_id)
    delete_user_objects(user_id)
    delete_user_graph(user_id)

    db.query(Document).filter(Document.user_id == user_id).delete(
        synchronize_session=False
    )

    user = db.get(User, user_id)
    if user is not None:
        db.delete(user)

    db.commit()
    logger.info("deleted account data", extra={"user_id": user_id})
