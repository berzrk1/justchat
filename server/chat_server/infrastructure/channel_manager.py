import logging
from chat_server.connection.channel import Channel


class ChannelManager:
    """
    Repository for Channel entities.

    Currently store channels in-memory.
    """

    def __init__(self) -> None:
        # Keep track of Channels using their IDs
        self._channels: dict[int, Channel] = {}

    def add(self, channel: Channel) -> Channel:
        """
        Add a new channel.
        """
        self._channels[channel.id] = channel
        logging.debug(f"Added channel: {repr(channel)}")
        return channel

    def remove(self, channel_id: int) -> Channel | None:
        """
        Remove a channel.

        Returns the Channel if it exists.
        """
        channel = self._channels.pop(channel_id, None)
        if channel:
            logging.info(f"Removed channel: {repr(channel)}")
        return channel

    def get(self, channel_id: int) -> Channel | None:
        """
        Retrive a channel by ID.
        """
        return self._channels.get(channel_id)

    def exists(self, channel_id: int) -> bool:
        """
        Check if a channel exists.
        """
        return channel_id in self._channels
