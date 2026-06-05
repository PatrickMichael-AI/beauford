import fs from "node:fs/promises";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

import {
  AgentLoop,
  type AgentLoopOptions,
  type ModelClient,
  type RuntimeTool,
  type StructuredToolResult
} from "../agent/loop.js";
import { editFile, type EditFileArgs } from "../tools/edit-file.js";
import { resolveWorkspacePath, type ToolContext } from "../tools/path.js";
import { toolRegistry, type BeaufordTool } from "../tools/registry.js";

export type TerminalSessionOptions = {
  modelClient: ModelClient;
  toolContext?: ToolContext;
  readUserInput: () => Promise<string | null>;
  writeLine: (line: string) => Promise<void> | void;
  confirmEdit?: EditConfirmation;
  maxToolIterations?: number;
};

export type EditPreview = {
  filename: string;
  filePath: string;
  mode: "create_or_overwrite" | "replace";
  oldStr: string;
  newStr: string;
  preview: string;
};

export type EditConfirmation = (preview: EditPreview) => Promise<boolean> | boolean;

export async function runTerminalSession(options: TerminalSessionOptions): Promise<void> {
  const loop = new AgentLoop({
    modelClient: options.modelClient,
    toolContext: options.toolContext,
    maxToolIterations: options.maxToolIterations,
    tools: createTerminalToolRegistry(options.confirmEdit),
    onToolResult: async (result) => {
      await options.writeLine(formatToolActivity(result));
    }
  });

  await options.writeLine("Beauford terminal session ready.");

  while (true) {
    const userInput = await options.readUserInput();

    if (userInput === null) {
      await options.writeLine("Session ended.");
      return;
    }

    if (userInput.trim() === "") {
      continue;
    }

    try {
      const result = await loop.runUserTurn(userInput);
      await options.writeLine(`assistant: ${result.assistantResponse}`);
    } catch (error) {
      await options.writeLine(`error: ${formatErrorMessage(error)}`);
    }
  }
}

export async function runReadlineTerminalSession(
  options: Omit<TerminalSessionOptions, "readUserInput" | "writeLine" | "confirmEdit">
): Promise<void> {
  const readline = createInterface({ input, output });
  let interrupted = false;
  let closed = false;
  let activeQuestionAbort: AbortController | undefined;

  readline.on("SIGINT", () => {
    interrupted = true;
    readline.close();
  });
  readline.on("close", () => {
    closed = true;
    activeQuestionAbort?.abort();
  });

  try {
    const askQuestion = async (prompt: string): Promise<string | null> => {
      if (interrupted || closed) {
        return null;
      }

      activeQuestionAbort = new AbortController();

      try {
        return await readline.question(prompt, {
          signal: activeQuestionAbort.signal
        });
      } catch {
        return null;
      } finally {
        activeQuestionAbort = undefined;
      }
    };

    await runTerminalSession({
      ...options,
      readUserInput: async () => {
        return askQuestion("beauford> ");
      },
      writeLine: (line) => {
        console.log(line);
      },
      confirmEdit: async (preview) => {
        console.log(formatEditPreview(preview));
        const answer = await askQuestion("Apply edit? [y/N] ");

        return answer?.trim().toLowerCase() === "y" || answer?.trim().toLowerCase() === "yes";
      }
    });
  } finally {
    readline.close();
  }
}

export function formatToolActivity(result: StructuredToolResult): string {
  if (result.status === "ok") {
    return `[tool ok] ${result.tool} ${formatArgsSummary(result.args)}`;
  }

  const toolName = result.tool ?? result.error.kind;
  const args = result.args ? ` ${formatArgsSummary(result.args)}` : "";

  return `[tool error] ${toolName}${args}: ${result.error.message}`;
}

export function formatEditPreview(preview: EditPreview): string {
  return [
    `[edit preview] ${preview.mode}: ${preview.filename}`,
    preview.preview
  ].join("\n");
}

function createTerminalToolRegistry(
  confirmEdit: EditConfirmation | undefined
): AgentLoopOptions["tools"] {
  const tools = { ...toolRegistry } as unknown as Record<string, RuntimeTool>;

  tools.edit_file = {
    ...toolRegistry.edit_file,
    handler: async (args: Record<string, unknown>, context: ToolContext) => {
      const editArgs = parseEditArgs(args);

      if (!confirmEdit) {
        return editFile(editArgs, context);
      }

      const preview = await createEditPreview(editArgs, context);
      const approved = await confirmEdit(preview);

      if (!approved) {
        return {
          file_path: preview.filePath,
          status: "cancelled"
        };
      }

      return editFile(editArgs, context);
    }
  } satisfies BeaufordTool<Record<string, unknown>, unknown>;

  return tools;
}

function parseEditArgs(args: Record<string, unknown>): EditFileArgs {
  const { filename, old_str: oldStr, new_str: newStr } = args;

  if (typeof filename !== "string" || typeof oldStr !== "string" || typeof newStr !== "string") {
    throw new Error("edit_file requires string filename, old_str, and new_str arguments.");
  }

  return { filename, old_str: oldStr, new_str: newStr };
}

async function createEditPreview(args: EditFileArgs, context: ToolContext): Promise<EditPreview> {
  const filePath = await resolveWorkspacePath(args.filename, context);

  if (args.old_str === "") {
    return {
      filename: args.filename,
      filePath,
      mode: "create_or_overwrite",
      oldStr: args.old_str,
      newStr: args.new_str,
      preview: truncatePreview(args.new_str)
    };
  }

  const content = await fs.readFile(filePath, "utf8");
  const matchIndex = content.indexOf(args.old_str);

  if (matchIndex === -1) {
    return {
      filename: args.filename,
      filePath,
      mode: "replace",
      oldStr: args.old_str,
      newStr: args.new_str,
      preview: "old_str was not found; no edit will be applied."
    };
  }

  return {
    filename: args.filename,
    filePath,
    mode: "replace",
    oldStr: args.old_str,
    newStr: args.new_str,
    preview: truncatePreview([
      "--- old",
      args.old_str,
      "+++ new",
      args.new_str
    ].join("\n"))
  };
}

function formatArgsSummary(args: Record<string, unknown>): string {
  const entries = Object.entries(args)
    .slice(0, 3)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`);

  return entries.length > 0 ? `(${entries.join(", ")})` : "";
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function truncatePreview(value: string): string {
  const maxLength = 1200;

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n... truncated ...`;
}
