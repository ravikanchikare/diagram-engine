import {
  BaseEdge,
  EdgeLabelRenderer,
  Position,
  useInternalNode,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { memo, type CSSProperties } from 'react';
import { useEdgeEditor } from '../edge-editor-context';
import {
  buildEdgeGeometry,
  getEdgeOffsetFromPoint,
  snapEdgeHandleValue,
  type Point,
  type RoutableEdgeData,
  type EdgeNodeBounds,
} from '../edge-routing';
import type { EdgeRouting } from '../schema';
import { pointsToRoundedPath } from './OrthogonalEdge';
import { areRoutableEdgePropsEqual } from './memo';
import { EdgeLabel } from './EdgeLabel';

const LABEL_OFFSET = 16;
const ARROW_LENGTH = 10;
const ARROW_HALF_WIDTH = 5;

function distance(from: Point, to: Point) {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

function getNodeBounds(
  node: ReturnType<typeof useInternalNode>,
  position?: Position,
): EdgeNodeBounds | undefined {
  if (!node) {
    return undefined;
  }

  const width = node?.measured.width;
  const measuredHeight = node?.measured.height;

  if (width === undefined || measuredHeight === undefined) {
    return undefined;
  }

  const isIconNode = node.type === 'icon';
  const isHorizontal = position === Position.Left || position === Position.Right;

  return {
    x: node.internals.positionAbsolute.x,
    y: node.internals.positionAbsolute.y,
    width,
    height: isIconNode && isHorizontal ? 68 : measuredHeight,
  };
}

function getNodeFallback(
  node: ReturnType<typeof useInternalNode>,
  fallback: Point,
) {
  if (!node) {
    return fallback;
  }

  return {
    x: node.internals.positionAbsolute.x,
    y: node.internals.positionAbsolute.y,
  };
}

function getLongestSegment(points: Point[]) {
  let best:
    | {
        from: Point;
        to: Point;
      }
    | undefined;
  let bestLength = -1;

  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    const segmentLength = distance(from, to);

    if (segmentLength <= bestLength) {
      continue;
    }

    best = { from, to };
    bestLength = segmentLength;
  }

  return best;
}

function buildArrowHeadPath(points: Point[]) {
  if (points.length < 2) {
    return undefined;
  }

  const tip = points[points.length - 1];
  let previous = points[points.length - 2];

  for (let index = points.length - 2; index >= 0; index -= 1) {
    const candidate = points[index];
    if (candidate && distance(candidate, tip) > 0.1) {
      previous = candidate;
      break;
    }
  }

  if (!tip || !previous) {
    return undefined;
  }

  const segmentLength = distance(previous, tip);
  if (segmentLength <= 0.1) {
    return undefined;
  }

  const unitX = (tip.x - previous.x) / segmentLength;
  const unitY = (tip.y - previous.y) / segmentLength;
  const baseX = tip.x - unitX * ARROW_LENGTH;
  const baseY = tip.y - unitY * ARROW_LENGTH;
  const perpendicularX = -unitY;
  const perpendicularY = unitX;
  const leftX = baseX + perpendicularX * ARROW_HALF_WIDTH;
  const leftY = baseY + perpendicularY * ARROW_HALF_WIDTH;
  const rightX = baseX - perpendicularX * ARROW_HALF_WIDTH;
  const rightY = baseY - perpendicularY * ARROW_HALF_WIDTH;

  return `M ${tip.x} ${tip.y} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`;
}

function getArrowHeadStyle(style: CSSProperties | undefined): CSSProperties {
  const stroke = typeof style?.stroke === 'string' ? style.stroke : 'currentColor';

  return {
    fill: stroke,
    pointerEvents: 'none',
    stroke: 'none',
  };
}

function selectEdgeFromLabel(id: string) {
  const escapedId =
    typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(id)
      : id.replace(/"/g, '\\"');
  const edgeElement = document.querySelector<HTMLElement>(
    `.react-flow__edge[data-id="${escapedId}"]`,
  );

  if (!edgeElement) {
    return;
  }

  edgeElement.dispatchEvent(
    new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    }),
  );
  edgeElement.dispatchEvent(
    new MouseEvent('mouseup', {
      bubbles: true,
      cancelable: true,
    }),
  );
  edgeElement.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    }),
  );
}

