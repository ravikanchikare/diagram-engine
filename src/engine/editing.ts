import { snapPositionToDiagramGrid, type DiagramEdge, type DiagramNode } from './layout';
import type {
  BlockDiagramDefinition,
  BlockEdgeElement,
  DiagramDefinition,
  DiagramHandlePosition,
  DiagramPosition,
  EntityDiagramDefinition,
  OverviewDiagramDefinition,
  OverviewEdgeElement,
  StateDiagramDefinition,
  StateEdgeElement,
  StateNodeElement,
} from './schema';
import {
  adaptEdgeRouting,
  normalizeEdgeRoutingVariant,
  resolveHandlePosition,
  type Point,
  type RoutableEdgeData,
  type EdgeNodeBounds,
} from './edge-routing';
import { Position } from '@xyflow/react';

export { DIAGRAM_GRID_SIZE as EDIT_GRID_SIZE } from './layout';

function roundPosition(position: DiagramPosition): DiagramPosition {
  return snapPositionToDiagramGrid(position);
}

function isHandlePosition(value: string | null | undefined): value is DiagramHandlePosition {
  return value === 'top' || value === 'right' || value === 'bottom' || value === 'left';
}

function toOptionalHandle(value: string | null | undefined) {
  return value ?? undefined;
}

function buildNodeLookup(nodes: DiagramNode[]) {
  return new Map(nodes.map((node) => [node.id, roundPosition(node.position)]));
}

function buildEdgeLookup(edges: DiagramEdge[]) {
  return new Map(edges.map((edge) => [edge.id, edge]));
}

function buildDiagramNodeLookup(nodes: DiagramNode[]) {
  return new Map(nodes.map((node) => [node.id, node]));
}

