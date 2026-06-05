import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { editFile } from "./edit-file.js";
import { listFiles, type DirectoryEntry } from "./list-files.js";
import { readFile } from "./read-file.js";
import { toolRegistry } from "./registry.js";

async function createWorkspace(): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "beauford-tools-"));
  await fs.mkdir(path.join(workspaceRoot, "src"));
  await fs.writeFile(path.join(workspaceRoot, "README.md"), "hello beauford\n", "utf8");
  await fs.writeFile(path.join(workspaceRoot, "src", "app.ts"), "const name = 'old';\n", "utf8");

  return workspaceRoot;
}

describe("Emperor tools", () => {
  it("reads UTF-8 file content", async () => {
    const workspaceRoot = await createWorkspace();
    const result = await readFile({ filename: "README.md" }, { workspaceRoot });

    assert.equal(result.file_path, path.join(workspaceRoot, "README.md"));
    assert.equal(result.content, "hello beauford\n");
  });

  it("lists directory entries as files or dirs", async () => {
    const workspaceRoot = await createWorkspace();
    const result = await listFiles({ path: "." }, { workspaceRoot });

    assert.deepEqual(
      [...result.entries].sort((left: DirectoryEntry, right: DirectoryEntry) =>
        left.filename.localeCompare(right.filename)
      ),
      [
        { filename: "README.md", type: "file" },
        { filename: "src", type: "dir" }
      ]
    );
  });

  it("creates or overwrites when old_str is empty", async () => {
    const workspaceRoot = await createWorkspace();
    const result = await editFile(
      { filename: "notes.txt", old_str: "", new_str: "created\n" },
      { workspaceRoot }
    );

    assert.equal(result.status, "created_or_overwritten");
    assert.equal(await fs.readFile(path.join(workspaceRoot, "notes.txt"), "utf8"), "created\n");
  });

  it("replaces the first exact old_str match", async () => {
    const workspaceRoot = await createWorkspace();
    await fs.writeFile(path.join(workspaceRoot, "repeat.txt"), "old old old", "utf8");

    const result = await editFile(
      { filename: "repeat.txt", old_str: "old", new_str: "new" },
      { workspaceRoot }
    );

    assert.equal(result.status, "replaced");
    assert.equal(await fs.readFile(path.join(workspaceRoot, "repeat.txt"), "utf8"), "new old old");
  });

  it("returns old_str not found without editing content", async () => {
    const workspaceRoot = await createWorkspace();

    const result = await editFile(
      { filename: "src/app.ts", old_str: "missing", new_str: "replacement" },
      { workspaceRoot }
    );

    assert.equal(result.status, "old_str not found");
    assert.equal(result.message, "old_str was not found in src/app.ts; no edit was applied.");
    assert.equal(
      await fs.readFile(path.join(workspaceRoot, "src", "app.ts"), "utf8"),
      "const name = 'old';\n"
    );
  });

  it("reports missing files clearly", async () => {
    const workspaceRoot = await createWorkspace();

    await assert.rejects(
      () => readFile({ filename: "missing.txt" }, { workspaceRoot }),
      /File not found: missing\.txt/
    );
  });

  it("reports missing directories clearly", async () => {
    const workspaceRoot = await createWorkspace();

    await assert.rejects(
      () => listFiles({ path: "missing-dir" }, { workspaceRoot }),
      /Directory not found: missing-dir/
    );
  });

  it("reports missing edit targets clearly", async () => {
    const workspaceRoot = await createWorkspace();

    await assert.rejects(
      () =>
        editFile(
          { filename: "missing.txt", old_str: "old", new_str: "new" },
          { workspaceRoot }
        ),
      /File not found for edit: missing\.txt/
    );
  });

  it("exports explicit registry metadata and handlers", () => {
    assert.deepEqual(Object.keys(toolRegistry), ["read_file", "list_files", "edit_file"]);
    assert.equal(toolRegistry.read_file.name, "read_file");
    assert.equal(typeof toolRegistry.edit_file.handler, "function");
  });

  it("rejects read_file through an outside-root symlink", async () => {
    const workspaceRoot = await createWorkspace();
    const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), "beauford-outside-"));
    await fs.writeFile(path.join(outsideRoot, "secret.txt"), "outside\n", "utf8");
    await fs.symlink(path.join(outsideRoot, "secret.txt"), path.join(workspaceRoot, "secret.txt"));

    await assert.rejects(() => readFile({ filename: "secret.txt" }, { workspaceRoot }));
  });

  it("allows read_file through an outside-root symlink when explicitly configured", async () => {
    const workspaceRoot = await createWorkspace();
    const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), "beauford-outside-"));
    await fs.writeFile(path.join(outsideRoot, "allowed.txt"), "outside\n", "utf8");
    await fs.symlink(path.join(outsideRoot, "allowed.txt"), path.join(workspaceRoot, "allowed.txt"));

    const result = await readFile(
      { filename: "allowed.txt" },
      { workspaceRoot, allowOutsideRoot: true }
    );

    assert.equal(result.content, "outside\n");
  });

  it("rejects list_files through an outside-root directory symlink", async () => {
    const workspaceRoot = await createWorkspace();
    const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), "beauford-outside-"));
    await fs.writeFile(path.join(outsideRoot, "secret.txt"), "outside\n", "utf8");
    await fs.symlink(outsideRoot, path.join(workspaceRoot, "outside-dir"));

    await assert.rejects(() => listFiles({ path: "outside-dir" }, { workspaceRoot }));
  });

  it("allows list_files through an outside-root directory symlink when explicitly configured", async () => {
    const workspaceRoot = await createWorkspace();
    const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), "beauford-outside-"));
    await fs.writeFile(path.join(outsideRoot, "allowed.txt"), "outside\n", "utf8");
    await fs.symlink(outsideRoot, path.join(workspaceRoot, "allowed-dir"));

    const result = await listFiles(
      { path: "allowed-dir" },
      { workspaceRoot, allowOutsideRoot: true }
    );

    assert.deepEqual(result.entries, [{ filename: "allowed.txt", type: "file" }]);
  });

  it("rejects edit_file replacement through an outside-root symlink", async () => {
    const workspaceRoot = await createWorkspace();
    const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), "beauford-outside-"));
    await fs.writeFile(path.join(outsideRoot, "target.txt"), "old\n", "utf8");
    await fs.symlink(path.join(outsideRoot, "target.txt"), path.join(workspaceRoot, "target.txt"));

    await assert.rejects(() =>
      editFile({ filename: "target.txt", old_str: "old", new_str: "new" }, { workspaceRoot })
    );
    assert.equal(await fs.readFile(path.join(outsideRoot, "target.txt"), "utf8"), "old\n");
  });

  it("rejects edit_file create paths under an outside-root directory symlink", async () => {
    const workspaceRoot = await createWorkspace();
    const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), "beauford-outside-"));
    await fs.symlink(outsideRoot, path.join(workspaceRoot, "outside-dir"));

    await assert.rejects(() =>
      editFile(
        { filename: "outside-dir/created.txt", old_str: "", new_str: "outside\n" },
        { workspaceRoot }
      )
    );
  });

  it("allows edit_file through an outside-root symlink when explicitly configured", async () => {
    const workspaceRoot = await createWorkspace();
    const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), "beauford-outside-"));
    await fs.writeFile(path.join(outsideRoot, "allowed.txt"), "old\n", "utf8");
    await fs.symlink(path.join(outsideRoot, "allowed.txt"), path.join(workspaceRoot, "allowed.txt"));

    const result = await editFile(
      { filename: "allowed.txt", old_str: "old", new_str: "new" },
      { workspaceRoot, allowOutsideRoot: true }
    );

    assert.equal(result.status, "replaced");
    assert.equal(await fs.readFile(path.join(outsideRoot, "allowed.txt"), "utf8"), "new\n");
  });
});
