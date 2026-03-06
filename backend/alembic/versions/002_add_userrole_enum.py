"""Add userrole enum type and migrate users.role column

Revision ID: 002
Revises: 001
Create Date: 2026-03-06
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None

# The enum values must match models/user.py UserRole exactly
USERROLE_ENUM = postgresql.ENUM(
    "owner", "user", "read_only",
    name="userrole",
    create_type=False,  # we create it manually below
)


def upgrade() -> None:
    # 1. Create the PostgreSQL enum type
    op.execute("CREATE TYPE userrole AS ENUM ('owner', 'user', 'read_only')")

    # 2. Alter the column from VARCHAR to the enum type
    #    USING casts the existing string values to the enum
    op.execute(
        "ALTER TABLE users ALTER COLUMN role TYPE userrole "
        "USING role::userrole"
    )

    # 3. Set the column default to the enum value
    op.execute(
        "ALTER TABLE users ALTER COLUMN role SET DEFAULT 'owner'::userrole"
    )


def downgrade() -> None:
    # Revert column back to VARCHAR
    op.execute(
        "ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20) "
        "USING role::VARCHAR"
    )
    op.execute(
        "ALTER TABLE users ALTER COLUMN role SET DEFAULT 'owner'"
    )
    # Drop the enum type
    op.execute("DROP TYPE userrole")
