import {
  MarkerType,
  Position,
  type Edge,
  type Node,
} from '@xyflow/react';
import { clamp } from './utils';
import {
  getOverviewNodeConnectorColor,
  getSequenceActorConnectorColor,
  getStateNodeConnectorColor,
  resolveConnectorAppearance,
  type ConnectorEndpointAppearance,
} from './connector-appearance';
import { getDesiredHorizontalConnectionGap } from './connection-spacing';
import type { RoutableEdgeData, EdgeRoutingVariant } from './edge-routing';
import type {
  DiagramConnectionElement,
  DiagramDefinition,
  EntityDiagramDefinition,
  EntityElement,
  MarkdocContent,
  MarkdocNode,
  OverviewDiagramDefinition,
  OverviewEdgeElement,
  OverviewIconElement,
  OverviewTextElement,
  SequenceActionElement,
  SequenceActorElement,
  SequenceDiagramDefinition,
  SequenceEdgeElement,
  StateDiagramDefinition,
  StateEdgeElement,
  StateNodeElement,
  BlockDiagramDefinition,
  BlockNodeElement,
  BlockLayerElement,
  BlockEdgeElement,
  DiagramPosition,
  EdgeRouting,
} from './schema';
import { extractMarkdocText, truncateMarkdocNodes } from './markdoc';
import { getOverviewIconMeta } from './overview-icons';
import {
  minimizeBlockCrossings,
  minimizeStateCrossings,
} from './crossing-minimization';

export const LAYOUT = {
  actorWidth: 157,
  actorLineX: 24,
  actorLabelHeight: 30,
  actorLaneGap: 6,
  actorAccentTop: 6,
  actorAccentHeight: 18,
  actorSegmentHeight: 44,
  minLaneSpacing: 206,
  maxLaneSpacing: 314,
  targetActorSpread: 888,
  headerHeight: 54,
  rowHeight: 96,
  actionHeight: 62,
  actionHorizontalPadding: 14,
  actionApproxCharacterWidth: 7.4,
  actionMaxLines: 2,
  actionMinCharacters: 22,
  actionMaxCharacters: 72,
  minActionWidth: 132,
  maxActionWidth: 540,
  loopActionWidth: 160,
  canvasPadding: 48,
  entityWidth: 292,
  entityHeaderHeight: 44,
  entityRowHeight: 36,
  overviewIconWidth: 124,
  overviewIconHeight: 68,
  overviewTextPadding: 18,
  overviewTextMinWidth: 132,
  overviewTextMaxWidth: 240,
  stateMinWidth: 168,
  stateMaxWidth: 220,
  stateMinHeight: 40,
  stateHeight: 52,
  stateHorizontalGapCompactionThreshold: 32,
  blockMinWidth: 148,
  blockMaxWidth: 280,
  blockHeight: 56,
  blockApproxCharacterWidth: 7.4,
  blockHorizontalPadding: 34,
  blockVerticalPadding: 28,
  blockLayerMinWidth: 200,
  blockLayerMaxWidth: 1600,
  blockLayerMinHeight: 100,
  blockLayerMaxHeight: 400,
  blockLayerHeaderHeight: 36,
  blockLayerPadding: 14,
  gridColStep: 304,
  gridRowStep: 172,
} as const;

export const DIAGRAM_GRID_SIZE = 16;

export function snapPositionToDiagramGrid(position: DiagramPosition): DiagramPosition {
  return {
    x: Math.round(position.x / DIAGRAM_GRID_SIZE) * DIAGRAM_GRID_SIZE,
    y: Math.round(position.y / DIAGRAM_GRID_SIZE) * DIAGRAM_GRID_SIZE,
  };
}

type GridPositioned = {
  x?: number;
  y?: number;
  col?: number;
  row?: number;
};

function resolveGridPosition(element: GridPositioned) {
  const x =
    typeof element.x === 'number'
      ? element.x
      : typeof element.col === 'number'
        ? element.col * LAYOUT.gridColStep
        : 0;
  const y =
    typeof element.y === 'number'
      ? element.y
      : typeof element.row === 'number'
        ? element.row * LAYOUT.gridRowStep
        : 0;
  return { x, y };
}

type HandleSide = 'top' | 'right' | 'bottom' | 'left';

function inferEdgeRouting(
  source: { x: number; y: number },
  target: { x: number; y: number },
): { fromPosition: HandleSide; toPosition: HandleSide; type: 'straight' | 'bend' } {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const sameRow = dy === 0;
  const sameCol = dx === 0;

  if (sameRow && sameCol) {
    return { fromPosition: 'right', toPosition: 'left', type: 'straight' };
  }
  if (sameRow) {
    return dx > 0
      ? { fromPosition: 'right', toPosition: 'left', type: 'straight' }
      : { fromPosition: 'left', toPosition: 'right', type: 'straight' };
  }
  if (sameCol) {
    return dy > 0
      ? { fromPosition: 'bottom', toPosition: 'top', type: 'straight' }
      : { fromPosition: 'top', toPosition: 'bottom', type: 'straight' };
  }
  return {
    fromPosition: dx > 0 ? 'right' : 'left',
    toPosition: dy > 0 ? 'top' : 'bottom',
    type: 'bend',
  };
}

function resolveEdgeRouting(
  edge: { fromPosition?: string; toPosition?: string; type?: string },
  source: { x: number; y: number } | undefined,
  target: { x: number; y: number } | undefined,
) {
  const explicitFrom =
    edge.fromPosition && edge.fromPosition !== 'auto' ? edge.fromPosition : undefined;
  const explicitTo =
    edge.toPosition && edge.toPosition !== 'auto' ? edge.toPosition : undefined;
  const explicitType = edge.type;

  if (!source || !target) {
    return {
      fromPosition: explicitFrom,
      toPosition: explicitTo,
      type: explicitType,
    };
  }

  const inferred = inferEdgeRouting(source, target);
  return {
    fromPosition: explicitFrom ?? inferred.fromPosition,
    toPosition: explicitTo ?? inferred.toPosition,
    type: explicitType ?? inferred.type,
  };
}

