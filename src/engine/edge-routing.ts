import { Position } from '@xyflow/react';
import { estimateConnectionLabelWidth } from './connection-spacing';
import type { DiagramConnectorLineStyle, EdgeRouting } from './schema';
import { clamp } from './utils';

export interface Point {
  x: number;
  y: number;
}

export interface EdgeNodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type EdgeRoutingVariant = 'default' | 'straight' | 'step' | 'bend' | 'raised';
export type EdgeRouteKind =
  | 'direct'
  | 'horizontal-step'
  | 'vertical-step'
  | 'mixed-step'
  | 'raised'
  | 'loopback';

export interface RoutableEdgeData extends Record<string, unknown> {
  editable?: boolean;
  lineStyle?: DiagramConnectorLineStyle;
  routing?: EdgeRouting;
  variant?: EdgeRoutingVariant;
}

export interface EdgeGeometry {
  controlPoints: {
    bend?: Point;
    sourceOffset: Point;
    targetOffset: Point;
    track?: Point;
  };
  points: Point[];
  routeKind: EdgeRouteKind;
  routing: EdgeRouting;
  source: Point;
  sourcePosition: Position;
  target: Point;
  targetPosition: Position;
  variant: EdgeRoutingVariant;
}

const HORIZONTAL_SEGMENT_MARGIN = 24;
const LOOP_TRACK_OFFSET = 32;
const NODE_EDGE_INSET = 8;
const MIN_SEGMENT_LENGTH = 16;
const EDGE_HANDLE_SNAP_SIZE = 4;
export const MIN_ROUTING_OFFSET = 32;

export function dedupePoints(points: Point[]) {
  return points.filter((point, index) => {
    if (index === 0) {
      return true;
    }

    const previous = points[index - 1];
    return previous.x !== point.x || previous.y !== point.y;
  });
}

function hasRoutingValue(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value);
}

function withOptionalRoutingValue(
  routing: EdgeRouting,
  key: keyof EdgeRouting,
  value: number | undefined,
) {
  if (hasRoutingValue(value)) {
    routing[key] = value;
  }
}

function buildOffsetOnlyRouting(routing: EdgeRouting | undefined) {
  const nextRouting: EdgeRouting = {};

  withOptionalRoutingValue(nextRouting, 'sourceOffset', routing?.sourceOffset);
  withOptionalRoutingValue(nextRouting, 'targetOffset', routing?.targetOffset);

  return pruneUndefinedRoutingValues(nextRouting);
}

export function normalizeEdgeRoutingVariant(value: unknown): EdgeRoutingVariant {
  switch (value) {
    case 'straight':
    case 'step':
    case 'bend':
    case 'raised':
      return value;
    default:
      return 'default';
  }
}

export function isHorizontalPosition(position?: Position) {
  return position === Position.Left || position === Position.Right;
}

export function isVerticalPosition(position?: Position) {
  return position === Position.Top || position === Position.Bottom;
}

export function snapEdgeValue(value: number, gridSize = MIN_SEGMENT_LENGTH) {
  return Math.round(value / gridSize) * gridSize;
}

export function snapEdgeHandleValue(value: number) {
  return snapEdgeValue(value, EDGE_HANDLE_SNAP_SIZE);
}

export function snapRoutingOffset(value: number) {
  if (value === 0) {
    return 0;
  }

  const snapped = snapEdgeValue(value, MIN_ROUTING_OFFSET);

  if (snapped === 0) {
    return value > 0 ? MIN_ROUTING_OFFSET : -MIN_ROUTING_OFFSET;
  }

  return snapped;
}

export function getRaisedHeightFromTrackY(
  sourceY: number,
  targetY: number,
  trackY: number,
) {
  return Math.max(Math.min(sourceY, targetY) - trackY, MIN_SEGMENT_LENGTH);
}

export function getTrackYFromRaisedHeight(
  sourceY: number,
  targetY: number,
  height: number,
) {
  return Math.min(sourceY, targetY) - Math.max(height, MIN_SEGMENT_LENGTH);
}

export function getLoopOffsetFromTrackY(
  sourceY: number,
  sourcePosition: Position,
  trackY: number,
) {
  if (sourcePosition === Position.Bottom) {
    return Math.max(trackY - sourceY, LOOP_TRACK_OFFSET);
  }

  return Math.max(sourceY - trackY, LOOP_TRACK_OFFSET);
}

