import { describe, expect, it } from 'vitest';
import { Position, type EdgeProps } from '@xyflow/react';
import { areRoutableEdgePropsEqual } from './memo';

function edgeProps(routing: Record<string, number>): EdgeProps {
  return {
    id: 'edge-a-b',
    source: 'a',
    target: 'b',
    sourceX: 0,
    sourceY: 0,
    sourcePosition: Position.Right,
    targetX: 100,
    targetY: 100,
    targetPosition: Position.Left,
    selected: false,
    data: {
      editable: true,
      routing,
      variant: 'bend',
    },
  } as EdgeProps;
}

describe('edge memo comparators', () => {
  it('shallow-compares state connection routing data', () => {
    expect(
      areRoutableEdgePropsEqual(
        edgeProps({ bendX: 40, bendY: 60 }),
        edgeProps({ bendX: 40, bendY: 60 }),
      ),
    ).toBe(true);

    expect(
      areRoutableEdgePropsEqual(
        edgeProps({ bendX: 40, bendY: 60 }),
        edgeProps({ bendX: 40, bendY: 80 }),
      ),
    ).toBe(false);
  });
});
