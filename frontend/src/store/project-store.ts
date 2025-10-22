import { create } from 'zustand';
import type { Project, FileTreeEntry } from '@/types';

interface ProjectStore {
  projects: Project[];
  selectedProject: Project | null;
  fileTree: FileTreeEntry[];
  isLoading: boolean;
  error: string | null;

  setProjects: (projects: Project[]) => void;
  setSelectedProject: (project: Project | null) => void;
  setFileTree: (fileTree: FileTreeEntry[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  selectedProject: null,
  fileTree: [],
  isLoading: false,
  error: null,

  setProjects: (projects) => set({ projects }),
  setSelectedProject: (project) => set({ selectedProject: project }),
  setFileTree: (fileTree) => set({ fileTree }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