export interface SequenceActorNodeData extends Record<string, unknown> {
  heading: MarkdocContent;
  rows: number;
  color: SequenceActorElement['data']['color'];
  activeRows: number[];
  lineX: number;
}

export interface SequenceActionNodeData extends Record<string, unknown> {
  text: MarkdocNode[];
  row: number;
  from: string;
  to: string;
  isTruncated: boolean;
}

export interface EntityNodeData extends Record<string, unknown> {
  header: MarkdocContent;
  rows: EntityElement['data']['rows'];
  handles: string[];
}

export interface OverviewIconNodeData extends Record<string, unknown> {
  icon: string;
  label: string;
  text: MarkdocContent;
  size: OverviewIconElement['data']['size'];
  color: string;
}

export interface OverviewTextNodeData extends Record<string, unknown> {
  text: MarkdocContent;
  size: OverviewTextElement['data']['size'];
  color: string;
}

export interface StateNodeData extends Record<string, unknown> {
  text: MarkdocContent;
  state?: string;
}

export interface BlockNodeData extends Record<string, unknown> {
  text: MarkdocContent;
  state?: string;
  subtitle?: MarkdocContent;
}

export interface BlockLayerData extends Record<string, unknown> {
  title: MarkdocContent;
  children?: string[];
  state?: string;
}

export type DiagramNodeData =
  | SequenceActorNodeData
  | SequenceActionNodeData
  | EntityNodeData
  | OverviewIconNodeData
  | OverviewTextNodeData
  | StateNodeData
  | BlockNodeData
  | BlockLayerData;

export type SequenceActorFlowNode = Node<
  SequenceActorNodeData,
  'sequenceActor'
>;
export type SequenceActionFlowNode = Node<
  SequenceActionNodeData,
  'sequenceAction'
>;
export type EntityFlowNode = Node<EntityNodeData, 'entity'>;
export type OverviewIconFlowNode = Node<OverviewIconNodeData, 'icon'>;
export type OverviewTextFlowNode = Node<OverviewTextNodeData, 'text'>;
export type StateFlowNode = Node<StateNodeData, 'state'>;
export type BlockFlowNode = Node<BlockNodeData, 'block'>;
export type BlockLayerFlowNode = Node<BlockLayerData, 'layer'>;

export type DiagramNode =
  | SequenceActorFlowNode
  | SequenceActionFlowNode
  | EntityFlowNode
  | OverviewIconFlowNode
  | OverviewTextFlowNode
  | StateFlowNode
  | BlockFlowNode
  | BlockLayerFlowNode;

export type DiagramEdge = Edge;

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function buildMarker(arrowHeadType: string | undefined, color: string) {
  if (arrowHeadType && arrowHeadType !== 'arrowclosed') {
    return undefined;
  }

  return {
    type: MarkerType.ArrowClosed,
    width: 16,
    height: 16,
    color,
  };
}

function buildEdgeStyle(edge: {
  color: string;
  lineStyle: 'solid' | 'dashed';
}) {
  const style = {
    stroke: edge.color,
    strokeWidth: 1.75,
  };

  if (edge.lineStyle === 'dashed') {
    return {
      ...style,
      strokeDasharray: '6 6',
    };
  }

  return style;
}

function buildLabelStyle(style: Record<string, unknown> | undefined) {
  if (!style) {
    return undefined;
  }

  const { fontFamily: _fontFamily, ...rest } = style;

  return rest;
}

function buildConnectionEdge(
  edge: Pick<
    DiagramConnectionElement,
    | 'id'
    | 'type'
    | 'source'
    | 'target'
    | 'arrowHeadType'
    | 'sourceHandle'
    | 'targetHandle'
    | 'label'
    | 'labelStyle'
    | 'labelBgStyle'
    | 'state'
    | 'color'
    | 'lineStyle'
    | 'inheritColorFrom'
  >,
  editable = false,
  endpoints?: {
    source?: ConnectorEndpointAppearance;
    target?: ConnectorEndpointAppearance;
  },
  mode: 'light' | 'dark' = 'light',
) {
  const appearance = resolveConnectorAppearance(edge, endpoints, mode);

  return {
    id: edge.id,
    type: edge.type,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    markerEnd: buildMarker(edge.arrowHeadType, appearance.markerColor),
    label: edge.label || undefined,
    labelStyle: buildLabelStyle(edge.labelStyle),
    labelBgStyle: edge.labelBgStyle,
    labelShowBg: Boolean(edge.label),
    style: buildEdgeStyle(appearance),
    interactionWidth: editable ? 28 : 20,
    selectable: editable,
    reconnectable: editable,
    deletable: false,
  } satisfies DiagramEdge;
}

function buildRoutableEdge(params: {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  arrowHeadType?: string;
  markerColor: string;
  label?: string;
  labelStyle?: Record<string, unknown>;
  labelBgStyle?: Record<string, unknown>;
  routing?: EdgeRouting;
  variant: EdgeRoutingVariant;
  style: { stroke: string; strokeWidth: number; strokeDasharray?: string };
}): DiagramEdge {
  return {
    id: params.id,
    type: 'routable',
    source: params.source,
    target: params.target,
    sourceHandle: params.sourceHandle,
    targetHandle: params.targetHandle,
    markerEnd: buildMarker(params.arrowHeadType, params.markerColor),
    label: params.label,
    labelStyle: buildLabelStyle(params.labelStyle),
    labelBgStyle: params.labelBgStyle,
    labelShowBg: false,
    data: {
      editable: true,
      routing: params.routing,
      variant: params.variant,
    } satisfies RoutableEdgeData,
    style: params.style,
    interactionWidth: 28,
    selectable: true,
    reconnectable: true,
    deletable: false,
  };
}

