import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_OPENAI_MODEL,
  hasOpenAIConfig,
  loadOpenAIConfig,
  OpenAIConfigError,
  resolveOpenAIModel
} from "./openai.js";

describe("OpenAI config", () => {
  it("loads OPENAI_API_KEY without modifying the value", () => {
    const config = loadOpenAIConfig({ OPENAI_API_KEY: "sk-test-key" });

    assert.equal(config.apiKey, "sk-test-key");
    assert.equal(config.model, DEFAULT_OPENAI_MODEL);
  });

  it("trims surrounding whitespace", () => {
    const config = loadOpenAIConfig({ OPENAI_API_KEY: "  sk-test-key  " });

    assert.equal(config.apiKey, "sk-test-key");
  });

  it("loads model overrides from options before the environment", () => {
    const config = loadOpenAIConfig(
      {
        OPENAI_API_KEY: "sk-test-key",
        BEAUFORD_OPENAI_MODEL: "gpt-env"
      },
      { model: "gpt-flag" }
    );

    assert.equal(config.model, "gpt-flag");
  });

  it("loads model overrides from BEAUFORD_OPENAI_MODEL", () => {
    const config = loadOpenAIConfig({
      OPENAI_API_KEY: "sk-test-key",
      BEAUFORD_OPENAI_MODEL: "  gpt-env  "
    });

    assert.equal(config.model, "gpt-env");
  });

  it("throws a config-specific error when the key is missing", () => {
    assert.throws(
      () => loadOpenAIConfig({}),
      (error: unknown) =>
        error instanceof OpenAIConfigError &&
        error.message.includes("OPENAI_API_KEY")
    );
  });

  it("reports whether OpenAI config exists", () => {
    assert.equal(hasOpenAIConfig({}), false);
    assert.equal(hasOpenAIConfig({ OPENAI_API_KEY: "sk-test-key" }), true);
  });

  it("resolves the default model without requiring an API key", () => {
    assert.equal(resolveOpenAIModel({}), DEFAULT_OPENAI_MODEL);
  });
});