function getExplicitNodeWidth(node: DiagramNode | undefined) {
  if (!node) {
    return undefined;
  }

  const candidates = [
    (node as { width?: unknown }).width,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'number') {
      return candidate;
    }

    if (typeof candidate === 'string') {
      const parsed = Number(candidate);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function getExplicitNodeHeight(node: DiagramNode | undefined) {
  if (!node) {
    return undefined;
  }

  const candidates = [
    (node as { height?: unknown }).height,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'number') {
      return candidate;
    }

    if (typeof candidate === 'string') {
      const parsed = Number(candidate);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function getPersistedNodeHeight(
  node: DiagramNode | undefined,
  existingHeight: number | undefined,
) {
  return getExplicitNodeHeight(node) ?? existingHeight;
}

function getPersistedNodeWidth(
  node: DiagramNode | undefined,
  existingWidth: number | undefined,
) {
  return getExplicitNodeWidth(node) ?? existingWidth;
}

function getRoutableEdgeId(edge: StateEdgeElement) {
  return edge.id ?? `edge-${edge.from}-${edge.to}`;
}

function isStateNodeElement(
  element: StateDiagramDefinition['elements'][number],
): element is StateNodeElement {
  return 'type' in element && element.type === 'state';
}

function isEntityNodeElement(
  element: EntityDiagramDefinition['elements'][number],
): element is Extract<EntityDiagramDefinition['elements'][number], { type: 'entity' }> {
  return element.type === 'entity';
}

function isOverviewNodeElement(
  element: OverviewDiagramDefinition['elements'][number],
): element is Extract<OverviewDiagramDefinition['elements'][number], { type: 'icon' | 'text' }> {
  return element.type === 'icon' || element.type === 'text';
}

function isOverviewEdgeElement(
  element: OverviewDiagramDefinition['elements'][number],
): element is OverviewEdgeElement {
  return !isOverviewNodeElement(element);
}

function getRoutableEdgeData(edge: DiagramEdge) {
  return ((edge.data as RoutableEdgeData | undefined) ?? {}) satisfies RoutableEdgeData;
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

function getStateNodeFallbackPoint(node: DiagramNode | undefined): Point {
  return {
    x: node?.position.x ?? 0,
    y: node?.position.y ?? 0,
  };
}

function isSameRowLoopback(
  element: StateEdgeElement,
  nodesById: ReadonlyMap<string, DiagramNode>,
) {
  if (element.from === element.to) {
    return false;
  }

  const source = nodesById.get(element.from);
  const target = nodesById.get(element.to);

  if (!source || !target) {
    return false;
  }

  return source.position.x > target.position.x && source.position.y === target.position.y;
}

function resolveOriginalStateHandlePosition(
  element: StateEdgeElement,
  endpoint: 'source' | 'target',
  nodesById: ReadonlyMap<string, DiagramNode>,
) {
  const explicitPosition = endpoint === 'source'
    ? element.fromPosition
    : element.toPosition;

  if (explicitPosition && explicitPosition !== 'auto') {
    return resolveHandlePosition(
      explicitPosition,
      endpoint === 'source' ? Position.Right : Position.Left,
    );
  }

  if (isSameRowLoopback(element, nodesById)) {
    const loopHandle =
      element.fromPosition === 'bottom' || element.toPosition === 'bottom'
        ? Position.Bottom
        : Position.Top;

    return loopHandle;
  }

  return endpoint === 'source' ? Position.Right : Position.Left;
}

function buildEdgeRoutingVariantPatch(
  element: StateEdgeElement,
  variant: unknown,
): Partial<StateEdgeElement> {
  const normalizedVariant = normalizeEdgeRoutingVariant(variant);

  if (normalizedVariant === 'default') {
    if (element.type !== undefined) {
      return { type: 'default' };
    }

    if (element.style !== undefined) {
      return { style: 'default' };
    }

    return {};
  }

  if (element.type !== undefined) {
    return { type: normalizedVariant };
  }

  if (element.style !== undefined) {
    return { style: normalizedVariant };
  }

  return { type: normalizedVariant };
}

function getNextEdgeLabel(edge: DiagramEdge) {
  return typeof edge.label === 'string' && edge.label.trim()
    ? edge.label.trim()
    : undefined;
}

function applyEditableConnectionAppearance<
  T extends {
    label?: string;
    lineStyle?: 'solid' | 'dashed';
    routing?: RoutableEdgeData['routing'];
    type?: string;
  },
>(element: T, edge: DiagramEdge): T {
  const edgeData = getRoutableEdgeData(edge);
  const nextElement = { ...element };
  const nextLabel = getNextEdgeLabel(edge);
  const nextVariant = normalizeEdgeRoutingVariant(edgeData.variant);

  if (nextVariant !== 'default') {
    nextElement.type = nextVariant;
  } else if (nextElement.type !== undefined) {
    nextElement.type = 'default';
  }

  if (nextLabel !== undefined) {
    nextElement.label = nextLabel;
  } else {
    delete nextElement.label;
  }

  if (edgeData.routing) {
    nextElement.routing = edgeData.routing;
  } else {
    delete nextElement.routing;
  }

  if (edgeData.lineStyle !== undefined) {
    nextElement.lineStyle = edgeData.lineStyle;
  }

  return nextElement;
}

function applyEntityEdits(
  definition: EntityDiagramDefinition,
  nodes: DiagramNode[],
  edges: DiagramEdge[],
): EntityDiagramDefinition {
  const nodeLookup = buildNodeLookup(nodes);
  const diagramNodesById = buildDiagramNodeLookup(nodes);
  const edgeLookup = buildEdgeLookup(edges);

  return {
    ...definition,
    elements: definition.elements
      .filter((element) => {
        return element.type === 'entity'
          ? nodeLookup.has(element.id)
          : edgeLookup.has(element.id);
      })
      .map((element) => {
      if (isEntityNodeElement(element)) {
        const position = nodeLookup.get(element.id);
        const node = diagramNodesById.get(element.id);

        return position
          ? {
              ...element,
              position,
              data: {
                ...element.data,
                header: node?.type === 'entity' ? node.data.header : element.data.header,
                rows:
                  node?.type === 'entity'
                    ? element.data.rows.map((row, index) => ({
                        ...row,
                        value: node.data.rows[index]?.value ?? row.value,
                      }))
                    : element.data.rows,
              },
            }
          : element;
      }

      const edge = edgeLookup.get(element.id);

      if (!edge) {
        return element;
      }

      return {
        ...element,
        source: edge.source,
        target: edge.target,
        sourceHandle: toOptionalHandle(edge.sourceHandle),
        targetHandle: toOptionalHandle(edge.targetHandle),
      };
      }),
  };
}

function applyOverviewEdits(
  definition: OverviewDiagramDefinition,
  nodes: DiagramNode[],
  edges: DiagramEdge[],
): OverviewDiagramDefinition {
  const nodeLookup = buildNodeLookup(nodes);
  const diagramNodesById = buildDiagramNodeLookup(nodes);
  const edgeLookup = buildEdgeLookup(edges);

  return {
    ...definition,
    elements: definition.elements
      .filter((element) => {
        return isOverviewNodeElement(element)
          ? nodeLookup.has(element.id)
          : edgeLookup.has(element.id);
      })
      .map((element) => {
      if (isOverviewNodeElement(element)) {
        const position = nodeLookup.get(element.id);
        const node = diagramNodesById.get(element.id);

        if (!position) {
          return element;
        }

        if (element.type === 'icon' && node?.type === 'icon') {
          return {
            ...element,
            position,
            data: {
              ...element.data,
              text: node.data.text,
            },
          };
        }

        if (element.type === 'text' && node?.type === 'text') {
          return {
            ...element,
            position,
            width: getPersistedNodeWidth(node, element.width),
            data: {
              ...element.data,
              text: node.data.text,
            },
          };
        }

        return { ...element, position };
      }

      const edge = edgeLookup.get(element.id);

      if (!edge) {
        return element;
      }

      return {
        ...applyEditableConnectionAppearance(element, edge),
        source: edge.source,
        target: edge.target,
        sourceHandle: toOptionalHandle(edge.sourceHandle),
        targetHandle: toOptionalHandle(edge.targetHandle),
      };
      }),
  };
}

function applyStateEdits(
  definition: StateDiagramDefinition,
  nodes: DiagramNode[],
  edges: DiagramEdge[],
): StateDiagramDefinition {
  const nodeLookup = buildNodeLookup(nodes);
  const diagramNodesById = buildDiagramNodeLookup(nodes);
  const edgeLookup = buildEdgeLookup(edges);
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  return {
    ...definition,
    elements: definition.elements
      .filter((element) => {
        return isStateNodeElement(element)
          ? nodeLookup.has(element.id)
          : edgeLookup.has(getRoutableEdgeId(element));
      })
      .map((element) => {
      if (isStateNodeElement(element)) {
        const position = nodeLookup.get(element.id);
        const node = diagramNodesById.get(element.id);

        return position
          ? {
              ...element,
              x: position.x,
              y: position.y,
              width: getPersistedNodeWidth(node, element.width),
              height: getPersistedNodeHeight(node, element.height),
              data: {
                ...element.data,
                state: node?.type === 'state' ? node.data.state : element.data.state,
                text: node?.type === 'state' ? node.data.text : element.data.text,
              },
            }
          : element;
      }

      const edge = edgeLookup.get(getRoutableEdgeId(element));

      if (!edge) {
        return element;
      }

      const sourcePosition = isHandlePosition(edge.sourceHandle)
        ? resolveHandlePosition(edge.sourceHandle, Position.Right)
        : resolveOriginalStateHandlePosition(element, 'source', nodesById);
      const targetPosition = isHandlePosition(edge.targetHandle)
        ? resolveHandlePosition(edge.targetHandle, Position.Left)
        : resolveOriginalStateHandlePosition(element, 'target', nodesById);
      const originalSourcePosition = resolveOriginalStateHandlePosition(
        element,
        'source',
        nodesById,
      );
      const originalTargetPosition = resolveOriginalStateHandlePosition(
        element,
        'target',
        nodesById,
      );
      const nextRouting = adaptEdgeRouting({
        previousSourcePosition: originalSourcePosition,
        previousTargetPosition: originalTargetPosition,
        routing: getRoutableEdgeData(edge).routing,
        sourceBounds: getEdgeNodeBounds(nodesById.get(edge.source)),
        sourceFallback: getStateNodeFallbackPoint(nodesById.get(edge.source)),
        sourcePosition,
        targetBounds: getEdgeNodeBounds(nodesById.get(edge.target)),
        targetFallback: getStateNodeFallbackPoint(nodesById.get(edge.target)),
        targetPosition,
        variant: getRoutableEdgeData(edge).variant,
      });
      const nextElement: StateEdgeElement = {
        ...element,
        ...buildEdgeRoutingVariantPatch(element, getRoutableEdgeData(edge).variant),
        from: edge.source,
        to: edge.target,
        fromPosition: isHandlePosition(edge.sourceHandle)
          ? edge.sourceHandle
          : element.fromPosition,
        toPosition: isHandlePosition(edge.targetHandle)
          ? edge.targetHandle
          : element.toPosition,
      };
      const nextLabel =
        typeof edge.label === 'string' && edge.label.trim()
          ? edge.label.trim()
          : undefined;
      const nextLineStyle = getRoutableEdgeData(edge).lineStyle;

      if (nextLabel !== undefined) {
        nextElement.label = nextLabel;
      } else {
        delete nextElement.label;
      }

      if (nextRouting) {
        nextElement.routing = nextRouting;
      } else {
        delete nextElement.routing;
      }

      if (nextLineStyle !== undefined) {
        nextElement.lineStyle = nextLineStyle;
      }

      if (!element.id && nextRouting) {
        nextElement.id = edge.id;
      }

      return nextElement;
      }),
  };
}

function isBlockEdgeElement(
  element: BlockDiagramDefinition['elements'][number],
): element is BlockEdgeElement {
  return 'from' in element && 'to' in element && !('type' in element && (element as { type: string }).type === 'block');
}

function buildBlockEdgeId(element: BlockEdgeElement) {
  return element.id ?? `edge-${element.from}-${element.to}`;
}

function applyBlockEdits(
  definition: BlockDiagramDefinition,
  nodes: DiagramNode[],
  edges: DiagramEdge[],
): BlockDiagramDefinition {
  const nodeLookup = buildNodeLookup(nodes);
  const diagramNodesById = buildDiagramNodeLookup(nodes);
  const edgeLookup = buildEdgeLookup(edges);

  return {
    ...definition,
    elements: definition.elements
      .filter((element) => {
        return isBlockEdgeElement(element)
          ? edgeLookup.has(buildBlockEdgeId(element))
          : nodeLookup.has(element.id);
      })
      .map((element) => {
      if (!isBlockEdgeElement(element)) {
        const position = nodeLookup.get(element.id);
        const node = diagramNodesById.get(element.id);

        if (!position) {
          return element;
        }

        if (element.type === 'block' && node?.type === 'block') {
          return {
            ...element,
            x: position.x,
            y: position.y,
            width: getPersistedNodeWidth(node, element.width),
            height: getPersistedNodeHeight(node, element.height),
            data: {
              ...element.data,
              state: node.data.state as typeof element.data.state,
              subtitle: node.data.subtitle,
              text: node.data.text,
            },
          };
        }

        if (element.type === 'layer' && node?.type === 'layer') {
          return {
            ...element,
            x: position.x,
            y: position.y,
            width: getPersistedNodeWidth(node, element.width) ?? element.width,
            height: getPersistedNodeHeight(node, element.height) ?? element.height,
            data: {
              ...element.data,
              state: node.data.state as typeof element.data.state,
              title: node.data.title,
            },
          };
        }

        return { ...element, x: position.x, y: position.y };
      }

      const edge = edgeLookup.get(buildBlockEdgeId(element));

      if (!edge) {
        return element;
      }

      const sourceHandle = isHandlePosition(edge.sourceHandle)
        ? edge.sourceHandle
        : undefined;
      const targetHandle = isHandlePosition(edge.targetHandle)
        ? edge.targetHandle
        : undefined;
      const nextElement: BlockEdgeElement = {
        ...applyEditableConnectionAppearance(element, edge),
        from: edge.source,
        to: edge.target,
      };

      if (sourceHandle) {
        nextElement.fromPosition = sourceHandle;
      } else {
        delete nextElement.fromPosition;
      }

      if (targetHandle) {
        nextElement.toPosition = targetHandle;
      } else {
        delete nextElement.toPosition;
      }

      return nextElement;
      }),
  };
}

export function supportsManualCorrections(definition: DiagramDefinition) {
  return definition.type !== 'sequence';
}

export function applyFlowEditsToDefinition(
  definition: DiagramDefinition,
  nodes: DiagramNode[],
  edges: DiagramEdge[],
): DiagramDefinition {
  switch (definition.type) {
    case 'sequence':
      return definition;
    case 'entity':
      return applyEntityEdits(definition, nodes, edges);
    case 'overview':
      return applyOverviewEdits(definition, nodes, edges);
    case 'state':
      return applyStateEdits(definition, nodes, edges);
    case 'block':
      return applyBlockEdits(definition, nodes, edges);
  }
}