function useOrthogonalEdge(edge: SequenceEdgeElement) {
  return edge.sourceHandle === 'bottom' || edge.targetHandle === 'top';
}

function getActorElements(definition: SequenceDiagramDefinition) {
  return definition.elements
    .filter((element): element is SequenceActorElement => {
      return element.type === 'sequenceActor';
    })
    .sort((left, right) => left.data.index - right.data.index);
}

function getActionElements(definition: SequenceDiagramDefinition) {
  return definition.elements.filter((element): element is SequenceActionElement => {
    return element.type === 'sequenceAction';
  });
}

function getSequenceEdgeElements(definition: SequenceDiagramDefinition) {
  return definition.elements.filter((element): element is SequenceEdgeElement => {
    return element.type !== 'sequenceActor' && element.type !== 'sequenceAction';
  });
}

function getTotalRows(
  actorElements: SequenceActorElement[],
  actionElements: SequenceActionElement[],
) {
  const actorRows = actorElements.reduce((current, actor) => {
    return Math.max(current, actor.data.rows);
  }, 0);

  const actionRows = actionElements.reduce((current, action) => {
    return Math.max(current, action.data.row);
  }, 0);

  return Math.max(actorRows, actionRows);
}

function getRowCenter(row: number) {
  return LAYOUT.headerHeight + row * LAYOUT.rowHeight - LAYOUT.rowHeight / 2;
}

export function getLaneSpacing(actorCount: number) {
  if (actorCount <= 1) {
    return 0;
  }

  return clamp(
    LAYOUT.targetActorSpread / (actorCount - 1),
    LAYOUT.minLaneSpacing,
    LAYOUT.maxLaneSpacing,
  );
}

function getLoopOffsetX(laneSpacing: number) {
  return clamp(laneSpacing * 0.34, 52, 72);
}

function getActionCharacterLimit(width: number) {
  const contentWidth = Math.max(
    width - LAYOUT.actionHorizontalPadding * 2,
    LAYOUT.minActionWidth - LAYOUT.actionHorizontalPadding * 2,
  );
  const estimatedCharactersPerLine = Math.max(
    12,
    Math.floor(contentWidth / LAYOUT.actionApproxCharacterWidth),
  );

  return clamp(
    estimatedCharactersPerLine * LAYOUT.actionMaxLines,
    LAYOUT.actionMinCharacters,
    LAYOUT.actionMaxCharacters,
  );
}

