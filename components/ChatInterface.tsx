"use client";

import { Doc, Id } from "@/convex/_generated/dataModel";
import React, { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import { ChatRequestBody, StreamMessageType } from "@/lib/types";
import { createSSEParser } from "@/lib/createSSEParser";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import MessageBubble from "./MessageBubble";

interface ChatInterfaceProps {
  chatId: Id<"chats">;
  initialMessages: Doc<"messages">[];
}

function ChatInterface({ chatId, initialMessages }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Doc<"messages">[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamedResponse, setStreamedResponse] = useState("");
  const [currentTool, setCurrentTool] = useState<{
    name: string;
    input: unknown;
  } | null>(null);

  const messageEndRef = useRef<HTMLDivElement>(null);

  const formatToolOutput = (output: unknown): string => {
    if (typeof output === "string") return output;
    return JSON.stringify(output, null, 2);
  };
  const formatTerminalOutput = (
    tool: string,
    input: unknown,
    output: unknown
  ) => {
    const contentHtml = `<div class="bg-[#1elele] text-white font-mono p-2 rounded-md my-2 overflow-x-auto whitespace-normal max-w-[600px]">
      <div class="flex items-center gap-1.5 border-b border-gray-700 pb-1">
        <span class=" text-red-500">*</span>
        <span class=" •text-yellow-500"></span>
        <span class=" text-green-500"></span>
        <span class=" text-gray-400 ml-1 text-sm">~/${tool}</span>
      </div>
      <div class="text-gray-400 mt-1">$ Input</div>
      <pre class="text-yellow-400 mt-0.5 whitespace-pre-wrap overflow-x-auto">${formatToolOutput(input)}</pre>
      <div class="text-gray-400 mt-2">$ Outputs/div>
      <pre class="text-green-400 mt-0.5 whitespace-pre-wrap overflow-x-auto">${formatToolOutput(output)}</pre>
    </div>`;

    return `---START---\n${contentHtml}\n--END---*`;
  };
  const processStream = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onChunk: (chunk: string) => Promise<void>
  ) => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value, {stream: true});
        await onChunk(chunk);
      }
    } finally {
      reader.releaseLock();
    }
  };

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamedResponse]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimedInput = input.trim();
    if (!trimedInput || isLoading) return;

    setInput("");
    setStreamedResponse("");
    setCurrentTool(null);
    setIsLoading(true);

    // Add user message immediately for better Ux
    const optimisticUserMessage: Doc<"messages"> = {
      _id: `temp_${Date.now()}`,
      chatId,
      content: trimedInput,
      role: "user",
      createdAt: Date.now(),
    } as Doc<"messages">;

    setMessages((prev) => [...prev, optimisticUserMessage]);

    // Track complete response for saving to database
    let fullResponse = "";

    // Stream response from the AI
    try {
      const requestBody: ChatRequestBody = {
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        newMessage: trimedInput,
        chatId,
      };

      // Initialize SSE connection
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error(await response.text());
      if (!response.body) throw new Error("No response body");

      // ---- Handle SSE stream ----
      // create SSE parser and stream reader
      const parser = createSSEParser();
      const reader = response.body.getReader();

      await processStream(reader, async (chunk) => {
        // Parse SSE messages from the chunk
        const messages = parser.parse(chunk);
        console.log({messages})
        // for (const message of messages) {
        //   console.log({ message });
      
        //   switch (message.type) {
        //     case StreamMessageType.Token:
        //       // Handle streaming tokens (normal text response)
        //       if ('token' in message) {
        //         fullResponse += message.token;
        //         setStreamedResponse(fullResponse);
        //       }
        //       break;
      
        //     case StreamMessageType.ToolStart:
        //       // Handle start of tool execution (e.g API calls, file operations)
        //       if ('tool' in message) {
        //         setCurrentTool({
        //           name: message.tool,
        //           input: message.input,
        //         });
        //         fullResponse += formatTerminalOutput(
        //           message.tool,
        //           message.input,
        //           'Processing...'
        //         );
        //         setStreamedResponse(fullResponse);
        //       }
        //       break; // <-- Missing break here!
      
        //     case StreamMessageType.ToolEnd:
        //       console.log('three');
        //       // Handle completion of tool execution
        //       if ('tool' in message && currentTool) {
        //         // Replace the "Processing..." message with actual output
        //         const lastIndex = fullResponse.lastIndexOf('<div class="bg-[#1e1e1e]');
        //         if (lastIndex !== -1) {
        //           fullResponse =
        //             fullResponse.substring(0, lastIndex) +
        //             formatTerminalOutput(
        //               message.tool,
        //               currentTool.input,
        //               'output' in message ? message.output : 'No output'
        //             );
        //           setStreamedResponse(fullResponse);
        //         }
        //         setCurrentTool(null); // Reset tool after completion
        //       }
        //       break;
      
        //     case StreamMessageType.Error:
        //       // Handle error messages from the stream
        //       if ('error' in message) throw new Error(message.error); // Throw the error if exists
        //       break;
      
        //     case StreamMessageType.Done:
        //       console.log('done');
        //       // Handle completion of the stream
        //       const newAssistantMessage: Doc<'messages'> = {
        //         _id: `temp_assistant_${Date.now()}`,
        //         chatId,
        //         content: fullResponse,
        //         role: 'assistant',
        //         createdAt: Date.now(),
        //       } as Doc<'messages'>;
      
        //       // Save the complete message to database (convex)
        //       const convex = await getConvexClient();
        //       await convex.mutation(api.messages.store, {
        //         chatId,
        //         content: fullResponse,
        //         role: 'assistant',
        //       });
      
        //       setMessages((prev) => [...prev, newAssistantMessage]);
        //       setStreamedResponse(''); // Clear the streamed response
        //       return; // Exit when done
        //   }
        // }
      });
    } catch (error) {
      // Handle any errors during streaming
      console.error("Error sending message:", error);
      // Remove the optimistic user message if there was an error
      setMessages((prev) => {
        return prev.filter((msg) => msg._id !== optimisticUserMessage._id);
      });
      setStreamedResponse(
        formatTerminalOutput(
          "error",
          "Failed to process message",
          error instanceof Error ? error.message : "Unknown error"
        )
      );
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <main className="flex flex-col h-[calc(100vh-theme(spacing.14))]">
      <section className="flex-1 overflow-y-auto bg-gray-50 p-2 md:p-0">
        <div className="max-w-4xl mx-auto p-4 space-y-3">
          {/* Messages */}
          {messages.map((message: Doc<"messages">) => (
            <MessageBubble
              key={message._id}
              content={message.content}
              isUser={message.role === "user"}
            />
          ))}

          {streamedResponse && <MessageBubble content={streamedResponse} />}
          {isLoading && !streamedResponse && (
            <div className="flex justify-start animate-in fade-in-0">
              <div className="rounded-2xl px-4 py-3 bg-white text-gray-900 rounded-bl-none shadow-sm ring-1 ring-inset ring-gray-200">
                <div className="flex items-center gap-1.5">
                  {[0.3, 0.15, 0].map((delay, i) => (
                    <div
                      key={`loading-delay-${i}`}
                      className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: `-${delay}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          {/* Last Message */}
          <div ref={messageEndRef} />
        </div>
      </section>

      {/* footer input */}
      <footer className="bg-white border-t p-4">
        <form onSubmit={handleSubmit}>
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message AI Agent..."
              className="flex-1 py-3 px-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 bg-gray-50 placeholder:text-gray-500"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`absolute right-2 rounded-xl h-9 w-9 p-0 flex items-center justify-center transition-all ${
                input.trim()
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <ArrowRight />
            </Button>
          </div>
        </form>
      </footer>
    </main>
  );
}

export default ChatInterface;
