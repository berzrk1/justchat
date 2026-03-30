import asyncio
import logging
import math
from datetime import timedelta

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import delete, select

from chat_server.api.models import UserCreate, UserUpdate, UsersPublic
from chat_server.exceptions import UserNotFound, UsernameAlreadyExists
from chat_server.db.models import MessageTable, MuteTable, UserTable
from chat_server.protocol.messages import ChatSend
from chat_server.security.utils import get_password_hash


async def create_user(session: AsyncSession, user_in: UserCreate) -> UserTable | None:
    """
    Create an User in the database. Returns the User created.
    """
    user_db = UserTable(
        username=user_in.username, hashed_password=get_password_hash(user_in.password)
    )

    try:
        session.add(user_db)
        await session.commit()
        await session.refresh(user_db)
        logging.debug(f"Created user successfully: {user_db}")
        return user_db
    except IntegrityError:
        await session.rollback()
        logging.warning("Attempted to create user with existing username.")
    except Exception as e:
        await session.rollback()
        logging.warning(f"Failed to add a user: {e}")
        raise e


async def create_guest_user(session: AsyncSession) -> UserTable:
    """
    Create a Guest user which consists of a username like GuestXXXX (4 random numbers),
    and "no password" (technically its just a random password).

    This user is deleted after 1 day.
    """
    from random import randint
    from secrets import token_urlsafe

    while True:
        num = str(randint(0, 9999)).zfill(4)
        guest_username = "Guest" + num

        if not await get_user_by_username(session, guest_username):
            break

    guest_password = token_urlsafe()

    user_db = UserTable(
        username=guest_username,
        hashed_password=get_password_hash(guest_password),
        is_guest=True,
    )

    try:
        session.add(user_db)
        await session.commit()
        await session.refresh(user_db)
        logging.debug(f"Created guest user successfully: {user_db.username}")
        return user_db
    except Exception as e:
        await session.rollback()
        logging.warning(f"Failed to create guest user: {e}")
        raise e


async def get_user_by_username(
    session: AsyncSession, username: str
) -> UserTable | None:
    """
    Retrieve an User from the database using a username. Returns None if not found.
    """
    res = await session.execute(select(UserTable).where(UserTable.username == username))
    return res.scalar_one_or_none()


async def get_user_by_id(session: AsyncSession, id: int) -> UserTable | None:
    """
    Retrieve an User from the database using an ID. Returns None if not found.
    """
    return await session.get(UserTable, id)


async def get_users_paginated(
    session: AsyncSession,
    page: int = 1,
    limit: int = 10,
    registered_only: bool = False,
    search: str | None = None,
) -> UsersPublic:
    """
    Retrive a paginated list of users
    """

    offset = (page - 1) * limit
    users_stmt = (
        select(UserTable).order_by(UserTable.username).limit(limit).offset(offset)
    )
    count_stmt = select(func.count()).select_from(UserTable)

    if registered_only:
        users_stmt = users_stmt.where(UserTable.is_guest.is_(False))
        count_stmt = count_stmt.where(UserTable.is_guest.is_(False))
    if search:
        users_stmt = users_stmt.where(UserTable.username.ilike(f"%{search}%"))
        count_stmt = count_stmt.where(UserTable.username.ilike(f"%{search}%"))

    users_result, total_users = await asyncio.gather(
        session.scalars(users_stmt),
        session.scalar(count_stmt),
    )

    return UsersPublic(
        total_users=total_users or 0,
        total_pages=math.ceil((total_users or 0) / limit),
        users=users_result.all(),  # type: ignore
    )


async def get_user_messages(
    session: AsyncSession, user_id: int, offset: int = 0, limit: int = 10
) -> tuple[int, list[MessageTable]]:
    """
    Retrieve messages sent by an user
    """
    count_stmt = select(func.count(MessageTable.id)).where(
        MessageTable.sender_id == user_id
    )
    messages_stmt = (
        select(MessageTable)
        .where(MessageTable.sender_id == user_id)
        .offset(offset)
        .limit(limit)
    )

    count_result, messages_result = await asyncio.gather(
        session.execute(count_stmt),
        session.scalars(messages_stmt),
    )

    return count_result.scalar(), messages_result.all()  # type: ignore


