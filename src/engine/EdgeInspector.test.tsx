import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EdgeInspector } from './EdgeInspector';
import {
  EdgeEditorProvider,
  type EdgeEditorActions,
} from './edge-editor-context';
import type { DiagramEdge, DiagramNode } from './layout';

function makeTestNode(id: string, x: number, y: number): DiagramNode {
  return {
    id,
    position: { x, y },
    style: { width: 160, height: 52 },
  } as DiagramNode;
}

function makeTestEdge(
  id: string,
  source: string,
  target: string,
  sourceHandle: string,
  targetHandle: string,
  overrides: Partial<DiagramEdge> = {},
): DiagramEdge {
  return {
    id,
    type: 'routable',
    source,
    target,
    sourceHandle,
    targetHandle,
    data: { editable: true, ...overrides.data },
    ...overrides,
  } as DiagramEdge;
}

function renderInspector({
  edge,
  nodes,
  onDelete = vi.fn(),
  resetEdgeRouting = vi.fn() as any,
  setEdgeLabel = vi.fn() as any,
  setEdgeRouting = vi.fn() as any,
  setEdgeLineStyle = vi.fn() as any,
  setEdgeSourcePosition = vi.fn() as any,
  setEdgeTargetPosition = vi.fn() as any,
  setEdgeRoutingVariant = vi.fn() as any,
}: {
  edge: DiagramEdge;
  nodes: DiagramNode[];
  onDelete?: any;
  resetEdgeRouting?: any;
  setEdgeLabel?: any;
  setEdgeRouting?: any;
  setEdgeLineStyle?: any;
  setEdgeSourcePosition?: any;
  setEdgeTargetPosition?: any;
  setEdgeRoutingVariant?: any;
}) {
  const actions: EdgeEditorActions = {
    resetEdgeRouting: (...args) => resetEdgeRouting(...args),
    setEdgeLabel: (...args) => setEdgeLabel(...args),
    setEdgeRouting: (...args) => setEdgeRouting(...args),
    setEdgeLineStyle: (...args) => setEdgeLineStyle(...args),
    setEdgeSourcePosition: (...args) => setEdgeSourcePosition(...args),
    setEdgeTargetPosition: (...args) => setEdgeTargetPosition(...args),
    setEdgeRoutingVariant: (...args) => setEdgeRoutingVariant(...args),
  };

  render(
    <EdgeEditorProvider
      value={actions}
    >
      <EdgeInspector
        edge={edge}
        nodes={nodes}
        onDelete={onDelete}
      />
    </EdgeEditorProvider>,
  );

  return {
    onDelete,
    resetEdgeRouting,
    setEdgeLabel,
    setEdgeRouting,
    setEdgeLineStyle,
    setEdgeSourcePosition,
    setEdgeTargetPosition,
    setEdgeRoutingVariant,
  };
}

