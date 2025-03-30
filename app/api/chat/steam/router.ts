import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { ChatRequestBody, SSE_DATA_PREFIX, SSE_LINE_DELIMITER, StreamMessage, StreamMessageType } from "@/lib/types";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const sendSSEMessage = (
    writer: WritableStreamDefaultWriter<Uint8Array>,
    data: StreamMessage
) => {
    const encoder = new TextEncoder();
    const message = encoder.encode(`${SSE_DATA_PREFIX}${JSON.stringify(data)}${SSE_LINE_DELIMITER}`);
    return writer.write(message);
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }
    const bodyRequest = (await req.json()) as ChatRequestBody;
    const { messages, newMessage, chatId } = bodyRequest;
    const convex = await getConvexClient();

    // Create stream with large queue strategy for better performance
    const stream = new TransformStream({}, { highWaterMark: 1024 });
    const writer = stream.writable.getWriter();
    const respone = new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable buffering for nginx which is required for SSE (Server-Sent Events) to work properly
      },
    });

    const startStream = async () => {
      try {
        // Stream will be implemented here

        // Send initial connection established message
        await sendSSEMessage(writer, { type: StreamMessageType.Connected });

        // Send user message to the database (convex)
        await convex.mutation(api.messages.send, {
            chatId,
            content: newMessage,
        });
        // Send final done message
        await sendSSEMessage(writer, { type: StreamMessageType.Done });
        await writer.close();
      } catch (error) {
        console.error("Error streaming chat response", error);
        return NextResponse.json({ error: "Internal Server Error" } as const, {
          status: 500,
        });
      }
    };

    await startStream();

    return respone;
  } catch (error) {
    console.error("Error streaming chat response", error);
    return NextResponse.json({ error: "Internal Server Error" } as const, {
      status: 500,
    });
  }
}
