import type { DiagramExample, WorkspaceExampleFile } from '@/data/types';
import type { DiagramTokens } from '@/engine/schema';

export type MainView = 'document' | 'help';

export type AppError = {
  title: string;
  detail: string;
  recoverable: boolean;
};

export interface ConnectedProject {
  files: WorkspaceExampleFile[];
  handle: FileSystemDirectoryHandle | null;
  id: string;
  name: string;
  tokens?: DiagramTokens;
}

export type PendingNavigation =
  | {
      kind: 'document';
      nextDocument: DiagramExample;
    }
  | {
      kind: 'help';
    };
