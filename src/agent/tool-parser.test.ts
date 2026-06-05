import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseToolInvocations } from "./tool-parser.js";

const KNOWN_TOOLS = ["read_file", "list_files", "edit_file"];

describe("parseToolInvocations", () => {
  it("parses compact JSON tool calls", () => {
    const result = parseToolInvocations('tool: read_file({"filename":"README.md"})', KNOWN_TOOLS);

    assert.equal(result.length, 1);
    assert.equal(result[0]?.status, "ok");
    assert.deepEqual(result[0]?.status === "ok" ? result[0].invocation.args : undefined, {
      filename: "README.md"
    });
  });

  it("ignores normal multiline assistant text", () => {
    const result = parseToolInvocations(
      'I will inspect this first.\ntool: list_files({"path":"."})\nThen I will continue.',
      KNOWN_TOOLS
    );

    assert.equal(result.length, 1);
    assert.equal(result[0]?.status, "ok");
  });

  it("returns malformed_json errors", () => {
    const result = parseToolInvocations('tool: read_file({"filename":)', KNOWN_TOOLS);

    assert.equal(result[0]?.status, "error");
    assert.equal(result[0]?.status === "error" ? result[0].error.kind : undefined, "malformed_json");
  });

  it("returns unknown_tool errors", () => {
    const result = parseToolInvocations('tool: run_shell({"cmd":"pwd"})', KNOWN_TOOLS);

    assert.equal(result[0]?.status, "error");
    assert.equal(result[0]?.status === "error" ? result[0].error.kind : undefined, "unknown_tool");
  });

  it("returns missing_args errors when args are not an object", () => {
    const result = parseToolInvocations("tool: list_files(null)", KNOWN_TOOLS);

    assert.equal(result[0]?.status, "error");
    assert.equal(result[0]?.status === "error" ? result[0].error.kind : undefined, "missing_args");
  });

  it("returns no results when there are no tool lines", () => {
    assert.deepEqual(parseToolInvocations("No tools needed.", KNOWN_TOOLS), []);
  });
});
