import { describe, expect, it } from 'vitest';
import { buildRaisedPoints } from './RaisedEdge';
import { pointsToRoundedPath } from './OrthogonalEdge';

describe('buildRaisedPoints', () => {
  it('lifts the connection above both endpoints before returning to the target', () => {
    const points = buildRaisedPoints(420, 220, 180, 80);

    expect(points[0]).toEqual({ x: 420, y: 220 });
    expect(points[1].x).toBe(420);
    expect(points[1].y).toBeLessThan(80);
    expect(points[2]).toEqual({ x: 180, y: points[1].y });
    expect(points[3]).toEqual({ x: 180, y: 80 });
  });

  it('rounds the elbows on raised connections', () => {
    const path = pointsToRoundedPath(buildRaisedPoints(420, 220, 180, 80));

    expect(path).toContain('Q');
  });
});
