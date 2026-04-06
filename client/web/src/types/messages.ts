export const MessageType = {
  HELLO: "hello",
  ERROR: "error",
  CHAT_SEND: "chat_send",
  REACT: "chat_react",
  REACT_ADD: "chat_react_add",
  REACT_REMOVE: "chat_react_remove",
  TYPING_START: "chat_typing",
  CHAT_KICK: "chat_kick",
  CHAT_MUTE: "chat_mute",
  CHAT_UNMUTE: "chat_unmute",
  CHANNEL_JOIN: "channel_join",
  CHANNEL_LEAVE: "channel_leave",
  CHANNEL_MEMBERS: "channel_members",
  // Future types go here
} as const;

export type MessageTypeValue = typeof MessageType[keyof typeof MessageType];

export interface BaseMessage {
  type: MessageTypeValue;
  timestamp: string;
  id?: string; // Changed from correlation_id to id to match backend
  payload: any;
}

// User information object (matches backend UserFrom)
export interface UserFrom {
  username: string;
  is_guest: boolean;
}

// Hello (Client → Server: send token only, no username)
export interface HelloPayloadClientToServer {
  token?: string; // Optional JWT token for authentication
}

export interface HelloMessageClientToServer extends BaseMessage {
  type: typeof MessageType.HELLO;
  payload: HelloPayloadClientToServer;
}

// Hello (Server → Client: returns user info, especially for guests)
export interface HelloPayloadServerToClient {
  token?: string;
  user?: UserFrom; // Server returns the assigned username
}

export interface HelloMessageServerToClient extends BaseMessage {
  type: typeof MessageType.HELLO;
  payload: HelloPayloadServerToClient;
}

// Chat Send (Client → Server)
export interface ChatSendPayloadClientToServer {
  channel_id: number;
  content: string;
}

export interface ChatSendMessageClientToServer extends BaseMessage {
  type: typeof MessageType.CHAT_SEND;
  payload: ChatSendPayloadClientToServer;
}

// Chat Send (Server → Client: broadcasts to channel with sender info)
export interface ChatSendPayloadServerToClient {
  channel_id: number;
  sender?: UserFrom; // User who sent the message
  content: string;
  reactions?: Record<string, number> | null;
}

export interface ChatSendMessageServerToClient extends BaseMessage {
  type: typeof MessageType.CHAT_SEND;
  payload: ChatSendPayloadServerToClient;
}

// Channel Join (Client → Server)
export interface ChannelJoinPayloadClientToServer {
  channel_id: number;
  user?: UserFrom; // Optional user info
}

export interface ChannelJoinMessageClientToServer extends BaseMessage {
  type: typeof MessageType.CHANNEL_JOIN;
  payload: ChannelJoinPayloadClientToServer;
}

// Channel Join (Server → Client: broadcasts when user joins)
export interface ChannelJoinPayloadServerToClient {
  channel_id: number;
  user?: UserFrom; // User who joined
}

export interface ChannelJoinMessageServerToClient extends BaseMessage {
  type: typeof MessageType.CHANNEL_JOIN;
  payload: ChannelJoinPayloadServerToClient;
}

// Channel Leave (Client → Server)
export interface ChannelLeavePayloadClientToServer {
  channel_id: number;
}

export interface ChannelLeaveMessageClientToServer extends BaseMessage {
  type: typeof MessageType.CHANNEL_LEAVE;
  payload: ChannelLeavePayloadClientToServer;
}

// Channel Leave (Server → Client: broadcasts when user leaves)
export interface ChannelLeavePayloadServerToClient {
  channel_id: number;
  user?: UserFrom; // User who left
}

export interface ChannelLeaveMessageServerToClient extends BaseMessage {
  type: typeof MessageType.CHANNEL_LEAVE;
  payload: ChannelLeavePayloadServerToClient;
}

// Error (server sends this)
export interface ErrorPayload {
  detail: string;
}

export interface ErrorMessage extends BaseMessage {
  type: typeof MessageType.ERROR;
  payload: ErrorPayload;
}

// Reactions (Client → Server)
export interface ReactPayloadClientToServer {
  emote: string;
  message_id: string;
  channel_id: number;
}

export interface ReactMessageClientToServer extends BaseMessage {
  type: typeof MessageType.REACT;
  payload: ReactPayloadClientToServer;
}

// kept for type completeness — server still sends these as responses
export interface ReactAddMessageClientToServer extends BaseMessage {
  type: typeof MessageType.REACT_ADD;
  payload: ReactPayloadClientToServer;
}

