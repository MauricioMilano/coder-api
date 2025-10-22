import { useState } from 'react';
import { RefreshCw, Globe } from 'lucide-react';
import { useSettingsStore } from '@/store/settings-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function PreviewPanel() {
  const { previewUrl, setPreviewUrl } = useSettingsStore();
  const [url, setUrl] = useState(previewUrl);
  const [key, setKey] = useState(0);

  const handleRefresh = () => {
    setKey((prev) => prev + 1);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  const handleUrlSubmit = () => {
    setPreviewUrl(url);
    setKey((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col w-[480px] border-l border-border bg-card">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Globe className="w-4 h-4 text-muted-foreground" />
        <Input
          value={url}
          onChange={handleUrlChange}
          onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
          onBlur={handleUrlSubmit}
          className="flex-1 h-8 text-xs font-mono bg-secondary"
          placeholder="http://localhost:3000"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 bg-white">
        {previewUrl ? (
          <iframe
            key={key}
            src={previewUrl}
            className="w-full h-full border-none"
            title="Preview"
            sandbox="allow-same-origin allow-scripts allow-forms"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-center text-muted-foreground">
            <div>
              <div className="text-4xl mb-4">🖼️</div>
              <div className="text-sm">Live Preview</div>
              <div className="text-xs mt-2">Enter a URL above to preview</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
