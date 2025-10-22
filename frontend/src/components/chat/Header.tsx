import { Bot, Settings } from 'lucide-react';
import { useSettingsStore } from '@/store/settings-store';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onSettingsClick: () => void;
}

export function Header({ onSettingsClick }: HeaderProps) {
  const { provider, model, apiKey } = useSettingsStore();

  const isConnected = apiKey && apiKey.length > 0;
  const providerLabel = provider === 'openai' ? 'OpenAI' : provider === 'gemini' ? 'Google' : 'Groq';
  const modelLabel = model.toUpperCase();

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-lg font-semibold">AI Code Assistant</h1>
      </div>

      <div className="flex items-center gap-3">
        {isConnected && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary text-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>{providerLabel} - {modelLabel}</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onSettingsClick}
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Button>
      </div>
    </div>
  );
}
