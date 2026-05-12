import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MarkerType,
  Position,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  reconnectEdge,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { applyFlowEditsToDefinition, supportsManualCorrections } from './editing';
import { DEFAULT_DIAGRAM_GRID_COLOR } from './diagram-tokens';
import { NodeInspector } from './NodeInspector';
import { SelectionInspector } from './SelectionInspector';
import { EdgeInspector } from './EdgeInspector';
import { edgeTypes } from './edges';
import {
  buildDiagramFlow,
  getBlockNodeWidthForContent,
  getOverviewTextWidthForContent,
  getStateNodeWidthForContent,
  snapPositionToDiagramGrid,
  type DiagramEdge,
  type DiagramNode,
} from './layout';
import { nodeTypes } from './nodes';
import type { DiagramDefinition, MarkdocContent } from './schema';
import { EdgeEditorProvider } from './edge-editor-context';
import {
  adaptEdgeRouting,
  resolveHandlePosition,
  type Point,
  type RoutableEdgeData,
  type EdgeNodeBounds,
  type EdgeRoutingVariant,
} from './edge-routing';

export interface DiagramCanvasProps {
  definition: DiagramDefinition;
  gridColor?: string;
  inspectorPortalTarget?: HTMLElement | null;
  revision: number;
  onDefinitionChange?: (definition: DiagramDefinition) => void;
  statusNotice?: string;
  viewportToken?: string;
}

let wasResizing = false;

function moveChildrenWithLayers(
  oldLayerPositions: Map<string, { x: number; y: number }>,
  nodes: DiagramNode[],
  ignoredLayerIds = new Set<string>(),
): DiagramNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const deltas = new Map<string, { dx: number; dy: number }>();

  for (const [layerId, oldPos] of oldLayerPositions) {
    if (ignoredLayerIds.has(layerId)) continue;
    const layerNode = nodeMap.get(layerId);
    if (!layerNode || layerNode.type !== 'layer') continue;
    const dx = layerNode.position.x - oldPos.x;
    const dy = layerNode.position.y - oldPos.y;
    if (dx !== 0 || dy !== 0) {
      deltas.set(layerId, { dx, dy });
    }
  }

  if (deltas.size === 0) return nodes;

  const childToDelta = new Map<string, { dx: number; dy: number }>();
  for (const [layerId, delta] of deltas) {
    const layerNode = nodeMap.get(layerId);
    if (!layerNode || layerNode.type !== 'layer') continue;
    const children = layerNode.data.children;
    if (!children) continue;
    for (const childId of children) {
      childToDelta.set(childId, delta);
    }
  }

  if (childToDelta.size === 0) return nodes;

  return nodes.map((node) => {
    const delta = childToDelta.get(node.id);
    if (!delta) return node;
    return {
      ...node,
      position: {
        x: node.position.x + delta.dx,
        y: node.position.y + delta.dy,
      },
    };
  });
}

function getResizedNodeIds(changes: NodeChange<DiagramNode>[]) {
  const resizedNodeIds = new Set<string>();

  for (const change of changes) {
    if (change.type === 'dimensions') {
      resizedNodeIds.add(change.id);
    }
  }

  return resizedNodeIds;
}

function shouldPersistNodeChanges(changes: NodeChange<DiagramNode>[]) {
  return changes.some((change) => {
    if (change.type === 'dimensions') {
      if (change.resizing) {
        wasResizing = true;
        return false;
      }
      if (wasResizing) {
        wasResizing = false;
        return true;
      }
      return false;
    }
    return (
      change.type === 'position' ||
      change.type === 'add' ||
      change.type === 'remove' ||
      change.type === 'replace'
    );
  });
}

function shouldPersistEdgeChanges(changes: EdgeChange<DiagramEdge>[]) {
  return changes.some((change) => {
    return (
      change.type === 'add' ||
      change.type === 'remove' ||
      change.type === 'replace'
    );
  });
}

function snapOverviewTextNodePosition(node: DiagramNode): DiagramNode {
  if (node.type !== 'text') {
    return node;
  }

  const position = snapPositionToDiagramGrid(node.position);

  if (position.x === node.position.x && position.y === node.position.y) {
    return node;
  }

  return {
    ...node,
    position,
  };
}

