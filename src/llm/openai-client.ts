import OpenAI from "openai";

import { loadOpenAIConfig, resolveOpenAIModel, type OpenAIConfigOptions } from "../config/openai.js";
import { type BeaufordMessage } from "../agent/conversation.js";
import { type ModelClient } from "../agent/loop.js";

export type OpenAIResponseInputMessage = {
  role: BeaufordMessage["role"];
  content: string;
};

export type OpenAIResponseRequest = {
  model: string;
  input: OpenAIResponseInputMessage[];
  store: false;
};

export type OpenAIResponseResult = {
  output_text?: string | null;
};

export type OpenAIResponseClient = {
  responses: {
    create: (request: OpenAIResponseRequest) => Promise<OpenAIResponseResult>;
  };
};

export type OpenAIModelClientOptions = OpenAIConfigOptions & {
  apiKey?: string;
  env?: NodeJS.ProcessEnv;
  client?: OpenAIResponseClient;
};

export class OpenAIModelClient implements ModelClient {
  readonly model: string;

  private readonly client: OpenAIResponseClient;

  constructor(options: OpenAIModelClientOptions = {}) {
    const config =
      options.apiKey === undefined
        ? loadOpenAIConfig(options.env, options)
        : { apiKey: options.apiKey, model: resolveOpenAIModel(options.env, options) };

    this.model = config.model;
    this.client = options.client ?? createSDKClient(config.apiKey);
  }

  async complete(messages: BeaufordMessage[]): Promise<string> {
    const response = await this.client.responses.create({
      model: this.model,
      input: messages.map((message) => ({ role: message.role, content: message.content })),
      store: false
    });

    if (typeof response.output_text !== "string" || response.output_text.length === 0) {
      throw new Error("OpenAI response did not include output_text.");
    }

    return response.output_text;
  }
}

function createSDKClient(apiKey: string): OpenAIResponseClient {
  const sdk = new OpenAI({ apiKey });

  return {
    responses: {
      create: async (request) => {
        const response = await sdk.responses.create(request);

        return { output_text: response.output_text };
      }
    }
  };
}
