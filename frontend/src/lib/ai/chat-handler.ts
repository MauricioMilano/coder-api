import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { useChatStore } from '@/store/chat-store';
import { useSettingsStore } from '@/store/settings-store';
import { tools } from '@/lib/tools/definitions';
import type { ChatMessage } from '@/types';

// ChatSession type to store model/provider info per chat
type ChatSession = {
  id: string;
  provider: string;
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
  messages: ChatMessage[];
};

// In-memory chat sessions (replace with persistent store if needed)
const chatSessions: Record<string, ChatSession> = {};

// Start a new chat session
export function startChatSession(sessionId: string) {
  const { provider, model, apiKey, temperature, maxTokens } = useSettingsStore.getState();
  if (!apiKey) throw new Error('API key not configured');
  if (chatSessions[sessionId]) throw new Error('Chat session already exists');
  chatSessions[sessionId] = {
    id: sessionId,
    provider,
    model,
    apiKey,
    temperature,
    maxTokens,
    messages: [],
  };
}

// Send a message in a chat session (model/provider cannot change)
export async function sendMessage(userMessage: string, projectId?: string, sessionId?: string) {
  const { addMessage, updateMessage, setIsStreaming } = useChatStore.getState();

  // Use session if provided, else fallback to global settings (for legacy)
  let session: ChatSession | undefined = sessionId ? chatSessions[sessionId] : undefined;
  let provider, model, apiKey, temperature, maxTokens, messages: ChatMessage[];
  if (session) {
    ({ provider, model, apiKey, temperature, maxTokens, messages } = session);
  } else {
    // fallback for non-session usage
    const settings = useSettingsStore.getState();
    provider = settings.provider;
    model = settings.model;
    apiKey = settings.apiKey;
    temperature = settings.temperature;
    maxTokens = settings.maxTokens;
    messages = [];
  }

  if (!apiKey) {
    throw new Error('API key not configured');
  }

  // Add user message
  const userMsg: ChatMessage = {
    id: `user-${Date.now()}`,
    role: 'user',
    content: userMessage,
    timestamp: new Date(),
  };
  addMessage(userMsg);
  if (session) session.messages.push(userMsg);

  // Create AI message placeholder
  const assistantMsgId = `assistant-${Date.now()}`;
  const assistantMsg: ChatMessage = {
    id: assistantMsgId,
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    toolCalls: [],
    toolResults: [],
  };
  addMessage(assistantMsg);
  if (session) session.messages.push(assistantMsg);

  // Prepare chat history for multi-turn context
  const history = [...messages, userMsg]
    .slice(-10)
    .map((msg) => ({ role: msg.role, content: msg.content }));

  try {
    setIsStreaming(true);

    // Get the appropriate AI provider
    let aiProvider;
    if (provider === 'openai') {
      const openai = createOpenAI({ apiKey });
      aiProvider = openai(model);
    } else if (provider === 'gemini') {
      const google = createGoogleGenerativeAI({ apiKey });
      aiProvider = google(model);
    } else if (provider === 'groq') {
      const groq = createOpenAI({
        apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });
      aiProvider = groq(model);
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    // Prepare system message with context
    const systemMessage = `You are an AI code assistant integrated with a project management system. You have access to tools that can interact with the Coder API to manage projects, files, and execute commands.

${projectId ? `Current project ID: ${projectId}` : 'No project selected'}

When users ask you to perform tasks, use the available tools to accomplish them. Always provide clear explanations of what you're doing and the results.

Available tools:
- list_projects: List all projects
- get_project: Get project details
- read_file: Read file contents
- create_file: Create new files
- edit_file: Edit existing files (find and replace)
- list_file_tree: Browse project structure
- search_code: Search across files
- run_command: Execute bash commands
- start_app: Start applications with PM2

Be helpful, concise, and always explain your actions.`;

    // Helper to append tool results to history for next turn
    const appendToolResultsToHistory = (toolResults: any[], history: any[]) => {
      if (!toolResults || toolResults.length === 0) return history;
      // Add each tool result as an assistant message
      return [
        ...history,
        ...toolResults.map((tr) => ({
          role: 'assistant',
          content:
            `Tool '${tr.toolName}' result:\n` +
            (tr.result ? JSON.stringify(tr.result, null, 2) : tr.error ? `Error: ${tr.error.message}` : ''),
        })),
      ];
    };

    let currentHistory = history;

    const result = await streamText({
      model: aiProvider,
      system: systemMessage,
      messages: currentHistory,
      tools,
      temperature,
      maxTokens,
      onFinish: ({ text, toolCalls, toolResults }) => {
        updateMessage(assistantMsgId, {
          content: text,
          toolCalls: toolCalls?.map((tc: any) => ({
            id: tc.toolCallId,
            name: tc.toolName,
            arguments: tc.args,
          })),
          toolResults: toolResults?.map((tr: any) => ({
            id: tr.toolCallId,
            name: tr.toolName,
            result: tr.result,
            error: tr.error?.message,
          })),
        });
        setIsStreaming(false);

        if (toolResults && toolResults.length > 0) {
          currentHistory = appendToolResultsToHistory(toolResults, currentHistory);
          if (session) {
            session.messages.push({
              id: `tool-result-${Date.now()}`,
              role: 'assistant',
              content: `Tool results: ${JSON.stringify(toolResults, null, 2)}`,
              timestamp: new Date(),
            });
          }
        }
      },
    });

    // Stream the response
    for await (const delta of result.textStream) {
      updateMessage(assistantMsgId, {
        content: assistantMsg.content + delta,
      });
      assistantMsg.content += delta;
      if (session) {
        // Update session message content for streaming
        const msg = session.messages.find((m) => m.id === assistantMsgId);
        if (msg) msg.content = assistantMsg.content;
      }
    }

  } catch (error) {
    console.error('Error in chat handler:', error);
    updateMessage(assistantMsgId, {
      content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
    });
    setIsStreaming(false);
  }
}