function getRoutableEdgeData(edge: DiagramEdge) {
  return ((edge.data as RoutableEdgeData | undefined) ?? {}) satisfies RoutableEdgeData;
}

function isEditableRoutableEdge(edge: DiagramEdge) {
  return edge.type === 'routable' && getRoutableEdgeData(edge).editable === true;
}

function applyRenderedLineStyle(
  edge: DiagramEdge,
  lineStyle: 'solid' | 'dashed',
) {
  const nextStyle = {
    ...(edge.style ?? {}),
  };

  if (lineStyle === 'dashed') {
    nextStyle.strokeDasharray = '6 6';
    return nextStyle;
  }

  delete nextStyle.strokeDasharray;
  return nextStyle;
}

function getNodeDimension(value: unknown) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function getEdgeNodeBounds(node: DiagramNode | undefined): EdgeNodeBounds | undefined {
  if (!node) {
    return undefined;
  }

  const width = getNodeDimension(node.style?.width);
  const height = getNodeDimension(node.style?.height);

  if (width === undefined || height === undefined) {
    return undefined;
  }

  return {
    x: node.position.x,
    y: node.position.y,
    width,
    height,
  };
}

function getNodeFallback(node: DiagramNode | undefined): Point {
  return {
    x: node?.position.x ?? 0,
    y: node?.position.y ?? 0,
  };
}

function CanvasControls() {
  const reactFlow = useReactFlow<DiagramNode, DiagramEdge>();

  return (
    <div className="diagram-controls pointer-events-none absolute right-4 bottom-4 z-10 flex flex-col gap-2">
      <Button
        className="pointer-events-auto shadow-sm"
        onClick={() => {
          void reactFlow.zoomIn({ duration: 150 });
        }}
        size="icon-sm"
        type="button"
        variant="outline"
      >
        <Plus />
        <span className="sr-only">Zoom in</span>
      </Button>
      <Button
        className="pointer-events-auto shadow-sm"
        onClick={() => {
          void reactFlow.zoomOut({ duration: 150 });
        }}
        size="icon-sm"
        type="button"
        variant="outline"
      >
        <Minus />
        <span className="sr-only">Zoom out</span>
      </Button>
      <Button
        className="pointer-events-auto shadow-sm"
        onClick={() => {
          void reactFlow.fitView({ duration: 150, padding: 0.18 });
        }}
        size="icon-sm"
        type="button"
        variant="outline"
      >
        <Maximize2 />
        <span className="sr-only">Fit view</span>
      </Button>
    </div>
  );
}

function DiagramInspectorPlaceholder({
  editable,
}: {
  editable: boolean;
}) {
  return (
    <aside
      aria-label="Inspector"
      className="diagram-edge-inspector diagram-edge-inspector--empty"
    >
      <div className="diagram-edge-inspector__header">
        <div>
          <p className="diagram-edge-inspector__eyebrow">Inspector</p>
          <h3 className="diagram-edge-inspector__title">Select a node or stage edge</h3>
        </div>
      </div>

      <div className="diagram-edge-inspector__section">
        <h4 className="diagram-edge-inspector__section-title">Selection</h4>
        <p className="diagram-edge-inspector__hint">
          {editable
            ? 'Choose a node to edit content and state, or choose a stage edge to adjust routing, labels, and style.'
            : 'This diagram is preview-only on canvas. Use the JSON view to edit the underlying definition.'}
        </p>
      </div>
    </aside>
  );
}