function buildActorNodes(
  actorElements: SequenceActorElement[],
  actionElements: SequenceActionElement[],
  totalRows: number,
) {
  const actorPositions = new Map<string, number>();
  const actorRows = new Map<string, Set<number>>();
  const laneSpacing = getLaneSpacing(actorElements.length);

  actionElements.forEach((action) => {
    const fromRows = actorRows.get(action.data.from) ?? new Set<number>();
    fromRows.add(action.data.row);
    actorRows.set(action.data.from, fromRows);

    const toRows = actorRows.get(action.data.to) ?? new Set<number>();
    toRows.add(action.data.row);
    actorRows.set(action.data.to, toRows);
  });

  const nodes = actorElements.map<SequenceActorFlowNode>((actor) => {
    const x = actor.data.index * laneSpacing;
    actorPositions.set(actor.id, x + LAYOUT.actorLineX);

    return {
      id: actor.id,
      type: 'sequenceActor',
      position: { x, y: 0 },
      data: {
        heading: actor.data.heading,
        rows: totalRows,
        color: actor.data.color,
        activeRows: [...(actorRows.get(actor.id) ?? new Set<number>())].sort(
          (left, right) => left - right,
        ),
        lineX: LAYOUT.actorLineX,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      draggable: false,
      selectable: false,
      deletable: false,
      style: {
        width: LAYOUT.actorWidth,
        height: LAYOUT.headerHeight + totalRows * LAYOUT.rowHeight,
      },
    };
  });

  return { actorPositions, laneSpacing, nodes };
}

function buildActionNodes(
  actionElements: SequenceActionElement[],
  actorLinePositions: Map<string, number>,
  laneSpacing: number,
) {
  const loopOffsetX = getLoopOffsetX(laneSpacing);

  return actionElements.map<SequenceActionFlowNode>((action) => {
    const sourceLineX = actorLinePositions.get(action.data.from);
    const targetLineX = actorLinePositions.get(action.data.to);

    if (sourceLineX === undefined || targetLineX === undefined) {
      throw new Error(`Action ${action.id} references an unknown actor lane.`);
    }

    const distance = Math.abs(targetLineX - sourceLineX);
    const edgeInset = clamp(distance * 0.16, 28, 42);
    const width =
      action.data.from === action.data.to
        ? LAYOUT.loopActionWidth
        : clamp(distance - edgeInset * 2, LAYOUT.minActionWidth, LAYOUT.maxActionWidth);

    const x =
      action.data.from === action.data.to
        ? sourceLineX + loopOffsetX
        : Math.min(sourceLineX, targetLineX) + distance / 2 - width / 2;
    const y = getRowCenter(action.data.row) - LAYOUT.actionHeight / 2;
    const fullText = normalizeText(extractMarkdocText(action.data.text));
    const characterLimit = getActionCharacterLimit(width);
    const text = truncateMarkdocNodes(action.data.text, characterLimit);
    const truncatedText = normalizeText(extractMarkdocText(text));

    return {
      id: action.id,
      type: 'sequenceAction',
      position: { x, y },
      data: {
        text,
        row: action.data.row,
        from: action.data.from,
        to: action.data.to,
        isTruncated: truncatedText !== fullText,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      draggable: false,
      selectable: false,
      deletable: false,
      style: {
        width,
        height: LAYOUT.actionHeight,
      },
    };
  });
}

function buildSequenceConnectorColors(actorElements: SequenceActorElement[]) {
  return new Map<string, ConnectorEndpointAppearance>(
    actorElements.map((actor) => [
      actor.id,
      {
        color: getSequenceActorConnectorColor(actor.data.color),
      },
    ]),
  );
}

function buildSequenceEdges(
  edgeElements: SequenceEdgeElement[],
  connectorColors: ReadonlyMap<string, ConnectorEndpointAppearance>,
  actionElements: SequenceActionElement[],
  mode: 'light' | 'dark' = 'light',
) {
  const actionSourceColors = new Map<string, ConnectorEndpointAppearance>();
  const actionTargetColors = new Map<string, ConnectorEndpointAppearance>();
  for (const action of actionElements) {
    const fromColor = connectorColors.get(action.data.from);
    if (fromColor) {
      actionTargetColors.set(action.id, fromColor);
    }

    const toColor = connectorColors.get(action.data.to);
    if (toColor) {
      actionSourceColors.set(action.id, toColor);
    }
  }

  return edgeElements.map<DiagramEdge>((edge) => {
    const type =
      edge.type === 'dashed'
        ? edge.type
        : useOrthogonalEdge(edge)
          ? 'orthogonal'
          : edge.type;

    return buildConnectionEdge({
      ...edge,
      type,
    }, false, {
      source: connectorColors.get(edge.source) ?? actionSourceColors.get(edge.source),
      target: connectorColors.get(edge.target) ?? actionTargetColors.get(edge.target),
    }, mode);
  });
}

export function buildSequenceFlow(definition: SequenceDiagramDefinition, mode: 'light' | 'dark' = 'light') {
  const actorElements = getActorElements(definition);
  const actionElements = getActionElements(definition);
  const edgeElements = getSequenceEdgeElements(definition);
  const totalRows = getTotalRows(actorElements, actionElements);
  const { actorPositions, laneSpacing, nodes: actorNodes } = buildActorNodes(
    actorElements,
    actionElements,
    totalRows,
  );
  const actionNodes = buildActionNodes(actionElements, actorPositions, laneSpacing);
  const connectorColors = buildSequenceConnectorColors(actorElements);
  const edges = buildSequenceEdges(edgeElements, connectorColors, actionElements, mode);

  return {
    nodes: [...actorNodes, ...actionNodes],
    edges,
  };
}

function isEntityNodeElement(
  element: EntityDiagramDefinition['elements'][number],
): element is EntityElement {
  return element.type === 'entity';
}

function buildEntityNode(element: EntityElement): EntityFlowNode {
  return {
    id: element.id,
    type: 'entity',
    position: element.position,
    data: {
      header: element.data.header,
      rows: element.data.rows,
      handles: element.data.handles,
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    draggable: true,
    selectable: true,
    deletable: false,
    style: {
      width: LAYOUT.entityWidth,
    },
  };
}

function buildEntityFlow(definition: EntityDiagramDefinition, mode: 'light' | 'dark' = 'light') {
  const nodes = definition.elements
    .filter(isEntityNodeElement)
    .map((element) => buildEntityNode(element));
  const edges = definition.elements
    .filter((element): element is Exclude<typeof element, EntityElement> => {
      return !isEntityNodeElement(element);
    })
    .map((edge) => buildConnectionEdge(edge, true, undefined, mode));

  return { nodes, edges };
}

export function getOverviewTextWidthForContent(
  content: MarkdocContent,
  size: OverviewTextElement['data']['size'],
) {
  const normalizedContent = normalizeText(extractMarkdocText(content));

  switch (size) {
    case 'small':
      return 120;
    case 'medium':
      return 176;
    case 'large':
      return 232;
    default:
      return clamp(
        normalizedContent.length * 6.8 + LAYOUT.overviewTextPadding * 2,
        LAYOUT.overviewTextMinWidth,
        LAYOUT.overviewTextMaxWidth,
      );
  }
}

function getOverviewTextWidth(element: OverviewTextElement) {
  if (typeof element.width === 'number') {
    return element.width;
  }

  return getOverviewTextWidthForContent(element.data.text, element.data.size);
}

function buildOverviewNode(
  element: OverviewIconElement | OverviewTextElement,
): OverviewIconFlowNode | OverviewTextFlowNode {
  if (element.type === 'icon') {
    return {
      id: element.id,
      type: 'icon',
      position: element.position,
      data: {
        icon: element.data.icon,
        label: element.data.label?.trim() || getOverviewIconMeta(element.data.icon).label,
        text: element.data.text,
        size: element.data.size,
        color: element.data.color,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      draggable: true,
      selectable: true,
      deletable: false,
      style: {
        width: LAYOUT.overviewIconWidth,
      },
    };
  }

  return {
    id: element.id,
    type: 'text',
    position: snapPositionToDiagramGrid(element.position),
    data: {
      text: element.data.text,
      size: element.data.size,
      color: element.data.color,
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    draggable: true,
    selectable: true,
    deletable: false,
    style: {
      width: getOverviewTextWidth(element),
    },
  };
}

function resolveEdgeRoutingVariant(type?: string): EdgeRoutingVariant {
  switch (type) {
    case 'straight':
    case 'step':
    case 'bend':
    case 'raised':
      return type;
    default:
      return 'default';
  }
}

function buildOverviewConnectorColors(
  elements: ReadonlyArray<OverviewIconElement | OverviewTextElement>,
) {
  return new Map<string, ConnectorEndpointAppearance>(
    elements.map((element) => [
      element.id,
      {
        color: getOverviewNodeConnectorColor(element.data.color),
      },
    ]),
  );
}

function buildOverviewEdge(
  edge: OverviewEdgeElement,
  connectorColors: ReadonlyMap<string, ConnectorEndpointAppearance>,
  mode: 'light' | 'dark' = 'light',
): DiagramEdge {
  const variant = resolveEdgeRoutingVariant(edge.type);
  const appearance = resolveConnectorAppearance(edge, {
    source: connectorColors.get(edge.source),
    target: connectorColors.get(edge.target),
  }, mode);

  return buildRoutableEdge({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    arrowHeadType: edge.arrowHeadType,
    markerColor: appearance.markerColor,
    label: edge.label || undefined,
    labelStyle: edge.labelStyle,
    routing: edge.routing,
    variant,
    style: buildEdgeStyle(appearance),
  });
}

function buildOverviewFlow(definition: OverviewDiagramDefinition, mode: 'light' | 'dark' = 'light') {
  const overviewNodes = definition.elements.filter(
    (
      element,
    ): element is OverviewIconElement | OverviewTextElement => {
      return element.type === 'icon' || element.type === 'text';
    },
  );
  const nodes = overviewNodes.map((element) => buildOverviewNode(element));
  const connectorColors = buildOverviewConnectorColors(overviewNodes);
  const edges = definition.elements
    .filter((element): element is OverviewEdgeElement => {
      return element.type !== 'icon' && element.type !== 'text';
    })
    .map((edge) => buildOverviewEdge(edge, connectorColors, mode));

  return { nodes, edges };
}

function isStateNodeElement(
  element: StateDiagramDefinition['elements'][number],
): element is StateNodeElement {
  return 'type' in element && element.type === 'state';
}

export function getStateNodeWidthForContent(content: MarkdocContent) {
  const text = normalizeText(extractMarkdocText(content));
  return clamp(text.length * 7.2 + 42, LAYOUT.stateMinWidth, LAYOUT.stateMaxWidth);
}

function buildStateNode(element: StateNodeElement): StateFlowNode {
  const width = typeof element.width === 'number'
    ? element.width
    : getStateNodeWidthForContent(element.data.text);
  const height = typeof element.height === 'number'
    ? element.height
    : LAYOUT.stateHeight;

  return {
    id: element.id,
    type: 'state',
    position: resolveGridPosition(element),
    data: {
      text: element.data.text,
      state: element.data.state,
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    draggable: true,
    selectable: true,
    deletable: false,
    style: {
      width,
      height,
    },
  };
}

function getStateNodeWidth(node: StateFlowNode) {
  const width = node.style?.width;

  if (typeof width === 'number') {
    return width;
  }

  if (typeof width === 'string') {
    const parsed = Number(width);

    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return LAYOUT.stateMinWidth;
}

type ColumnNode = {
  id: string;
  position: { x: number; y: number };
};

type ColumnEdge = {
  from: string;
  to: string;
  label?: string;
};

function groupNodesByColumn<TNode extends ColumnNode>(
  nodes: TNode[],
  tolerance: number,
) {
  const sorted = [...nodes].sort((left, right) => left.position.x - right.position.x);
  const columns: TNode[][] = [];

  for (const node of sorted) {
    const column = columns[columns.length - 1];

    if (!column) {
      columns.push([node]);
      continue;
    }

    const averageX =
      column.reduce((sum, columnNode) => sum + columnNode.position.x, 0) / column.length;

    if (Math.abs(node.position.x - averageX) <= tolerance) {
      column.push(node);
    } else {
      columns.push([node]);
    }
  }

  return columns;
}

function getColumnGap(
  leftColumn: ColumnNode[],
  rightColumn: ColumnNode[],
  edges: ColumnEdge[],
) {
  const leftIds = new Set(leftColumn.map((node) => node.id));
  const rightIds = new Set(rightColumn.map((node) => node.id));
  let desiredGap = getDesiredHorizontalConnectionGap();

  for (const edge of edges) {
    const connectsColumns =
      (leftIds.has(edge.from) && rightIds.has(edge.to)) ||
      (leftIds.has(edge.to) && rightIds.has(edge.from));

    if (!connectsColumns) {
      continue;
    }

    desiredGap = Math.max(desiredGap, getDesiredHorizontalConnectionGap(edge.label));
  }

  return desiredGap;
}

function autoSpaceColumns<TNode extends ColumnNode>(
  nodes: TNode[],
  edges: ColumnEdge[],
  options: {
    minWidth: number;
    getWidth: (node: TNode) => number;
  },
) {
  const columns = groupNodesByColumn(nodes, options.minWidth / 2);

  if (columns.length < 2) {
    return nodes;
  }

  const xById = new Map<string, number>();
  let currentX = Math.min(...columns[0]!.map((node) => node.position.x));

  columns.forEach((column, index) => {
    for (const node of column) {
      xById.set(node.id, currentX);
    }

    const nextColumn = columns[index + 1];
    if (!nextColumn) {
      return;
    }

    const widestNode = Math.max(
      options.minWidth,
      ...column.map((node) => options.getWidth(node)),
    );
    currentX += widestNode + getColumnGap(column, nextColumn, edges);
  });

  return nodes.map((node) => {
    const x = xById.get(node.id);

    if (x === undefined || x === node.position.x) {
      return node;
    }

    return {
      ...node,
      position: {
        ...node.position,
        x,
      },
    };
  });
}

export function autoSpaceStateColumns(
  nodes: StateFlowNode[],
  edges: StateEdgeElement[],
) {
  return autoSpaceColumns(nodes, edges, {
    minWidth: LAYOUT.stateMinWidth,
    getWidth: getStateNodeWidth,
  });
}

function isHorizontalStateHandle(
  position: StateEdgeElement['fromPosition'] | StateEdgeElement['toPosition'],
) {
  return position !== 'top' && position !== 'bottom';
}

function isForwardHorizontalStateEdge(
  edge: StateEdgeElement,
  source: StateFlowNode,
  target: StateFlowNode,
) {
  return (
    source.position.y === target.position.y &&
    source.position.x < target.position.x &&
    isHorizontalStateHandle(edge.fromPosition) &&
    isHorizontalStateHandle(edge.toPosition)
  );
}

function compactStateRowNodes(
  nodes: StateFlowNode[],
  edges: StateEdgeElement[],
  positioning: string,
) {
  if (positioning === 'manual') {
    return nodes;
  }

  const rowMap = new Map<number, StateFlowNode[]>();

  for (const node of nodes) {
    const row = rowMap.get(node.position.y) ?? [];
    row.push(node);
    rowMap.set(node.position.y, row);
  }

  const edgeByPair = new Map<string, StateEdgeElement>();

  for (const edge of edges) {
    edgeByPair.set(`${edge.from}->${edge.to}`, edge);
  }

  const nextNodes = new Map<string, StateFlowNode>(
    nodes.map((node) => [
      node.id,
      {
        ...node,
        position: { ...node.position },
      },
    ]),
  );

  for (const rowNodes of rowMap.values()) {
    const sorted = [...rowNodes].sort((left, right) => left.position.x - right.position.x);

    for (let index = 1; index < sorted.length; index += 1) {
      const previous = nextNodes.get(sorted[index - 1]!.id);
      const current = nextNodes.get(sorted[index]!.id);

      if (!previous || !current) {
        continue;
      }

      const forwardEdge = edgeByPair.get(`${previous.id}->${current.id}`);

      if (!forwardEdge || !isForwardHorizontalStateEdge(forwardEdge, previous, current)) {
        continue;
      }

      const desiredGap = getDesiredHorizontalConnectionGap(forwardEdge.label);
      const currentGap = current.position.x - (previous.position.x + getStateNodeWidth(previous));

      if (currentGap <= desiredGap + LAYOUT.stateHorizontalGapCompactionThreshold) {
        continue;
      }

      const desiredX = previous.position.x + getStateNodeWidth(previous) + desiredGap;

      current.position.x = desiredX;
    }
  }

  return nodes.map((node) => nextNodes.get(node.id) ?? node);
}

function isSameRowStateLoopback(
  edge: StateEdgeElement,
  nodesById: ReadonlyMap<string, StateFlowNode>,
) {
  if (edge.from === edge.to) {
    return false;
  }

  const source = nodesById.get(edge.from);
  const target = nodesById.get(edge.to);

  if (!source || !target) {
    return false;
  }

  return source.position.x > target.position.x && source.position.y === target.position.y;
}

function resolveStateLoopHandle(
  edge: StateEdgeElement,
  nodesById: ReadonlyMap<string, StateFlowNode>,
) {
  if (edge.fromPosition === 'top' || edge.toPosition === 'top') {
    return 'top';
  }

  if (edge.fromPosition === 'bottom' || edge.toPosition === 'bottom') {
    return 'bottom';
  }

  const sourceY = nodesById.get(edge.from)?.position.y;
  if (sourceY === undefined) {
    return 'top';
  }

  let minY = Infinity;
  let maxY = -Infinity;
  for (const node of nodesById.values()) {
    if (node.position.y < minY) minY = node.position.y;
    if (node.position.y > maxY) maxY = node.position.y;
  }

  if (sourceY === minY) return 'top';
  if (sourceY === maxY) return 'bottom';
  return 'top';
}

function buildStateEdge(
  edge: StateEdgeElement,
  nodesById: ReadonlyMap<string, StateFlowNode>,
  mode: 'light' | 'dark' = 'light',
): DiagramEdge {
  const sourceNode = nodesById.get(edge.from);
  const targetNode = nodesById.get(edge.to);
  const loopHandle = isSameRowStateLoopback(edge, nodesById)
    ? resolveStateLoopHandle(edge, nodesById)
    : undefined;
  const resolved = loopHandle
    ? { fromPosition: loopHandle, toPosition: loopHandle, type: edge.type ?? edge.style }
    : resolveEdgeRouting(
        { fromPosition: edge.fromPosition, toPosition: edge.toPosition, type: edge.type ?? edge.style },
        sourceNode?.position,
        targetNode?.position,
      );
  const variant = resolveEdgeRoutingVariant(resolved.type);
  const appearance = resolveConnectorAppearance(edge, {
    source: {
      color: getStateNodeConnectorColor(sourceNode?.data.state),
    },
    target: {
      color: getStateNodeConnectorColor(targetNode?.data.state),
    },
  }, mode);

  return buildRoutableEdge({
    id: edge.id ?? `edge-${edge.from}-${edge.to}`,
    source: edge.from,
    target: edge.to,
    sourceHandle: resolved.fromPosition,
    targetHandle: resolved.toPosition,
    arrowHeadType: edge.arrowHeadType,
    markerColor: appearance.markerColor,
    label: edge.label || undefined,
    labelStyle: edge.labelStyle,
    labelBgStyle: edge.labelBgStyle,
    routing: edge.routing,
    variant,
    style: buildEdgeStyle(appearance),
  });
}


function isBlockNodeElement(
  element: BlockDiagramDefinition['elements'][number],
): element is BlockNodeElement {
  return 'type' in element && element.type === 'block';
}

function isBlockLayerElement(
  element: BlockDiagramDefinition['elements'][number],
): element is BlockLayerElement {
  return 'type' in element && element.type === 'layer';
}

function isBlockContentElement(
  element: BlockDiagramDefinition['elements'][number],
): element is BlockNodeElement | BlockLayerElement {
  return 'type' in element && (element.type === 'block' || element.type === 'layer');
}

export function getBlockNodeWidthForContent(content: MarkdocContent) {
  const text = normalizeText(extractMarkdocText(content));
  return clamp(text.length * LAYOUT.blockApproxCharacterWidth + LAYOUT.blockHorizontalPadding, LAYOUT.blockMinWidth, LAYOUT.blockMaxWidth);
}

function estimateBlockLineCount(content: MarkdocContent | undefined, width: number) {
  if (!content) return 0;
  const text = normalizeText(extractMarkdocText(content));
  if (!text) return 0;
  const availableWidth = Math.max(width - LAYOUT.blockHorizontalPadding, LAYOUT.blockApproxCharacterWidth);
  const charactersPerLine = Math.max(Math.floor(availableWidth / LAYOUT.blockApproxCharacterWidth), 1);
  return Math.max(Math.ceil(text.length / charactersPerLine), 1);
}

function getBlockNodeHeightForContent(element: BlockNodeElement, width: number) {
  if (typeof element.height === 'number') return element.height;

  const titleLines = estimateBlockLineCount(element.data.text, width);
  const subtitleLines = estimateBlockLineCount(element.data.subtitle, width);
  const contentGap = subtitleLines > 0 ? 2 : 0;
  const estimatedHeight =
    LAYOUT.blockVerticalPadding +
    titleLines * 18 +
    subtitleLines * 16 +
    contentGap;

  return Math.max(LAYOUT.blockHeight, estimatedHeight);
}

function buildBlockNode(element: BlockNodeElement): BlockFlowNode {
  const width = typeof element.width === 'number' ? element.width : getBlockNodeWidthForContent(element.data.text);
  const height = getBlockNodeHeightForContent(element, width);

  return {
    id: element.id,
    type: 'block',
    position: resolveGridPosition(element),
    data: {
      text: element.data.text,
      state: element.data.state,
      subtitle: element.data.subtitle,
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    draggable: true,
    selectable: true,
    deletable: false,
    style: { width, height },
  };
}

function buildBlockLayer(element: BlockLayerElement): BlockLayerFlowNode {
  return {
    id: element.id,
    type: 'layer',
    position: { x: element.x, y: element.y },
    data: {
      title: element.data.title,
      children: element.data.children,
      state: element.data.state,
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    draggable: true,
    selectable: true,
    deletable: false,
    style: {
      width: element.width,
      height: element.height,
    },
  };
}

function buildBlockEdge(
  edge: BlockEdgeElement,
  positions: ReadonlyMap<string, { x: number; y: number }>,
  mode: 'light' | 'dark' = 'light',
): DiagramEdge {
  const resolved = resolveEdgeRouting(
    { fromPosition: edge.fromPosition, toPosition: edge.toPosition, type: edge.type },
    positions.get(edge.from),
    positions.get(edge.to),
  );
  const variant = resolveEdgeRoutingVariant(resolved.type);
  const appearance = resolveConnectorAppearance(edge, undefined, mode);

  return buildRoutableEdge({
    id: edge.id ?? `edge-${edge.from}-${edge.to}`,
    source: edge.from,
    target: edge.to,
    sourceHandle: resolved.fromPosition,
    targetHandle: resolved.toPosition,
    arrowHeadType: edge.arrowHeadType,
    markerColor: appearance.markerColor,
    label: edge.label || undefined,
    labelStyle: edge.labelStyle,
    labelBgStyle: edge.labelBgStyle,
    routing: edge.routing,
    variant,
    style: buildEdgeStyle(appearance),
  });
}

export function parseStyleDimension(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

function getNodeWidth(node: BlockFlowNode) {
  const width = node.style?.width;
  if (typeof width === 'number') return width;
  if (typeof width === 'string') {
    const parsed = Number(width);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return LAYOUT.blockMinWidth;
}

function getNodeHeight(node: BlockFlowNode) {
  const height = node.style?.height;
  if (typeof height === 'number') return height;
  if (typeof height === 'string') {
    const parsed = Number(height);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return LAYOUT.blockHeight;
}

function equalizeBlockNodeHeightsByRow(nodes: BlockFlowNode[]) {
  const rowHeights = new Map<number, number>();

  for (const node of nodes) {
    const current = rowHeights.get(node.position.y) ?? 0;
    rowHeights.set(node.position.y, Math.max(current, getNodeHeight(node)));
  }

  return nodes.map((node) => ({
    ...node,
    style: {
      ...node.style,
      height: rowHeights.get(node.position.y) ?? getNodeHeight(node),
    },
  }));
}

export function autoSpaceBlockColumns(
  nodes: BlockFlowNode[],
  edges: BlockEdgeElement[],
) {
  return autoSpaceColumns(nodes, edges, {
    minWidth: LAYOUT.blockMinWidth,
    getWidth: getNodeWidth,
  });
}

function buildBlockFlow(definition: BlockDiagramDefinition, mode: 'light' | 'dark' = 'light') {
  const layerElements = definition.elements.filter(isBlockLayerElement);
  const nodeElements = definition.elements.filter(isBlockNodeElement);
  const edgeElements = definition.elements.filter(
    (element): element is BlockEdgeElement => !isBlockContentElement(element),
  );

  const layerNodes = layerElements.map((element) => buildBlockLayer(element));
  const layerById = new Map(layerNodes.map((n) => [n.id, n]));
  const childToLayer = new Map<string, BlockLayerFlowNode>();

  for (const layerNode of layerNodes) {
    for (const childId of layerNode.data.children ?? []) {
      childToLayer.set(childId, layerNode);
    }
  }

  // Build all block nodes first (computes widths)
  const blockNodes = nodeElements.map((element) => buildBlockNode(element));
  const blockNodeById = new Map(blockNodes.map((n) => [n.id, n]));

  // Group children by layer for even spacing
  const childrenByLayer = new Map<string, BlockFlowNode[]>();
  for (const node of blockNodes) {
    const parent = childToLayer.get(node.id);
    if (parent) {
      const list = childrenByLayer.get(parent.id) ?? [];
      list.push(node);
      childrenByLayer.set(parent.id, list);
    }
  }

  // Position layered children with even spacing (left/right padding) in auto mode
  if (definition.positioning === 'auto') {
    for (const [layerId, children] of childrenByLayer) {
      const layerNode = layerById.get(layerId);
      if (!layerNode || children.length === 0) continue;

      const layerWidth = (typeof layerNode.style?.width === 'number' ? layerNode.style.width : Number(layerNode.style?.width)) || LAYOUT.blockMinWidth;
      const contentWidth = layerWidth - 2 * LAYOUT.blockLayerPadding;
      const totalChildWidth = children.reduce((sum, n) => sum + getNodeWidth(n), 0);

      if (children.length === 1) {
        const child = children[0]!;
        child.position = {
          x: layerNode.position.x + LAYOUT.blockLayerPadding + (contentWidth - getNodeWidth(child)) / 2,
          y: layerNode.position.y + LAYOUT.blockLayerHeaderHeight + LAYOUT.blockLayerPadding,
        };
      } else {
        const gap = Math.max(
          (contentWidth - totalChildWidth) / (children.length - 1),
          20,
        );
        let currentX = LAYOUT.blockLayerPadding;
        for (const child of children) {
          child.position = {
            x: layerNode.position.x + currentX,
            y: layerNode.position.y + LAYOUT.blockLayerHeaderHeight + LAYOUT.blockLayerPadding,
          };
          currentX += getNodeWidth(child) + gap;
        }
      }
    }
  }

  // Position non-layered children using their absolute coordinates or grid coords
  for (const node of blockNodes) {
    if (!childToLayer.has(node.id)) {
      const element = nodeElements.find((e) => e.id === node.id);
      if (element) {
        node.position = resolveGridPosition(element);
      }
    }
  }

  // Sort nodes so layers render behind their children
  const childIds = new Set(childToLayer.keys());

  const sortedBlockNodes = [
    ...blockNodes.filter((node) => !childIds.has(node.id)),
    ...blockNodes.filter((node) => childIds.has(node.id)),
  ];

  const finalBlockNodes =
    definition.positioning === 'auto'
      ? [
          ...autoSpaceBlockColumns(
            minimizeBlockCrossings(
              sortedBlockNodes.filter((node) => !childIds.has(node.id)),
              edgeElements,
            ),
            edgeElements,
          ),
          ...sortedBlockNodes.filter((node) => childIds.has(node.id)),
        ]
      : sortedBlockNodes;

  const equalizedBlockNodes = equalizeBlockNodeHeightsByRow(finalBlockNodes);
  const positions = new Map(equalizedBlockNodes.map((node) => [node.id, node.position]));
  const nodes = [...layerNodes, ...equalizedBlockNodes];
  const edges = edgeElements.map((edge) => buildBlockEdge(edge, positions, mode));

  return { nodes, edges };
}

function buildStateFlow(definition: StateDiagramDefinition, mode: 'light' | 'dark' = 'light') {
  const nodes = definition.elements
    .filter(isStateNodeElement)
    .map((element) => buildStateNode(element));
  const stateEdges = definition.elements
    .filter((element): element is StateEdgeElement => !isStateNodeElement(element));
  const compactedNodes = compactStateRowNodes(nodes, stateEdges, definition.positioning);
  const finalNodes =
    definition.positioning === 'auto'
      ? autoSpaceStateColumns(minimizeStateCrossings(compactedNodes, stateEdges), stateEdges)
      : compactedNodes;
  const nodesById = new Map(finalNodes.map((node) => [node.id, node]));
  const edges = stateEdges
    .map((edge) => buildStateEdge(edge, nodesById, mode));

  return { nodes: finalNodes, edges };
}

/**
 * Converts a {@link DiagramDefinition} into React Flow nodes and edges.
 * Pass the result directly to `<ReactFlow nodes={nodes} edges={edges} />`.
 *
 * @param definition - A validated diagram definition
 * @param mode - Colour mode used for connector colour resolution (default: `'light'`)
 */
export function buildDiagramFlow(definition: DiagramDefinition, mode: 'light' | 'dark' = 'light') {
  switch (definition.type) {
    case 'sequence':
      return buildSequenceFlow(definition, mode);
    case 'entity':
      return buildEntityFlow(definition, mode);
    case 'overview':
      return buildOverviewFlow(definition, mode);
    case 'state':
      return buildStateFlow(definition, mode);
    case 'block':
      return buildBlockFlow(definition, mode);
  }
}

function getDiagramNodeHeight(node: DiagramNode): number {
  const styleHeight = node.style?.height;
  if (typeof styleHeight === 'number') return styleHeight;
  if (typeof styleHeight === 'string') {
    const parsed = Number(styleHeight);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 52;
}

export function getDiagramContentHeight(
  flow: { nodes: DiagramNode[]; edges: DiagramEdge[] },
  options?: { padding?: number; minHeight?: number },
): number {
  const padding = options?.padding ?? LAYOUT.canvasPadding;
  const minHeight = options?.minHeight ?? 320;

  let maxY = 0;
  for (const node of flow.nodes) {
    const bottom = node.position.y + getDiagramNodeHeight(node);
    if (bottom > maxY) maxY = bottom;
  }

  return Math.max(maxY + padding, minHeight);
}
