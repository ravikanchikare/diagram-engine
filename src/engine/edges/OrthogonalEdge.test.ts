import { Position } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import { buildOrthogonalPath, pointsToRoundedPath } from './OrthogonalEdge';

describe('buildOrthogonalPath', () => {
  it('uses a single elbow for bottom-to-lifeline routes', () => {
    const points = buildOrthogonalPath({
      sourceX: 120,
      sourceY: 220,
      sourcePosition: Position.Bottom,
      targetX: 40,
      targetY: 280,
      targetPosition: Position.Right,
    });

    expect(points).toEqual([
      { x: 120, y: 220 },
      { x: 120, y: 280 },
      { x: 40, y: 280 },
    ]);
  });

  it('rounds orthogonal corners with a smooth curve', () => {
    expect(
      pointsToRoundedPath([
        { x: 120, y: 220 },
        { x: 120, y: 280 },
        { x: 40, y: 280 },
      ]),
    ).toContain('Q120 280 106 280');
  });
});
