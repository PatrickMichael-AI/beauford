import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { AgentLoop, runOuterUserLoop, type ModelClient } from "./loop.js";

class MockModelClient implements ModelClient {
  readonly seenMessages = [] as unknown[];
  private responseIndex = 0;

  constructor(private readonly responses: string[]) {}

  async complete(messages: unknown[]): Promise<string> {
    this.seenMessages.push(messages);
    const response = this.responses[this.responseIndex];
    this.responseIndex += 1;

    return response ?? "Done.";
  }
}

async function createWorkspace(): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "beauford-agent-"));
  await fs.mkdir(path.join(workspaceRoot, "src"));
  await fs.writeFile(path.join(workspaceRoot, "README.md"), "hello beauford\n", "utf8");
  await fs.writeFile(path.join(workspaceRoot, "src", "app.ts"), "const name = 'old';\n", "utf8");

  return workspaceRoot;
}

describe("AgentLoop", () => {
  it("executes read/list/edit tool requests and then returns a normal response", async () => {
    const workspaceRoot = await createWorkspace();
    const modelClient = new MockModelClient([
      'tool: list_files({"path":"."})',
      'tool: read_file({"filename":"README.md"})',
      'tool: edit_file({"filename":"src/app.ts","old_str":"old","new_str":"new"})',
      "Updated src/app.ts."
    ]);
    const loop = new AgentLoop({ modelClient, toolContext: { workspaceRoot } });

    const result = await loop.runUserTurn("Inspect and update the sample repo.");

    assert.equal(result.assistantResponse, "Updated src/app.ts.");
    assert.equal(result.toolResults.length, 3);
    assert.deepEqual(
      result.toolResults.map((toolResult) => toolResult.status === "ok" ? toolResult.tool : "error"),
      ["list_files", "read_file", "edit_file"]
    );
    assert.equal(await fs.readFile(path.join(workspaceRoot, "src", "app.ts"), "utf8"), "const name = 'new';\n");
    assert.equal(
      result.messages.filter((message) => message.content.startsWith("tool_result(")).length,
      3
    );
  });

  it("appends structured parse errors and continues the inner loop", async () => {
    const workspaceRoot = await createWorkspace();
    const modelClient = new MockModelClient([
      'tool: read_file({"filename":)',
      "I received the parser error."
    ]);
    const loop = new AgentLoop({ modelClient, toolContext: { workspaceRoot } });

    const result = await loop.runUserTurn("Trigger a malformed call.");

    assert.equal(result.toolResults.length, 1);
    assert.equal(result.toolResults[0]?.status, "error");
    assert.equal(
      result.toolResults[0]?.status === "error" ? result.toolResults[0].error.kind : undefined,
      "malformed_json"
    );
    assert.equal(result.assistantResponse, "I received the parser error.");
  });

  it("appends structured unknown tool errors", async () => {
    const modelClient = new MockModelClient([
      'tool: run_shell({"cmd":"pwd"})',
      "I cannot use that tool."
    ]);
    const loop = new AgentLoop({ modelClient });

    const result = await loop.runUserTurn("Try an unknown tool.");

    assert.equal(
      result.toolResults[0]?.status === "error" ? result.toolResults[0].error.kind : undefined,
      "unknown_tool"
    );
  });

  it("appends structured missing args errors", async () => {
    const modelClient = new MockModelClient(["tool: list_files([])", "I will retry with object args."]);
    const loop = new AgentLoop({ modelClient });

    const result = await loop.runUserTurn("Try missing args.");

    assert.equal(
      result.toolResults[0]?.status === "error" ? result.toolResults[0].error.kind : undefined,
      "missing_args"
    );
  });

  it("appends structured tool failure errors", async () => {
    const workspaceRoot = await createWorkspace();
    const modelClient = new MockModelClient([
      'tool: read_file({"filename":"missing.txt"})',
      "The file is missing."
    ]);
    const loop = new AgentLoop({ modelClient, toolContext: { workspaceRoot } });

    const result = await loop.runUserTurn("Read a missing file.");

    assert.equal(
      result.toolResults[0]?.status === "error" ? result.toolResults[0].error.kind : undefined,
      "tool_failure"
    );
  });

  it("caps tool iterations per user turn", async () => {
    const workspaceRoot = await createWorkspace();
    const modelClient = new MockModelClient([
      'tool: list_files({"path":"."})',
      "Stopped after limit."
    ]);
    const loop = new AgentLoop({ modelClient, toolContext: { workspaceRoot }, maxToolIterations: 1 });

    const result = await loop.runUserTurn("Keep listing.");
    const finalToolResult = result.toolResults.at(-1);

    assert.equal(
      finalToolResult?.status === "error" ? finalToolResult.error.kind : undefined,
      "tool_iteration_limit"
    );
    assert.equal(result.assistantResponse, "Stopped after limit.");
  });
});

describe("runOuterUserLoop", () => {
  it("runs repeated user turns until input returns null", async () => {
    const inputs = ["hello", null] as Array<string | null>;
    const outputs: string[] = [];
    const modelClient = new MockModelClient(["first response"]);

    await runOuterUserLoop({
      modelClient,
      readUserInput: async () => inputs.shift() ?? null,
      writeAssistantOutput: (content) => {
        outputs.push(content);
      }
    });

    assert.deepEqual(outputs, ["first response"]);
  });
});
