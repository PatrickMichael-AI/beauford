import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { OpenAIConfigError } from "../config/openai.js";
import { OpenAIModelClient, type OpenAIResponseClient, type OpenAIResponseRequest } from "./openai-client.js";

function createMockClient(outputText = "Assistant response."): {
  client: OpenAIResponseClient;
  requests: OpenAIResponseRequest[];
} {
  const requests: OpenAIResponseRequest[] = [];

  return {
    requests,
    client: {
      responses: {
        create: async (request) => {
          requests.push(request);

          return { output_text: outputText };
        }
      }
    }
  };
}

describe("OpenAIModelClient", () => {
  it("maps Beauford messages to an OpenAI Responses request", async () => {
    const { client, requests } = createMockClient("Done.");
    const modelClient = new OpenAIModelClient({
      env: { OPENAI_API_KEY: "sk-test-key" },
      model: "gpt-test",
      client
    });

    const output = await modelClient.complete([
      { role: "system", content: "Use Beauford tools." },
      { role: "user", content: "List files." },
      { role: "assistant", content: 'tool: list_files({"path":"."})' }
    ]);

    assert.equal(output, "Done.");
    assert.deepEqual(requests, [
      {
        model: "gpt-test",
        input: [
          { role: "system", content: "Use Beauford tools." },
          { role: "user", content: "List files." },
          { role: "assistant", content: 'tool: list_files({"path":"."})' }
        ],
        store: false
      }
    ]);
  });

  it("uses BEAUFORD_OPENAI_MODEL when a CLI override is absent", () => {
    const { client } = createMockClient();
    const modelClient = new OpenAIModelClient({
      env: {
        OPENAI_API_KEY: "sk-test-key",
        BEAUFORD_OPENAI_MODEL: "gpt-env"
      },
      client
    });

    assert.equal(modelClient.model, "gpt-env");
  });

  it("requires OPENAI_API_KEY when creating the production client path", () => {
    assert.throws(
      () => new OpenAIModelClient({ env: {} }),
      (error: unknown) => error instanceof OpenAIConfigError && error.message.includes("OPENAI_API_KEY")
    );
  });

  it("does not require a real SDK client when apiKey and mocked client are provided", async () => {
    const { client } = createMockClient("Mocked.");
    const modelClient = new OpenAIModelClient({
      apiKey: "sk-test-key",
      model: "gpt-test",
      client
    });

    assert.equal(await modelClient.complete([{ role: "user", content: "Hello" }]), "Mocked.");
  });

  it("fails clearly when OpenAI returns no output text", async () => {
    const modelClient = new OpenAIModelClient({
      env: { OPENAI_API_KEY: "sk-test-key" },
      model: "gpt-test",
      client: {
        responses: {
          create: async () => ({ output_text: "" })
        }
      }
    });

    await assert.rejects(
      () => modelClient.complete([{ role: "user", content: "Hello" }]),
      /output_text/
    );
  });
});
