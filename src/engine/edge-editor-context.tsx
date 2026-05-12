import { createContext, useContext, type ReactNode } from 'react';
import type {
  DiagramConnectorLineStyle,
  DiagramHandlePosition,
  EdgeRouting,
} from './schema';
import type { EdgeRoutingVariant } from './edge-routing';

export interface EdgeEditorActions {
  resetEdgeRouting: (edgeId: string) => void;
  setEdgeLabel: (edgeId: string, label: string | undefined) => void;
  setEdgeRouting: (
    edgeId: string,
    updater:
      | EdgeRouting
      | undefined
      | ((current: EdgeRouting | undefined) => EdgeRouting | undefined),
  ) => void;
  setEdgeSourcePosition: (
    edgeId: string,
    position: DiagramHandlePosition,
  ) => void;
  setEdgeTargetPosition: (
    edgeId: string,
    position: DiagramHandlePosition,
  ) => void;
  setEdgeLineStyle: (
    edgeId: string,
    lineStyle: DiagramConnectorLineStyle,
  ) => void;
  setEdgeRoutingVariant: (edgeId: string, variant: EdgeRoutingVariant) => void;
}

const EdgeEditorContext = createContext<EdgeEditorActions | null>(null);

export function EdgeEditorProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: EdgeEditorActions;
}) {
  return (
    <EdgeEditorContext.Provider value={value}>
      {children}
    </EdgeEditorContext.Provider>
  );
}

export function useEdgeEditor() {
  return useContext(EdgeEditorContext);
}
