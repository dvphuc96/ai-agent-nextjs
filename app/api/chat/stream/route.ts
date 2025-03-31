import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import {
  ChatRequestBody,
  SSE_DATA_PREFIX,
  SSE_LINE_DELIMITER,
  StreamMessage,
  StreamMessageType,
} from "@/lib/types";
import { auth } from "@clerk/nextjs/server";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { NextResponse } from "next/server";
import { submitQuestion } from "@/lib/langgraph";

const sendSSEMessage = (
  writer: WritableStreamDefaultWriter<Uint8Array>,
  data: StreamMessage
) => {
  const encoder = new TextEncoder();
  const message = encoder.encode(
    `${SSE_DATA_PREFIX}${JSON.stringify(data)}${SSE_LINE_DELIMITER}`
  );
  return writer.write(message);
};

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
        // "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // Disable buffering for nginx which is required for SSE (Server-Sent Events) to work properly
      },
    });

    (async () => {
      try {
        // Stream will be implemented here

        // Send initial connection established message
        await sendSSEMessage(writer, { type: StreamMessageType.Connected });

        // Send user message to the database (convex)
        await convex.mutation(api.messages.send, {
          chatId,
          content: newMessage,
        });

        // convert message to langchain format
        const langChainMessages = [
          ...messages.map((msg) =>
            msg.role === "user"
              ? new HumanMessage(msg.content)
              : new AIMessage(msg.content)
          ),
          new HumanMessage(newMessage),
        ];

        try {
          // Create the event stream
          const eventStream = await submitQuestion(langChainMessages, chatId);
          for await (const event of eventStream) {
            switch (event.event) {
              case "on_chat_model_stream": {
                const text = event.data.chunk?.content;
                console.log({text})
                if (text) {
                  await sendSSEMessage(writer, {
                    type: StreamMessageType.Token,
                    token: text,
                  });
                }
                break;
              }

              case "on_chain_start": {
                const { name: tool = "unknown", data: { input } } = event;
                if (tool && input) {
                  await sendSSEMessage(writer, {
                    type: StreamMessageType.ToolStart,
                    tool,
                    input,
                  });
                }
                break;
              }

              case "on_chain_end": {
                const {data: { output }} = event;
                const toolMessage = new ToolMessage(output);
                await sendSSEMessage(writer, {
                  type: StreamMessageType.ToolEnd,
                  tool: toolMessage.lc_kwargs.name || "unknown",
                  output,
                });
                break;
              }
            }
          }

          // Send final done message after stream completes
          await sendSSEMessage(writer, { type: StreamMessageType.Done });
        } catch (error) {
          console.error("Error in event stream: ", error);
          await sendSSEMessage(writer, {
            type: StreamMessageType.Error,
            error:
              error instanceof Error
                ? error.message
                : "Stream processing faild",
          });
        }
      } catch (error) {
        console.error("Error in stream: ", error);
        await sendSSEMessage(writer, {
          type: StreamMessageType.Error,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        try {
          await writer.close();
        } catch (error) {
          console.log("Error closing writer: ", error);
        }
      }
    })();

    return respone;
  } catch (error) {
    console.error("Error streaming chat response", error);
    return NextResponse.json({ error: "Internal Server Error" } as const, {
      status: 500,
    });
  }
}
