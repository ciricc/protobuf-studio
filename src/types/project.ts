export interface ProjectMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  id: string;
  name: string;
  mainFile: string | null;
  files: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectsIndex {
  version: 1;
  projects: ProjectMeta[];
}

export interface ProjectExport {
  version: 1;
  name: string;
  mainFile: string | null;
  files: Record<string, string>;
  jsonStates: Record<string, string>;
}
