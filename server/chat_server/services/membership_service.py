import logging
from chat_server.connection.channel import Channel
from chat_server.connection.user import User


class MembershipService:
    """
    Manage the User and Channel relation.

    Keep track of "who" is connected to "where".
    """

    def __init__(self) -> None:
        self._channel_members: dict[Channel, set[User]] = {}
        self._user_channels: dict[User, set[Channel]] = {}

    def join(self, user: User, channel: Channel) -> None:
        """
        Join a User to a Channel.
        """
        logging.info(f"{repr(user)} is joining {repr(channel)}")

        if channel not in self._channel_members:
            self._channel_members[channel] = set()
        self._channel_members[channel].add(user)

        if user not in self._user_channels:
            self._user_channels[user] = set()
        self._user_channels[user].add(channel)

        logging.debug(f"Join: {self._channel_members = }")
        logging.debug(f"Join: {self._user_channels = }")

    def leave(self, user: User, channel: Channel) -> None:
        """
        Remove a User from a Channel.
        """
        logging.info(f"{repr(user)} is leaving {repr(channel)}")

        if channel in self._channel_members:
            self._channel_members[channel].discard(user)

        if user in self._user_channels:
            self._user_channels[user].discard(channel)

        logging.debug(f"Leave: {self._channel_members = }")
        logging.debug(f"Leave: {self._user_channels = }")

    def get_channel_members(self, channel: Channel) -> set[User]:
        """
        Get all Users members of a Channel.
        """
        return self._channel_members.get(channel, set()).copy()

    def get_user_channels(self, user: User) -> set[Channel]:
        """
        Get all Channels a User is connected to.
        """
        return self._user_channels.get(user, set()).copy()

    def get_channels_in_use(self) -> list[Channel]:
        """
        Returns a list with all the Channels in use (at least 1 user online)
        """
        return [ch for ch, users in self._channel_members.items() if users]

    def is_member(self, user: User, channel: Channel) -> bool:
        """
        Check if User is member of a Channel.
        """
        return channel in self._user_channels.get(user, set())

    def leave_all(self, user: User) -> set[Channel]:
        """
        Remove a User from all of its connected Channels

        Returns all Channels the User was disconnected from.
        """
        channels = self.get_user_channels(user)

        for channel in channels:
            self.leave(user, channel)
        return channels
