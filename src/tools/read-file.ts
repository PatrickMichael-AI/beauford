import fs from "node:fs/promises";

import { resolveWorkspacePath, type ToolContext } from "./path.js";

export type ReadFileArgs = {
  filename: string;
};

export type ReadFileResult = {
  file_path: string;
  content: string;
};

export async function readFile(
  args: ReadFileArgs,
  context: ToolContext = {}
): Promise<ReadFileResult> {
  const filePath = await resolveWorkspacePath(args.filename, context);
  let content: string;

  try {
    content = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new Error(`File not found: ${args.filename}`);
    }

    throw error;
  }

  return {
    file_path: filePath,
    content
  };
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
