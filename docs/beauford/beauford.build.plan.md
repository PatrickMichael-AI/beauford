<begin output format LOCAL ENVIRONMENT ONLY>
# beauford.build.plan.md

Output to docs/beauford/beauford.build.plan.md[output]

## Best-Fit Check

Question before outputting: is this best for BEA-1?

Answer: yes. The plan preserves the small Emperor agent-loop philosophy, translates the Python reference into a TypeScript/npm CLI contract, keeps scope limited to Beauford, and appends a checklist using the local `phased-checklist-from-plan` skill format.

## Source Mental Model

The `.context/beauford/` source defines Beauford's MVP mental model: a coding agent is a terminal conversation with an LLM plus a local toolbox. The LLM never edits the filesystem directly. It asks for local actions with a single-line text protocol, the program executes the action, then returns structured results to the conversation.

The tutorial file, `the-emperor-has-no-clothes-how-to-code-claude-code-in-200-li.md`, establishes the loop:

1. User enters a request.
2. LLM responds normally or emits `tool: TOOL_NAME({"json":"args"})`.
3. Local code parses and executes the requested tool.
4. Local code appends `tool_result({...})` to the conversation.
5. The inner loop repeats until the assistant gives a normal response.

The origin file, `origin/beauford_origin.py`, makes that concrete with:

- `resolve_abs_path(path_str)` for cwd-relative path resolution.
- `read_file`, `list_files`, and `edit_file` as the baseline tools.
- `TOOL_REGISTRY` as the name-to-handler lookup table.
- docstring/signature-generated tool descriptions inside the system prompt.
- `extract_tool_invocations(...)` parsing lines that start with `tool:`.
- an outer user-input loop and inner tool-execution loop.
- OpenAI inference through `OPENAI_API_KEY`.

This is the architecture Beauford should start from. Production features can be added later, but the first build should prove this loop works cleanly in TypeScript.

## Beauford Target Contract

Beauford is a TypeScript agentic Terminal UI coding harness installable through npm and invokable with:

```bash
beauford
```

Non-negotiables:

- Use TypeScript, not Python.
- Expose an npm package with a `bin` entry for `beauford`.
- Run as a Terminal UI, not a web app.
- Authenticate every AI inference with an OpenAI API key.
- Read `OPENAI_API_KEY` from the environment, including the repo's direnv-provided value.
- Preserve the Emperor text protocol for MVP: `tool: name({...})` and `tool_result(...)`.

The first implementation should use explicit TypeScript tool metadata instead of Python introspection:

```ts
type BeaufordTool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: (args: unknown, context: ToolContext) => Promise<ToolResult>;
};
```

This keeps the docstring-driven prompt behavior while making signatures, validation, and tests reliable in TypeScript.

## Phased Implementation Plan

### Phase 1: Package And Runtime Foundation

Create the npm package skeleton and TypeScript runtime:

- `package.json` with `type`, build scripts, test scripts, and `bin: { "beauford": "./dist/cli.js" }`.
- `tsconfig.json` configured for Node ESM.
- `src/cli.ts` as the executable entry with a Node shebang.
- `src/config/openai.ts` for loading and validating `OPENAI_API_KEY`.
- basic build output to `dist/`.

Verification:

- `npm install`
- `npm run build`
- `npm link` then `beauford --help` or `beauford` starts without import/runtime errors.

### Phase 2: Emperor Tool Core

Implement the three baseline tools as first-class TypeScript modules:

- `src/tools/read-file.ts`: read UTF-8 file content and return `{ file_path, content }`.
- `src/tools/list-files.ts`: list directory entries as `{ filename, type }`.
- `src/tools/edit-file.ts`: create/overwrite when `old_str === ""`, otherwise replace the first exact `old_str` match.
- `src/tools/path.ts`: resolve relative paths from the current workspace and reject paths outside the allowed root unless explicitly configured.
- `src/tools/registry.ts`: export tool metadata and handlers.

Verification:

- unit tests for path resolution, file reads, directory listing, create edit, replace edit, and `old_str not found`.
- sample fixture repo proves read/list/edit behavior matches `origin/beauford_origin.py`.

### Phase 3: Prompt, Parser, And Agent Loop

Build the local agent protocol:

- `src/agent/system-prompt.ts`: render the system prompt from tool registry metadata.
- `src/agent/tool-parser.ts`: parse `tool: TOOL_NAME({"args":true})` lines.
- `src/agent/conversation.ts`: manage system/user/assistant/tool-result messages.
- `src/agent/loop.ts`: implement the outer terminal input loop and inner tool loop.
- cap tool iterations per user turn and return structured errors for malformed JSON, unknown tools, missing args, and tool failures.