export function DiagramCanvas({
  definition,
  gridColor = DEFAULT_DIAGRAM_GRID_COLOR,
  inspectorPortalTarget = null,
  onDefinitionChange,
  revision,
  statusNotice,
  viewportToken = 'default',
}: DiagramCanvasProps) {
  const initialFlow = buildDiagramFlow(definition);
  const editable = supportsManualCorrections(definition);
  const [nodes, setNodes] = useState<DiagramNode[]>(initialFlow.nodes);
  const [edges, setEdges] = useState<DiagramEdge[]>(initialFlow.edges);
  const definitionRef = useRef(definition);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const selectedNodes = nodes.filter((node) => node.selected);
  const selectedEdges = edges.filter((edge) => edge.selected);
  const selectedEditableRoutableEdge =
    selectedEdges.length === 1 &&
    selectedNodes.length === 0 &&
    isEditableRoutableEdge(selectedEdges[0]!)
      ? selectedEdges[0]
      : undefined;
  const selectedEditableNode =
    selectedNodes.length === 1 && selectedEdges.length === 0
      ? selectedNodes[0]
      : undefined;
  const selectedNodeIds = new Set(selectedNodes.map((node) => node.id));
  const selectedEdgeIds = new Set(selectedEdges.map((edge) => edge.id));
  const selectionCount = selectedNodes.length + selectedEdges.length;
  const hasSelection = selectionCount > 0;

  useEffect(() => {
    definitionRef.current = definition;
  }, [definition]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    const nextFlow = buildDiagramFlow(definition);

    definitionRef.current = definition;
    nodesRef.current = nextFlow.nodes;
    edgesRef.current = nextFlow.edges;
    setNodes(nextFlow.nodes);
    setEdges(nextFlow.edges);
  }, [revision]);

  const commitManualEdits = (nextNodes: DiagramNode[], nextEdges: DiagramEdge[]) => {
    if (!editable || !onDefinitionChange) {
      return;
    }

    const nextDefinition = applyFlowEditsToDefinition(
      definitionRef.current,
      nextNodes,
      nextEdges,
    );

    definitionRef.current = nextDefinition;
    onDefinitionChange(nextDefinition);
  };

  const updateRoutableEdge = (
    edgeId: string,
    updater: (edge: DiagramEdge) => DiagramEdge,
  ) => {
    if (!editable) {
      return;
    }

    setEdges((current) => {
      let didChange = false;
      const nextEdges = current.map((edge) => {
        if (edge.id !== edgeId || !isEditableRoutableEdge(edge)) {
          return edge;
        }

        const nextEdge = updater(edge);
        didChange = didChange || nextEdge !== edge;
        return nextEdge;
      });

      if (!didChange) {
        return current;
      }

      edgesRef.current = nextEdges;
      commitManualEdits(nodesRef.current, nextEdges);
      return nextEdges;
    });
  };

  const updateNode = (
    nodeId: string,
    updater: (node: DiagramNode) => DiagramNode,
  ) => {
    if (!editable) {
      return;
    }

    setNodes((current) => {
      let didChange = false;
      const nextNodes = current.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }

        const nextNode = updater(node);
        didChange = didChange || nextNode !== node;
        return nextNode;
      });

      if (!didChange) {
        return current;
      }

      nodesRef.current = nextNodes;
      commitManualEdits(nextNodes, edgesRef.current);
      return nextNodes;
    });
  };

  const updateNodeMarkdoc = (
    nodeId: string,
    fieldKey: string,
    content: MarkdocContent,
  ) => {
    updateNode(nodeId, (node) => {
      switch (node.type) {
        case 'state':
          if (fieldKey !== 'text') {
            return node;
          }

          return {
            ...node,
            data: {
              ...node.data,
              text: content,
            },
            style: {
              ...node.style,
              width: getStateNodeWidthForContent(content),
              ...(node.height != null ? { height: node.height } : {}),
            },
          };
        case 'text':
          if (fieldKey !== 'text') {
            return node;
          }

          return {
            ...node,
            data: {
              ...node.data,
              text: content,
            },
            style: {
              ...node.style,
              width: getOverviewTextWidthForContent(content, node.data.size),
            },
          };
        case 'block':
          if (fieldKey !== 'text' && fieldKey !== 'subtitle') {
            return node;
          }

          return {
            ...node,
            data: {
              ...node.data,
              [fieldKey]: content,
            },
            style: fieldKey === 'text'
              ? {
                  ...node.style,
                  width: getBlockNodeWidthForContent(content),
                }
              : node.style,
          };
        case 'layer':
          if (fieldKey !== 'title') {
            return node;
          }

          return {
            ...node,
            data: {
              ...node.data,
              title: content,
            },
          };
        case 'icon':
          if (fieldKey !== 'text') {
            return node;
          }

          return {
            ...node,
            data: {
              ...node.data,
              text: content,
            },
          };
        case 'entity':
          if (fieldKey === 'header') {
            return {
              ...node,
              data: {
                ...node.data,
                header: content,
              },
            };
          }

          if (!fieldKey.startsWith('row-')) {
            return node;
          }

          const rowIndex = Number(fieldKey.slice(4));

          if (Number.isNaN(rowIndex) || !node.data.rows[rowIndex]) {
            return node;
          }

          return {
            ...node,
            data: {
              ...node.data,
              rows: node.data.rows.map((row, index) =>
                index === rowIndex
                  ? {
                      ...row,
                      value: content,
                    }
                  : row),
            },
          };
        default:
          return node;
      }
    });
  };

  const updateNodeState = (
    nodeId: string,
    state: string | undefined,
  ) => {
    updateNode(nodeId, (node) => {
      switch (node.type) {
        case 'state':
          return {
            ...node,
            data: {
              ...node.data,
              state,
            },
          };
        case 'block':
          return {
            ...node,
            data: {
              ...node.data,
              state,
            },
          };
        case 'layer':
          return {
            ...node,
            data: {
              ...node.data,
              state,
            },
          };
        default:
          return node;
      }
    });
  };

  const buildUpdatedRoutableEdge = (
    edge: DiagramEdge,
    overrides: {
      previousSourceHandle?: string | null;
      previousTargetHandle?: string | null;
      routing?: RoutableEdgeData['routing'];
      sourceHandle?: string | null;
      targetHandle?: string | null;
      variant?: EdgeRoutingVariant;
    },
  ) => {
    const currentData = getRoutableEdgeData(edge);
    const sourceNode = nodesRef.current.find((node) => node.id === edge.source);
    const targetNode = nodesRef.current.find((node) => node.id === edge.target);
    const sourceHandle = overrides.sourceHandle ?? edge.sourceHandle;
    const targetHandle = overrides.targetHandle ?? edge.targetHandle;
    const variant = overrides.variant ?? currentData.variant;
    const routing = adaptEdgeRouting({
      previousSourcePosition: resolveHandlePosition(
        overrides.previousSourceHandle ?? edge.sourceHandle,
        Position.Right,
      ),
      previousTargetPosition: resolveHandlePosition(
        overrides.previousTargetHandle ?? edge.targetHandle,
        Position.Left,
      ),
      routing: overrides.routing,
      sourceBounds: getEdgeNodeBounds(sourceNode),
      sourceFallback: getNodeFallback(sourceNode),
      sourcePosition: resolveHandlePosition(sourceHandle, Position.Right),
      targetBounds: getEdgeNodeBounds(targetNode),
      targetFallback: getNodeFallback(targetNode),
      targetPosition: resolveHandlePosition(targetHandle, Position.Left),
      variant,
    });
    const nextData: RoutableEdgeData = {
      ...currentData,
      variant,
    };

    if (routing) {
      nextData.routing = routing;
    } else {
      delete nextData.routing;
    }

    return {
      ...edge,
      data: nextData,
      sourceHandle,
      targetHandle,
    };
  };

  const edgeEditor = {
    resetEdgeRouting: (edgeId: string) => {
      updateRoutableEdge(edgeId, (edge) =>
        buildUpdatedRoutableEdge(edge, {
          routing: undefined,
        }),
      );
    },
    setEdgeLabel: (edgeId: string, label: string | undefined) => {
      updateRoutableEdge(edgeId, (edge) => {
        if (edge.label === label) {
          return edge;
        }

        return {
          ...edge,
          label,
        };
      });
    },
    setEdgeRouting: (
      edgeId: string,
      updater:
        | RoutableEdgeData['routing']
        | undefined
        | ((
          current: RoutableEdgeData['routing'],
        ) => RoutableEdgeData['routing'] | undefined),
    ) => {
      updateRoutableEdge(edgeId, (edge) => {
        const currentData = getRoutableEdgeData(edge);
        const nextRouting = typeof updater === 'function'
          ? updater(currentData.routing)
          : updater;

        return buildUpdatedRoutableEdge(edge, {
          routing: nextRouting,
        });
      });
    },
    setEdgeSourcePosition: (edgeId: string, position: string) => {
      updateRoutableEdge(edgeId, (edge) =>
        buildUpdatedRoutableEdge(edge, {
          sourceHandle: position,
          routing: getRoutableEdgeData(edge).routing,
        }),
      );
    },
    setEdgeTargetPosition: (edgeId: string, position: string) => {
      updateRoutableEdge(edgeId, (edge) =>
        buildUpdatedRoutableEdge(edge, {
          routing: getRoutableEdgeData(edge).routing,
          targetHandle: position,
        }),
      );
    },
    setEdgeLineStyle: (edgeId: string, lineStyle: 'solid' | 'dashed') => {
      updateRoutableEdge(edgeId, (edge) => {
        const currentData = getRoutableEdgeData(edge);

        return {
          ...edge,
          data: {
            ...currentData,
            lineStyle,
          },
          style: applyRenderedLineStyle(edge, lineStyle),
        };
      });
    },
    setEdgeRoutingVariant: (edgeId: string, variant: EdgeRoutingVariant) => {
      updateRoutableEdge(edgeId, (edge) =>
        buildUpdatedRoutableEdge(edge, {
          routing: getRoutableEdgeData(edge).routing,
          variant,
        }),
      );
    },
  };

  const handleNodesChange = (changes: NodeChange<DiagramNode>[]) => {
    const persistChanges = editable && shouldPersistNodeChanges(changes);
    const resizedNodeIds = getResizedNodeIds(changes);

    setNodes((current) => {
      const oldLayerPositions = new Map<string, { x: number; y: number }>();
      for (const node of current) {
        if (node.type === 'layer') {
          oldLayerPositions.set(node.id, { x: node.position.x, y: node.position.y });
        }
      }

      const changedNodes = applyNodeChanges(changes, current) as DiagramNode[];
      let nextNodes = changedNodes.map(snapOverviewTextNodePosition);
      nextNodes = moveChildrenWithLayers(oldLayerPositions, nextNodes, resizedNodeIds);

      nodesRef.current = nextNodes;

      if (persistChanges) {
        commitManualEdits(nextNodes, edgesRef.current);
      }

      return nextNodes;
    });
  };

  const handleEdgesChange = (changes: EdgeChange<DiagramEdge>[]) => {
    const persistChanges = editable && shouldPersistEdgeChanges(changes);

    setEdges((current) => {
      const nextEdges = applyEdgeChanges(changes, current) as DiagramEdge[];

      edgesRef.current = nextEdges;

      if (persistChanges) {
        commitManualEdits(nodesRef.current, nextEdges);
      }

      return nextEdges;
    });
  };

  const handleReconnect = (oldEdge: DiagramEdge, newConnection: Connection) => {
    if (!editable) {
      return;
    }

    setEdges((current) => {
      const reconnectedEdges = reconnectEdge(oldEdge, newConnection, current) as DiagramEdge[];
      const nextEdges = reconnectedEdges.map((edge) => {
        if (edge.id !== oldEdge.id || !isEditableRoutableEdge(edge)) {
          return edge;
        }

        return buildUpdatedRoutableEdge(edge, {
          previousSourceHandle: oldEdge.sourceHandle,
          previousTargetHandle: oldEdge.targetHandle,
          routing: getRoutableEdgeData(edge).routing,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          variant: getRoutableEdgeData(edge).variant,
        });
      });

      edgesRef.current = nextEdges;
      commitManualEdits(nodesRef.current, nextEdges);

      return nextEdges;
    });
  };

  const handleConnect = (connection: Connection) => {
    if (!editable) {
      return;
    }

    const sourceNode = nodesRef.current.find((n) => n.id === connection.source);
    const targetNode = nodesRef.current.find((n) => n.id === connection.target);

    if (!sourceNode || !targetNode) {
      return;
    }

    const sameRow = sourceNode.position.y === targetNode.position.y;
    const sameCol = sourceNode.position.x === targetNode.position.x;

    let variant: EdgeRoutingVariant;
    if (definition.type === 'overview') {
      variant = sameRow ? 'straight' : 'default';
    } else {
      variant = sameRow || sameCol ? 'straight' : 'bend';
    }

    const edgeId =
      definition.type === 'overview'
        ? `edge-${connection.source}-${connection.target}-${connection.sourceHandle ?? 'auto'}-${connection.targetHandle ?? 'auto'}`
        : `edge-${connection.source}-${connection.target}-${connection.sourceHandle ?? 'auto'}-${connection.targetHandle ?? 'auto'}`;

    const newEdge: DiagramEdge = {
      id: edgeId,
      type: 'routable',
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? undefined,
      targetHandle: connection.targetHandle ?? undefined,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color: '#97A2B1',
      },
      style: {
        stroke: '#97A2B1',
        strokeWidth: 1.75,
      },
      data: {
        editable: true,
        variant,
      } satisfies RoutableEdgeData,
      interactionWidth: 28,
      selectable: true,
      reconnectable: true,
      deletable: true,
    };

    setEdges((current) => {
      const nextEdges = [...current, newEdge];
      edgesRef.current = nextEdges;
      commitManualEdits(nodesRef.current, nextEdges);
      return nextEdges;
    });
  };

  const handleDeleteSelection = () => {
    if (!editable || !hasSelection) {
      return;
    }

    const nextNodes = nodes.filter((node) => !selectedNodeIds.has(node.id));
    const nextEdges = edges.filter((edge) => {
      return (
        !selectedEdgeIds.has(edge.id) &&
        !selectedNodeIds.has(edge.source) &&
        !selectedNodeIds.has(edge.target)
      );
    });

    nodesRef.current = nextNodes;
    edgesRef.current = nextEdges;
    setNodes(nextNodes);
    setEdges(nextEdges);
    commitManualEdits(nextNodes, nextEdges);
  };

  const deleteLabel =
    selectedNodes.length === 1 && selectedEdges.length === 0
      ? 'Delete node'
      : selectedEdges.length === 1 && selectedNodes.length === 0
        ? 'Delete edge'
        : `Delete selection (${selectionCount})`;
  const inspector = selectedEditableRoutableEdge ? (
    <EdgeInspector
      edge={selectedEditableRoutableEdge}
      nodes={nodes}
      onDelete={handleDeleteSelection}
    />
  ) : selectedEditableNode ? (
    <NodeInspector
      node={selectedEditableNode}
      onDelete={handleDeleteSelection}
      onMarkdocChange={updateNodeMarkdoc}
      onStateChange={updateNodeState}
    />
  ) : editable && hasSelection ? (
    <SelectionInspector
      deleteLabel={deleteLabel}
      onDelete={handleDeleteSelection}
      selectionCount={selectionCount}
    />
  ) : (
    <DiagramInspectorPlaceholder editable={editable} />
  );

  return (
    <div
      className={`diagram-canvas ${editable ? 'diagram-canvas--editable' : 'diagram-canvas--readonly'}`}
      key={`${revision}:${viewportToken}`}
    >
      <EdgeEditorProvider value={edgeEditor}>
        <div className="diagram-canvas__viewport">
          <ReactFlow<DiagramNode, DiagramEdge>
            edges={edges}
            edgesReconnectable={editable}
            elevateEdgesOnSelect={editable}
            edgeTypes={edgeTypes}
            elementsSelectable={editable}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            maxZoom={1.6}
            minZoom={0.2}
            nodeTypes={nodeTypes}
            nodes={nodes}
            connectionMode={ConnectionMode.Strict}
            nodesConnectable={editable}
            nodesDraggable={editable}
            onConnect={editable ? handleConnect : undefined}
            onEdgesChange={editable ? handleEdgesChange : undefined}
            onNodesChange={editable ? handleNodesChange : undefined}
            onReconnect={editable ? handleReconnect : undefined}
            proOptions={{ hideAttribution: true }}
            reconnectRadius={24}
            snapGrid={[16, 16]}
            snapToGrid={editable}
            zoomOnDoubleClick={false}
          >
            <CanvasControls />
            <Background
              color={gridColor}
              gap={16}
              id="diagram-grid"
              size={1.15}
              variant={BackgroundVariant.Dots}
            />
          </ReactFlow>
          {statusNotice ? (
            <div
              aria-live="polite"
              className="diagram-canvas__status-notice"
              data-testid="canvas-status-notice"
              role="status"
            >
              {statusNotice}
            </div>
          ) : null}
        </div>
        {inspectorPortalTarget ? createPortal(inspector, inspectorPortalTarget) : null}
      </EdgeEditorProvider>
    </div>
  );
}
