import type { DiagramTokens } from '../engine/schema';
import type { WorkspaceExampleFile } from '../data/types';

const STORAGE_KEY = 'diagram-engine/connected-projects';

export interface StoredConnectedProject {
  files: WorkspaceExampleFile[];
  id: string;
  name: string;
  tokensJson?: string | null;
}

function serializeTokens(tokens?: DiagramTokens): string | null {
  if (!tokens) return null;
  return JSON.stringify(tokens);
}

function deserializeTokens(json?: string | null): DiagramTokens | undefined {
  if (!json) return undefined;
  try {
    return JSON.parse(json) as DiagramTokens;
  } catch {
    return undefined;
  }
}

export function loadStoredProjects(): StoredConnectedProject[] {
  if (typeof window === 'undefined') return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (p: unknown): p is StoredConnectedProject =>
        typeof p === 'object' &&
        p !== null &&
        typeof (p as StoredConnectedProject).id === 'string' &&
        typeof (p as StoredConnectedProject).name === 'string' &&
        Array.isArray((p as StoredConnectedProject).files),
    );
  } catch {
    return [];
  }
}

export function saveStoredProjects(projects: StoredConnectedProject[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function projectToStored(project: {
  files: WorkspaceExampleFile[];
  id: string;
  name: string;
  tokens?: DiagramTokens;
}): StoredConnectedProject {
  return {
    files: project.files,
    id: project.id,
    name: project.name,
    tokensJson: serializeTokens(project.tokens),
  };
}

export function tokensFromStored(stored: StoredConnectedProject): DiagramTokens | undefined {
  return deserializeTokens(stored.tokensJson);
}