function EdgeControlHandle({
  ariaLabel,
  className,
  onPointerDown,
  point,
}: {
  ariaLabel: string;
  className: string;
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
  point: Point;
}) {
  return (
    <EdgeLabelRenderer>
      <button
        aria-label={ariaLabel}
        className={`diagram-edge-handle nodrag nopan ${className}`}
        onMouseDown={(event) => {
          if (typeof window !== 'undefined' && 'PointerEvent' in window) {
            return;
          }

          onPointerDown(event as unknown as React.PointerEvent<HTMLButtonElement>);
        }}
        onPointerDown={onPointerDown}
        style={{
          display: 'block',
          position: 'absolute',
          pointerEvents: 'all',
          touchAction: 'none',
          zIndex: 8,
          transform: `translate(-50%, -50%) translate(${point.x}px, ${point.y}px)`,
        }}
        type="button"
      />
    </EdgeLabelRenderer>
  );
}

export function buildRoutableEdgePoints({
  label,
  routing,
  sourcePosition,
  sourceX,
  sourceY,
  targetPosition,
  targetX,
  targetY,
  variant,
}: Pick<
  EdgeProps,
  | 'label'
  | 'sourcePosition'
  | 'sourceX'
  | 'sourceY'
  | 'targetPosition'
  | 'targetX'
  | 'targetY'
> & {
  routing?: EdgeRouting;
  variant?: string;
}) {
  return buildEdgeGeometry({
    label: typeof label === 'string' ? label : undefined,
    routing,
    sourceFallback: {
      x: sourceX,
      y: sourceY,
    },
    sourcePosition: sourcePosition ?? Position.Right,
    targetFallback: {
      x: targetX,
      y: targetY,
    },
    targetPosition: targetPosition ?? Position.Left,
    variant,
  }).points;
}

export function getEdgeLabelPosition(
  points: Point[],
) {
  const segment = getLongestSegment(points);

  if (!segment) {
    return { x: 0, y: 0 };
  }

  const midX = (segment.from.x + segment.to.x) / 2;
  const midY = (segment.from.y + segment.to.y) / 2;
  const horizontal = Math.abs(segment.to.x - segment.from.x) >= Math.abs(segment.to.y - segment.from.y);

  if (horizontal) {
    return {
      x: midX,
      y: midY - LABEL_OFFSET,
    };
  }

  return {
    x: midX,
    y: midY,
  };
}

