import {
  SSE_DONE_MESSAGE,
  StreamMessageType,
  SSE_DATA_PREFIX,
  StreamMessage,
} from "./types";

/**
 * Create a parser for Server-Sent Events (SSE) streams.
 * SSE allows real-time updates from server to client
 * @returns
 */
export const createSSEParser = () => {
  let buffer = "";
  let accumulatedResponse = ""; // Tích lũy nội dung AI trả lời

  const parse = (chunk: string): string | null => {
    const lines = (buffer + chunk).split("\n");
    buffer = lines.pop() || ""; // Lưu lại dòng chưa hoàn chỉnh nếu có

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine.startsWith("data: ")) continue;
      
      const jsonString = trimmedLine.substring(6);
      console.log({jsonString})
      if (jsonString === "[DONE]") {
        const finalResponse = accumulatedResponse.trim();
        accumulatedResponse = ""; // Reset lại
        return finalResponse; // Trả về câu trả lời đầy đủ
      }
      
      try {
        const parsed = JSON.parse(jsonString);
        if (parsed.type === "token" && parsed.token) {
          accumulatedResponse += parsed.token;
        }
      } catch (error) {
        console.error("Lỗi khi parse SSE message:", error);
      }
    }
    return null; // Chưa hoàn thành phản hồi
  };

  return { parse };
};


