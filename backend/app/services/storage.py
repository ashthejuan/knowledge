import json
import os
from pathlib import Path

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


def upload_file_to_s3(
    file_bytes: bytes,
    object_key: str,
    content_type: str | None = None,
) -> str:
    """Upload raw file bytes to the documents bucket and return the S3 object key."""
    extra_args = {}
    if content_type:
        extra_args["ContentType"] = content_type

    s3_client.put_object(
        Bucket=S3_BUCKET_NAME,
        Key=object_key,
        Body=file_bytes,
        **extra_args,
    )

    return object_key


def download_file_from_s3(object_key: str) -> bytes:
    response = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=object_key)
    return response["Body"].read()


def upload_json_to_s3(object_key: str, payload: dict) -> str:
    s3_client.put_object(
        Bucket=S3_BUCKET_NAME,
        Key=object_key,
        Body=json.dumps(payload).encode("utf-8"),
        ContentType="application/json",
    )
    return object_key
