import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useProjectStore } from '@/store/project-store';
import { useSettingsStore } from '@/store/settings-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { sendMessage } from '@/lib/ai/chat-handler';

export function ChatInput() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { selectedProject } = useProjectStore();
  const { apiKey } = useSettingsStore();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading || !apiKey) return;

    const message = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      await sendMessage(message, selectedProject?.projectId);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-border bg-card p-4">
      {!apiKey && (
        <div className="mb-3 p-3 bg-destructive/10 border border-destructive/50 rounded-md text-sm text-destructive">
          Please configure your API key in Settings before chatting.
        </div>
      )}
      <div className="flex items-end gap-3">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            !apiKey
              ? 'Configure API key in settings first...'
              : 'Describe what you want to build or change...'
          }
          disabled={!apiKey || isLoading}
          className="min-h-[48px] max-h-[200px] resize-none"
          rows={1}
        />
        <Button
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading || !apiKey}
          className="h-12 px-6"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
