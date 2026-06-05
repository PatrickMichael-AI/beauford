import { Conversation, type BeaufordMessage } from "./conversation.js";
import { parseToolInvocations, type ToolInvocation, type ToolParseError } from "./tool-parser.js";
import { renderSystemPrompt } from "./system-prompt.js";
import { toolRegistry, type BeaufordTool } from "../tools/registry.js";
import { type ToolContext } from "../tools/path.js";

export type ModelClient = {
  complete(messages: BeaufordMessage[]): Promise<string>;
};

export type AgentLoopOptions = {
  modelClient: ModelClient;
  tools?: Record<string, RuntimeTool>;
  toolContext?: ToolContext;
  maxToolIterations?: number;
  systemPrompt?: string;
  onToolResult?: (result: StructuredToolResult) => Promise<void> | void;
};

export type RuntimeTool = Omit<BeaufordTool<unknown, unknown>, "handler"> & {
  handler: (args: Record<string, unknown>, context: ToolContext) => Promise<unknown>;
};

export type AgentTurnResult = {
  assistantResponse: string;
  messages: BeaufordMessage[];
  toolResults: StructuredToolResult[];
};

export type OuterLoopOptions = AgentLoopOptions & {
  readUserInput: () => Promise<string | null>;
  writeAssistantOutput: (content: string) => Promise<void> | void;
};

export type StructuredToolResult =
  | {
      status: "ok";
      tool: string;
      args: Record<string, unknown>;
      result: unknown;
    }
  | {
      status: "error";
      tool?: string;
      args?: Record<string, unknown>;
      error: {
        kind: "malformed_json" | "malformed_tool_call" | "missing_args" | "unknown_tool" | "tool_failure" | "tool_iteration_limit";
        message: string;
      };
      raw?: string;
    };

export class AgentLoop {
  private readonly conversation: Conversation;
  private readonly modelClient: ModelClient;
  private readonly tools: Record<string, RuntimeTool>;
  private readonly toolContext: ToolContext;
  private readonly maxToolIterations: number;
  private readonly onToolResult?: (result: StructuredToolResult) => Promise<void> | void;

  constructor(options: AgentLoopOptions) {
    this.tools = options.tools ?? coerceToolRegistry(toolRegistry);
    this.modelClient = options.modelClient;
    this.toolContext = options.toolContext ?? {};
    this.maxToolIterations = options.maxToolIterations ?? 8;
    this.onToolResult = options.onToolResult;
    this.conversation = new Conversation({
      systemPrompt: options.systemPrompt ?? renderSystemPrompt(this.tools)
    });
  }

  async runUserTurn(userInput: string): Promise<AgentTurnResult> {
    const toolResults: StructuredToolResult[] = [];
    this.conversation.addUserMessage(userInput);

    for (let iteration = 0; iteration < this.maxToolIterations; iteration += 1) {
      const assistantResponse = await this.modelClient.complete(this.conversation.snapshot());
      const parsedToolLines = parseToolInvocations(assistantResponse, Object.keys(this.tools));

      if (parsedToolLines.length === 0) {
        this.conversation.addAssistantMessage(assistantResponse);

        return {
          assistantResponse,
          messages: this.conversation.snapshot(),
          toolResults
        };
      }

      for (const parsedToolLine of parsedToolLines) {
        const structuredResult =
          parsedToolLine.status === "ok"
            ? await this.executeTool(parsedToolLine.invocation)
            : this.formatParseError(parsedToolLine.error);

        toolResults.push(structuredResult);
        this.conversation.addToolResult(structuredResult);
        await this.onToolResult?.(structuredResult);
      }
    }

    const limitResult: StructuredToolResult = {
      status: "error",
      error: {
        kind: "tool_iteration_limit",
        message: `Tool iteration limit reached for this turn: ${this.maxToolIterations}`
      }
    };
    toolResults.push(limitResult);
    this.conversation.addToolResult(limitResult);
    await this.onToolResult?.(limitResult);

    const assistantResponse = await this.modelClient.complete(this.conversation.snapshot());
    this.conversation.addAssistantMessage(assistantResponse);

    return {
      assistantResponse,
      messages: this.conversation.snapshot(),
      toolResults
    };
  }

  snapshot(): BeaufordMessage[] {
    return this.conversation.snapshot();
  }

  private async executeTool(invocation: ToolInvocation): Promise<StructuredToolResult> {
    const tool = this.tools[invocation.toolName];

    if (!tool) {
      return {
        status: "error",
        tool: invocation.toolName,
        args: invocation.args,
        raw: invocation.raw,
        error: {
          kind: "unknown_tool",
          message: `Unknown tool: ${invocation.toolName}`
        }
      };
    }

    try {
      const result = await tool.handler(invocation.args, this.toolContext);

      return {
        status: "ok",
        tool: invocation.toolName,
        args: invocation.args,
        result
      };
    } catch (error) {
      return {
        status: "error",
        tool: invocation.toolName,
        args: invocation.args,
        raw: invocation.raw,
        error: {
          kind: "tool_failure",
          message: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  private formatParseError(error: ToolParseError): StructuredToolResult {
    return {
      status: "error",
      raw: error.raw,
      error: {
        kind: error.kind,
        message: error.message
      }
    };
  }
}

export async function runOuterUserLoop(options: OuterLoopOptions): Promise<void> {
  const loop = new AgentLoop(options);

  while (true) {
    const userInput = await options.readUserInput();

    if (userInput === null) {
      return;
    }

    const result = await loop.runUserTurn(userInput);
    await options.writeAssistantOutput(result.assistantResponse);
  }
}

function coerceToolRegistry(tools: typeof toolRegistry): Record<string, RuntimeTool> {
  return tools as unknown as Record<string, RuntimeTool>;
}
