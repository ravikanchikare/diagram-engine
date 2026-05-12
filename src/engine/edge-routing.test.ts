import { Position } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import {
  adaptEdgeRouting,
  buildEdgeGeometry,
  canCollapseEdgeRoute,
  collapseEdgeRoutingBends,
  getLoopOffsetFromTrackY,
  getRaisedHeightFromTrackY,
  getTrackYFromLoopOffset,
  getTrackYFromRaisedHeight,
  resetEdgeRoutingBends,
} from './edge-routing';

const sourceBounds = {
  x: 0,
  y: 0,
  width: 160,
  height: 52,
};

const targetBounds = {
  x: 320,
  y: 160,
  width: 160,
  height: 52,
};

describe('buildEdgeGeometry', () => {
  it('uses bendX for horizontal step routes', () => {
    const geometry = buildEdgeGeometry({
      routing: {
        bendX: 240,
      },
      sourceBounds,
      sourceFallback: { x: 160, y: 26 },
      sourcePosition: Position.Right,
      targetBounds,
      targetFallback: { x: 320, y: 186 },
      targetPosition: Position.Left,
      variant: 'bend',
    });

    expect(geometry.routeKind).toBe('horizontal-step');
    expect(geometry.points).toEqual([
      { x: 160, y: 26 },
      { x: 240, y: 26 },
      { x: 240, y: 186 },
      { x: 320, y: 186 },
    ]);
    expect(geometry.routing.bendX).toBe(240);
  });

  it('uses bendY for vertical step routes', () => {
    const geometry = buildEdgeGeometry({
      routing: {
        bendY: 120,
      },
      sourceBounds,
      sourceFallback: { x: 80, y: 52 },
      sourcePosition: Position.Bottom,
      targetBounds: {
        ...targetBounds,
        x: 80,
        y: 260,
      },
      targetFallback: { x: 160, y: 260 },
      targetPosition: Position.Top,
      variant: 'bend',
    });

    expect(geometry.routeKind).toBe('vertical-step');
    expect(geometry.points).toEqual([
      { x: 80, y: 52 },
      { x: 80, y: 120 },
      { x: 160, y: 120 },
      { x: 160, y: 260 },
    ]);
    expect(geometry.routing.bendY).toBe(120);
  });

  it('uses elbowX and elbowY for mixed step routes', () => {
    const geometry = buildEdgeGeometry({
      routing: {
        elbowX: 240,
        elbowY: 120,
      },
      sourceBounds,
      sourceFallback: { x: 160, y: 26 },
      sourcePosition: Position.Right,
      targetBounds,
      targetFallback: { x: 400, y: 160 },
      targetPosition: Position.Top,
      variant: 'bend',
    });

    expect(geometry.routeKind).toBe('mixed-step');
    expect(geometry.points).toEqual([
      { x: 160, y: 26 },
      { x: 240, y: 26 },
      { x: 240, y: 120 },
      { x: 400, y: 120 },
      { x: 400, y: 160 },
    ]);
    expect(geometry.routing.elbowX).toBe(240);
    expect(geometry.routing.elbowY).toBe(120);
  });

  it('lets manual mixed-step elbows collapse to the endpoint so extra segments can disappear', () => {
    const geometry = buildEdgeGeometry({
      routing: {
        elbowX: 0,
        elbowY: 0,
      },
      sourceBounds,
      sourceFallback: { x: 160, y: 26 },
      sourcePosition: Position.Right,
      targetBounds,
      targetFallback: { x: 400, y: 160 },
      targetPosition: Position.Top,
      variant: 'bend',
    });

    expect(geometry.routeKind).toBe('mixed-step');
    expect(geometry.routing.elbowX).toBe(160);
    expect(geometry.routing.elbowY).toBe(26);
    expect(geometry.points).toEqual([
      { x: 160, y: 26 },
      { x: 400, y: 26 },
      { x: 400, y: 160 },
    ]);
  });

  it('uses trackY for raised routes', () => {
    const geometry = buildEdgeGeometry({
      routing: {
        trackY: -48,
      },
      sourceBounds,
      sourceFallback: { x: 160, y: 26 },
      sourcePosition: Position.Right,
      targetBounds,
      targetFallback: { x: 320, y: 186 },
      targetPosition: Position.Left,
      variant: 'raised',
    });

    expect(geometry.routeKind).toBe('raised');
    expect(geometry.points).toEqual([
      { x: 160, y: 26 },
      { x: 160, y: -48 },
      { x: 320, y: -48 },
      { x: 320, y: 186 },
    ]);
    expect(geometry.routing.trackY).toBe(-48);
  });

  it('uses trackY for same-row loopbacks', () => {
    const geometry = buildEdgeGeometry({
      routing: {
        trackY: 70,
      },
      sourceBounds: {
        ...sourceBounds,
        x: 320,
      },
      sourceFallback: { x: 400, y: 0 },
      sourcePosition: Position.Top,
      targetBounds: {
        ...targetBounds,
        x: 0,
        y: 0,
      },
      targetFallback: { x: 80, y: 0 },
      targetPosition: Position.Top,
      variant: 'bend',
    });

    expect(geometry.routeKind).toBe('loopback');
    expect(geometry.points).toEqual([
      { x: 400, y: 0 },
      { x: 400, y: -32 },
      { x: 80, y: -32 },
      { x: 80, y: 0 },
    ]);
    expect(geometry.routing.trackY).toBe(-32);
  });

  it('clamps source and target offsets to the node side', () => {
    const geometry = buildEdgeGeometry({
      routing: {
        sourceOffset: 80,
        targetOffset: -80,
      },
      sourceBounds,
      sourceFallback: { x: 160, y: 26 },
      sourcePosition: Position.Right,
      targetBounds,
      targetFallback: { x: 320, y: 186 },
      targetPosition: Position.Left,
      variant: 'straight',
    });

    expect(geometry.routing.sourceOffset).toBe(18);
    expect(geometry.routing.targetOffset).toBe(-18);
    expect(geometry.source).toEqual({ x: 160, y: 44 });
    expect(geometry.target).toEqual({ x: 320, y: 168 });
  });
});

