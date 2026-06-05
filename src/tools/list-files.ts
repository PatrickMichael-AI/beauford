import type { Dirent } from "node:fs";
import fs from "node:fs/promises";

import { resolveWorkspacePath, type ToolContext } from "./path.js";

export type ListFilesArgs = {
  path: string;
};

export type DirectoryEntry = {
  filename: string;
  type: "file" | "dir";
};

export type ListFilesResult = {
  path: string;
  entries: DirectoryEntry[];
};

export async function listFiles(
  args: ListFilesArgs,
  context: ToolContext = {}
): Promise<ListFilesResult> {
  const directoryPath = await resolveWorkspacePath(args.path, context);
  let entries: Dirent[];

  try {
    entries = await fs.readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new Error(`Directory not found: ${args.path}`);
    }

    if (isNotDirectoryError(error)) {
      throw new Error(`Path is not a directory: ${args.path}`);
    }

    throw error;
  }

  return {
    path: directoryPath,
    entries: entries.map((entry) => ({
      filename: entry.name,
      type: entry.isDirectory() ? "dir" : "file"
    }))
  };
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function isNotDirectoryError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOTDIR";
}
