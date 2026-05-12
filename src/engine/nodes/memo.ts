import type { Node, NodeProps } from '@xyflow/react';

export function areEqualValues(left: unknown, right: unknown): boolean {
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

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }

    return left.every((value, index) => areEqualValues(value, right[index]));
  }

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => areEqualValues(leftRecord[key], rightRecord[key]));
}

export function areNodePropsEqual<TNode extends Node<Record<string, unknown>>>(
  left: NodeProps<TNode>,
  right: NodeProps<TNode>,
  keys: Array<keyof TNode['data']>,
) {
  if (left.id !== right.id) {
    return false;
  }

  if (left.selected !== right.selected) {
    return false;
  }

  return keys.every((key) => areEqualValues(left.data[key], right.data[key]));
}