export function getTrackYFromLoopOffset(
  sourceY: number,
  sourcePosition: Position,
  offset: number,
) {
  const normalizedOffset = Math.max(offset, LOOP_TRACK_OFFSET);

  return sourcePosition === Position.Bottom
    ? sourceY + normalizedOffset
    : sourceY - normalizedOffset;
}

export function resolveHandlePosition(
  value: string | null | undefined,
  fallback: Position,
) {
  switch (value) {
    case 'top':
      return Position.Top;
    case 'right':
      return Position.Right;
    case 'bottom':
      return Position.Bottom;
    case 'left':
      return Position.Left;
    default:
      return fallback;
  }
}

function clampAnchorOffset(
  bounds: EdgeNodeBounds | undefined,
  position: Position,
  offset: number,
) {
  if (!bounds) {
    return offset;
  }

  const axisLength = isHorizontalPosition(position) ? bounds.height : bounds.width;
  const limit = Math.max(axisLength / 2 - NODE_EDGE_INSET, 0);

  return clamp(offset, -limit, limit);
}

function getAnchorPoint(
  bounds: EdgeNodeBounds | undefined,
  fallback: Point,
  position: Position,
  offset: number,
) {
  if (!bounds) {
    return fallback;
  }

  const clampedOffset = clampAnchorOffset(bounds, position, offset);
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  switch (position) {
    case Position.Left:
      return {
        x: bounds.x,
        y: centerY + clampedOffset,
      };
    case Position.Right:
      return {
        x: bounds.x + bounds.width,
        y: centerY + clampedOffset,
      };
    case Position.Top:
      return {
        x: centerX + clampedOffset,
        y: bounds.y,
      };
    case Position.Bottom:
      return {
        x: centerX + clampedOffset,
        y: bounds.y + bounds.height,
      };
  }
}

function clampBendValue(source: number, target: number, candidate: number) {
  const min = Math.min(source, target) + MIN_SEGMENT_LENGTH;
  const max = Math.max(source, target) - MIN_SEGMENT_LENGTH;

  if (min > max) {
    return source + (target - source) / 2;
  }

  return clamp(candidate, min, max);
}

function clampManualBendValue(source: number, target: number, candidate: number) {
  const start = Math.min(source, target);
  const end = Math.max(source, target);
  const clamped = clamp(candidate, start, end);

  if (Math.abs(clamped - source) <= MIN_SEGMENT_LENGTH) {
    return source;
  }

  if (Math.abs(clamped - target) <= MIN_SEGMENT_LENGTH) {
    return target;
  }

  return clampBendValue(source, target, clamped);
}

function getHorizontalSegmentWidth(sourceX: number, targetX: number, label?: string) {
  const gap = Math.abs(targetX - sourceX);
  const requestedWidth = estimateConnectionLabelWidth(label);

  if (requestedWidth <= 0 || gap <= HORIZONTAL_SEGMENT_MARGIN * 2) {
    return undefined;
  }

  return Math.min(requestedWidth, gap - HORIZONTAL_SEGMENT_MARGIN * 2);
}

function getDefaultHorizontalBendX(sourceX: number, targetX: number, label?: string) {
  const defaultMidX = sourceX + (targetX - sourceX) / 2;
  const segmentWidth = getHorizontalSegmentWidth(sourceX, targetX, label);

  if (!segmentWidth || Math.abs(targetX - sourceX) <= HORIZONTAL_SEGMENT_MARGIN) {
    return defaultMidX;
  }

  const direction = Math.sign(targetX - sourceX) || 1;
  const minimumHorizontalRun = Math.min(
    segmentWidth,
    Math.abs(targetX - sourceX) - HORIZONTAL_SEGMENT_MARGIN,
  );
  const preferredMidX = sourceX + direction * minimumHorizontalRun;

  return direction > 0
    ? Math.max(defaultMidX, preferredMidX)
    : Math.min(defaultMidX, preferredMidX);
}

function getDefaultVerticalBendY(sourceY: number, targetY: number) {
  return sourceY + (targetY - sourceY) / 2;
}

function getDefaultRaisedTrackY(sourceX: number, sourceY: number, targetX: number, targetY: number) {
  const lift = clamp(Math.abs(targetX - sourceX) * 0.08 + 40, 40, 80);
  return Math.min(sourceY, targetY) - lift;
}

function getDefaultLoopTrackY(sourceY: number, sourcePosition: Position) {
  return sourcePosition === Position.Bottom
    ? sourceY + LOOP_TRACK_OFFSET
    : sourceY - LOOP_TRACK_OFFSET;
}

