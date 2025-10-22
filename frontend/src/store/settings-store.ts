import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AISettings, AIProvider, AIModel } from '@/types';

interface SettingsStore extends AISettings {
  previewUrl: string;

  setProvider: (provider: AIProvider) => void;
  setModel: (model: AIModel) => void;
  setApiKey: (apiKey: string) => void;
  setPreviewUrl: (url: string) => void;
  setTemperature: (temperature: number) => void;
  setMaxTokens: (maxTokens: number) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      provider: 'openai',
      model: 'gpt-4',
      apiKey: '',
      temperature: 0.7,
      maxTokens: 4096,
      previewUrl: 'http://localhost:3000',

      setProvider: (provider) => {
        // Auto-select appropriate default model when changing provider
        let defaultModel: AIModel = 'gpt-4';
        if (provider === 'gemini') {
          defaultModel = 'gemini-2.0-flash-exp';
        } else if (provider === 'groq') {
          defaultModel = 'llama-3.1-70b-versatile';
        }
        set({ provider, model: defaultModel });
      },
      setModel: (model) => set({ model }),
      setApiKey: (apiKey) => set({ apiKey }),
      setPreviewUrl: (url) => set({ previewUrl: url }),
      setTemperature: (temperature) => set({ temperature }),
      setMaxTokens: (maxTokens) => set({ maxTokens }),
    }),
    {
      name: 'ai-code-assistant-settings',
    }
  )
);
