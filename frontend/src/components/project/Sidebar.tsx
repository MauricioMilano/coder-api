import { useEffect, useState } from 'react';
import { Folder, File, ChevronRight, ChevronDown } from 'lucide-react';
import { useProjectStore } from '@/store/project-store';
import { useSettingsStore } from '@/store/settings-store';
import { coderAPI } from '@/lib/api/coder-client';
import type { FileTreeEntry } from '@/types';

export function Sidebar() {
  const { projects, selectedProject, fileTree, setProjects, setSelectedProject, setFileTree } = useProjectStore();
  const { provider, model, setProvider, setModel } = useSettingsStore();
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['/']));

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadFileTree();
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    const response = await coderAPI.listProjects();
    if (response.success && response.data) {
      setProjects(response.data);
      if (response.data.length > 0 && !selectedProject) {
        setSelectedProject(response.data[0]);
      }
    }
  };

  const loadFileTree = async () => {
    if (!selectedProject) return;
    const response = await coderAPI.listFileTree(selectedProject.id);
    if (response.success && response.data) {
      setFileTree(response.data.entries || []);
    }
  };

  const toggleDir = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderFileTree = (entries: FileTreeEntry[], depth = 0) => {
    return entries.map((entry) => {
      const isExpanded = expandedDirs.has(entry.path);
      const isDir = entry.type === 'directory';
      return (
        <div key={entry.path}>
          <div
            className="flex items-center gap-2 px-2 py-1 text-sm cursor-pointer hover:bg-secondary rounded"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => isDir && toggleDir(entry.path)}
          >
            {isDir ? (
              <>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <Folder className="w-4 h-4 text-blue-400" />
              </>
            ) : (
              <>
                <div className="w-4" />
                <File className="w-4 h-4 text-gray-400" />
              </>
            )}
            <span>{entry.name}</span>
          </div>
          {isDir && isExpanded && entry.children && (
            <div>{renderFileTree(entry.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col w-72 border-r border-border bg-card">
      {/* Project Selector */}
      <div className="p-4 border-b border-border">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
          Project
        </label>
        <select
          className="w-full px-3 py-2 bg-secondary border border-input rounded-md text-sm"
          value={selectedProject?.id || ''}
          onChange={(e) => {
            const project = projects.find(p => p.id === e.target.value);
            if (project) setSelectedProject(project);
          }}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* File Tree */}
      <div className="flex-1 p-4 overflow-y-auto">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block">
          Files
        </label>
        <div>{fileTree && renderFileTree(fileTree)}</div>
      </div>

      {/* AI Settings */}
      <div className="p-4 border-t border-border">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
          AI Provider
        </label>
        <select
          className="w-full px-3 py-2 mb-2 bg-secondary border border-input rounded-md text-sm"
          value={provider}
          onChange={(e) => setProvider(e.target.value as any)}
        >
          <option value="openai">OpenAI</option>
          <option value="gemini">Google Gemini</option>
          <option value="groq">Groq (Llama)</option>
        </select>
        <select
          className="w-full px-3 py-2 bg-secondary border border-input rounded-md text-sm"
          value={model}
          onChange={(e) => setModel(e.target.value as any)}
        >
          {provider === 'openai' && (
            <>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </>
          )}
          {provider === 'gemini' && (
            <>
              <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</option>
              <option value="gemini-exp-1206">Gemini Experimental 1206</option>
              <option value="gemini-1.5-pro-latest">Gemini 1.5 Pro (Latest)</option>
              <option value="gemini-1.5-flash-latest">Gemini 1.5 Flash (Latest)</option>
              <option value="gemini-pro">Gemini Pro</option>
            </>
          )}
          {provider === 'groq' && (
            <>
              <option value="llama-3.1-70b-versatile">Llama 3.1 70B Versatile</option>
              <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant</option>
            </>
          )}
        </select>
      </div>
    </div>
  );
}
