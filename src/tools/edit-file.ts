import fs from "node:fs/promises";

import { resolveWorkspacePath, type ToolContext } from "./path.js";

export type EditFileArgs = {
  filename: string;
  old_str: string;
  new_str: string;
};

export type EditFileResult = {
  file_path: string;
  status: "created_or_overwritten" | "replaced" | "old_str not found";
  message?: string;
};

export async function editFile(
  args: EditFileArgs,
  context: ToolContext = {}
): Promise<EditFileResult> {
  const filePath = await resolveWorkspacePath(args.filename, context);

  if (args.old_str === "") {
    await fs.writeFile(filePath, args.new_str, "utf8");

    return {
      file_path: filePath,
      status: "created_or_overwritten"
    };
  }

  let content: string;

  try {
    content = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new Error(`File not found for edit: ${args.filename}`);
    }

    throw error;
  }
  const matchIndex = content.indexOf(args.old_str);

  if (matchIndex === -1) {
    return {
      file_path: filePath,
      status: "old_str not found",
      message: `old_str was not found in ${args.filename}; no edit was applied.`
    };
  }

  const updatedContent =
    content.slice(0, matchIndex) +
    args.new_str +
    content.slice(matchIndex + args.old_str.length);

  await fs.writeFile(filePath, updatedContent, "utf8");

  return {
    file_path: filePath,
    status: "replaced"
  };
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
