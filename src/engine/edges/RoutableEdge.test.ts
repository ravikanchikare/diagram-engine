import { Position } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import { pointsToRoundedPath } from './OrthogonalEdge';
import {
  buildRoutableEdgePoints,
  getEdgeLabelPosition,
} from './RoutableEdge';

describe('buildRoutableEdgePoints', () => {
  it('keeps same-row transitions as a straight segment', () => {
    expect(
      buildRoutableEdgePoints({
        sourceX: 120,
        sourceY: 40,
        sourcePosition: Position.Right,
        targetX: 320,
        targetY: 40,
        targetPosition: Position.Left,
        variant: 'straight',
      }),
    ).toEqual([
      { x: 120, y: 40 },
      { x: 320, y: 40 },
    ]);
  });

  it('routes offset left-right connections through a rounded center column', () => {
    const points = buildRoutableEdgePoints({
      sourceX: 160,
      sourceY: 60,
      sourcePosition: Position.Right,
      targetX: 420,
      targetY: 220,
      targetPosition: Position.Left,
      variant: 'bend',
    });

    expect(points).toEqual([
      { x: 160, y: 60 },
      { x: 290, y: 60 },
      { x: 290, y: 220 },
      { x: 420, y: 220 },
    ]);
    expect(pointsToRoundedPath(points)).toContain('Q');
  });

  it('routes same-row top loopbacks above the main flow with a small offset', () => {
    expect(
      buildRoutableEdgePoints({
        sourceX: 420,
        sourceY: 80,
        sourcePosition: Position.Top,
        targetX: 180,
        targetY: 80,
        targetPosition: Position.Top,
        variant: 'bend',
      }),
    ).toEqual([
      { x: 420, y: 80 },
      { x: 420, y: 48 },
      { x: 180, y: 48 },
      { x: 180, y: 80 },
    ]);
  });

  it('routes same-row bottom loopbacks below the main flow with a small offset', () => {
    expect(
      buildRoutableEdgePoints({
        sourceX: 420,
        sourceY: 132,
        sourcePosition: Position.Bottom,
        targetX: 180,
        targetY: 132,
        targetPosition: Position.Bottom,
        variant: 'bend',
      }),
    ).toEqual([
      { x: 420, y: 132 },
      { x: 420, y: 164 },
      { x: 180, y: 164 },
      { x: 180, y: 132 },
    ]);
  });

  it('keeps same-row labeled horizontal connections flat', () => {
    expect(
      buildRoutableEdgePoints({
        label: 'Review failures',
        sourceX: 120,
        sourceY: 40,
        sourcePosition: Position.Right,
        targetX: 360,
        targetY: 40,
        targetPosition: Position.Left,
        variant: 'straight',
      }),
    ).toEqual([
      { x: 120, y: 40 },
      { x: 360, y: 40 },
    ]);
  });

  it('extends offset horizontal runs to fit the label width', () => {
    const points = buildRoutableEdgePoints({
      label: 'Promote candidate',
      sourceX: 160,
      sourceY: 60,
      sourcePosition: Position.Right,
      targetX: 420,
      targetY: 220,
      targetPosition: Position.Left,
      variant: 'bend',
    });

    expect(points).toEqual([
      { x: 160, y: 60 },
      { x: 295.6, y: 60 },
      { x: 295.6, y: 220 },
      { x: 420, y: 220 },
    ]);
  });
});

describe('getEdgeLabelPosition', () => {
  it('offsets horizontal labels above the edge', () => {
    expect(
      getEdgeLabelPosition(
        [{ x: 120, y: 40 }, { x: 320, y: 40 }],
      ),
    ).toEqual({ x: 220, y: 24 });
  });

  it('keeps upward vertical labels centered on the connector', () => {
    expect(
      getEdgeLabelPosition(
        [{ x: 220, y: 200 }, { x: 220, y: 80 }],
      ),
    ).toEqual({ x: 220, y: 140 });
  });

  it('keeps downward vertical labels centered on the connector', () => {
    expect(
      getEdgeLabelPosition(
        [{ x: 220, y: 80 }, { x: 220, y: 200 }],
      ),
    ).toEqual({ x: 220, y: 140 });
  });
});
