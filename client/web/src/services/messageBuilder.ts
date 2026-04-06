import { MessageType } from '../types/messages';
import type {
  HelloMessageClientToServer,
  ChatSendMessageClientToServer,
  ChannelJoinMessageClientToServer,
  ChannelLeaveMessageClientToServer,
  ReactMessageClientToServer,
  TypingStartMessageClientToServer,
  ChatKickMessageClientToServer,
  ChatMuteMessageClientToServer,
  ChatUnmuteMessageClientToServer,
} from '../types/messages';

export class MessageBuilder {
  /**
   * Build HELLO message (Client → Server).
   * Server will respond with HELLO containing assigned username for guests.
   */
  static hello(token?: string): HelloMessageClientToServer {
    return {
      type: MessageType.HELLO,
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID(),
      payload: {
        ...(token && { token }), // Include token only if provided
      },
    };
  }

  /**
   * Build CHAT_SEND message (Client → Server).
   * Server will broadcast to channel with sender info.
   */
  static chatSend(channelId: number, content: string): ChatSendMessageClientToServer {
    return {
      type: MessageType.CHAT_SEND,
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID(),
      payload: {
        channel_id: channelId,
        content: content,
      },
    };
  }

  /**
   * Build CHANNEL_JOIN message (Client → Server).
   * Server will broadcast join notification to channel members.
   */
  static channelJoin(channelId: number): ChannelJoinMessageClientToServer {
    return {
      type: MessageType.CHANNEL_JOIN,
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID(),
      payload: {
        channel_id: channelId,
      },
    };
  }

  /**
   * Build REACT message (Client → Server).
   * Backend handles add/remove/toggle logic.
   */
  static react(channelId: number, messageId: string, emote: string): ReactMessageClientToServer {
    return {
      type: MessageType.REACT,
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID(),
      payload: {
        channel_id: channelId,
        message_id: messageId,
        emote: emote,
      },
    };
  }

  /**
   * Build TYPING_START message (Client → Server).
   * Notify server that user started typing in a channel.
   */
  static typingStart(channelId: number): TypingStartMessageClientToServer {
    return {
      type: MessageType.TYPING_START,
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID(),
      payload: {
        channel_id: channelId,
      },
    };
  }

  /**
   * Build CHAT_KICK message (Client → Server).
   * Kick a user from a channel.
   */
  static chatKick(channelId: number, target: string, reason?: string): ChatKickMessageClientToServer {
    return {
      type: MessageType.CHAT_KICK,
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID(),
      payload: {
        channel_id: channelId,
        target: target,
        ...(reason && { reason }), // Include reason only if provided
      },
    };
  }

  /**
   * Build CHAT_MUTE message (Client → Server).
   * Mute a user in a channel.
   */
  static chatMute(channelId: number, target: string, duration?: number, reason?: string): ChatMuteMessageClientToServer {
    return {
      type: MessageType.CHAT_MUTE,
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID(),
      payload: {
        channel_id: channelId,
        target: target,
        ...(duration !== undefined && { duration }), // Include duration only if provided
        ...(reason && { reason }), // Include reason only if provided
      },
    };
  }

  /**
   * Build CHAT_UNMUTE message (Client → Server).
   * Unmute a user in a channel.
   */
  static chatUnmute(channelId: number, target: string): ChatUnmuteMessageClientToServer {
    return {
      type: MessageType.CHAT_UNMUTE,
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID(),
      payload: {
        channel_id: channelId,
        target: target,
      },
    };
  }

  /**
   * Build CHANNEL_LEAVE message (Client → Server).
   * Leave a channel.
   */
  static channelLeave(channelId: number): ChannelLeaveMessageClientToServer {
    return {
      type: MessageType.CHANNEL_LEAVE,
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID(),
      payload: {
        channel_id: channelId,
      },
    };
  }
}
