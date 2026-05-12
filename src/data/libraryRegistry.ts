import {
  PROJECT_DIAGRAM_THEME_FILENAME,
  parseDiagramThemeSource,
} from '../engine/diagram-tokens';
import {
  parseDiagramFileMetadata,
  type DiagramTokens,
} from '../engine/schema';
import type { WorkspaceExampleFile, WorkspaceSourceKind } from './types';

function humanizeFileStem(stem: string) {
  return stem
    .split(/[-_]/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function buildWorkspaceId(relativePath: string, projectId = 'bundled') {
  const normalizedPath = relativePath.replace(/\.json$/i, '').replace(/[\\/]/g, '__');

  if (projectId === 'bundled') {
    return `workspace:${normalizedPath}`;
  }

  return `workspace:${projectId}:${normalizedPath}`;
}

export function createWorkspaceExampleFile({
  label,
  filename,
  relativePath,
  segments,
  source,
  projectId = 'bundled',
  projectName = 'Bundled library',
  sourceKind = 'bundled',
}: Pick<
  WorkspaceExampleFile,
  'filename' | 'relativePath' | 'segments' | 'source'
> &
  Partial<Pick<WorkspaceExampleFile, 'label' | 'projectId' | 'projectName' | 'sourceKind'>>): WorkspaceExampleFile {
  const stem = filename.replace(/\.json$/i, '');

  return {
    id: buildWorkspaceId(relativePath, projectId),
    kind: 'workspace',
    label: label?.trim() || humanizeFileStem(stem),
    source,
    filename,
    relativePath,
    segments,
    projectId,
    projectName,
    sourceKind: sourceKind as WorkspaceSourceKind,
  };
}

const rawWorkspaceModules = import.meta.glob('./library/**/*.json', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

const bundledThemeModulePath = Object.keys(rawWorkspaceModules).find((modulePath) =>
  modulePath.endsWith(`/${PROJECT_DIAGRAM_THEME_FILENAME}`),
);
const bundledWorkspaceThemeSource =
  bundledThemeModulePath ? rawWorkspaceModules[bundledThemeModulePath] : undefined;

export const bundledWorkspaceThemeTokens: DiagramTokens | undefined =
  bundledWorkspaceThemeSource && bundledThemeModulePath
    ? parseDiagramThemeSource(
        bundledWorkspaceThemeSource,
        bundledThemeModulePath.replace('./', 'src/data/'),
      )
    : undefined;

export const workspaceExampleFiles = Object.entries(rawWorkspaceModules)
  .filter(([modulePath]) => !modulePath.endsWith(`/${PROJECT_DIAGRAM_THEME_FILENAME}`))
  .map<WorkspaceExampleFile>(([modulePath, source]) => {
    const relativePath = modulePath.replace('./library/', '');
    const segments = relativePath.split('/');
    const filename = segments[segments.length - 1] ?? relativePath;
    const metadata = parseDiagramFileMetadata(source);

    return createWorkspaceExampleFile({
      filename,
      label: metadata?.name,
      relativePath,
      segments,
      source,
    });
  })
  .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
