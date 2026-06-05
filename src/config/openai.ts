export type OpenAIConfig = {
  apiKey: string;
  model: string;
};

export const DEFAULT_OPENAI_MODEL = "gpt-5.2";

export type OpenAIConfigOptions = {
  model?: string;
};

export class OpenAIConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAIConfigError";
  }
}

export function loadOpenAIConfig(
  env: NodeJS.ProcessEnv = process.env,
  options: OpenAIConfigOptions = {}
): OpenAIConfig {
  const apiKey = env.OPENAI_API_KEY?.trim();
  const model = resolveOpenAIModel(env, options);

  if (!apiKey) {
    throw new OpenAIConfigError(
      "OPENAI_API_KEY is required before Beauford can perform AI inference."
    );
  }

  return { apiKey, model };
}

export function hasOpenAIConfig(
  env: NodeJS.ProcessEnv = process.env,
  options: OpenAIConfigOptions = {}
): boolean {
  try {
    loadOpenAIConfig(env, options);
    return true;
  } catch (error) {
    if (error instanceof OpenAIConfigError) {
      return false;
    }

    throw error;
  }
}

export function resolveOpenAIModel(
  env: NodeJS.ProcessEnv = process.env,
  options: OpenAIConfigOptions = {}
): string {
  const model = options.model?.trim() || env.BEAUFORD_OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;

  if (!model) {
    throw new OpenAIConfigError("OpenAI model cannot be blank.");
  }

  return model;
}