async def update_user(
    session: AsyncSession, user_id: int, user_upd: UserUpdate
) -> UserTable | None:
    """
    Update user information

    Raises UsernameAlreadyExists
    Raises UserNotFound
    """

    try:
        user = await get_user_by_id(session, user_id)

        if not user:
            raise UserNotFound("User not found")

        if user_upd.username:
            if await get_user_by_username(session, user_upd.username):
                raise UsernameAlreadyExists("Username in use")
            user.username = user_upd.username
        if user_upd.password:
            user.hashed_password = get_password_hash(user_upd.password)

        await session.commit()
        await session.refresh(user)
        return user
    except Exception as e:
        logging.error(
            f"An unexpected error occured while updating user {user_id}: {e}",
            exc_info=True,
        )
        await session.rollback()
        raise e


async def delete_user_by_id(session: AsyncSession, user_id: int):
    """
    Delete user using their ID
    """
    stmt = delete(UserTable).where(UserTable.id == user_id)
    await session.execute(stmt)
    logging.info(f"Deleted {user_id} from database.")
    await session.commit()


async def create_message(
    session: AsyncSession, message: ChatSend
) -> MessageTable | None:
    """
    Store a message in the database.
    """
    user_db = await get_user_by_username(session, message.payload.sender.username)  # type: ignore
    if not user_db:
        return None
    sender_id = user_db.id
    sender_username = message.payload.sender.username  # type: ignore
    channel_id = message.payload.channel_id
    timestamp = message.timestamp

    message_db = MessageTable(
        id=message.id,
        channel_id=channel_id,
        sender_id=sender_id,
        sender_username=sender_username,
        timestamp=timestamp,
        content=message.payload.content,
    )

    try:
        session.add(message_db)
        await session.commit()
        await session.refresh(message_db)
        logging.debug(f"Created message in database successfully: {repr(message_db)}")
        return message_db
    except Exception as e:
        await session.rollback()
        logging.error(f"Failed to create message in database: {e}")
        raise e


async def get_channel_messages(
    session: AsyncSession, channel_id: int
) -> list[MessageTable] | None:
    """
    Retrive all messages stored from a channel.
    """
    stmt = select(MessageTable).where(MessageTable.channel_id == channel_id)
    res = await session.execute(stmt)
    return list(res.scalars().all())


async def mute_user(
    session: AsyncSession,
    target_id: int,
    by_id: int,
    channel_id: int,
    duration: int | None = None,
    reason: str = "",
):
    """
    Store mute in database
    """
    try:
        mute_db = MuteTable(
            target_id=target_id,
            by_id=by_id,
            channel_id=channel_id,
            expires_at=func.now() + timedelta(seconds=duration) if duration else None,
            reason=reason,
        )

        session.add(mute_db)
        await session.commit()
        await session.refresh(mute_db)
        logging.info(f"Mute logged: {mute_db}")
    except Exception as e:
        await session.rollback()
        logging.error(f"Failed to mute user: {e}")
        raise e


async def get_mute(
    session: AsyncSession, target_id: int, channel_id: int
) -> MuteTable | None:
    """
    Check if `target_id` is muted in `channel_id`.
    """
    stmt = select(MuteTable).where(
        MuteTable.target_id == target_id,
        MuteTable.channel_id == channel_id,
        (MuteTable.expires_at.is_(None)) | (MuteTable.expires_at > func.now()),
    )
    res = await session.execute(stmt)
    return res.scalar_one_or_none()


async def unmute_user(session: AsyncSession, target_id: int, channel_id: int):
    """
    Unmute a user.
    """
    try:
        mute_db = await get_mute(session, target_id, channel_id)
        if mute_db:
            await session.delete(mute_db)
            await session.commit()
            logging.info("Unmuted")
    except Exception as e:
        logging.error(f"Failed to unmute user in database: {e}")
        raise
