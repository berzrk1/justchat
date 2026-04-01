import logging
from datetime import timedelta

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import select

from chat_server.database.models import MuteTable


class MuteRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def mute(
        self,
        target_id: int,
        by_id: int,
        channel_id: int,
        duration: int | None = None,
        reason: str = "",
    ) -> None:
        mute_db = MuteTable(
            target_id=target_id,
            by_id=by_id,
            channel_id=channel_id,
            reason=reason,
            expires_at=func.now() + timedelta(seconds=duration) if duration else None,
        )
        try:
            self._session.add(mute_db)
            await self._session.commit()
            await self._session.refresh(mute_db)
            logging.debug(f"Mute logged: {mute_db}")
        except Exception as e:
            await self._session.rollback()
            logging.error(f"Failed to mute user: {e}")
            raise

    async def is_muted(self, target_id: int, channel_id: int) -> MuteTable | None:
        stmt = select(MuteTable).where(
            MuteTable.target_id == target_id,
            MuteTable.channel_id == channel_id,
            (MuteTable.expires_at.is_(None)) | (MuteTable.expires_at > func.now()),
        )
        res = await self._session.execute(stmt)
        return res.scalar_one_or_none()

    async def unmute(self, target_id: int, channel_id: int) -> None:
        mute_db = await self.is_muted(target_id, channel_id)
        if mute_db:
            try:
                await self._session.delete(mute_db)
                await self._session.commit()
                logging.debug(f"Unmuted user {target_id} in channel {channel_id}.")
            except Exception as e:
                await self._session.rollback()
                logging.error(f"Failed to unmute user in database: {e}")
                raise
