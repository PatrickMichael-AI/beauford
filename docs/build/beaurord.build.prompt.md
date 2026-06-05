# Master Build Prompt Template

```markdown
# Building Beauford

**Prompt ID:** BEA-1
**Dependencies:**
**Estimated Tokens:** 1000 - 1500
**Output Files:** docs/beauford/beauford.build.plan.md
**Framework:**

**Purpose:** To build Beauford.

# Context

We are building Beauford, which is our own agentic Terminal UI coding harness. Beauford initial build is based on the files in .context/beauford/ which is a local copy of [The Emperor Has No Clothes](https://www.mihaileric.com/The-Emperor-Has-No-Clothes/).

You will understand the source (Input Context) and then initiate the build witht the Initial Prompt.

## Initial Prompt

Create a Terminal UI following the philosophy of Input Context and the rules of [The Emperor Has No Clothes](https://www.mihaileric.com/The-Emperor-Has-No-Clothes/). Our tool is called Beauford. Instead of using Python, use Typescript. Users will npm install the CLI tool and they shold be able to start the tool running the command `beauford`. For all AI inferences, user should be able to log in with their OpenAI API key.

Our OpenAI API (OPENAI_API_KEY) key is available via direenv.

## Input Context - Read These Files

**Source Files:**
.context/beauford/

# Task

1. Read and understand the source files.
2. Create a plan to build Beauford usitn the Initial Prompt as the initiation point.
4. Use the `phased-checklist-from-plan` skill to create a phased checklist from the plan.
5. Rate the output using the Quality Rubric below.
7. Output using format below.

# Output

## Quality Rubric

Rate your own output before submitting to ensure it meets the Patrick Michael Sovereign Stack elite standard. Target Score must be 9/10 or higher.

**Structure & Build Plan Document (3 points):**

- [ ] **Output Pathing/Formatting:** The output strictly follows the `<begin output format LOCAL ENVIRONMENT ONLY>` wrapper and writes to `docs/beauford/beauford.build.plan.md[output]` (slug `beauford.build.plan.md`), not another docs path.
- [ ] **Plan Shape:** The document separates **source mental model** (Emperor Has No Clothes agent loop from `.context/beauford/`) from **Beauford target contract** (TypeScript CLI, `beauford` command, OpenAI auth) from **phased implementation** with file touchpoints and verification—not a generic “build an AI tool” essay.
- [ ] **Scope Boundary:** The plan stays scoped to building Beauford as the agentic Terminal UI coding harness described in Context and the Initial Prompt, and does not drift into unrelated repo features (Leonardo, inbox, Drupal, copy matrices, etc.) unless explicitly required for Beauford integration.

**Content & Beauford / Emperor Grounding (4 points):**

- [ ] **Required Input Reads:** The plan demonstrably synthesizes `.context/beauford/`—including `the-emperor-has-no-clothes-how-to-code-claude-code-in-200-li.md` and `origin/beauford_origin.py`—so architecture reflects the tutorial’s tool loop (read, list, edit), `tool:` invocation parsing, and `tool_result(...)` conversation pattern.
- [ ] **Initial Prompt Contract:** The plan explicitly maps Initial Prompt non-negotiables: **TypeScript** (not Python), **npm-installable CLI** invokable as `beauford`, **Terminal UI** aligned with Emperor philosophy, and **OpenAI API key** authentication for all AI inferences (with `OPENAI_API_KEY` via direnv called out where relevant).
- [ ] **Core Capability Coverage:** The plan names how Beauford will implement the three baseline tools (`read_file`, `list_files`, `edit_file`), path resolution, tool registry/docstring-driven system prompt, inner/outer agent loops, and how TypeScript packaging exposes the `beauford` binary—grounded in the origin reference, not invented from scratch.
- [ ] **Phased Checklist Protocol:** The plan requires an appended **Phased Checklist** produced with the `phased-checklist-from-plan` skill (phase tracker + checkbox items tied to plan phases), matching Task step 4.

**Completeness & Protocol (3 points):**

- [ ] **Traceability & Verification:** Each implementation phase maps to concrete deliverables (package layout, CLI entry, tool modules, OpenAI client, TUI loop) with verification steps (e.g. `npm install`, `beauford` starts, tool loop executes read/list/edit against a sample repo).
- [ ] **Deliverable Completeness:** The plan covers both the written build plan **and** the phased checklist artifact implied by the Task list—not only high-level vision without executable phases.
- [ ] **Self-Evaluation Execution:** This Quality Matrix is applied to the drafted plan with binary checkmarks and meets the `9/10 or higher` threshold before **Sequence Complete**.

**Output Target Score: 9/10 or higher**

<begin output format LOCAL ENVIRONMENT ONLY>
# beauford.build.plan.md

Output to docs/beauford/beauford.build.plan.md[output]
</end output format LOCAL ENVIRONMENT ONLY>

<begin output format ONLINE ENVIRONMENT ONLY>

NA

</end output format ONLINE ENVIRONMENT ONLY>

**Sequence Complete** [Output confirmation]

</end output format>

# Notes

- The quality of your output is vital
- Before outputting, ask if this is best
```
