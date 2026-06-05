# CRITICAL RULES - MUST FOLLOW

## RESPONSES

- Keep responses concise and to the point - unless the user asks otherwise

## PLANNING MODE

- Always ask clarifying questions
- Never assume design, tech stack or features
- Use deep-dive sub-agents to assist with research
- Use deep-dive sub-agents to review the different aspects of your plan before presenting to the user

## CHANGE / EDIT MODE

- Never implement features yourself when possible - use sub-agents!
- Identify changes from the plan that can be implemented in parallel, and use sub-agents to implement the features efficiently
- When using sub-agents to implement features, act as a coordinator only
- Use the best model for the task - premium models for complex tasks (like coding) and mid-tier models for simpler tasks, like documentation
- After completing features (large or small), always run commands like lint, type check and next build to check code quality

## SUB-AGENT DELEGATION

- In tools that support explicit agent/model selection, always specify both the Beauford sub-agent and the intended model.
- Use `beauford-feature-planner` for planning/checklists, `beauford-implementation-engineer` for code changes, and `beauford-senior-code-reviewer` for review.
- Keep the parent agent as the orchestrator: delegate code changes, fix rounds, and review passes instead of doing them in the parent context.
- On reviewer FAIL, send only the must-fix list to a new implementation sub-agent, then run a new senior-review pass. Repeat until PASS.
- If a sub-agent launch fails, retry once with the correct agent/model. If it fails again, stop and report the blocker.
- Mark plan checklist items complete only after reviewer PASS and required verification passes or is explicitly reported; mark both the phase tracker and the phase detail items.
- Implement one plan phase at a time unless parallel phase work is explicitly scoped.
- When resuming work, trust the plan checklist and current repo state over prior chat memory.

## DATABASE SCHEMA CHANGES

- Whenever you make changes to the database schema, ALWAYS run the drizzle generate and migrate commands
- NEVER run drizzle push!
- For all ID columns NOT related to BetterAuth, use UUID for the ID columns and be randomly generated

## TESTING

- Use any testing tools, libraries available to the project for testing your changes
- Never assume your changes simply work, always test!
- If the project does not have any testing tools, scripts, MCP tools, skills, etc. available for testing, ask the user whether testing should be skipped.

## UI DESIGN

- Always follow the UI design system when creating or reviewing components or pages.
- Design System: @DESIGN.md
