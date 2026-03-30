import asyncio
import logging
import math
from random import randint
from secrets import token_urlsafe

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import delete, select

from chat_server.database.models import MessageTable, UserTable
from chat_server.exceptions import UserNotFound, UsernameAlreadyExists
from chat_server.schemas.user import UserCreate, UserUpdate, UsersPublic
from chat_server.security.utils import get_password_hash


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: int) -> UserTable | None:
        return await self._session.get(UserTable, user_id)

    async def get_by_username(self, username: str) -> UserTable | None:
        res = await self._session.execute(
            select(UserTable).where(UserTable.username == username)
        )
        return res.scalar_one_or_none()

    async def create(self, user_in: UserCreate) -> UserTable | None:
        user_db = UserTable(
            username=user_in.username,
            hashed_password=get_password_hash(user_in.password),
        )
        try:
            self._session.add(user_db)
            await self._session.commit()
            await self._session.refresh(user_db)
            logging.debug(f"Created user successfully: {user_db}")
            return user_db
        except IntegrityError:
            await self._session.rollback()
            logging.warning("Attempted to create user with existing username.")
            return None
        except Exception as e:
            await self._session.rollback()
            logging.warning(f"Failed to add a user: {e}")
            raise

    async def create_guest(self) -> UserTable:
        while True:
            num = str(randint(0, 9999)).zfill(4)
            guest_username = f"Guest{num}"
            if not await self.get_by_username(guest_username):
                break

        user_db = UserTable(
            username=guest_username,
            hashed_password=get_password_hash(token_urlsafe()),
            is_guest=True,
        )
        try:
            self._session.add(user_db)
            await self._session.commit()
            await self._session.refresh(user_db)
            logging.debug(f"Created guest user successfully: {user_db.username}")
            return user_db
        except Exception as e:
            await self._session.rollback()
            logging.warning(f"Failed to create guest user: {e}")
            raise

    async def update(self, user_id: int, user_upd: UserUpdate) -> UserTable:
        user = await self.get_by_id(user_id)

        if not user:
            raise UserNotFound("User not found")

        if user_upd.username:
            if await self.get_by_username(user_upd.username):
                raise UsernameAlreadyExists("Username in use")
            user.username = user_upd.username

        if user_upd.password:
            user.hashed_password = get_password_hash(user_upd.password)

        try:
            await self._session.commit()
            await self._session.refresh(user)
            return user
        except Exception as e:
            await self._session.rollback()
            logging.error(f"Failed to update user {user_id}: {e}", exc_info=True)
            raise

    async def delete(self, user_id: int) -> None:
        await self._session.execute(
            delete(UserTable).where(UserTable.id == user_id)
        )
        await self._session.commit()
        logging.info(f"Deleted user {user_id} from database.")

    async def get_paginated(
        self,
        page: int = 1,
        limit: int = 10,
        registered_only: bool = False,
        search: str | None = None,
    ) -> UsersPublic:
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
            self._session.scalars(users_stmt),
            self._session.scalar(count_stmt),
        )

        return UsersPublic(
            total_users=total_users or 0,
            total_pages=math.ceil((total_users or 0) / limit),
            users=users_result.all(),  # type: ignore
        )

    async def get_messages(
        self, user_id: int, offset: int = 0, limit: int = 10
    ) -> tuple[int, list[MessageTable]]:
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
            self._session.execute(count_stmt),
            self._session.scalars(messages_stmt),
        )

        return count_result.scalar(), messages_result.all()  # type: ignore
