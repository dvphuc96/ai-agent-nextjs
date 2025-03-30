import { ChatAnthropic } from "@langchain/anthropic";

const initialiseModel = async () => {
  const model = new ChatAnthropic({
    modelName: "claude-3-5-sonnet-20241022",
    apiKey: process.env.ANTHROPIC_API_KEY,
    temperature: 0.7, // Higher temperature for more creative responses
    maxTokens: 4096, // Higher max tokens for longer responses
    streaming: true, // Enable streaming for SSE (Server-Sent Events)
    clientOptions: {
      defaultHeaders: {
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
    },
    callbacks: [
      {
        handleLLMStart: async (input) => {
          console.log("Start LLM call", input);
        },
        handleLLMEnd(output) {
          console.log("End LLM call", output);
          const usage = output.llmOutput?.usage;
          if (usage) {
            const input_tokens = usage.input_tokens;
            const output_tokens = usage.output_tokens;
            const total_tokens = usage.input_tokens + usage.output_tokens;
            const cache_creation_input_tokens =
              usage.cache_creation_input_tokens || 0;
            const cache_read_input_tokens = usage.cache_read_input_tokens || 0;
            console.log(
              `Input tokens: ${input_tokens}, Output tokens: ${output_tokens}, Total tokens: ${total_tokens}`
            );
            console.log(
              `Cache creation input tokens: ${cache_creation_input_tokens}`
            );
            console.log(`Cache read input tokens: ${cache_read_input_tokens}`);
          }
        },
        handleLLMNewToken: async (token: string) => {
          console.log("New token", token);
        },
        handleLLMError: async (error) => {
          console.error("LLM Error", error);
        },
      },
    ],
  }).bindTools(tools);

  return model;
};

export const initialiseGraph = async () => {
  const model = await initialiseModel();

  const graph = new StateGraph({
    model,
  });
};
