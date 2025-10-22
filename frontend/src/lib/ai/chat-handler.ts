import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { useChatStore } from '@/store/chat-store';
import { useSettingsStore } from '@/store/settings-store';
import { tools } from '@/lib/tools/definitions';
import type { ChatMessage } from '@/types';

export async function sendMessage(userMessage: string, projectId?: string) {
  const { addMessage, updateMessage, setIsStreaming } = useChatStore.getState();
  const { provider, model, apiKey, temperature, maxTokens } = useSettingsStore.getState();

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

    const result = await streamText({
      model: aiProvider,
      system: systemMessage,
      messages: [{ role: 'user', content: userMessage }],
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
      },
    });

    // Stream the response
    for await (const delta of result.textStream) {
      updateMessage(assistantMsgId, {
        content: assistantMsg.content + delta,
      });
      assistantMsg.content += delta;
    }

  } catch (error) {
    console.error('Error in chat handler:', error);
    updateMessage(assistantMsgId, {
      content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
    });
    setIsStreaming(false);
  }
}
