import { type BeaufordTool } from "../tools/registry.js";

type ToolPromptMetadata = Pick<BeaufordTool<unknown, unknown>, "name" | "description" | "parameters">;

export function renderSystemPrompt(tools: Record<string, ToolPromptMetadata>): string {
  const toolDescriptions = Object.values(tools)
    .map((tool) => {
      const schema = JSON.stringify(tool.parameters);

      return `- ${tool.name}: ${tool.description}\n  Parameters: ${schema}\n  Invocation: tool: ${tool.name}({...})`;
    })
    .join("\n\n");

  return `You are Beauford, an agentic Terminal UI coding harness.

You help the user inspect and edit the local workspace. You never access files directly. When local action is needed, request exactly one tool call per line using this text protocol:

tool: TOOL_NAME({"compact_json_args":true})

After the local program executes a tool, it will append a user message in this form:

tool_result({"status":"ok","tool":"TOOL_NAME","result":{...}})

Continue requesting tools until you have enough information, then answer normally without a tool call.

Available tools:

${toolDescriptions}`;
}
