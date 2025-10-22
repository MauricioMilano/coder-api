# AI Code Assistant - Frontend

A modern web-based AI-powered code assistant with BYOK (Bring Your Own Key) support for multiple AI providers.

## Features

- **Multi-AI Provider Support**: OpenAI (GPT-4, GPT-3.5), Google Gemini, and Groq (Llama)
- **BYOK**: Bring your own API keys for any supported provider
- **Project Management**: Browse and manage Coder-API projects
- **Live Preview**: Real-time preview of your running applications
- **AI Tools**: The AI can autonomously use tools to interact with your codebase
- **Code Highlighting**: Syntax-highlighted code blocks in responses
- **Streaming Responses**: Real-time AI response streaming

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm (recommended)
- Running Coder-API backend on `http://localhost:3000`

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The app will be available at `http://localhost:5173`

### Configuration

1. Click the "Settings" button in the header
2. Select your AI provider (OpenAI, Gemini, or Groq)
3. Enter your API key
4. Adjust temperature and max tokens if needed
5. Set your preview URL (default: http://localhost:3000)

### API Keys

You'll need an API key from one of the supported providers:

- **OpenAI**: Get yours at https://platform.openai.com/api-keys
- **Google Gemini**: Get yours at https://makersuite.google.com/app/apikey
- **Groq**: Get yours at https://console.groq.com

API keys are stored locally in your browser and never sent to our servers.

## Architecture

### Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Vercel AI SDK** - Unified AI provider interface
- **React Markdown** - Markdown rendering
- **React Syntax Highlighter** - Code highlighting

### Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── chat/          # Chat interface components
│   │   ├── editor/        # Code editor components
│   │   ├── preview/       # Preview panel
│   │   ├── project/       # Project management
│   │   ├── settings/      # Settings modal
│   │   └── ui/            # Reusable UI components
│   ├── lib/
│   │   ├── ai/            # AI provider implementations
│   │   ├── api/           # Coder-API client
│   │   ├── tools/         # AI tool definitions
│   │   └── utils/         # Utility functions
│   ├── store/             # Zustand stores
│   ├── types/             # TypeScript types
│   └── hooks/             # Custom React hooks
```

## AI Tools

The AI assistant has access to the following tools to interact with your codebase:

- `list_projects` - List all available projects
- `get_project` - Get project details
- `read_file` - Read file contents
- `create_file` - Create new files
- `edit_file` - Edit files using find/replace
- `list_file_tree` - Browse project structure
- `search_code` - Search across project files
- `run_command` - Execute bash commands
- `start_app` - Start applications with PM2

## Development

### Build for Production

```bash
pnpm build
```

### Preview Production Build

```bash
pnpm preview
```

## License

MIT
