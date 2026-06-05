import { type ToolName } from "../tools/registry.js";

export type ToolInvocation = {
  toolName: ToolName;
  args: Record<string, unknown>;
  raw: string;
};

export type ToolParseErrorKind = "malformed_tool_call" | "malformed_json" | "unknown_tool" | "missing_args";

export type ToolParseError = {
  kind: ToolParseErrorKind;
  raw: string;
  message: string;
};

export type ParsedToolLine =
  | { status: "ok"; invocation: ToolInvocation }
  | { status: "error"; error: ToolParseError };

const TOOL_LINE_PATTERN = /^tool:\s*([A-Za-z_][A-Za-z0-9_]*)\((.*)\)\s*$/;

export function parseToolInvocations(
  content: string,
  knownToolNames: readonly string[]
): ParsedToolLine[] {
  return content
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith("tool:"))
    .map((line) => parseToolLine(line.trim(), knownToolNames));
}

function parseToolLine(line: string, knownToolNames: readonly string[]): ParsedToolLine {
  const match = TOOL_LINE_PATTERN.exec(line);

  if (!match) {
    return {
      status: "error",
      error: {
        kind: "malformed_tool_call",
        raw: line,
        message: "Tool call must match: tool: TOOL_NAME({\"args\":true})"
      }
    };
  }

  const [, toolName, rawArgs] = match;

  if (!knownToolNames.includes(toolName)) {
    return {
      status: "error",
      error: {
        kind: "unknown_tool",
        raw: line,
        message: `Unknown tool: ${toolName}`
      }
    };
  }

  let args: unknown;
  try {
    args = JSON.parse(rawArgs);
  } catch {
    return {
      status: "error",
      error: {
        kind: "malformed_json",
        raw: line,
        message: `Tool arguments for ${toolName} must be valid compact JSON.`
      }
    };
  }

  if (!isPlainObject(args)) {
    return {
      status: "error",
      error: {
        kind: "missing_args",
        raw: line,
        message: `Tool arguments for ${toolName} must be a JSON object.`
      }
    };
  }

  return {
    status: "ok",
    invocation: {
      toolName: toolName as ToolName,
      args,
      raw: line
    }
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