describe('EdgeInspector', () => {
  it('shows route-specific bend controls and dispatches variant changes', () => {
    const nodes = [
      makeTestNode('draft', 0, 0),
      makeTestNode('review', 320, 160),
    ];
    const edge = makeTestEdge('edge-draft-review', 'draft', 'review', 'right', 'left', {
      data: { routing: { bendX: 240 }, variant: 'bend' },
    });
    const {
      setEdgeLineStyle,
      setEdgeRoutingVariant,
    } = renderInspector({ edge, nodes });

    expect(screen.getByLabelText('Bend X')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Route'), {
      target: {
        value: 'raised',
      },
    });

    expect(setEdgeRoutingVariant).toHaveBeenCalledWith('edge-draft-review', 'raised');

    fireEvent.change(screen.getByLabelText('Edge style'), {
      target: {
        value: 'dashed',
      },
    });

    expect(setEdgeLineStyle).toHaveBeenCalledWith('edge-draft-review', 'dashed');
  });

  it('edits edge text from the inspector', () => {
    const nodes = [
      makeTestNode('draft', 0, 0),
      makeTestNode('review', 320, 160),
    ];
    const edge = makeTestEdge('edge-draft-review', 'draft', 'review', 'right', 'left', {
      label: 'old label',
      data: { variant: 'bend' },
    });
    const { setEdgeLabel } = renderInspector({ edge, nodes });
    const input = screen.getByLabelText('Edge text');

    fireEvent.change(input, {
      target: {
        value: 'review failures',
      },
    });
    fireEvent.blur(input);

    expect(setEdgeLabel).toHaveBeenCalledWith('edge-draft-review', 'review failures');
  });

  it('limits loopback side controls to top and bottom and updates both endpoints together', () => {
    const nodes = [
      makeTestNode('refine', 320, 0),
      makeTestNode('test', 0, 0),
    ];
    const edge = makeTestEdge('edge-refine-test', 'refine', 'test', 'top', 'top', {
      data: { variant: 'bend' },
    });
    const {
      setEdgeSourcePosition,
      setEdgeTargetPosition,
    } = renderInspector({ edge, nodes });
    const sourceSideSelect = screen.getByLabelText('Source side');

    expect(screen.queryByRole('option', { name: 'left' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'right' })).not.toBeInTheDocument();

    fireEvent.change(sourceSideSelect, {
      target: {
        value: 'bottom',
      },
    });

    expect(setEdgeSourcePosition).toHaveBeenCalledWith('edge-refine-test', 'bottom');
    expect(setEdgeTargetPosition).toHaveBeenCalledWith('edge-refine-test', 'bottom');
  });

  it('shows raised height as a relative value and converts it back to trackY', () => {
    const nodes = [
      makeTestNode('draft', 0, 80),
      makeTestNode('review', 320, 200),
    ];
    const edge = makeTestEdge('edge-draft-review', 'draft', 'review', 'right', 'left', {
      data: { routing: { trackY: 32 }, variant: 'raised' },
    });
    const { setEdgeRouting } = renderInspector({ edge, nodes });
    const raisedHeightInput = screen.getByLabelText('Raised Height') as HTMLInputElement;

    expect(raisedHeightInput.value).toBe('74');

    fireEvent.change(raisedHeightInput, {
      target: {
        value: '96',
      },
    });
    fireEvent.blur(raisedHeightInput);

    expect(setEdgeRouting).toHaveBeenCalledTimes(1);
    expect(setEdgeRouting.mock.calls[0]?.[0]).toBe('edge-draft-review');

    const updater = setEdgeRouting.mock.calls[0]?.[1] as (
      current: undefined,
    ) => { trackY: number };

    expect(updater(undefined)).toEqual({
      trackY: 10,
    });
  });

  it('resets only manual bend fields and preserves source and target offsets', () => {
    const nodes = [
      makeTestNode('draft', 0, 0),
      makeTestNode('review', 320, 160),
    ];
    const edge = makeTestEdge('edge-draft-review', 'draft', 'review', 'right', 'top', {
      data: {
        routing: {
          sourceOffset: 16,
          targetOffset: -16,
          elbowX: 240,
          elbowY: 120,
        },
        variant: 'bend',
      },
    });
    const { setEdgeRouting } = renderInspector({ edge, nodes });

    fireEvent.click(screen.getByRole('button', { name: 'Reset bend' }));

    expect(setEdgeRouting).toHaveBeenCalledWith('edge-draft-review', {
      sourceOffset: 16,
      targetOffset: -16,
    });
  });

  it('collapses mixed-step bends to the current side intersection', () => {
    const nodes = [
      makeTestNode('draft', 0, 0),
      makeTestNode('review', 320, 160),
    ];
    const edge = makeTestEdge('edge-draft-review', 'draft', 'review', 'right', 'top', {
      data: {
        routing: {
          sourceOffset: 16,
          targetOffset: -16,
          elbowX: 240,
          elbowY: 120,
        },
        variant: 'bend',
      },
    });
    const { setEdgeRouting } = renderInspector({ edge, nodes });

    fireEvent.click(screen.getByRole('button', { name: 'Collapse bend' }));

    expect(setEdgeRouting).toHaveBeenCalledWith('edge-draft-review', {
      sourceOffset: 16,
      targetOffset: -16,
      elbowX: 384,
      elbowY: 42,
    });
  });

  it('hides the collapse action for horizontal step routes', () => {
    const nodes = [
      makeTestNode('draft', 0, 0),
      makeTestNode('review', 320, 160),
    ];
    const edge = makeTestEdge('edge-draft-review', 'draft', 'review', 'right', 'left', {
      data: {
        routing: {
          bendX: 240,
        },
        variant: 'bend',
      },
    });

    renderInspector({ edge, nodes });

    expect(screen.getByRole('button', { name: 'Reset bend' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Collapse bend' })).not.toBeInTheDocument();
  });
});
