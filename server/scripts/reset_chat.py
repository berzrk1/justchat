#!/usr/bin/python3

# This script resets the chat to an initial state
import logging
import os
import sys
from secrets import choice
from typing import Any
from urllib.parse import quote

from dotenv import load_dotenv
from pydantic import PostgresDsn
from sqlalchemy import create_engine
from sqlalchemy.sql import text

load_dotenv()
# Environment Variables
POSTGRES_USER = os.getenv("POSTGRES_USER")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
POSTGRES_DB = os.getenv("POSTGRES_DB")
POSTGRES_HOST = os.getenv("POSTGRES_HOST")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", 5432))

POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
if ENVIRONMENT == "production":
    import boto3

    AWS_REGION_NAME = os.getenv("AWS_REGION_NAME")
    auth_token = boto3.client(
        "rds", region_name=AWS_REGION_NAME
    ).generate_db_auth_token(
        DBHostname=POSTGRES_HOST,
        DBUsername=POSTGRES_USER,
        Port=POSTGRES_PORT,
        Region=AWS_REGION_NAME,
    )
    POSTGRES_PASSWORD = quote(auth_token, safe="")

DATABASE_URL = PostgresDsn.build(
    scheme="postgresql+psycopg",
    username=POSTGRES_USER,
    password=POSTGRES_PASSWORD,
    host=POSTGRES_HOST,
    port=POSTGRES_PORT,
    path=POSTGRES_DB,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)

logger = logging.getLogger(__name__)


engine = create_engine(str(DATABASE_URL))
if ENVIRONMENT == "production":
    ssl = {"sslmode": "verify-full", "sslrootcert": "/certs/global-bundle.pem"}
    engine = create_engine(str(DATABASE_URL), connect_args=ssl)


def checkdb():
    """Check if the connection to database was successful."""
    try:
        with engine.connect():
            logger.info("Connected to database")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        sys.exit(1)


def delete_users():
    """Delete all users from the database, except for admin."""
    try:
        with engine.connect() as conn:
            result = conn.execute(
                text('DELETE FROM "user" WHERE username != :admin'),
                {"admin": "admin"},
            )
            logging.info(f"Successfully deleted {result.rowcount} users.")
            conn.commit()
    except Exception as e:
        logger.error(f"Failed to delete users from database: {e}")
        sys.exit(2)


def delete_messages():
    """Delete all messages from the database."""
    try:
        with engine.connect() as conn:
            result = conn.execute(text('DELETE FROM "messages"'))
            logging.info(f"Successfully deleted {result.rowcount} messages.")
            conn.commit()
    except Exception as e:
        logger.error(f"Failed to delete messages from database: {e}")
        sys.exit(3)


def create_users() -> dict[int, str]:
    """Create some users."""
    try:
        users = [
            {"username": "Alice", "password": "456"},
            {"username": "Bob", "password": "789"},
            {"username": "Charlie", "password": "123"},
        ]
        created = {}
        with engine.connect() as conn:
            logging.info("Creating new users.")
            for user in users:
                result = conn.execute(
                    text(
                        'INSERT INTO "user" (username, hashed_password, created_at, is_guest) \
                        VALUES (:username, :password, NOW(), false) RETURNING id, username'
                    ),
                    user,
                )
                # created[result.scalar()] = user["username"]
                row = result.fetchone()
                created[row.id] = row.username  # type: ignore
            conn.commit()
            logging.info("Created new users successfully")
            return created
    except Exception as e:
        logger.error(f"Failed to create users: {e}")
        sys.exit(3)


def generate_messages(n_messages: int, users: dict[int, str]) -> list[dict[Any, Any]]:
    """Generate random messages from random users and in random channels."""
    sample_messages = [
        "Hello",
        "Anybody out there ?",
        "Sup",
        "hello world",
        "I am not a bot, I swear!",
        "This is not an automated message",
    ]

    users_list = list(users.items())
    channels = list(range(1, 5))
    messages = [
        {
            "channel_id": choice(channels),
            "sender_id": (user := choice(users_list))[0],
            "sender_username": user[1],
            "content": choice(sample_messages),
        },
    ]
    messages = []
    for _ in range(n_messages):
        messages.append(
            {
                "channel_id": choice(channels),
                "sender_id": (user := choice(users_list))[0],
                "sender_username": user[1],
                "content": choice(sample_messages),
            }
        )
    return messages


def create_messages(users: dict[int, str]):
    """Create messages by `ids`."""
    try:
        with engine.connect() as conn:
            messages = generate_messages(20, users)
            for message in messages:
                conn.execute(
                    text(
                        'INSERT INTO "messages" (id, channel_id, sender_id, sender_username, timestamp, content) VALUES (gen_random_uuid(),:channel_id, :sender_id, :sender_username, NOW(), :content)'
                    ),
                    message,
                )
            conn.commit()
            logging.info("Created new messages successfully")
    except Exception as e:
        logger.error(f"Failed to create messages: {e}")
        sys.exit(4)


def main():
    checkdb()
    delete_messages()
    delete_users()
    users = create_users()
    create_messages(users)

    logger.info("Chat reset completed successfully")


if __name__ == "__main__":
    main()
