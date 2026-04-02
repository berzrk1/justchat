from fastapi import Depends
from typing import AsyncGenerator, Annotated
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.sql import insert, select
from sqlalchemy import event
from chat_server.database.models import UserTable
from chat_server.security.utils import get_password_hash
from chat_server.settings import settings

if settings.is_development:
    async_engine = create_async_engine(str(settings.DATABASE_URL))
else:
    ssl = {"sslmode": "verify-full", "sslrootcert": "/certs/global-bundle.pem"}
    async_engine = create_async_engine(str(settings.DATABASE_URL), connect_args=ssl)


async_session = async_sessionmaker(async_engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides an async database session.
    """
    async with async_session() as session:
        yield session


DBSession = Annotated[AsyncSession, Depends(get_db)]


async def init_db() -> None:
    """Creates all database tables."""
    async with async_engine.begin() as conn:
        res = await conn.execute(
            select(UserTable).where(UserTable.username == settings.SUPERUSER_USERNAME)
        )
        if res.scalar_one_or_none() is None:
            await conn.execute(
                insert(UserTable).values(
                    username=settings.SUPERUSER_USERNAME,
                    hashed_password=get_password_hash(settings.SUPERUSER_PASSWORD),
                )
            )


if settings.is_production:

    @event.listens_for(async_engine.engine, "do_connect")
    def provide_token(dialect, conn_rec, cargs, cparams):
        cparams["password"] = settings.get_authentication_token()
