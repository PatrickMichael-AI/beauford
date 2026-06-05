import path from "node:path";
import fs from "node:fs/promises";

export type ToolContext = {
  workspaceRoot?: string;
  allowOutsideRoot?: boolean;
};

export class PathResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathResolutionError";
  }
}

export async function resolveWorkspacePath(pathInput: string, context: ToolContext = {}): Promise<string> {
  if (pathInput.trim() === "") {
    throw new PathResolutionError("Path must not be empty.");
  }

  const workspaceRoot = path.resolve(context.workspaceRoot ?? process.cwd());
  const resolvedPath = path.resolve(workspaceRoot, pathInput);

  if (context.allowOutsideRoot) {
    return resolvedPath;
  }

  if (isOutsideRoot(resolvedPath, workspaceRoot)) {
    throw new PathResolutionError(`Path is outside the allowed workspace root: ${pathInput}`);
  }

  const realWorkspaceRoot = await fs.realpath(workspaceRoot);
  const realPathForContainment = await realpathForContainment(resolvedPath);

  if (isOutsideRoot(realPathForContainment, realWorkspaceRoot)) {
    throw new PathResolutionError(`Path resolves outside the allowed workspace root: ${pathInput}`);
  }

  return resolvedPath;
}

async function realpathForContainment(resolvedPath: string): Promise<string> {
  try {
    return await fs.realpath(resolvedPath);
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }

  return findNearestExistingAncestor(path.dirname(resolvedPath));
}

async function findNearestExistingAncestor(startPath: string): Promise<string> {
  let currentPath = startPath;

  while (true) {
    try {
      return await fs.realpath(currentPath);
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
      }
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      throw new PathResolutionError(`No existing parent directory for path: ${startPath}`);
    }

    currentPath = parentPath;
  }
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function isOutsideRoot(resolvedPath: string, workspaceRoot: string): boolean {
  const relativePath = path.relative(workspaceRoot, resolvedPath);

  return (
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  );
}
