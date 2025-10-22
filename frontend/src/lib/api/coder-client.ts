import type {
  CoderAPIResponse,
  Project,
  FileTreeEntry,
  CreateFileParams,
  PatchFileParams,
  RunBashParams,
  SearchParams,
} from '@/types';

// In development (Vite dev server on port 5173), use /api prefix (proxied by Vite)
// In production (served from Express), use empty string (same origin)
const isDevelopment = window.location.port === '5173';
const API_BASE_URL = isDevelopment ? '/api' : '';

class CoderAPIClient {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<CoderAPIResponse<T>> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();
    return data;
  }

  // Project management
  async listProjects(): Promise<CoderAPIResponse<Project[]>> {
    return this.request('/projects');
  }

  async getProject(projectId: string): Promise<CoderAPIResponse<Project>> {
    return this.request(`/projects/${projectId}`);
  }

  async createProject(params: {
    source: any;
    name: string;
  }): Promise<CoderAPIResponse<{ projectId: string }>> {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async renameProject(
    projectId: string,
    name: string
  ): Promise<CoderAPIResponse<Project>> {
    return this.request(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  }

  // File operations
  async getFile(
    projectId: string,
    path: string,
    encoding?: 'text' | 'base64'
  ): Promise<CoderAPIResponse<{ content: string; encoding: string }>> {
    const params = new URLSearchParams({ path });
    if (encoding) params.append('encoding', encoding);
    return this.request(`/projects/${projectId}/files?${params}`);
  }

  async createFile(
    projectId: string,
    params: CreateFileParams
  ): Promise<CoderAPIResponse<any>> {
    return this.request(`/projects/${projectId}/files`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async patchFile(
    projectId: string,
    params: PatchFileParams
  ): Promise<CoderAPIResponse<any>> {
    return this.request(`/projects/${projectId}/files`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    });
  }

  async deleteFile(
    projectId: string,
    path: string,
    recursive?: boolean
  ): Promise<CoderAPIResponse<any>> {
    return this.request(`/projects/${projectId}/files`, {
      method: 'DELETE',
      body: JSON.stringify({ path, recursive }),
    });
  }

  // File tree
  async listFileTree(
    projectId: string,
    path: string = '/',
    depth: number = 2
  ): Promise<CoderAPIResponse<{ entries: FileTreeEntry[] }>> {
    const params = new URLSearchParams({ path, depth: depth.toString() });
    return this.request(`/projects/${projectId}/filetree?${params}`);
  }

  // Search
  async search(
    projectId: string,
    params: SearchParams
  ): Promise<
    CoderAPIResponse<{
      results: Array<{
        file: string;
        line: string;
        line_number: number;
        match: string;
      }>;
    }>
  > {
    const queryParams = new URLSearchParams({
      query: params.query,
      path: params.path || '/',
      regex: params.regex ? 'true' : 'false',
      case_sensitive: params.case_sensitive ? 'true' : 'false',
      max_results: (params.max_results || 200).toString(),
    });
    return this.request(`/projects/${projectId}/search?${queryParams}`);
  }

  // Bash execution
  async runBash(
    projectId: string,
    params: RunBashParams
  ): Promise<CoderAPIResponse<{ stdout: string; stderr: string; exit_code: number }>> {
    return this.request(`/projects/${projectId}/bash`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // PM2 operations
  async pm2Start(
    projectId: string,
    config: any
  ): Promise<CoderAPIResponse<any>> {
    return this.request(`/projects/${projectId}/pm2/start`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async pm2Stop(
    projectId: string,
    nameOrId: string
  ): Promise<CoderAPIResponse<any>> {
    return this.request(`/projects/${projectId}/pm2/stop`, {
      method: 'POST',
      body: JSON.stringify({ nameOrId }),
    });
  }

  async pm2List(projectId: string): Promise<CoderAPIResponse<any[]>> {
    return this.request(`/projects/${projectId}/pm2/list`);
  }

  async pm2Logs(
    projectId: string,
    nameOrId: string,
    lines?: number
  ): Promise<CoderAPIResponse<{ logs: string }>> {
    const params = new URLSearchParams({ nameOrId });
    if (lines) params.append('lines', lines.toString());
    return this.request(`/projects/${projectId}/pm2/logs?${params}`);
  }
}

export const coderAPI = new CoderAPIClient();
