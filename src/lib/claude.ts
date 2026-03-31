// Claude API Client for FU Corp CRM

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Context {
  userName?: string;
  userRole?: string;
  brand?: string;
  clients?: any[];
  employees?: any[];
  tasks?: any[];
  revenue?: any;
}

const SYSTEM_PROMPT = `You are FU AI, an elite AI assistant for FU Corp Command Center CRM. FU Corp operates 3 companies:
- VCS (Virtual Customer Solution) - Virtual services, digital marketing
- BSL (Backup Solutions LLC) - Cloud backup, cybersecurity  
- DPL (Digital Point LLC) - Performance marketing, $50M+ ad spend managed

You have full access to the CRM data including:
- Clients with revenue, health scores, services
- Employees with roles, workloads, performance
- Tasks with status, priorities, assignments
- Revenue data across all brands

Your personality:
- Professional but friendly, like a smart assistant
- Use emojis sparingly for emphasis
- Be concise but helpful
- When asked about data, summarize key insights
- When asked to create/update things, explain what you're doing

Current context:
{context}

Always respond in the language the user uses (English/Urdu).`;

export const claudeClient = {
  async chat(messages: Message[], context?: Context): Promise<string> {
    const apiKey = process.env.CLAUDE_API_KEY;

    if (!apiKey) {
      throw new Error("Claude API key not configured");
    }

    // Format messages for Claude
    const formattedMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Build context string
    let contextStr = "No specific context available.";
    if (context) {
      contextStr = JSON.stringify(context, null, 2);
    }

    const systemPrompt = SYSTEM_PROMPT.replace("{context}", contextStr);

    try {
      const response = await fetch(CLAUDE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-opus-4-5",
          max_tokens: 1024,
          system: systemPrompt,
          messages: formattedMessages,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return data.content[0].text;
    } catch (error: any) {
      console.error("Claude API call failed:", error);
      throw error;
    }
  },
};
