#!/usr/bin/env node

import { realpathSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hasOpenAIConfig, resolveOpenAIModel } from "./config/openai.js";
import { OpenAIModelClient } from "./llm/openai-client.js";
import { runReadlineTerminalSession } from "./tui/session.js";

const VERSION = "0.1.0";

function printHelp(): void {
  console.log(`Beauford ${VERSION}

Usage:
  beauford [--help] [--version] [--check-auth] [--model <model>] [--cwd <path>]

Terminal:
  Run without options to start an interactive Beauford session.

Workspace:
  --cwd sets the workspace root for Beauford file tools. Defaults to the current directory.

Environment:
  OPENAI_API_KEY must be set before Beauford can perform AI inference.
  BEAUFORD_OPENAI_MODEL can override the default model.`);
}

async function startTerminal(model: string, workspaceRoot: string): Promise<number> {
  console.log(`OpenAI model: ${model}`);
  console.log(`Workspace: ${workspaceRoot}`);

  try {
    await runReadlineTerminalSession({
      modelClient: new OpenAIModelClient({ model }),
      toolContext: { workspaceRoot }
    });

    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

export async function run(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv);

  if (parsed.status === "error") {
    console.error(parsed.message);
    console.error("Run `beauford --help`.");
    return 1;
  }

  const { command, model, cwd } = parsed;

  switch (command) {
    case undefined:
      try {
        return startTerminal(
          resolveOpenAIModel(process.env, { model }),
          await resolveWorkspaceRoot(cwd)
        );
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        return 1;
      }
    case "--help":
    case "-h":
      printHelp();
      return 0;
    case "--version":
    case "-v":
      console.log(VERSION);
      return 0;
    case "--check-auth":
      if (hasOpenAIConfig(process.env, { model })) {
        console.log("OPENAI_API_KEY is configured.");
        console.log(`OpenAI model: ${resolveOpenAIModel(process.env, { model })}`);
        return 0;
      }

      console.error("OPENAI_API_KEY is not configured.");
      return 1;
    default:
      console.error(`Unknown option: ${command}`);
      console.error("Run `beauford --help`.");
      return 1;
  }
}

type ParsedArgs =
  | {
      status: "ok";
      command?: string;
      model?: string;
      cwd?: string;
    }
  | {
      status: "error";
      message: string;
    };

export function parseArgs(argv: string[]): ParsedArgs {
  const remaining = [...argv];
  let command: string | undefined;
  let model: string | undefined;
  let cwd: string | undefined;

  while (remaining.length > 0) {
    const arg = remaining.shift();

    if (arg === undefined) {
      break;
    }

    if (arg === "--model") {
      const value = remaining.shift();

      if (!value) {
        return { status: "error", message: "--model requires a non-empty value." };
      }

      model = value;
      continue;
    }

    if (arg.startsWith("--model=")) {
      const value = arg.slice("--model=".length);

      if (!value) {
        return { status: "error", message: "--model requires a non-empty value." };
      }

      model = value;
      continue;
    }

    if (arg === "--cwd") {
      const value = remaining.shift();

      if (!value) {
        return { status: "error", message: "--cwd requires a non-empty value." };
      }

      cwd = value;
      continue;
    }

    if (arg.startsWith("--cwd=")) {
      const value = arg.slice("--cwd=".length);

      if (!value) {
        return { status: "error", message: "--cwd requires a non-empty value." };
      }

      cwd = value;
      continue;
    }

    if (command !== undefined) {
      return { status: "error", message: "Unexpected extra arguments." };
    }

    command = arg;
  }

  return { status: "ok", command, model, cwd };
}

async function resolveWorkspaceRoot(cwd: string | undefined): Promise<string> {
  const workspaceRoot = path.resolve(cwd ?? process.cwd());

  try {
    const stat = await fs.stat(workspaceRoot);

    if (!stat.isDirectory()) {
      throw new Error(`Workspace root is not a directory: ${workspaceRoot}`);
    }
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error(`Workspace root does not exist: ${workspaceRoot}`);
    }

    throw error;
  }

  return workspaceRoot;
}

if (process.argv[1] && isCliEntrypoint(process.argv[1])) {
  process.exitCode = await run(process.argv.slice(2));
}

function isCliEntrypoint(argvPath: string): boolean {
  return realpathSync(argvPath) === fileURLToPath(import.meta.url);
}
