import { useState } from 'react';
import { Header } from './components/chat/Header';
import { Sidebar } from './components/project/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { PreviewPanel } from './components/preview/PreviewPanel';
import { SettingsModal } from './components/settings/SettingsModal';

function App() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <Header onSettingsClick={() => setShowSettings(true)} />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Chat Area */}
        <ChatArea />

        {/* Preview Panel */}
        <PreviewPanel />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}

export default App;
