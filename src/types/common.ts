export type Project = {
  id: string;
  name: string;
  rootAbsPath: string;
};

export type FileNode = {
  type: 'file' | 'dir';
  path: string;
  size?: number;
  hash?: string;
};

export type FiletreeResponse = {
  root: string;
  nodes: FileNode[];
  truncated: boolean;
};

export type ProblemJson = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  extras?: Record<string, unknown>;
};
