import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { promisify } from "node:util";

import { parseArgs } from "./cli.js";

const execFileAsync = promisify(execFile);
const distDir = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(distDir, "cli.js");

describe("CLI", () => {
  it("parses --cwd, --model, and command flags", () => {
    assert.deepEqual(parseArgs(["--cwd", "sample", "--model", "gpt-test", "--version"]), {
      status: "ok",
      command: "--version",
      model: "gpt-test",
      cwd: "sample"
    });
  });

  it("rejects an empty --cwd value", () => {
    assert.deepEqual(parseArgs(["--cwd="]), {
      status: "error",
      message: "--cwd requires a non-empty value."
    });
  });

  it("prints help with the cwd flag", async () => {
    const { stdout } = await execFileAsync(process.execPath, [cliPath, "--help"]);

    assert.match(stdout, /--cwd <path>/);
  });

  it("fails clearly when --cwd does not exist", async () => {
    const missingPath = path.join(os.tmpdir(), `beauford-missing-${Date.now()}`);

    await assert.rejects(
      () =>
        execFileAsync(process.execPath, [cliPath, "--cwd", missingPath], {
          env: { ...process.env, OPENAI_API_KEY: "sk-test-key" }
        }),
      (error: unknown) => {
        assert(error instanceof Error);
        assert.match("stderr" in error ? String(error.stderr) : "", /Workspace root does not exist/);
        return true;
      }
    );
  });

  it("accepts --cwd for a clean EOF smoke", async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "beauford-cli-"));
    const { stdout } = await runCliWithClosedStdin(
      ["--cwd", workspaceRoot, "--model", "gpt-test"],
      { ...process.env, OPENAI_API_KEY: "sk-test-key" }
    );

    assert.match(stdout, new RegExp(`Workspace: ${escapeRegExp(workspaceRoot)}`));
    assert.match(stdout, /Session ended/);
  });
});

async function runCliWithClosedStdin(
  args: string[],
  env: NodeJS.ProcessEnv
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      env,
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
        return;
      }

      reject(new Error(`CLI exited with ${code}: ${stderr}`));
    });
    child.stdin.end();
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
