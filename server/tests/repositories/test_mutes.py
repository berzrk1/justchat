import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from chat_server.database.repositories.mutes import MuteRepository
from chat_server.database.repositories.users import UserRepository
from chat_server.schemas.user import UserCreate


@pytest.fixture
def repo(session: AsyncSession) -> MuteRepository:
    return MuteRepository(session)


@pytest.fixture
async def users(session: AsyncSession):
    user_repo = UserRepository(session)
    target = await user_repo.create(UserCreate(username="target", password="Password1"))
    mod = await user_repo.create(UserCreate(username="mod", password="Password1"))
    return target, mod


class TestCreate:
    async def test_creates_mute(self, repo: MuteRepository, users) -> None:
        target, mod = users
        await repo.create(target.id, mod.id, channel_id=1)
        mute = await repo.get(target.id, channel_id=1)
        assert mute is not None
        assert mute.target_id == target.id
        assert mute.by_id == mod.id

    async def test_stores_reason(self, repo: MuteRepository, users) -> None:
        target, mod = users
        await repo.create(target.id, mod.id, channel_id=1, reason="spamming")
        mute = await repo.get(target.id, channel_id=1)
        assert mute is not None
        assert mute.reason == "spamming"

    async def test_mutes_are_channel_scoped(self, repo: MuteRepository, users) -> None:
        target, mod = users
        await repo.create(target.id, mod.id, channel_id=1)
        await repo.create(target.id, mod.id, channel_id=2)
        assert await repo.get(target.id, channel_id=1) is not None
        assert await repo.get(target.id, channel_id=2) is not None


class TestGet:
    async def test_returns_none_when_not_muted(self, repo: MuteRepository, users) -> None:
        target, _ = users
        assert await repo.get(target.id, channel_id=1) is None

    async def test_returns_none_for_different_channel(self, repo: MuteRepository, users) -> None:
        target, mod = users
        await repo.create(target.id, mod.id, channel_id=1)
        assert await repo.get(target.id, channel_id=2) is None

    async def test_returns_none_for_different_user(self, repo: MuteRepository, users) -> None:
        target, mod = users
        await repo.create(target.id, mod.id, channel_id=1)
        assert await repo.get(mod.id, channel_id=1) is None


class TestDelete:
    async def test_removes_existing_mute(self, repo: MuteRepository, users) -> None:
        target, mod = users
        await repo.create(target.id, mod.id, channel_id=1)
        await repo.delete(target.id, channel_id=1)
        assert await repo.get(target.id, channel_id=1) is None

    async def test_nonexistent_is_idempotent(self, repo: MuteRepository, users) -> None:
        target, _ = users
        await repo.delete(target.id, channel_id=1)  # must not raise

    async def test_only_removes_target_channel(self, repo: MuteRepository, users) -> None:
        target, mod = users
        await repo.create(target.id, mod.id, channel_id=1)
        await repo.create(target.id, mod.id, channel_id=2)
        await repo.delete(target.id, channel_id=1)
        assert await repo.get(target.id, channel_id=1) is None
        assert await repo.get(target.id, channel_id=2) is not None
