import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, HttpUrl
from sqlalchemy.orm import Session

from app.core.security import CurrentUser
from app.db.session import get_db
from app.models.document import Document
from app.services.document_cleanup import (
    delete_document_graph,
    delete_document_objects,
    delete_document_vectors,
)
from app.services.storage import build_document_key, upload_file_to_s3
from app.services.tasks import process_document_task


router = APIRouter(prefix="/api/ingest", tags=["ingest"])

DbSession = Annotated[Session, Depends(get_db)]
PdfUpload = Annotated[UploadFile, File()]


class URLIngestRequest(BaseModel):
    url: HttpUrl


class IngestResponse(BaseModel):
    document_id: uuid.UUID
    status: str


class IngestStatusResponse(BaseModel):
    id: uuid.UUID
    status: str
    source_type: str
    filename: str | None = None


class DocumentListItem(BaseModel):
    id: uuid.UUID
    status: str
    source_type: str
    filename: str | None = None
    source_url: str | None = None
    created_at: str
    updated_at: str


class DocumentActionResponse(BaseModel):
    id: uuid.UUID
    status: str


def enqueue_document_processing(document_id: uuid.UUID, user_id: str) -> None:
    process_document_task.apply_async(
        args=[str(document_id), user_id],
        task_id=str(document_id),
    )


def revoke_document_processing(document_id: uuid.UUID) -> None:
    process_document_task.AsyncResult(str(document_id)).revoke(terminate=True)


def get_user_document(
    document_id: uuid.UUID, db: DbSession, user_id: CurrentUser
) -> Document:
    document = (
        db.query(Document)
        .filter(Document.id == document_id, Document.user_id == user_id)
        .first()
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    return document


@router.post(
    "/pdf",
    response_model=IngestResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def ingest_pdf(file: PdfUpload, db: DbSession, user_id: CurrentUser) -> IngestResponse:
    filename = file.filename or ""
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a .pdf extension",
        )

    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have an application/pdf MIME type",
        )

    document_id = uuid.uuid4()
    s3_key = build_document_key(user_id, str(document_id), extension="pdf")
    file_bytes = file.file.read()

    upload_file_to_s3(
        file_bytes=file_bytes,
        object_key=s3_key,
        content_type="application/pdf",
    )

    document = Document(
        id=document_id,
        user_id=user_id,
        filename=filename,
        source_type="pdf",
        s3_key=s3_key,
        status="pending",
    )
    db.add(document)
    db.commit()

    enqueue_document_processing(document_id, user_id)

    return IngestResponse(document_id=document_id, status="processing_queued")


@router.get(
    "/status/{document_id}",
    response_model=IngestStatusResponse,
)
def get_ingest_status(
    document_id: uuid.UUID, db: DbSession, user_id: CurrentUser
) -> IngestStatusResponse:
    document = get_user_document(document_id, db, user_id)

    return IngestStatusResponse(
        id=document.id,
        status=document.status,
        source_type=document.source_type,
        filename=document.filename,
    )


@router.get("/documents", response_model=list[DocumentListItem])
def list_ingested_documents(
    db: DbSession, user_id: CurrentUser
) -> list[DocumentListItem]:
    documents = (
        db.query(Document)
        .filter(Document.user_id == user_id)
        .order_by(Document.created_at.desc())
        .all()
    )

    return [
        DocumentListItem(
            id=document.id,
            status=document.status,
            source_type=document.source_type,
            filename=document.filename,
            source_url=document.source_url,
            created_at=document.created_at.isoformat(),
            updated_at=document.updated_at.isoformat(),
        )
        for document in documents
    ]


@router.patch(
    "/documents/{document_id}/cancel",
    response_model=DocumentActionResponse,
)
def cancel_ingested_document(
    document_id: uuid.UUID, db: DbSession, user_id: CurrentUser
) -> DocumentActionResponse:
    document = get_user_document(document_id, db, user_id)
    if document.status not in {"pending", "processing"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only pending or processing documents can be cancelled",
        )

    revoke_document_processing(document.id)
    document.status = "cancelled"
    db.commit()

    return DocumentActionResponse(id=document.id, status=document.status)


@router.delete(
    "/documents/{document_id}",
    response_model=DocumentActionResponse,
)
def delete_ingested_document(
    document_id: uuid.UUID, db: DbSession, user_id: CurrentUser
) -> DocumentActionResponse:
    document = get_user_document(document_id, db, user_id)
    revoke_document_processing(document.id)

    if document.status in {"pending", "processing"}:
        document.status = "cancelled"
        db.commit()
        db.refresh(document)

    try:
        delete_document_vectors(str(document.id), user_id)
        delete_document_objects(user_id, str(document.id), document.s3_key)
        delete_document_graph(str(document.id), user_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Document cleanup failed; nothing was removed from SQL",
        ) from exc

    response = DocumentActionResponse(id=document.id, status="deleted")
    db.delete(document)
    db.commit()

    return response


@router.post(
    "/url",
    response_model=IngestResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def ingest_url(
    payload: URLIngestRequest, db: DbSession, user_id: CurrentUser
) -> IngestResponse:
    document_id = uuid.uuid4()

    document = Document(
        id=document_id,
        user_id=user_id,
        filename=None,
        source_type="url",
        source_url=str(payload.url),
        s3_key=None,
        status="pending",
    )
    db.add(document)
    db.commit()

    enqueue_document_processing(document_id, user_id)

    return IngestResponse(document_id=document_id, status="processing_queued")
