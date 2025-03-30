import { Id } from "@/convex/_generated/dataModel";

// SSE constants
export const SSE_DATA_PREFIX = "data: " as const;
export const SSE_DONE_MESSAGE = "[DONE]" as const;
export const SSE_LINE_DELIMITER = "\n\n" as const;

export type MessageRole = "user" | "assistant";

export interface Message {
  role: MessageRole;
  content: string;
}
export interface ChatRequestBody {
  messages: Message[];
  newMessage: string;
  chatId: Id<"chats">;
}

export enum StreamMessageType {
  Token = "token",
  Error = "error",
  Connected = "connected",
  Done = "done",
  ToolStart = "tool_start",
  ToolEnd = "tool_end",
}

export interface BaseStreamMessage {
  type: StreamMessageType;
}

export interface TokenStreamMessage extends BaseStreamMessage {
  type: StreamMessageType.Token;
  token: string;
}

export interface ErrorStreamMessage extends BaseStreamMessage {
  type: StreamMessageType.Error;
  error: string;
}

export interface ConnectedStreamMessage extends BaseStreamMessage {
  type: StreamMessageType.Connected;
}

export interface DoneStreamMessage extends BaseStreamMessage {
  type: StreamMessageType.Done;
}

export interface ToolStartStreamMessage extends BaseStreamMessage {
  type: StreamMessageType.ToolStart;
  tool: string;
  input: unknown;
}

export interface ToolEndStreamMessage extends BaseStreamMessage {
  type: StreamMessageType.ToolEnd;
  tool: string;
  output: unknown;
}

export type StreamMessage =
  | TokenStreamMessage
  | ErrorStreamMessage
  | ConnectedStreamMessage
  | DoneStreamMessage
  | ToolStartStreamMessage
  | ToolEndStreamMessage;
