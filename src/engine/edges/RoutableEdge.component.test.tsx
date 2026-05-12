import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EdgeEditorProvider } from '../edge-editor-context';

vi.mock('@xyflow/react', async () => {
  const React = await import('react');

  return {
    BaseEdge: () => <div data-testid="base-edge" />,
    EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Position: {
      Left: 'left',
      Right: 'right',
      Top: 'top',
      Bottom: 'bottom',
    },
    useInternalNode: (id: string) => {
      if (id === 'source') {
        return {
          measured: {
            width: 160,
            height: 52,
          },
          internals: {
            positionAbsolute: {
              x: 0,
              y: 0,
            },
          },
        };
      }

      return {
        measured: {
          width: 160,
          height: 52,
        },
        internals: {
          positionAbsolute: {
            x: 320,
            y: 160,
          },
        },
      };
    },
    useReactFlow: () => ({
      screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x, y }),
    }),
  };
});

import { RoutableEdge } from './RoutableEdge';

describe('RoutableEdge interactive handles', () => {
  it('renders editable bend handles with pointer events enabled', () => {
    render(
      <EdgeEditorProvider
        value={{
          resetEdgeRouting: vi.fn(),
          setEdgeLabel: vi.fn(),
          setEdgeLineStyle: vi.fn(),
          setEdgeRouting: vi.fn(),
          setEdgeSourcePosition: vi.fn(),
          setEdgeTargetPosition: vi.fn(),
          setEdgeRoutingVariant: vi.fn(),
        }}
      >
        <RoutableEdge
          data={{
            editable: true,
            routing: {
              elbowX: 240,
              elbowY: 120,
            },
            variant: 'bend',
          }}
          id="edge-source-target"
          selected
          source="source"
          sourcePosition={'right' as any}
          sourceX={160}
          sourceY={26}
          style={{}}
          target="target"
          targetPosition={'top' as any}
          targetX={400}
          targetY={160}
        />
      </EdgeEditorProvider>,
    );

    const bendHandle = screen.getByRole('button', { name: /adjust bend/i });

    expect(bendHandle.getAttribute('style')).toContain('pointer-events: all;');
  });
});