function clampTrackY(
  sourceY: number,
  targetY: number,
  trackY: number,
  options: {
    loopback: boolean;
    sourcePosition: Position;
  },
) {
  if (options.loopback) {
    if (options.sourcePosition === Position.Bottom) {
      return Math.max(trackY, Math.max(sourceY, targetY) + LOOP_TRACK_OFFSET);
    }

    return Math.min(trackY, Math.min(sourceY, targetY) - LOOP_TRACK_OFFSET);
  }

  return Math.min(trackY, Math.min(sourceY, targetY) - MIN_SEGMENT_LENGTH);
}

function buildAnchorGeometry(options: {
  routing?: EdgeRouting;
  sourceBounds?: EdgeNodeBounds;
  sourceFallback: Point;
  sourcePosition: Position;
  targetBounds?: EdgeNodeBounds;
  targetFallback: Point;
  targetPosition: Position;
}) {
  const sourceOffset = clampAnchorOffset(
    options.sourceBounds,
    options.sourcePosition,
    options.routing?.sourceOffset ?? 0,
  );
  const targetOffset = clampAnchorOffset(
    options.targetBounds,
    options.targetPosition,
    options.routing?.targetOffset ?? 0,
  );

  return {
    source: getAnchorPoint(
      options.sourceBounds,
      options.sourceFallback,
      options.sourcePosition,
      sourceOffset,
    ),
    sourceOffset,
    target: getAnchorPoint(
      options.targetBounds,
      options.targetFallback,
      options.targetPosition,
      targetOffset,
    ),
    targetOffset,
  };
}

function isSameRowLoopback({
  source,
  sourcePosition,
  target,
  targetPosition,
}: {
  source: Point;
  sourcePosition: Position;
  target: Point;
  targetPosition: Position;
}) {
  return (
    source.x > target.x &&
    Math.abs(source.y - target.y) < 0.5 &&
    sourcePosition === targetPosition &&
    isVerticalPosition(sourcePosition)
  );
}

function resolveRouteKind(options: {
  source: Point;
  sourcePosition: Position;
  target: Point;
  targetPosition: Position;
  variant: EdgeRoutingVariant;
}) {
  if (options.variant === 'raised') {
    return 'raised' satisfies EdgeRouteKind;
  }

  if (isSameRowLoopback(options)) {
    return 'loopback' satisfies EdgeRouteKind;
  }

  if (
    options.variant === 'straight' ||
    Math.abs(options.source.x - options.target.x) < 0.5 ||
    Math.abs(options.source.y - options.target.y) < 0.5
  ) {
    return 'direct' satisfies EdgeRouteKind;
  }

  if (
    isHorizontalPosition(options.sourcePosition) &&
    isHorizontalPosition(options.targetPosition)
  ) {
    return 'horizontal-step' satisfies EdgeRouteKind;
  }

  if (
    isVerticalPosition(options.sourcePosition) &&
    isVerticalPosition(options.targetPosition)
  ) {
    return 'vertical-step' satisfies EdgeRouteKind;
  }

  return 'mixed-step' satisfies EdgeRouteKind;
}

