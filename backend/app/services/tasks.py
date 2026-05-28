import json
import logging
import re
import uuid

import fitz
import trafilatura
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.document import Document
from app.services.storage import download_file_from_s3, upload_json_to_s3


logger = logging.getLogger(__name__)


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _extract_pdf_text(s3_key: str) -> str:
    pdf_bytes = download_file_from_s3(s3_key)
    with fitz.open(stream=pdf_bytes, filetype="pdf") as pdf:
        page_text = [page.get_text() for page in pdf]

    return _normalize_text("\n\n".join(page_text))


def _extract_url_text(url: str) -> str:
    html = trafilatura.fetch_url(url)
    if not html:
        raise ValueError(f"Unable to fetch URL content: {url}")

    extracted = trafilatura.extract(html)
    if not extracted:
        raise ValueError(f"Unable to extract article text from URL: {url}")

    return _normalize_text(extracted)


@celery_app.task(name="app.services.tasks.process_document_task")
def process_document_task(document_id: str) -> None:
    db = SessionLocal()

    try:
        document_uuid = uuid.UUID(document_id)
        document = db.get(Document, document_uuid)
        if document is None:
            logger.error("Document %s was not found", document_id)
            return

        if document.status == "completed":
            logger.info("Document %s has already been processed", document_id)
            return

        document.status = "processing"
        db.commit()

        try:
            if document.source_type == "pdf":
                if not document.s3_key:
                    raise ValueError(f"PDF document {document_id} is missing an S3 key")
                extracted_text = _extract_pdf_text(document.s3_key)
            elif document.source_type == "url":
                if not document.source_url:
                    raise ValueError(f"URL document {document_id} is missing a source URL")
                extracted_text = _extract_url_text(document.source_url)
            else:
                raise ValueError(
                    f"Unsupported source type for document {document_id}: {document.source_type}"
                )

            splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=150,
                separators=["\n\n", "\n", " ", ""],
            )
            chunks = splitter.split_text(extracted_text)

            processed_key = f"processed/{document_id}_chunks.json"
            upload_json_to_s3(
                object_key=processed_key,
                payload={"document_id": document_id, "chunks": chunks},
            )

            document.status = "completed"
            db.commit()
        except Exception:
            logger.exception("Failed to process document %s", document_id)
            db.rollback()
            document = db.get(Document, document_uuid)
            if document is not None:
                document.status = "failed"
                db.commit()
            raise
    finally:
        db.close()
