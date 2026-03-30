import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from chat_server.database.repositories.users import UserRepository
from chat_server.exceptions import UserNotFound, UsernameAlreadyExists
from chat_server.schemas.user import UserCreate, UserUpdate


@pytest.fixture
def repo(session: AsyncSession) -> UserRepository:
    return UserRepository(session)


@pytest.fixture
async def user(repo: UserRepository):
    return await repo.create(UserCreate(username="testuser", password="Password1"))


class TestCreate:
    async def test_creates_user(self, repo: UserRepository) -> None:
        user = await repo.create(UserCreate(username="alice", password="Password1"))
        assert user is not None
        assert user.username == "alice"
        assert user.is_guest is False

    async def test_hashes_password(self, repo: UserRepository) -> None:
        user = await repo.create(UserCreate(username="alice", password="Password1"))
        assert user is not None
        assert user.hashed_password != "Password1"

    async def test_duplicate_username_returns_none(self, repo: UserRepository) -> None:
        await repo.create(UserCreate(username="alice", password="Password1"))
        result = await repo.create(UserCreate(username="alice", password="Password1"))
        assert result is None


class TestCreateGuest:
    async def test_creates_guest_user(self, repo: UserRepository) -> None:
        guest = await repo.create_guest()
        assert guest.is_guest is True
        assert guest.username.startswith("Guest")

    async def test_guest_username_is_unique(self, repo: UserRepository) -> None:
        g1 = await repo.create_guest()
        g2 = await repo.create_guest()
        assert g1.username != g2.username


class TestGetById:
    async def test_returns_existing_user(self, repo: UserRepository, user) -> None:
        found = await repo.get_by_id(user.id)
        assert found is not None
        assert found.id == user.id

    async def test_returns_none_for_missing_id(self, repo: UserRepository) -> None:
        assert await repo.get_by_id(99999) is None


class TestGetByUsername:
    async def test_returns_existing_user(self, repo: UserRepository, user) -> None:
        found = await repo.get_by_username(user.username)
        assert found is not None
        assert found.username == user.username

    async def test_returns_none_for_unknown_username(self, repo: UserRepository) -> None:
        assert await repo.get_by_username("nobody") is None


class TestUpdate:
    async def test_updates_username(self, repo: UserRepository, user) -> None:
        updated = await repo.update(user.id, UserUpdate(username="newname"))
        assert updated.username == "newname"

    async def test_updates_password(self, repo: UserRepository, user) -> None:
        old_hash = user.hashed_password
        updated = await repo.update(user.id, UserUpdate(password="NewPassword1"))
        assert updated.hashed_password != old_hash

    async def test_raises_user_not_found(self, repo: UserRepository) -> None:
        with pytest.raises(UserNotFound):
            await repo.update(99999, UserUpdate(username="nobody"))

    async def test_raises_on_duplicate_username(self, repo: UserRepository, user) -> None:
        other = await repo.create(UserCreate(username="other", password="Password1"))
        assert other is not None
        with pytest.raises(UsernameAlreadyExists):
            await repo.update(user.id, UserUpdate(username=other.username))


class TestDelete:
    async def test_removes_user(self, repo: UserRepository, user) -> None:
        await repo.delete(user.id)
        assert await repo.get_by_id(user.id) is None

    async def test_nonexistent_is_idempotent(self, repo: UserRepository) -> None:
        await repo.delete(99999)  # must not raise


class TestGetPaginated:
    async def test_returns_all_users(self, repo: UserRepository) -> None:
        await repo.create(UserCreate(username="alice", password="Password1"))
        await repo.create(UserCreate(username="bob", password="Password1"))
        result = await repo.get_paginated()
        assert result.total_users == 2
        assert len(result.users) == 2

    async def test_pagination_limits_results(self, repo: UserRepository) -> None:
        for i in range(5):
            await repo.create(UserCreate(username=f"user{i}", password="Password1"))
        result = await repo.get_paginated(page=1, limit=2)
        assert len(result.users) == 2
        assert result.total_pages == 3

    async def test_second_page(self, repo: UserRepository) -> None:
        for i in range(4):
            await repo.create(UserCreate(username=f"user{i}", password="Password1"))
        page1 = await repo.get_paginated(page=1, limit=2)
        page2 = await repo.get_paginated(page=2, limit=2)
        ids_p1 = {u.id for u in page1.users}
        ids_p2 = {u.id for u in page2.users}
        assert ids_p1.isdisjoint(ids_p2)

    async def test_registered_only_excludes_guests(self, repo: UserRepository) -> None:
        await repo.create(UserCreate(username="reg", password="Password1"))
        await repo.create_guest()
        result = await repo.get_paginated(registered_only=True)
        assert result.total_users == 1
        assert all(not u.is_guest for u in result.users)

    async def test_search_filters_by_username(self, repo: UserRepository) -> None:
        await repo.create(UserCreate(username="alice", password="Password1"))
        await repo.create(UserCreate(username="bob", password="Password1"))
        result = await repo.get_paginated(search="ali")
        assert result.total_users == 1
        assert result.users[0].username == "alice"

    async def test_empty_db_returns_zero(self, repo: UserRepository) -> None:
        result = await repo.get_paginated()
        assert result.total_users == 0
        assert result.total_pages == 0
        assert result.users == []


class TestGetMessages:
    async def test_returns_empty_for_new_user(self, repo: UserRepository, user) -> None:
        count, messages = await repo.get_messages(user.id)
        assert count == 0
        assert messages == []
