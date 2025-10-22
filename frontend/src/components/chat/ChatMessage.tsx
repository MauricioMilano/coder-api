import { User, Bot, Terminal } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/types';
import { CodeBlock } from './CodeBlock';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className="flex gap-4">
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-secondary' : 'bg-gradient-to-br from-indigo-500 to-purple-600'
        }`}
      >
        {isUser ? (
          <User className="w-5 h-5" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-3">
        <div className="font-semibold text-sm">
          {isUser ? 'You' : 'AI Assistant'}
        </div>

        {/* Message Content */}
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';
                const isInline = !className;

                return !isInline && language ? (
                  <CodeBlock
                    code={String(children).replace(/\n$/, '')}
                    language={language}
                  />
                ) : (
                  <code className="px-1.5 py-0.5 rounded bg-secondary text-primary" {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Tool Calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-2">
            {message.toolCalls.map((tool) => (
              <div
                key={tool.id}
                className="flex items-start gap-2 p-3 bg-card border border-border rounded-lg text-sm"
              >
                <Terminal className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium text-foreground">
                    Executing: {tool.name}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {JSON.stringify(tool.arguments, null, 2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tool Results */}
        {message.toolResults && message.toolResults.length > 0 && (
          <div className="space-y-2">
            {message.toolResults.map((result) => (
              <div
                key={result.id}
                className={`p-3 rounded-lg text-sm ${
                  result.error
                    ? 'bg-destructive/10 border border-destructive/50'
                    : 'bg-card border border-border'
                }`}
              >
                <div className="font-medium mb-1">
                  {result.error ? '❌ Error' : '✅ Success'}: {result.name}
                </div>
                <pre className="text-xs text-muted-foreground overflow-x-auto">
                  {result.error || JSON.stringify(result.result, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
