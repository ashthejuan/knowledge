import asyncio
import os
from pathlib import Path
from uuid import uuid4

import boto3
from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[2] / ".env")

S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "documents")

s3_client = boto3.client(
    "s3",
    endpoint_url=os.getenv("S3_ENDPOINT_URL"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION", "us-east-1"),
)


async def upload_file_to_s3(file_bytes: bytes, filename: str) -> str:
    """Upload raw file bytes to the documents bucket and return the S3 object key."""
    safe_filename = Path(filename).name or "upload"
    object_key = f"{uuid4().hex}_{safe_filename}"

    await asyncio.to_thread(
        s3_client.put_object,
        Bucket=S3_BUCKET_NAME,
        Key=object_key,
        Body=file_bytes,
    )

    return object_key
