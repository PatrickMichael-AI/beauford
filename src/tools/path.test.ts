import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { PathResolutionError, resolveWorkspacePath } from "./path.js";

async function createWorkspace(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "beauford-tools-"));
}

describe("resolveWorkspacePath", () => {
  it("resolves relative paths from the workspace root", async () => {
    const workspaceRoot = await createWorkspace();

    assert.equal(
      await resolveWorkspacePath("src/index.ts", { workspaceRoot }),
      path.join(workspaceRoot, "src", "index.ts")
    );
  });

  it("rejects paths outside the workspace root", async () => {
    const workspaceRoot = await createWorkspace();

    await assert.rejects(
      () => resolveWorkspacePath("../outside.txt", { workspaceRoot }),
      PathResolutionError
    );
  });

  it("allows outside-root paths when explicitly configured", async () => {
    const workspaceRoot = await createWorkspace();
    const outsidePath = path.resolve(workspaceRoot, "..", "outside.txt");

    assert.equal(
      await resolveWorkspacePath("../outside.txt", {
        workspaceRoot,
        allowOutsideRoot: true
      }),
      outsidePath
    );
  });

  it("rejects existing symlinks that resolve outside the workspace root", async () => {
    const workspaceRoot = await createWorkspace();
    const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), "beauford-outside-"));
    await fs.writeFile(path.join(outsideRoot, "outside.txt"), "outside\n", "utf8");
    await fs.symlink(path.join(outsideRoot, "outside.txt"), path.join(workspaceRoot, "linked.txt"));

    await assert.rejects(
      () => resolveWorkspacePath("linked.txt", { workspaceRoot }),
      PathResolutionError
    );
  });

  it("rejects new paths whose nearest existing parent resolves outside the workspace root", async () => {
    const workspaceRoot = await createWorkspace();
    const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), "beauford-outside-"));
    await fs.symlink(outsideRoot, path.join(workspaceRoot, "linked-dir"));

    await assert.rejects(
      () => resolveWorkspacePath("linked-dir/new.txt", { workspaceRoot }),
      PathResolutionError
    );
  });
});
