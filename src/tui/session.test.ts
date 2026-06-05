import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { type BeaufordMessage } from "../agent/conversation.js";
import { type ModelClient } from "../agent/loop.js";
import { runTerminalSession } from "./session.js";

class MockModelClient implements ModelClient {
  private responseIndex = 0;

  constructor(private readonly responses: string[]) {}

  async complete(messages: BeaufordMessage[]): Promise<string> {
    void messages;
    const response = this.responses[this.responseIndex];
    this.responseIndex += 1;

    return response ?? "Done.";
  }
}

async function createWorkspace(): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "beauford-tui-"));
  await fs.writeFile(path.join(workspaceRoot, "README.md"), "hello\n", "utf8");

  return workspaceRoot;
}

describe("runTerminalSession", () => {
  it("runs repeated turns and prints assistant output", async () => {
    const outputs: string[] = [];
    const inputs = ["first", "second", null] as Array<string | null>;

    await runTerminalSession({
      modelClient: new MockModelClient(["First response.", "Second response."]),
      readUserInput: async () => inputs.shift() ?? null,
      writeLine: (line) => {
        outputs.push(line);
      }
    });

    assert(outputs.includes("assistant: First response."));
    assert(outputs.includes("assistant: Second response."));
    assert(outputs.includes("Session ended."));
  });

  it("shows tool activity for successful tool calls", async () => {
    const workspaceRoot = await createWorkspace();
    const outputs: string[] = [];
    const inputs = ["list files", null] as Array<string | null>;

    await runTerminalSession({
      modelClient: new MockModelClient(['tool: list_files({"path":"."})', "Done listing."]),
      toolContext: { workspaceRoot },
      readUserInput: async () => inputs.shift() ?? null,
      writeLine: (line) => {
        outputs.push(line);
      }
    });

    assert(outputs.some((line) => line.startsWith("[tool ok] list_files")));
    assert(outputs.includes("assistant: Done listing."));
  });

  it("shows structured errors for malformed tool calls", async () => {
    const outputs: string[] = [];
    const inputs = ["bad tool", null] as Array<string | null>;

    await runTerminalSession({
      modelClient: new MockModelClient(['tool: read_file({"filename":)', "Parser error received."]),
      readUserInput: async () => inputs.shift() ?? null,
      writeLine: (line) => {
        outputs.push(line);
      }
    });

    assert(outputs.some((line) => line.includes("[tool error] malformed_json")));
    assert(outputs.includes("assistant: Parser error received."));
  });

  it("exits cleanly on immediate EOF", async () => {
    const outputs: string[] = [];

    await runTerminalSession({
      modelClient: new MockModelClient(["unused"]),
      readUserInput: async () => null,
      writeLine: (line) => {
        outputs.push(line);
      }
    });

    assert.deepEqual(outputs, ["Beauford terminal session ready.", "Session ended."]);
  });

  it("previews edit_file writes and cancels when the user denies confirmation", async () => {
    const workspaceRoot = await createWorkspace();
    const outputs: string[] = [];
    const inputs = ["edit readme", null] as Array<string | null>;
    const previews: string[] = [];

    await runTerminalSession({
      modelClient: new MockModelClient([
        'tool: edit_file({"filename":"README.md","old_str":"hello","new_str":"changed"})',
        "Edit was cancelled."
      ]),
      toolContext: { workspaceRoot },
      readUserInput: async () => inputs.shift() ?? null,
      writeLine: (line) => {
        outputs.push(line);
      },
      confirmEdit: (preview) => {
        previews.push(preview.preview);
        return false;
      }
    });

    assert(previews.some((preview) => preview.includes("hello") && preview.includes("changed")));
    assert(outputs.some((line) => line.startsWith("[tool ok] edit_file")));
    assert.equal(await fs.readFile(path.join(workspaceRoot, "README.md"), "utf8"), "hello\n");
  });

  it("does not print API key-shaped input values from the session layer", async () => {
    const outputs: string[] = [];
    const secret = "sk-test-key";

    await runTerminalSession({
      modelClient: new MockModelClient(["Response without secret."]),
      readUserInput: async () => null,
      writeLine: (line) => {
        outputs.push(line);
      }
    });

    assert.equal(outputs.some((line) => line.includes(secret)), false);
  });
});
