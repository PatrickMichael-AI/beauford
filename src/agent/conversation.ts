export type BeaufordRole = "system" | "user" | "assistant";

export type BeaufordMessage = {
  role: BeaufordRole;
  content: string;
};

export type ConversationInit = {
  systemPrompt: string;
  messages?: BeaufordMessage[];
};

export class Conversation {
  private readonly messages: BeaufordMessage[];

  constructor(init: ConversationInit) {
    this.messages = [{ role: "system", content: init.systemPrompt }, ...(init.messages ?? [])];
  }

  addUserMessage(content: string): void {
    this.messages.push({ role: "user", content });
  }

  addAssistantMessage(content: string): void {
    this.messages.push({ role: "assistant", content });
  }

  addToolResult(result: unknown): void {
    this.messages.push({
      role: "user",
      content: `tool_result(${JSON.stringify(result)})`
    });
  }

  snapshot(): BeaufordMessage[] {
    return this.messages.map((message) => ({ ...message }));
  }
}
