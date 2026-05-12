export interface BaseDiagramSource {
  id: string;
  label: string;
  source: string;
}

export type WorkspaceSourceKind = 'bundled' | 'connected';

export interface WorkspaceExampleFile extends BaseDiagramSource {
  kind: 'workspace';
  filename: string;
  relativePath: string;
  segments: string[];
  projectId: string;
  projectName: string;
  sourceKind: WorkspaceSourceKind;
}

export interface BrowserDraftDocument extends BaseDiagramSource {
  displayName: string;
  kind: 'draft';
  filename: string;
  updatedAt: string;
}

export type DiagramExample = WorkspaceExampleFile | BrowserDraftDocument;
