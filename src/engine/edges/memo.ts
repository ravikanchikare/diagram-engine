import type { EdgeProps } from '@xyflow/react';
import { areEqualValues } from '../nodes/memo';
import type { RoutableEdgeData } from '../edge-routing';

function areShallowObjectsEqual(left: unknown, right: unknown) {
  if (Object.is(left, right)) {
    return true;
  }

  if (
    typeof left !== 'object' ||
    left === null ||
    typeof right !== 'object' ||
    right === null
  ) {
    return false;
  }

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => Object.is(leftRecord[key], rightRecord[key]));
}

export function areBaseEdgePropsEqual(left: EdgeProps, right: EdgeProps) {
  return (
    left.id === right.id &&
    left.sourceX === right.sourceX &&
    left.sourceY === right.sourceY &&
    left.targetX === right.targetX &&
    left.targetY === right.targetY &&
    left.sourcePosition === right.sourcePosition &&
    left.targetPosition === right.targetPosition &&
    left.markerEnd === right.markerEnd &&
    left.label === right.label &&
    left.selected === right.selected &&
    areEqualValues(left.style, right.style) &&
    areEqualValues(left.labelStyle, right.labelStyle) &&
    areEqualValues(left.labelBgStyle, right.labelBgStyle)
  );
}

export function areRoutableEdgePropsEqual(left: EdgeProps, right: EdgeProps) {
  const leftData = (left.data ?? {}) as RoutableEdgeData;
  const rightData = (right.data ?? {}) as RoutableEdgeData;

  return (
    areBaseEdgePropsEqual(left, right) &&
    left.source === right.source &&
    left.target === right.target &&
    leftData.editable === rightData.editable &&
    leftData.variant === rightData.variant &&
    areShallowObjectsEqual(leftData.routing, rightData.routing)
  );
}
