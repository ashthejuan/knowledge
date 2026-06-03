"""add user_id to documents for multi-tenancy

Revision ID: a1b2c3d4e5f6
Revises: 5cbd94f882b4
Create Date: 2026-06-02 16:00:00.000000

"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "5cbd94f882b4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add the tenant boundary column. A temporary server_default backfills any
    # pre-existing single-tenant rows so the NOT NULL constraint can be applied
    # without failure; the default is then dropped so the application layer is
    # the sole authority for populating user_id on future inserts.
    op.add_column(
        "documents",
        sa.Column(
            "user_id",
            sa.String(),
            nullable=False,
            server_default="legacy",
        ),
    )
    op.alter_column("documents", "user_id", server_default=None)
    op.create_index(
        op.f("ix_documents_user_id"), "documents", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_documents_user_id"), table_name="documents")
    op.drop_column("documents", "user_id")