export interface ReactRemoveMessageClientToServer extends BaseMessage {
  type: typeof MessageType.REACT_REMOVE;
  payload: ReactPayloadClientToServer;
}

// Reactions (Server → Client: broadcasts to channel)
export interface ReactPayloadServerToClient {
  emote: string;
  message_id: string;
  channel_id: number;
}

export interface ReactAddMessageServerToClient extends BaseMessage {
  type: typeof MessageType.REACT_ADD;
  payload: ReactPayloadServerToClient;
}

export interface ReactRemoveMessageServerToClient extends BaseMessage {
  type: typeof MessageType.REACT_REMOVE;
  payload: ReactPayloadServerToClient;
}

// Channel Members (Server → Client: sent when member list changes)
export interface ChannelMembersPayload {
  channel_id: number;
  members: UserFrom[];
}

export interface ChannelMembersMessage extends BaseMessage {
  type: typeof MessageType.CHANNEL_MEMBERS;
  payload: ChannelMembersPayload;
}

// Typing Start (Client → Server)
export interface TypingStartPayloadClientToServer {
  channel_id: number;
}

export interface TypingStartMessageClientToServer extends BaseMessage {
  type: typeof MessageType.TYPING_START;
  payload: TypingStartPayloadClientToServer;
}

// Typing Start (Server → Client: broadcasts when user starts typing)
export interface TypingStartPayloadServerToClient {
  channel_id: number;
  user?: UserFrom; // User who is typing
}

export interface TypingStartMessageServerToClient extends BaseMessage {
  type: typeof MessageType.TYPING_START;
  payload: TypingStartPayloadServerToClient;
}

// Chat Kick Command (Client → Server)
export interface ChatKickPayloadClientToServer {
  channel_id: number;
  target: string; // Username to kick
  reason?: string; // Optional reason
}

export interface ChatKickMessageClientToServer extends BaseMessage {
  type: typeof MessageType.CHAT_KICK;
  payload: ChatKickPayloadClientToServer;
}

// Chat Kick (Server → Client: broadcasts when user is kicked)
export interface ChatKickPayloadServerToClient {
  channel_id: number;
  target: string; // Username who was kicked
  reason?: string; // Optional reason
}

export interface ChatKickMessageServerToClient extends BaseMessage {
  type: typeof MessageType.CHAT_KICK;
  payload: ChatKickPayloadServerToClient;
}

// Chat Mute Command (Client → Server)
export interface ChatMutePayloadClientToServer {
  channel_id: number;
  target: string; // Username to mute
  duration?: number; // Duration in seconds (optional)
  reason?: string; // Optional reason
}

export interface ChatMuteMessageClientToServer extends BaseMessage {
  type: typeof MessageType.CHAT_MUTE;
  payload: ChatMutePayloadClientToServer;
}

// Chat Mute (Server → Client: broadcasts when user is muted)
export interface ChatMutePayloadServerToClient {
  channel_id: number;
  target: string; // Username who was muted
  duration?: number; // Duration in seconds
  reason?: string; // Optional reason
}

export interface ChatMuteMessageServerToClient extends BaseMessage {
  type: typeof MessageType.CHAT_MUTE;
  payload: ChatMutePayloadServerToClient;
}

// Chat Unmute Command (Client → Server)
export interface ChatUnmutePayloadClientToServer {
  channel_id: number;
  target: string; // Username to unmute
}

export interface ChatUnmuteMessageClientToServer extends BaseMessage {
  type: typeof MessageType.CHAT_UNMUTE;
  payload: ChatUnmutePayloadClientToServer;
}

// Chat Unmute (Server → Client: broadcasts when user is unmuted)
export interface ChatUnmutePayloadServerToClient {
  channel_id: number;
  target: string; // Username who was unmuted
}

export interface ChatUnmuteMessageServerToClient extends BaseMessage {
  type: typeof MessageType.CHAT_UNMUTE;
  payload: ChatUnmutePayloadServerToClient;
}

// Union type for messages received from server
export type Message =
  | HelloMessageServerToClient
  | ChatSendMessageServerToClient
  | ChannelJoinMessageServerToClient
  | ChannelLeaveMessageServerToClient
  | ErrorMessage
  | ReactAddMessageServerToClient
  | ReactRemoveMessageServerToClient
  | ChannelMembersMessage
  | TypingStartMessageServerToClient
  | ChatKickMessageServerToClient
  | ChatMuteMessageServerToClient
  | ChatUnmuteMessageServerToClient;
