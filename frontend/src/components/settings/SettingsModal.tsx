import { useState } from 'react';
import { X } from 'lucide-react';
import { useSettingsStore } from '@/store/settings-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    provider,
    model,
    apiKey,
    previewUrl,
    temperature,
    maxTokens,
    setApiKey,
    setPreviewUrl,
    setTemperature,
    setMaxTokens,
  } = useSettingsStore();

  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localPreviewUrl, setLocalPreviewUrl] = useState(previewUrl);
  const [localTemperature, setLocalTemperature] = useState(temperature || 0.7);
  const [localMaxTokens, setLocalMaxTokens] = useState(maxTokens || 4096);

  if (!isOpen) return null;

  const handleSave = () => {
    setApiKey(localApiKey);
    setPreviewUrl(localPreviewUrl);
    setTemperature(localTemperature);
    setMaxTokens(localMaxTokens);
    onClose();
  };

  const getPlaceholder = () => {
    switch (provider) {
      case 'openai':
        return 'sk-...';
      case 'gemini':
        return 'AIza...';
      case 'groq':
        return 'gsk_...';
      default:
        return 'Enter API key';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {provider === 'openai' ? 'OpenAI' : provider === 'gemini' ? 'Google' : 'Groq'} API Key
            </label>
            <Input
              type="password"
              value={localApiKey}
              onChange={(e) => setLocalApiKey(e.target.value)}
              placeholder={getPlaceholder()}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Your API key is stored locally and never sent to our servers.
            </p>
          </div>

          {/* Preview URL */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Preview URL
            </label>
            <Input
              type="url"
              value={localPreviewUrl}
              onChange={(e) => setLocalPreviewUrl(e.target.value)}
              placeholder="http://localhost:3000"
            />
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Temperature: {localTemperature.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={localTemperature}
              onChange={(e) => setLocalTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Higher values make output more random, lower values more focused.
            </p>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Max Tokens
            </label>
            <Input
              type="number"
              value={localMaxTokens}
              onChange={(e) => setLocalMaxTokens(parseInt(e.target.value))}
              min="256"
              max="8192"
            />
          </div>

          {/* Provider Info */}
          <div className="p-4 bg-secondary rounded-lg text-sm">
            <div className="font-medium mb-2">Current Configuration</div>
            <div className="space-y-1 text-muted-foreground">
              <div>Provider: <span className="text-foreground">{provider}</span></div>
              <div>Model: <span className="text-foreground">{model}</span></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