describe('adaptEdgeRouting', () => {
  it('drops incompatible bend fields after a reconnect changes orientation', () => {
    const routing = adaptEdgeRouting({
      previousSourcePosition: Position.Right,
      previousTargetPosition: Position.Left,
      routing: {
        bendX: 224,
        sourceOffset: 16,
      },
      sourceBounds,
      sourceFallback: { x: 160, y: 26 },
      sourcePosition: Position.Top,
      targetBounds,
      targetFallback: { x: 320, y: 186 },
      targetPosition: Position.Bottom,
      variant: 'bend',
    });

    expect(routing).toEqual({
      sourceOffset: 0,
    });
  });

  it('preserves compatible offsets when the handle stays on the same side family', () => {
    const routing = adaptEdgeRouting({
      previousSourcePosition: Position.Right,
      previousTargetPosition: Position.Left,
      routing: {
        sourceOffset: 16,
        targetOffset: -16,
      },
      sourceBounds,
      sourceFallback: { x: 160, y: 26 },
      sourcePosition: Position.Left,
      targetBounds,
      targetFallback: { x: 320, y: 186 },
      targetPosition: Position.Right,
      variant: 'straight',
    });

    expect(routing).toEqual({
      sourceOffset: 16,
      targetOffset: -16,
    });
  });
});

describe('bend helpers', () => {
  it('resets manual bend fields while preserving anchor offsets', () => {
    expect(
      resetEdgeRoutingBends({
        sourceOffset: 16,
        targetOffset: -16,
        elbowX: 240,
        elbowY: 120,
      }),
    ).toEqual({
      sourceOffset: 16,
      targetOffset: -16,
    });
  });

  it('collapses mixed-step bends to the source and target side intersection', () => {
    expect(
      collapseEdgeRoutingBends({
        routeKind: 'mixed-step',
        routing: {
          sourceOffset: 16,
          targetOffset: -16,
          elbowX: 240,
          elbowY: 120,
        },
        source: { x: 160, y: 26 },
        sourcePosition: Position.Right,
        target: { x: 400, y: 160 },
        targetPosition: Position.Top,
      }),
    ).toEqual({
      sourceOffset: 16,
      targetOffset: -16,
      elbowX: 400,
      elbowY: 26,
    });
  });

  it('only exposes collapse for routes that can preserve endpoint directions', () => {
    expect(canCollapseEdgeRoute('horizontal-step')).toBe(false);
    expect(canCollapseEdgeRoute('vertical-step')).toBe(false);
    expect(canCollapseEdgeRoute('mixed-step')).toBe(true);
    expect(canCollapseEdgeRoute('raised')).toBe(true);
    expect(canCollapseEdgeRoute('loopback')).toBe(true);
  });
});

describe('raised and loop metrics', () => {
  it('converts between raised height and trackY', () => {
    expect(getRaisedHeightFromTrackY(106, 226, 32)).toBe(74);
    expect(getTrackYFromRaisedHeight(106, 226, 96)).toBe(10);
  });

  it('converts between loop offset and trackY', () => {
    expect(getLoopOffsetFromTrackY(80, Position.Top, 68)).toBe(32);
    expect(getTrackYFromLoopOffset(80, Position.Bottom, 24)).toBe(112);
  });
});