export function buildEdgeGeometry(options: {
  label?: string;
  routing?: EdgeRouting;
  sourceBounds?: EdgeNodeBounds;
  sourceFallback: Point;
  sourcePosition?: Position;
  targetBounds?: EdgeNodeBounds;
  targetFallback: Point;
  targetPosition?: Position;
  variant?: string;
}): EdgeGeometry {
  const variant = normalizeEdgeRoutingVariant(options.variant);
  const sourcePosition = options.sourcePosition ?? Position.Right;
  const targetPosition = options.targetPosition ?? Position.Left;
  const anchorGeometry = buildAnchorGeometry({
    routing: options.routing,
    sourceBounds: options.sourceBounds,
    sourceFallback: options.sourceFallback,
    sourcePosition,
    targetBounds: options.targetBounds,
    targetFallback: options.targetFallback,
    targetPosition,
  });
  const routeKind = resolveRouteKind({
    source: anchorGeometry.source,
    sourcePosition,
    target: anchorGeometry.target,
    targetPosition,
    variant,
  });
  const routing: EdgeRouting = {};

  withOptionalRoutingValue(routing, 'sourceOffset', anchorGeometry.sourceOffset);
  withOptionalRoutingValue(routing, 'targetOffset', anchorGeometry.targetOffset);

  switch (routeKind) {
    case 'raised': {
      const trackY = clampTrackY(
        anchorGeometry.source.y,
        anchorGeometry.target.y,
        options.routing?.trackY ?? getDefaultRaisedTrackY(
          anchorGeometry.source.x,
          anchorGeometry.source.y,
          anchorGeometry.target.x,
          anchorGeometry.target.y,
        ),
        {
          loopback: false,
          sourcePosition,
        },
      );

      routing.trackY = trackY;

      return {
        controlPoints: {
          sourceOffset: anchorGeometry.source,
          targetOffset: anchorGeometry.target,
          track: {
            x: (anchorGeometry.source.x + anchorGeometry.target.x) / 2,
            y: trackY,
          },
        },
        points: dedupePoints([
          anchorGeometry.source,
          { x: anchorGeometry.source.x, y: trackY },
          { x: anchorGeometry.target.x, y: trackY },
          anchorGeometry.target,
        ]),
        routeKind,
        routing,
        source: anchorGeometry.source,
        sourcePosition,
        target: anchorGeometry.target,
        targetPosition,
        variant,
      };
    }
    case 'loopback': {
      const trackY = clampTrackY(
        anchorGeometry.source.y,
        anchorGeometry.target.y,
        options.routing?.trackY ?? getDefaultLoopTrackY(
          anchorGeometry.source.y,
          sourcePosition,
        ),
        {
          loopback: true,
          sourcePosition,
        },
      );

      routing.trackY = trackY;

      return {
        controlPoints: {
          sourceOffset: anchorGeometry.source,
          targetOffset: anchorGeometry.target,
          track: {
            x: (anchorGeometry.source.x + anchorGeometry.target.x) / 2,
            y: trackY,
          },
        },
        points: dedupePoints([
          anchorGeometry.source,
          { x: anchorGeometry.source.x, y: trackY },
          { x: anchorGeometry.target.x, y: trackY },
          anchorGeometry.target,
        ]),
        routeKind,
        routing,
        source: anchorGeometry.source,
        sourcePosition,
        target: anchorGeometry.target,
        targetPosition,
        variant,
      };
    }
    case 'horizontal-step': {
      const bendX = options.routing?.bendX !== undefined
        ? clampManualBendValue(
            anchorGeometry.source.x,
            anchorGeometry.target.x,
            options.routing.bendX,
          )
        : clampBendValue(
            anchorGeometry.source.x,
            anchorGeometry.target.x,
            getDefaultHorizontalBendX(
              anchorGeometry.source.x,
              anchorGeometry.target.x,
              options.label,
            ),
          );

      routing.bendX = bendX;

      return {
        controlPoints: {
          bend: {
            x: bendX,
            y: anchorGeometry.source.y + (anchorGeometry.target.y - anchorGeometry.source.y) / 2,
          },
          sourceOffset: anchorGeometry.source,
          targetOffset: anchorGeometry.target,
        },
        points: dedupePoints([
          anchorGeometry.source,
          { x: bendX, y: anchorGeometry.source.y },
          { x: bendX, y: anchorGeometry.target.y },
          anchorGeometry.target,
        ]),
        routeKind,
        routing,
        source: anchorGeometry.source,
        sourcePosition,
        target: anchorGeometry.target,
        targetPosition,
        variant,
      };
    }
    case 'vertical-step': {
      const bendY = options.routing?.bendY !== undefined
        ? clampManualBendValue(
            anchorGeometry.source.y,
            anchorGeometry.target.y,
            options.routing.bendY,
          )
        : clampBendValue(
            anchorGeometry.source.y,
            anchorGeometry.target.y,
            getDefaultVerticalBendY(
              anchorGeometry.source.y,
              anchorGeometry.target.y,
            ),
          );

      routing.bendY = bendY;

      return {
        controlPoints: {
          bend: {
            x: anchorGeometry.source.x + (anchorGeometry.target.x - anchorGeometry.source.x) / 2,
            y: bendY,
          },
          sourceOffset: anchorGeometry.source,
          targetOffset: anchorGeometry.target,
        },
        points: dedupePoints([
          anchorGeometry.source,
          { x: anchorGeometry.source.x, y: bendY },
          { x: anchorGeometry.target.x, y: bendY },
          anchorGeometry.target,
        ]),
        routeKind,
        routing,
        source: anchorGeometry.source,
        sourcePosition,
        target: anchorGeometry.target,
        targetPosition,
        variant,
      };
    }
    case 'mixed-step': {
      const horizontalFirst = isHorizontalPosition(sourcePosition);
      const defaultElbow = horizontalFirst
        ? { x: anchorGeometry.target.x, y: anchorGeometry.source.y }
        : { x: anchorGeometry.source.x, y: anchorGeometry.target.y };
      const elbowX = options.routing?.elbowX !== undefined
        ? clampManualBendValue(
            anchorGeometry.source.x,
            anchorGeometry.target.x,
            options.routing.elbowX,
          )
        : clampManualBendValue(
            anchorGeometry.source.x,
            anchorGeometry.target.x,
            defaultElbow.x,
          );
      const elbowY = options.routing?.elbowY !== undefined
        ? clampManualBendValue(
            anchorGeometry.source.y,
            anchorGeometry.target.y,
            options.routing.elbowY,
          )
        : clampManualBendValue(
            anchorGeometry.source.y,
            anchorGeometry.target.y,
            defaultElbow.y,
          );

      routing.elbowX = elbowX;
      routing.elbowY = elbowY;

      return {
        controlPoints: {
          bend: {
            x: elbowX,
            y: elbowY,
          },
          sourceOffset: anchorGeometry.source,
          targetOffset: anchorGeometry.target,
        },
        points: horizontalFirst
          ? dedupePoints([
              anchorGeometry.source,
              { x: elbowX, y: anchorGeometry.source.y },
              { x: elbowX, y: elbowY },
              { x: anchorGeometry.target.x, y: elbowY },
              anchorGeometry.target,
            ])
          : dedupePoints([
              anchorGeometry.source,
              { x: anchorGeometry.source.x, y: elbowY },
              { x: elbowX, y: elbowY },
              { x: elbowX, y: anchorGeometry.target.y },
              anchorGeometry.target,
            ]),
        routeKind,
        routing,
        source: anchorGeometry.source,
        sourcePosition,
        target: anchorGeometry.target,
        targetPosition,
        variant,
      };
    }
    case 'direct':
    default:
      return {
        controlPoints: {
          sourceOffset: anchorGeometry.source,
          targetOffset: anchorGeometry.target,
        },
        points: [anchorGeometry.source, anchorGeometry.target],
        routeKind: 'direct',
        routing,
        source: anchorGeometry.source,
        sourcePosition,
        target: anchorGeometry.target,
        targetPosition,
        variant,
      };
  }
}

