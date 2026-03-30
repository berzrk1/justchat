import pytest
import pytest_asyncio
from chat_server.api.models import UserCreate
from chat_server.database import crud
from chat_server.protocol.messages import ChatSend
from chat_server.security.utils import get_password_hash, verify_password_hash


class TestGetUserByUsername:
    @pytest.mark.asyncio
    async def test_existing_user(self, test_session, user_create_obj):
        """
        Test should return an existing User.
        """
        user_data = user_create_obj
        user_db = await crud.create_user(test_session, user_data)

        assert user_db is not None, "Failure when creating a new user."

        user = await crud.get_user_by_username(test_session, user_db.username)

        assert user is not None, "A User object should have been returned."
        assert user.username == user_db.username


class TestGetUserById:
    @pytest.mark.asyncio
    async def test_existing_user(self, test_session, user_create_obj):
        """
        Test should return an existing User.
        """
        user_db = await crud.create_user(test_session, user_create_obj)

        assert user_db is not None, "Failure when creating a new user."

        user = await crud.get_user_by_id(test_session, user_db.id)

        assert user is not None, "A User object should have been returned."
        assert user.id == 1

    async def test_guest_user(self, test_session):
        guest_db = await crud.create_guest_user(test_session)

        get_guest = await crud.get_user_by_id(test_session, 1)

        assert get_guest is not None, "A user should have been returned."
        assert get_guest.username.startswith("Guest"), "Did not get a Guest User"


class TestCreateUser:
    # Test Create Successful User
    # Test Duplicate Username
    async def test_create_user(self, test_session, user_create_obj: UserCreate):
        user_created = await crud.create_user(test_session, user_create_obj)

        assert user_created is not None, "Failed to create a new user."

        assert user_created.username == user_create_obj.username, (
            "Username does not match"
        )
        assert verify_password_hash(
            user_create_obj.password, user_created.hashed_password
        ), "Password does not match the hashed password in database."
        assert user_created.is_guest is False, "User should not be a guest."

    async def test_duplicate_username(self, test_session, user_create_obj: UserCreate):
        user1 = await crud.create_user(test_session, user_create_obj)

        assert user1 is not None, "Failed to create a new user"

        user2 = await crud.create_user(test_session, user_create_obj)

        assert user2 is None, "A user with existing username should not exists."


class TestCreateGuestUser:
    # Test Guest user is created with is_guest flag
    async def test_is_guest(self, test_session):
        guest_created = await crud.create_guest_user(test_session)

        assert guest_created is not None, "Failed to create guest user."

        assert guest_created.is_guest, (
            "Guest account should have the flag is_guest as True"
        )
        assert guest_created.id == 1, "Guest accounts should have an ID"

    async def test_guest_username_starts_with_guest(self, test_session):
        guest_created = await crud.create_guest_user(test_session)

        assert guest_created is not None, "Failed to create guest user."
        assert guest_created.username.startswith("Guest"), (
            "Guests usernames should start with `Guest`"
        )


class TestCreateMessage:
    async def test_create_message_by_existing_user(
        self, test_session, user_create_obj, sample_chat_send: ChatSend
    ):
        user = await crud.create_user(test_session, user_create_obj)

        msg_db = await crud.create_message(test_session, sample_chat_send)

        assert msg_db is not None, "No message stored in the database."

    async def test_create_message_by_non_existing_user(
        self, test_session, sample_chat_send: ChatSend
    ):
        msg_db = await crud.create_message(test_session, sample_chat_send)

        assert msg_db is None, (
            "No message should be created if the sender does not exist."
        )

    async def test_create_message_stored_correctly(
        self, test_session, user_create_obj, sample_chat_send: ChatSend
    ):
        user = await crud.create_user(test_session, user_create_obj)

        msg_db = await crud.create_message(test_session, sample_chat_send)

        assert msg_db is not None, "No message stored in the database."
        assert msg_db.channel_id == sample_chat_send.payload.channel_id, (
            "Database contains different channel_id"
        )
        assert msg_db.content == sample_chat_send.payload.content, (
            "Database contains different content"
        )
        assert msg_db.sender_username == sample_chat_send.payload.sender.username, (
            "Database contains different username."
        )

        user_db = await crud.get_user_by_username(
            test_session, sample_chat_send.payload.sender.username
        )
        assert msg_db.sender_id == user_db.id, (
            "User that sent the message does not exist in the database."
        )