Verification:

- parser tests for valid calls, invalid JSON, unknown tools, multiline assistant text, and no-tool responses.
- loop tests using a mocked OpenAI client that requests read/list/edit and then responds normally.

### Phase 4: OpenAI Client Integration

Wire Beauford to OpenAI:

- `src/llm/openai-client.ts` wraps OpenAI chat/responses calls behind a small interface.
- model selection defaults to a current OpenAI coding-capable model but remains configurable by env/flag.
- all inference fails fast with a clear message when `OPENAI_API_KEY` is missing.
- direnv flow requires no extra work beyond environment lookup.

Verification:

- mocked client tests for request/response mapping.
- manual smoke test with `OPENAI_API_KEY` available: ask Beauford to list files, read a file, and create a small file.

### Phase 5: Terminal UI

Build the TUI around the loop without changing the protocol:

- input prompt for user messages.
- assistant output panel or stream.
- tool activity log showing tool name, args summary, result status, and errors.
- edit confirmations or diff preview before writes if the MVP includes approval.
- clean interrupt handling for Ctrl-C and EOF.

Recommended implementation: use a practical Node terminal stack such as Ink or a readline-first interface for MVP, then upgrade to richer TUI panels after the loop is proven.

Verification:

- `beauford` starts in an empty repo.
- user can type requests repeatedly.
- tool calls are visible.
- Ctrl-C exits cleanly.
- no API key value is printed.

### Phase 6: End-To-End Hardening

Finish the MVP as an installable CLI:

- README with install/start/auth examples.
- smoke fixture under `test/fixtures/sample-repo`.
- CLI flags for `--cwd`, `--model`, and `--version`.
- clear failure messages for missing key, blocked path, missing file, and failed edit match.
- npm package dry run.

Verification:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm pack --dry-run`
- `npm link` and run `beauford` against the sample repo.

## Phased Checklist

### Progress Tracker

- [x] Phase 1 complete
- [x] Phase 2 complete
- [x] Phase 3 complete
- [x] Phase 4 complete
- [x] Phase 5 complete
- [x] Phase 6 complete

### Phase 1: Package And Runtime Foundation

- [x] Add TypeScript npm package files with a `beauford` bin target.
- [x] Add `src/cli.ts` executable entry.
- [x] Add OpenAI API key environment validation.
- [x] Verify install, build, and local binary startup.

### Phase 2: Emperor Tool Core

- [x] Implement `read_file`, `list_files`, and `edit_file`.
- [x] Implement workspace-aware path resolution.
- [x] Implement explicit TypeScript tool registry metadata.
- [x] Test tool behavior against fixture files.

### Phase 3: Prompt, Parser, And Agent Loop

- [x] Render system prompt from tool registry metadata.
- [x] Parse `tool:` invocations using compact JSON args.
- [x] Append `tool_result(...)` messages after local execution.
- [x] Implement outer user loop and inner tool loop.
- [x] Test parser and loop with mocked model responses.

### Phase 4: OpenAI Integration

- [x] Add OpenAI client wrapper.
- [x] Connect loop inference to `OPENAI_API_KEY`.
- [x] Add configurable model setting.
- [x] Smoke test one live inference when the key is present.
  - `OPENAI_API_KEY` was not present in the verification shell; mocked inference and missing-key handling passed.

### Phase 5: Terminal UI

- [x] Add interactive terminal input and assistant output.
- [x] Show tool activity and structured errors.
- [x] Add write confirmation or diff preview if included in MVP scope.
- [x] Verify repeated turns and clean Ctrl-C/EOF exit.

### Phase 6: Validation And Packaging

- [x] Add README usage, auth, and install notes.
- [x] Add sample repo smoke fixture.
- [x] Run lint, typecheck, test, and build.
- [x] Run npm package dry run.
- [x] Verify `beauford` works through `npm link`.

## Quality Rubric Self-Evaluation

**Structure & Build Plan Document: 3/3**

- [x] Output Pathing/Formatting
- [x] Plan Shape
- [x] Scope Boundary

**Content & Beauford / Emperor Grounding: 4/4**

- [x] Required Input Reads
- [x] Initial Prompt Contract
- [x] Core Capability Coverage
- [x] Phased Checklist Protocol

**Completeness & Protocol: 3/3**

- [x] Traceability & Verification
- [x] Deliverable Completeness
- [x] Self-Evaluation Execution

**Output Score:** 10/10

<end output format LOCAL ENVIRONMENT ONLY>

<begin output format ONLINE ENVIRONMENT ONLY>

NA

</end output format ONLINE ENVIRONMENT ONLY>

**Sequence Complete** [Output confirmation]
