from sqlalchemy.orm import joinedload
import logging
from datetime import datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import select

from chat_server.database.models import MessageTable


class MessageRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        id: UUID,
        channel_id: int,
        sender_id: int,
        sender_username: str,
        content: str,
        timestamp: datetime,
    ) -> MessageTable:
        message_db = MessageTable(
            id=id,
            channel_id=channel_id,
            sender_id=sender_id,
            sender_username=sender_username,
            content=content,
            timestamp=timestamp,
        )
        try:
            self._session.add(message_db)
            await self._session.commit()
            await self._session.refresh(message_db)
            logging.debug(
                f"Created message in database successfully: {repr(message_db)}"
            )
            return message_db
        except Exception as e:
            await self._session.rollback()
            logging.error(f"Failed to create message in database: {e}")
            raise

    async def get_by_id(self, id: UUID) -> MessageTable | None:
        return await self._session.get(MessageTable, id)

    async def get_by_channel(
        self, channel_id: int, limit: int = 50, before_id: UUID | None = None
    ) -> list[MessageTable]:
        stmt = (
            select(MessageTable)
            .where(MessageTable.channel_id == channel_id)
            .order_by(MessageTable.timestamp.asc())
            .limit(limit)
        )
        if before_id is not None:
            subq = (
                select(MessageTable.timestamp)
                .where(MessageTable.id == before_id)
                .scalar_subquery()
            )
            stmt = stmt.where(MessageTable.timestamp < subq)

        res = await self._session.scalars(stmt)
        return list(res.all())

    async def get_channel_messages(self, channel_id: int) -> list[MessageTable] | None:
        """
        Retrive all messages stored from a channel.
        """
        stmt = (
            select(MessageTable)
            .where(MessageTable.channel_id == channel_id)
            .options(joinedload(MessageTable.reactions))
        )
        res = await self._session.execute(stmt)

        # I don't know why, but this is required after adding the eager load in this case
        res = res.unique()
        return list(res.scalars().all())
