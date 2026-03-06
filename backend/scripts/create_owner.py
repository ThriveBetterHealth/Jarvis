#!/usr/bin/env python3
"""
One-time script to create the owner user account.
Run inside the backend container:
  docker compose exec backend python scripts/create_owner.py --email you@example.com --password secret --name "Andy Jackson"
"""

import asyncio
import argparse
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


async def create_owner(email: str, password: str, name: str):
    from core.database import AsyncSessionLocal
    from core.security import hash_password
    from models.user import User, UserRole
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        # Check if user already exists
        result = await db.execute(select(User).where(User.email == email.lower()))
        existing = result.scalar_one_or_none()
        if existing:
            print(f"User {email} already exists.")
            return

        user = User(
            email=email.lower(),
            password_hash=hash_password(password),
            full_name=name,
            role=UserRole.OWNER,
            is_active=True,
            preferences={},
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        print(f"Owner account created: {user.email} (ID: {user.id})")


def main():
    parser = argparse.ArgumentParser(description="Create Jarvis owner account")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--name", required=True)
    args = parser.parse_args()

    asyncio.run(create_owner(args.email, args.password, args.name))


if __name__ == "__main__":
    main()
