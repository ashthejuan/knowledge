import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, HttpUrl
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.document import Document
from app.services.storage import upload_file_to_s3
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


@router.post(
    "/pdf",
    response_model=IngestResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def ingest_pdf(file: PdfUpload, db: DbSession) -> IngestResponse:
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
    s3_key = f"pdfs/{document_id}.pdf"
    file_bytes = file.file.read()

    upload_file_to_s3(
        file_bytes=file_bytes,
        object_key=s3_key,
        content_type="application/pdf",
    )

    document = Document(
        id=document_id,
        filename=filename,
        source_type="pdf",
        s3_key=s3_key,
        status="pending",
    )
    db.add(document)
    db.commit()

    process_document_task.delay(str(document_id))

    return IngestResponse(document_id=document_id, status="processing_queued")


@router.get(
    "/status/{document_id}",
    response_model=IngestStatusResponse,
)
def get_ingest_status(document_id: uuid.UUID, db: DbSession) -> IngestStatusResponse:
    document = db.query(Document).filter(Document.id == document_id).first()

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    return IngestStatusResponse(
        id=document.id,
        status=document.status,
        source_type=document.source_type,
        filename=document.filename,
    )


@router.post(
    "/url",
    response_model=IngestResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def ingest_url(payload: URLIngestRequest, db: DbSession) -> IngestResponse:
    document_id = uuid.uuid4()

    document = Document(
        id=document_id,
        filename=None,
        source_type="url",
        source_url=str(payload.url),
        s3_key=None,
        status="pending",
    )
    db.add(document)
    db.commit()

    process_document_task.delay(str(document_id))

    return IngestResponse(document_id=document_id, status="processing_queued")
