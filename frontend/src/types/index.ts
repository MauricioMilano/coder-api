// AI Provider types
export type AIProvider = 'openai' | 'gemini' | 'groq';

export type AIModel =
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo'
  | 'gemini-1.5-pro-latest'
  | 'gemini-1.5-flash-latest'
  | 'gemini-pro'
  | 'llama-3.1-70b-versatile'
  | 'llama-3.1-8b-instant';

export interface AISettings {
  provider: AIProvider;
  model: AIModel;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
}

// Project types
export interface Project {
  projectId: string;
  name: string;
  rootAbsPath: string;
  createdAt: string;
}

export interface FileTreeEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeEntry[];
}

// Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface ToolResult {
  id: string;
  name: string;
  result: any;
  error?: string;
}

// Coder API types
export interface CoderAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface CreateFileParams {
  path: string;
  content: string;
  encoding?: 'text' | 'base64';
  create_parents?: boolean;
  overwrite?: boolean;
}

export interface PatchFileParams {
  path: string;
  operation: {
    type: 'replace' | 'lines' | 'insert' | 'code_block' | 'diff';
    [key: string]: any;
  };
  preview?: boolean;
  expected_hash?: string;
}

export interface RunBashParams {
  command: string;
  workdir?: string;
  timeout_sec?: number;
  env?: Record<string, string>;
}

export interface SearchParams {
  path?: string;
  query: string;
  regex?: boolean;
  case_sensitive?: boolean;
  max_results?: number;
}
