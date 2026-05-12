import { memo } from 'react';
import { BaseEdge, type EdgeProps } from '@xyflow/react';
import { pointsToRoundedPath } from './OrthogonalEdge';
import { areBaseEdgePropsEqual } from './memo';
import { type Point } from '../edge-routing';
import { clamp } from '../utils';
import { EdgeLabel } from './EdgeLabel';

export function buildRaisedPoints(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
) {
  const lift = clamp(Math.abs(targetX - sourceX) * 0.08 + 40, 40, 80);
  const raisedY = Math.min(sourceY, targetY) - lift;

  return [
    { x: sourceX, y: sourceY },
    { x: sourceX, y: raisedY },
    { x: targetX, y: raisedY },
    { x: targetX, y: targetY },
  ] satisfies Point[];
}

function getLabelPosition(points: Point[]) {
  if (points.length < 4) {
    return { x: 0, y: 0 };
  }

  return {
    x: (points[1].x + points[2].x) / 2,
    y: points[1].y - 12,
  };
}

function RaisedEdgeComponent({
  id,
  label,
  labelBgStyle,
  labelStyle,
  markerEnd,
  sourceX,
  sourceY,
  style,
  targetX,
  targetY,
}: EdgeProps) {
  const points = buildRaisedPoints(sourceX, sourceY, targetX, targetY);
  const path = pointsToRoundedPath(points);
  const labelPosition = getLabelPosition(points);

  return (
    <>
      <BaseEdge
        id={id}
        markerEnd={markerEnd}
        path={path}
        style={{
          ...style,
          strokeLinejoin: 'round',
        }}
      />
      {typeof label === 'string' && label ? (
        <EdgeLabel
          label={label}
          labelBgStyle={labelBgStyle}
          labelStyle={labelStyle}
          position={labelPosition}
        />
      ) : null}
    </>
  );
}

export const RaisedEdge = memo(RaisedEdgeComponent, areBaseEdgePropsEqual);