function pruneUndefinedRoutingValues(routing: EdgeRouting) {
  const nextRouting: EdgeRouting = {};

  (Object.keys(routing) as Array<keyof EdgeRouting>).forEach((key) => {
    const value = routing[key];

    if (hasRoutingValue(value)) {
      nextRouting[key] = value;
    }
  });

  return Object.keys(nextRouting).length > 0 ? nextRouting : undefined;
}

export function resetEdgeRoutingBends(routing: EdgeRouting | undefined) {
  return buildOffsetOnlyRouting(routing);
}

export function canCollapseEdgeRoute(routeKind: EdgeRouteKind) {
  return routeKind === 'mixed-step' || routeKind === 'raised' || routeKind === 'loopback';
}

export function collapseEdgeRoutingBends(options: {
  routeKind: EdgeRouteKind;
  routing?: EdgeRouting;
  source: Point;
  sourcePosition: Position;
  target: Point;
  targetPosition: Position;
}) {
  const nextRouting = buildOffsetOnlyRouting(options.routing) ?? {};

  switch (options.routeKind) {
    case 'mixed-step':
      if (isHorizontalPosition(options.sourcePosition)) {
        nextRouting.elbowX = options.target.x;
        nextRouting.elbowY = options.source.y;
      } else {
        nextRouting.elbowX = options.source.x;
        nextRouting.elbowY = options.target.y;
      }
      break;
    case 'raised':
      nextRouting.trackY = getTrackYFromRaisedHeight(
        options.source.y,
        options.target.y,
        MIN_SEGMENT_LENGTH,
      );
      break;
    case 'loopback':
      nextRouting.trackY = getTrackYFromLoopOffset(
        options.source.y,
        options.sourcePosition,
        LOOP_TRACK_OFFSET,
      );
      break;
    default:
      break;
  }

  return pruneUndefinedRoutingValues(nextRouting);
}

