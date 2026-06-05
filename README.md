# Beauford

Beauford is a TypeScript/npm terminal coding harness inspired by the small agent loop in _The Emperor Has No Clothes_. The MVP keeps the protocol explicit: the model asks for local tools with `tool: name({...})`, Beauford runs those tools in the workspace, then returns `tool_result(...)` to the conversation.

## Install

```bash
npm install -g beauford
beauford --help
```

For local development:

```bash
npm install --cache ./.npm-cache
npm run build
npm exec --cache ./.npm-cache --package . -- beauford --help
```

## Authentication

Beauford reads `OPENAI_API_KEY` from the environment. In this repo, environment variables are provided by direnv; there is no project `.env` file.

```bash
beauford --check-auth
```

Non-interactive shells may need direnv exported first:

```bash
eval "$(direnv export bash)" && beauford --check-auth
```

Optional model selection:

```bash
BEAUFORD_OPENAI_MODEL=gpt-5.2 beauford
beauford --model gpt-5.2
```

## Usage

Start Beauford in the current directory:

```bash
beauford
```

Start against a specific workspace:

```bash
beauford --cwd ./test/fixtures/sample-repo
```

Current flags:

- `--help`
- `--version`
- `--check-auth`
- `--model <model>`
- `--cwd <path>`

## Current MVP

The MVP includes the baseline Emperor tools:

- `read_file`
- `list_files`
- `edit_file`

File tools are constrained to the workspace root by default, including realpath checks for symlink escapes. `edit_file` previews writes in the terminal and asks for confirmation before applying changes.

Automated tests use mocked OpenAI clients. Live OpenAI checks should be run manually only when `OPENAI_API_KEY` is available.
