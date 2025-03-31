import { ChatOpenAI } from "@langchain/openai";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import wxflows from "@wxflows/sdk/langchain";
import {
  END,
  MemorySaver,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import SYSTEM_MESSAGE from "@/contants/systemMessage";
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  trimMessages,
} from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";

// Customers at: https://introspection.apis.stepzen.com/customers
// Comments at: https://dummyjson.com/comments

// Trim the messages to manage conversation history
const trimmer = trimMessages({
  maxTokens: 10,
  strategy: "last",
  tokenCounter: (msg) => msg.length,
  includeSystem: true,
  allowPartial: false,
  startOn: "human",
});

// Connect to wxflows
const toolClient = new wxflows({
  endpoint: process.env.WXFLOWS_ENDPOINT || "",
  apikey: process.env.WXFLOWS_API_KEY,
});

// Retrieve the tools
const tools = await toolClient.lcTools;
const toolNode = new ToolNode(tools);

const initialiseModel = async () => {
  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    apiKey: process.env.OPENAI_API_KEY,
    temperature: 0.7,
    maxTokens: 4096,
    streaming: true,
    callbacks: [
      {
        handleLLMStart: async (input) => {
          // console.log("Start LLM call", input);
        },
        handleLLMEnd(output) {
          // console.log("End LLM call", output);
          const usage = output.llmOutput?.tokenUsage;
          if (usage) {
            const input_tokens = usage.promptTokens;
            const output_tokens = usage.completionTokens;
            const total_tokens = usage.totalTokens;
            console.log(
              `Input tokens: ${input_tokens}, Output tokens: ${output_tokens}, Total tokens: ${total_tokens}`
            );
          }
        },
        handleLLMNewToken: async (token: string) => {
          // console.log("New token", token);
        },
        handleLLMError: async (error) => {
          console.error("LLM Error", error);
        },
      },
    ],
  }).bindTools(tools);

  return model;
};

// Define the function that determines whether to continue or not
const shouldContinue = (state: typeof MessagesAnnotation.State) => {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1] as AIMessage;

  // If the LLM makes a tool call, the we route the "tools" node
  if (lastMessage.tool_calls?.length) {
    return "tools";
  }

  // If the last message is a tool message, rout back to agent
  if (lastMessage.content && lastMessage._getType() === "tool") {
    return "agent";
  }

  // Otherwise, we stop (reply to the user)
  return END;
};

export const createWorkFlow = async () => {
  const model = await initialiseModel();

  const stateGraph = new StateGraph(MessagesAnnotation)
    .addNode("agent", async (state) => {
      // create the system message content
      const systemContent = SYSTEM_MESSAGE;

      // create the prompt template with system message and messages placeholder
      const promptTemplate = ChatPromptTemplate.fromMessages([
        new SystemMessage(systemContent),
        new MessagesPlaceholder("messages"),
      ]);

      // Trim messages to manage conversation history
      const trimmedMessages = await trimmer.invoke(state.messages);

      // Format the prompt with the current messages
      const prompt = await promptTemplate.invoke({ messages: trimmedMessages });

      // Get response from the model
      const response = await model.invoke(prompt);

      // Convert OpenAI response to AIMessage format
      const aiMessage = new AIMessage({
        content: response.content,
        additional_kwargs: {
          tool_calls: response.additional_kwargs?.tool_calls || [],
        },
      });

      return { messages: [aiMessage] };
    })
    .addEdge(START, "agent")
    .addNode("tools", toolNode)
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");

  return stateGraph;
};

const addCachingHeaders = (messages: BaseMessage[]): BaseMessage[] => {
  // Rules of caching headers for turn-by-turn conversations
  // 1: Cache the first system message
  // 2: Cache the last message
  // 3: Cache the second to last HUMAN message

  if (!messages.length) return messages;

  // create a copy of messages to avoid mutating the original
  const cachedMessages = [...messages];

  const addCache = (message: BaseMessage) => {
    message.content = [
      {
        type: "text",
        text: message.content as string,
        cache_control: { type: "ephemeral" },
      },
    ];
  };

  // cache the last message
  addCache(cachedMessages.at(-1)!);

  // Find and cache the second to last human message
  let humanCount = 0;
  for (let i = cachedMessages.length - 1; i >= 0; i--) {
    if (cachedMessages[i] instanceof HumanMessage) {
      humanCount++;
      if (humanCount === 2) {
        //
        addCache(cachedMessages[i]);
        break;
      }
    }
  }

  return cachedMessages;
};

export async function submitQuestion(messages: BaseMessage[], chatId: string) {
  // Add caching headers to messages
  const cachedMessages = addCachingHeaders(messages);
  const workflow = await createWorkFlow();

  // create a checkpoint to save the state of the conversation
  const checkpointer = new MemorySaver();
  const app = workflow.compile({ checkpointer });
  
  // Run the graph and stream
  const stream = app.streamEvents(
    { messages: cachedMessages },
    {
      version: "v2",
      configurable: {
        thread_id: chatId,
      },
      streamMode: "messages",
      runId: chatId,
    }
  );

  return stream;
}