function RoutableEdgeComponent({
  data,
  id,
  label,
  labelBgStyle,
  labelStyle,
  markerEnd,
  selected,
  source,
  sourcePosition,
  sourceX,
  sourceY,
  style,
  target,
  targetPosition,
  targetX,
  targetY,
}: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const reactFlow = useReactFlow();
  const editor = useEdgeEditor();
  const edgeData = ((data as RoutableEdgeData | undefined) ?? {}) satisfies RoutableEdgeData;
  const sourceBounds = getNodeBounds(sourceNode, sourcePosition ?? undefined);
  const targetBounds = getNodeBounds(targetNode, targetPosition ?? undefined);
  const geometry = buildEdgeGeometry({
    label: typeof label === 'string' ? label : undefined,
    routing: edgeData.routing,
    sourceBounds,
    sourceFallback: getNodeFallback(sourceNode, {
      x: sourceX,
      y: sourceY,
    }),
    sourcePosition: sourcePosition ?? Position.Right,
    targetBounds,
    targetFallback: getNodeFallback(targetNode, {
      x: targetX,
      y: targetY,
    }),
    targetPosition: targetPosition ?? Position.Left,
    variant: edgeData.variant,
  });
  const path = pointsToRoundedPath(geometry.points);
  const arrowHeadPath = markerEnd ? buildArrowHeadPath(geometry.points) : undefined;
  const labelPosition = getEdgeLabelPosition(geometry.points);
  const showHandles = selected && edgeData.editable === true && Boolean(editor);

  const startDrag = (
    update: (point: Point) => void,
  ) => (event: React.PointerEvent<HTMLButtonElement> | React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    document.body.style.cursor = 'grabbing';

    if ('pointerId' in event.nativeEvent) {
      try {
        event.currentTarget.setPointerCapture(event.nativeEvent.pointerId);
      } catch {
        // Pointer capture is best-effort here.
      }
    }

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const point = reactFlow.screenToFlowPosition({
        x: moveEvent.clientX,
        y: moveEvent.clientY,
      });

      update(point);
    };
    const handlePointerUp = () => {
      document.body.style.removeProperty('cursor');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          ...style,
          strokeLinejoin: 'round',
        }}
      />
      {arrowHeadPath ? (
        <path
          aria-hidden="true"
          className="react-flow__edge-path routable-edge__arrowhead"
          d={arrowHeadPath}
          style={getArrowHeadStyle(style)}
        />
      ) : null}
      {typeof label === 'string' && label ? (
        <EdgeLabel
          label={label}
          labelBgStyle={labelBgStyle}
          labelStyle={labelStyle}
          position={labelPosition}
          pointerEvents="auto"
          cursor="pointer"
          title="Select connector"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            selectEdgeFromLabel(id);
          }}
        />
      ) : null}
      {showHandles && editor ? (
        <>
          <EdgeControlHandle
            ariaLabel="Adjust source anchor"
            className="diagram-edge-handle--anchor"
            onPointerDown={startDrag((point) => {
              editor.setEdgeRouting(id, (current) => ({
                ...(current ?? {}),
                sourceOffset: snapEdgeHandleValue(
                  getEdgeOffsetFromPoint(sourceBounds, geometry.sourcePosition, point),
                ),
              }));
            })}
            point={geometry.controlPoints.sourceOffset}
          />
          <EdgeControlHandle
            ariaLabel="Adjust target anchor"
            className="diagram-edge-handle--anchor"
            onPointerDown={startDrag((point) => {
              editor.setEdgeRouting(id, (current) => ({
                ...(current ?? {}),
                targetOffset: snapEdgeHandleValue(
                  getEdgeOffsetFromPoint(targetBounds, geometry.targetPosition, point),
                ),
              }));
            })}
            point={geometry.controlPoints.targetOffset}
          />
          {geometry.controlPoints.bend ? (
            <EdgeControlHandle
              ariaLabel="Adjust bend"
              className="diagram-edge-handle--bend"
              onPointerDown={startDrag((point) => {
                if (geometry.routeKind === 'horizontal-step') {
                  editor.setEdgeRouting(id, (current) => ({
                    ...(current ?? {}),
                    bendX: snapEdgeHandleValue(point.x),
                  }));
                  return;
                }

                if (geometry.routeKind === 'vertical-step') {
                  editor.setEdgeRouting(id, (current) => ({
                    ...(current ?? {}),
                    bendY: snapEdgeHandleValue(point.y),
                  }));
                  return;
                }

                if (geometry.routeKind === 'mixed-step') {
                  editor.setEdgeRouting(id, (current) => ({
                    ...(current ?? {}),
                    elbowX: snapEdgeHandleValue(point.x),
                    elbowY: snapEdgeHandleValue(point.y),
                  }));
                }
              })}
              point={geometry.controlPoints.bend}
            />
          ) : null}
          {geometry.controlPoints.track ? (
            <EdgeControlHandle
              ariaLabel="Adjust track"
              className="diagram-edge-handle--bend"
              onPointerDown={startDrag((point) => {
                editor.setEdgeRouting(id, (current) => ({
                  ...(current ?? {}),
                  trackY: snapEdgeHandleValue(point.y),
                }));
              })}
              point={geometry.controlPoints.track}
            />
          ) : null}
        </>
      ) : null}
    </>
  );
}

export const RoutableEdge = memo(
  RoutableEdgeComponent,
  areRoutableEdgePropsEqual,
);
