import {
  createWorkspaceExampleFile,
  workspaceExampleFiles as bundledWorkspaceExampleFiles,
} from '@/data/libraryRegistry';
import type {
  BrowserDraftDocument,
  DiagramExample,
  WorkspaceExampleFile,
} from '@/data/types';
import {
  PROJECT_DIAGRAM_THEME_FILENAME,
  parseDiagramThemeSource,
} from '@/engine/diagram-tokens';
import {
  assertDiagramDefinition,
  type DiagramDefinition,
  type DiagramTokens,
} from '@/engine/schema';
import { buildDiagramHash, buildDiagramMainToken, findDocumentForLocation } from '@/lib/diagram-url';
import { ensureJsonFilename } from '@/lib/downloads';
import type { FileSystemExampleFile } from '@/lib/file-system';
import type {
  ConnectedProject,
  MainView,
  PendingNavigation,
} from './types';

export const initialDocument = bundledWorkspaceExampleFiles[0]!;

export function parseDefinition(source: string): DiagramDefinition {
  const candidate = JSON.parse(source) as unknown;
  assertDiagramDefinition(candidate);
  return candidate;
}

export function stringifyDefinition(definition: DiagramDefinition) {
  return JSON.stringify(definition, null, 2);
}

export function isHelpHash(hash: string) {
  const trimmedHash = hash.startsWith('#') ? hash.slice(1) : hash;
  const trimmedPath = trimmedHash.startsWith('/') ? trimmedHash.slice(1) : trimmedHash;

  return trimmedPath === 'help';
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function slugifyProjectName(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'project'
  );
}

export function createConnectedProjectId(
  name: string,
  existingProjects: ConnectedProject[],
) {
  const existingIds = new Set(existingProjects.map((project) => project.id));
  const base = slugifyProjectName(name);
  let candidate = base;
  let counter = 2;

  while (existingIds.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  return candidate;
}

export function toConnectedProjectFiles(
  project: Pick<ConnectedProject, 'id' | 'name'>,
  files: FileSystemExampleFile[],
) {
  return files.map((file) =>
    createWorkspaceExampleFile({
      filename: file.filename,
      label: file.diagramName ?? file.filename,
      projectId: project.id,
      projectName: project.name,
      relativePath: file.relativePath,
      segments: file.segments,
      source: file.source,
      sourceKind: 'connected',
    }),
  );
}

export function parseProjectTheme(
  projectName: string,
  themeSource: string | null,
): DiagramTokens | undefined {
  if (!themeSource) {
    return undefined;
  }

  return parseDiagramThemeSource(
    themeSource,
    `${projectName}/${PROJECT_DIAGRAM_THEME_FILENAME}`,
  );
}

export async function findConnectedProjectByHandle(
  projects: ConnectedProject[],
  handle: FileSystemDirectoryHandle,
) {
  for (const project of projects) {
    if (project.name !== handle.name) {
      continue;
    }

    if (!project.handle) {
      return project;
    }

    if (typeof project.handle.isSameEntry !== 'function') {
      return project;
    }

    try {
      if (await project.handle.isSameEntry(handle)) {
        return project;
      }
    } catch {
      return project;
    }
  }

  return null;
}

export function findDocumentById(
  id: string,
  workspaceFiles: WorkspaceExampleFile[],
  browserDrafts: BrowserDraftDocument[],
) {
  return (
    workspaceFiles.find((file) => file.id === id) ??
    browserDrafts.find((draft) => draft.id === id)
  );
}

export function getDocumentDisplayName(document: DiagramExample) {
  switch (document.kind) {
    case 'workspace':
      return document.filename;
    case 'draft':
      return document.displayName;
  }
}

export function getDocumentFilename(document: DiagramExample) {
  switch (document.kind) {
    case 'workspace':
    case 'draft':
      return document.filename;
  }
}

export function getInitialDraftDisplayName(document: DiagramExample) {
  switch (document.kind) {
    case 'workspace':
      return document.label?.trim() || document.filename.replace(/\.json$/i, '');
    case 'draft':
      return document.displayName;
  }
}

export function describeDocument(document: DiagramExample) {
  switch (document.kind) {
    case 'workspace':
      return document.sourceKind === 'connected'
        ? `${document.projectName}/${document.relativePath}`
        : document.relativePath;
    case 'draft':
      return document.filename;
  }
}

export function shouldIncludeExportNode(node: Node) {
  if (node instanceof Element) {
    return (
      !node.classList.contains('diagram-toolbar') &&
      !node.classList.contains('diagram-controls') &&
      !node.classList.contains('diagram-canvas__status-notice')
    );
  }

  return true;
}

export function getPendingNavigationLabel(target: PendingNavigation) {
  return target.kind === 'help' ? 'Help' : getDocumentDisplayName(target.nextDocument);
}

export function findPendingNavigationForLocation(options: {
  hash: string;
  search: string;
  browserDrafts: BrowserDraftDocument[];
  workspaceFiles: WorkspaceExampleFile[];
}) {
  if (isHelpHash(options.hash)) {
    return { kind: 'help' } satisfies PendingNavigation;
  }

  const nextDocument = findDocumentForLocation(options);

  return nextDocument
    ? ({
        kind: 'document',
        nextDocument,
      } satisfies PendingNavigation)
    : null;
}

export function buildUrlForState(options: {
  document: DiagramExample;
  view: MainView;
}) {
  const nextUrl = new URL(window.location.href);
  nextUrl.hash = options.view === 'help' ? '#/help' : buildDiagramHash(options.document);
  nextUrl.searchParams.set('main', buildDiagramMainToken(options.document));
  return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
}
