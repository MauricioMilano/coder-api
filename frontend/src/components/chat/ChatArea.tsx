import { useRef, useEffect } from 'react';
import { Bot } from 'lucide-react';
import { useChatStore } from '@/store/chat-store';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

export function ChatArea() {
  const { messages } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col flex-1 bg-background">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground max-w-md">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">
                Welcome to AI Code Assistant
              </h3>
              <p className="text-sm">
                I can help you build, modify, and manage your projects. Just describe what you want to do, and I'll use the available tools to make it happen.
              </p>
              <div className="mt-6 text-xs text-left bg-card border border-border rounded-lg p-4 space-y-2">
                <p className="font-semibold">Try asking me to:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Create a new API endpoint</li>
                  <li>Add authentication to the project</li>
                  <li>Search for specific code patterns</li>
                  <li>Run tests or build commands</li>
                  <li>Start the development server</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <ChatInput />
    </div>
  );
}
