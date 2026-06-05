import { editFile, type EditFileArgs, type EditFileResult } from "./edit-file.js";
import { listFiles, type ListFilesArgs, type ListFilesResult } from "./list-files.js";
import { type ToolContext } from "./path.js";
import { readFile, type ReadFileArgs, type ReadFileResult } from "./read-file.js";

export type ToolHandler<TArgs, TResult> = (
  args: TArgs,
  context: ToolContext
) => Promise<TResult>;

export type BeaufordTool<TArgs = unknown, TResult = unknown> = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: ToolHandler<TArgs, TResult>;
};

export const toolRegistry = {
  read_file: {
    name: "read_file",
    description: "Read a UTF-8 file from the current workspace.",
    parameters: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Workspace-relative file path to read." }
      },
      required: ["filename"]
    },
    handler: readFile
  } satisfies BeaufordTool<ReadFileArgs, ReadFileResult>,
  list_files: {
    name: "list_files",
    description: "List files and directories in a workspace directory.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Workspace-relative directory path to list." }
      },
      required: ["path"]
    },
    handler: listFiles
  } satisfies BeaufordTool<ListFilesArgs, ListFilesResult>,
  edit_file: {
    name: "edit_file",
    description:
      "Create, overwrite, or edit a UTF-8 file. When old_str is empty, write new_str as the full file content. Otherwise replace the first exact old_str match.",
    parameters: {
      type: "object",
      properties: {
        filename: { type: "string", description: "Workspace-relative file path to edit." },
        old_str: { type: "string", description: "Exact text to replace, or empty to write the file." },
        new_str: { type: "string", description: "Replacement text or full file content." }
      },
      required: ["filename", "old_str", "new_str"]
    },
    handler: editFile
  } satisfies BeaufordTool<EditFileArgs, EditFileResult>
} as const;

export type ToolName = keyof typeof toolRegistry;
