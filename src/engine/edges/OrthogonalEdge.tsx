import { memo } from 'react';
import {
  BaseEdge,
  Position,
  type EdgeProps,
} from '@xyflow/react';
import { areBaseEdgePropsEqual } from './memo';
import { type Point, dedupePoints } from '../edge-routing';

const CORNER_RADIUS = 14;

export function buildOrthogonalPath({
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
}: Pick<
  EdgeProps,
  'sourceX' | 'sourceY' | 'sourcePosition' | 'targetX' | 'targetY' | 'targetPosition'
>) {
  const start = { x: sourceX, y: sourceY };
  const end = { x: targetX, y: targetY };

  if (targetPosition === Position.Top) {
    return dedupePoints([
      start,
      { x: targetX, y: sourceY },
      end,
    ]);
  }

  if (sourcePosition === Position.Bottom) {
    return dedupePoints([
      start,
      { x: sourceX, y: targetY },
      end,
    ]);
  }

  return dedupePoints([
    start,
    { x: targetX, y: sourceY },
    end,
  ]);
}

function distance(from: Point, to: Point) {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

function isTurn(prev: Point, current: Point, next: Point) {
  const entersHorizontally = prev.y === current.y;
  const leavesHorizontally = current.y === next.y;

  return entersHorizontally !== leavesHorizontally;
}

export function pointsToRoundedPath(
  points: Point[],
  radius = CORNER_RADIUS,
) {
  const [first, ...rest] = points;

  if (!first) {
    return '';
  }

  if (rest.length === 0) {
    return `M${first.x} ${first.y}`;
  }

  let path = `M${first.x} ${first.y}`;

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];

    if (!isTurn(previous, current, next)) {
      path += `L${current.x} ${current.y}`;
      continue;
    }

    const radiusAtCorner = Math.min(
      radius,
      distance(previous, current) / 2,
      distance(current, next) / 2,
    );

    const bendStart = {
      x: current.x - Math.sign(current.x - previous.x) * radiusAtCorner,
      y: current.y - Math.sign(current.y - previous.y) * radiusAtCorner,
    };
    const bendEnd = {
      x: current.x + Math.sign(next.x - current.x) * radiusAtCorner,
      y: current.y + Math.sign(next.y - current.y) * radiusAtCorner,
    };

    path += `L${bendStart.x} ${bendStart.y}`;
    path += `Q${current.x} ${current.y} ${bendEnd.x} ${bendEnd.y}`;
  }

  const last = points[points.length - 1];
  return `${path}L${last.x} ${last.y}`;
}

function OrthogonalEdgeComponent({
  id,
  markerEnd,
  sourcePosition,
  sourceX,
  sourceY,
  style,
  targetPosition,
  targetX,
  targetY,
}: EdgeProps) {
  const path = pointsToRoundedPath(
    buildOrthogonalPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    }),
  );

  return (
    <BaseEdge
      id={id}
      markerEnd={markerEnd}
      path={path}
      style={{
        ...style,
        strokeLinejoin: 'round',
      }}
    />
  );
}

export const OrthogonalEdge = memo(OrthogonalEdgeComponent, areBaseEdgePropsEqual);