function preserveOffsetAcrossSideFamily(
  value: number | undefined,
  nextPosition: Position | undefined,
  previousPosition: Position | undefined,
) {
  if (!hasRoutingValue(value)) {
    return undefined;
  }

  if (
    !nextPosition ||
    !previousPosition ||
    isHorizontalPosition(nextPosition) === isHorizontalPosition(previousPosition)
  ) {
    return value;
  }

  return 0;
}

export function adaptEdgeRouting(options: {
  label?: string;
  previousSourcePosition?: Position;
  previousTargetPosition?: Position;
  routing?: EdgeRouting;
  sourceBounds?: EdgeNodeBounds;
  sourceFallback: Point;
  sourcePosition?: Position;
  targetBounds?: EdgeNodeBounds;
  targetFallback: Point;
  targetPosition?: Position;
  variant?: string;
}) {
  const nextRouting: EdgeRouting = {
    ...options.routing,
  };
  const sourcePosition = options.sourcePosition ?? Position.Right;
  const targetPosition = options.targetPosition ?? Position.Left;

  nextRouting.sourceOffset = preserveOffsetAcrossSideFamily(
    nextRouting.sourceOffset,
    sourcePosition,
    options.previousSourcePosition,
  );
  nextRouting.targetOffset = preserveOffsetAcrossSideFamily(
    nextRouting.targetOffset,
    targetPosition,
    options.previousTargetPosition,
  );

  const anchorGeometry = buildAnchorGeometry({
    routing: nextRouting,
    sourceBounds: options.sourceBounds,
    sourceFallback: options.sourceFallback,
    sourcePosition,
    targetBounds: options.targetBounds,
    targetFallback: options.targetFallback,
    targetPosition,
  });
  const routeKind = resolveRouteKind({
    source: anchorGeometry.source,
    sourcePosition,
    target: anchorGeometry.target,
    targetPosition,
    variant: normalizeEdgeRoutingVariant(options.variant),
  });

  if (hasRoutingValue(nextRouting.sourceOffset)) {
    nextRouting.sourceOffset = anchorGeometry.sourceOffset;
  }

  if (hasRoutingValue(nextRouting.targetOffset)) {
    nextRouting.targetOffset = anchorGeometry.targetOffset;
  }

  if (routeKind !== 'horizontal-step') {
    delete nextRouting.bendX;
  } else if (hasRoutingValue(nextRouting.bendX)) {
    const bendX = nextRouting.bendX as number;

    nextRouting.bendX = clampManualBendValue(
      anchorGeometry.source.x,
      anchorGeometry.target.x,
      bendX,
    );
  }

  if (routeKind !== 'vertical-step') {
    delete nextRouting.bendY;
  } else if (hasRoutingValue(nextRouting.bendY)) {
    const bendY = nextRouting.bendY as number;

    nextRouting.bendY = clampManualBendValue(
      anchorGeometry.source.y,
      anchorGeometry.target.y,
      bendY,
    );
  }

  if (routeKind !== 'mixed-step') {
    delete nextRouting.elbowX;
    delete nextRouting.elbowY;
  } else {
    if (hasRoutingValue(nextRouting.elbowX)) {
      const elbowX = nextRouting.elbowX as number;

      nextRouting.elbowX = clampManualBendValue(
        anchorGeometry.source.x,
        anchorGeometry.target.x,
        elbowX,
      );
    }

    if (hasRoutingValue(nextRouting.elbowY)) {
      const elbowY = nextRouting.elbowY as number;

      nextRouting.elbowY = clampManualBendValue(
        anchorGeometry.source.y,
        anchorGeometry.target.y,
        elbowY,
      );
    }
  }

  if (routeKind !== 'raised' && routeKind !== 'loopback') {
    delete nextRouting.trackY;
  } else if (hasRoutingValue(nextRouting.trackY)) {
    const trackY = nextRouting.trackY as number;

    nextRouting.trackY = clampTrackY(
      anchorGeometry.source.y,
      anchorGeometry.target.y,
      trackY,
      {
        loopback: routeKind === 'loopback',
        sourcePosition,
      },
    );
  }

  return pruneUndefinedRoutingValues(nextRouting);
}

export function getEdgeOffsetFromPoint(
  bounds: EdgeNodeBounds | undefined,
  position: Position,
  point: Point,
) {
  if (!bounds) {
    return 0;
  }

  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const rawOffset = isHorizontalPosition(position)
    ? point.y - centerY
    : point.x - centerX;

  return clampAnchorOffset(bounds, position, rawOffset);
}
