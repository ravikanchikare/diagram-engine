import type {
  BrowserDraftDocument,
  DiagramExample,
  WorkspaceExampleFile,
} from '@/data/types';

type DiagramUrlTarget =
  | (
      | {
          kind: 'workspace';
          relativePath: string;
          sourceKind: 'bundled';
        }
      | {
          kind: 'workspace';
          projectId: string;
          relativePath: string;
          sourceKind: 'connected';
        }
    )
  | {
      kind: 'draft';
      token: string;
    };

const LIBRARY_PATH_PREFIXES = [
  'src/data/library/',
  '/src/data/library/',
  'library/',
  '/library/',
];

function encodePath(value: string) {
  return value
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function decodePath(value: string) {
  return value
    .split('/')
    .map((segment) => decodeURIComponent(segment))
    .join('/');
}

function normalizeReference(value: string) {
  const normalizedHash = value.startsWith('#') ? value.slice(1) : value;
  return normalizedHash.startsWith('/') ? normalizedHash.slice(1) : normalizedHash;
}

function stripLibraryPrefix(value: string) {
  for (const prefix of LIBRARY_PATH_PREFIXES) {
    if (value.startsWith(prefix)) {
      return value.slice(prefix.length);
    }
  }

  return value;
}

function parseDiagramTargetReference(reference: string): DiagramUrlTarget | null {
  const normalizedReference = normalizeReference(reference);

  if (!normalizedReference) {
    return null;
  }

  const [scope, ...segments] = normalizedReference.split('/');

  if (!scope) {
    return null;
  }

  if (segments.length > 0) {
    switch (scope) {
      case 'connected': {
        const [projectId, ...pathSegments] = segments;

        if (!projectId || pathSegments.length === 0) {
          return null;
        }

        return {
          kind: 'workspace',
          projectId: decodeURIComponent(projectId),
          relativePath: decodePath(pathSegments.join('/')),
          sourceKind: 'connected',
        };
      }
      case 'project':
        return {
          kind: 'workspace',
          relativePath: decodePath(segments.join('/')),
          sourceKind: 'bundled',
        };
      case 'draft':
        return {
          kind: 'draft',
          token: decodeURIComponent(segments.join('/')),
        };
    }
  }

  const bundledRelativePath = stripLibraryPrefix(normalizedReference);

  if (!bundledRelativePath.endsWith('.json')) {
    return null;
  }

  return {
    kind: 'workspace',
    relativePath: decodePath(bundledRelativePath),
    sourceKind: 'bundled',
  };
}

function findDocumentForTarget(options: {
  target: DiagramUrlTarget | null;
  browserDrafts: BrowserDraftDocument[];
  workspaceFiles: WorkspaceExampleFile[];
}) {
  const { target } = options;

  if (!target) {
    return null;
  }

  switch (target.kind) {
    case 'workspace':
      return (
        options.workspaceFiles.find((file) => {
          if (file.relativePath !== target.relativePath) {
            return false;
          }

          if (target.sourceKind === 'connected') {
            return (
              file.sourceKind === 'connected' &&
              file.projectId === target.projectId
            );
          }

          return file.sourceKind === 'bundled';
        }) ?? null
      );
    case 'draft':
      return (
        options.browserDrafts.find((draft) => draft.id === target.token) ??
        options.browserDrafts.find((draft) => draft.filename === target.token) ??
        null
      );
  }
}

export function buildDiagramMainToken(document: DiagramExample) {
  switch (document.kind) {
    case 'workspace':
      return document.sourceKind === 'connected'
        ? `connected/${encodeURIComponent(document.projectId)}/${encodePath(document.relativePath)}`
        : `project/${encodePath(document.relativePath)}`;
    case 'draft':
      return `draft/${encodeURIComponent(document.id)}`;
  }
}

export function buildDiagramHash(document: DiagramExample) {
  return `#/${buildDiagramMainToken(document)}`;
}

export function parseDiagramHash(hash: string): DiagramUrlTarget | null {
  return parseDiagramTargetReference(hash);
}

export function parseDiagramMainParam(search: string): DiagramUrlTarget | null {
  const main = new URLSearchParams(search).get('main');
  return main ? parseDiagramTargetReference(main) : null;
}

export function hasDiagramLocationTarget(options: {
  hash: string;
  search: string;
}) {
  return (
    parseDiagramMainParam(options.search) !== null ||
    parseDiagramHash(options.hash) !== null
  );
}

export function findDocumentForHash(options: {
  hash: string;
  browserDrafts: BrowserDraftDocument[];
  workspaceFiles: WorkspaceExampleFile[];
}) {
  return findDocumentForTarget({
    ...options,
    target: parseDiagramHash(options.hash),
  });
}

export function findDocumentForLocation(options: {
  hash: string;
  search: string;
  browserDrafts: BrowserDraftDocument[];
  workspaceFiles: WorkspaceExampleFile[];
}) {
  return (
    findDocumentForTarget({
      ...options,
      target: parseDiagramMainParam(options.search),
    }) ??
    findDocumentForTarget({
      ...options,
      target: parseDiagramHash(options.hash),
    })
  );
}
