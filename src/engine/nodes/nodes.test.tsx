import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const updateNodeInternals = vi.fn();

vi.mock('@xyflow/react', () => ({
  Handle: ({ id, type }: { id: string; type: string }) => (
    <div data-testid={`handle-${id}-${type}`} />
  ),
  NodeResizer: () => null,
  Position: {
    Left: 'left',
    Right: 'right',
    Top: 'top',
    Bottom: 'bottom',
  },
  useUpdateNodeInternals: () => updateNodeInternals,
}));

vi.mock('../markdoc', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../markdoc')>();

  return {
    ...actual,
    renderMarkdocNodes: vi.fn(actual.renderMarkdocNodes),
  };
});

import { BlockLayer } from './BlockLayer';
import { EntityNode } from './EntityNode';
import { OverviewIconNode } from './OverviewIconNode';
import { OverviewTextNode } from './OverviewTextNode';
import { RoundedNode } from './RoundedNode';
import { SequenceActionNode } from './SequenceActionNode';
import { SequenceActorNode } from './SequenceActorNode';
import { renderMarkdocNodes } from '../markdoc';

function createNodeProps(id: string, data: unknown) {
  return {
    id,
    data,
    dragging: false,
    isConnectable: false,
    selected: false,
    type: 'test',
    xPos: 0,
    yPos: 0,
    zIndex: 0,
  } as any;
}

afterEach(() => {
  updateNodeInternals.mockClear();
  vi.mocked(renderMarkdocNodes).mockClear();
});

describe('diagram nodes', () => {
  it('toggles entity sample rows and requests node internals refresh', () => {
    render(
      <EntityNode
        {...createNodeProps('entity-1', {
          header: [
            {
              $$mdtype: 'Tag',
              name: 'Paragraph',
              attributes: {},
              children: ['Invoice'],
            },
          ],
          rows: [
            {
              name: 'id',
              value: 'in_123',
              handle: 'id',
            },
          ],
          handles: ['id'],
        })}
      />,
    );

    expect(screen.getByText('in_123')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hide sample arguments/i })).toBeInTheDocument();
    expect(updateNodeInternals).toHaveBeenCalledWith('entity-1');

    fireEvent.click(screen.getByRole('button', { name: /hide sample arguments/i }));

    expect(screen.queryByText('in_123')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show sample arguments/i })).toBeInTheDocument();
    expect(updateNodeInternals).toHaveBeenCalledWith('entity-1');
  });

  it('renders overview icon and text nodes', () => {
    render(
      <>
        <OverviewIconNode
          {...createNodeProps('account', {
            icon: 'account',
            text: [],
            size: 'auto',
            color: 'default',
            label: 'Connected account',
          })}
        />
        <OverviewTextNode
          {...createNodeProps('charge', {
            text: [
              {
                $$mdtype: 'Tag',
                name: 'Paragraph',
                attributes: {},
                children: ['10 USD charge'],
              },
            ],
            size: 'medium',
            color: 'default',
          })}
        />
      </>,
    );

    expect(screen.getByText('Connected account')).toBeInTheDocument();
    expect(screen.getByText('10 USD charge')).toBeInTheDocument();
  });

  it('renders state variants through modifier classes', () => {
    const { container } = render(
      <RoundedNode
        {...createNodeProps('success', {
          text: [
            {
              $$mdtype: 'Tag',
              name: 'Paragraph',
              attributes: {},
              children: ['Succeeded'],
            },
          ],
          state: 'success',
        })}
        type="state"
      />,
    );

    expect(container.firstChild).toHaveClass('rounded-node', 'rounded-node--pill', 'rounded-node--success');
    expect(screen.getByText('Succeeded')).toBeInTheDocument();
  });

  it('marks sequence action nodes when rendered content exceeds max lines', async () => {
    const scrollHeight = vi
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(80);

    const { container } = render(
      <SequenceActionNode
        {...createNodeProps('action', {
          text: ['This action label wraps onto too many rendered lines'],
          from: 'client',
          to: 'server',
        })}
      />,
    );

    await waitFor(() => {
      expect(container.firstChild).toHaveAttribute('data-overflow', 'true');
    });

    scrollHeight.mockRestore();
  });

  it('does not re-render a memoized node when an unrelated sibling changes', () => {
    function Harness({ siblingText }: { siblingText: string }) {
      return (
        <>
          <RoundedNode
            {...createNodeProps('stable', {
              text: ['Stable node'],
              state: 'success',
            })}
            type="state"
          />
          <div>{siblingText}</div>
        </>
      );
    }

    const { rerender } = render(<Harness siblingText="first sibling" />);
    const firstRenderCount = vi.mocked(renderMarkdocNodes).mock.calls.length;

    rerender(<Harness siblingText="second sibling" />);

    expect(vi.mocked(renderMarkdocNodes).mock.calls.length).toBe(firstRenderCount);
  });

  it('re-renders a memoized node when relevant data changes', () => {
    function Harness({ state }: { state: string }) {
      return (
        <RoundedNode
          {...createNodeProps('stable', {
            text: ['Stable node'],
            state,
          })}
          type="state"
        />
      );
    }

    const { rerender } = render(<Harness state="success" />);
    const firstRenderCount = vi.mocked(renderMarkdocNodes).mock.calls.length;

    rerender(<Harness state="danger" />);

    expect(vi.mocked(renderMarkdocNodes).mock.calls.length).toBeGreaterThan(firstRenderCount);
  });

  // T14 — per-node expanded tests

  it('SequenceActorNode renders heading text and correct number of row segments', () => {
    const { container } = render(
      <SequenceActorNode
        {...createNodeProps('actor-1', {
          heading: [{ $mdtype: 'Tag', name: 'Paragraph', attributes: {}, children: ['Client'] }],
          rows: 3,
          color: 'accent',
          activeRows: [1, 2],
          lineX: 24,
        })}
      />,
    );

    expect(screen.getByText('Client')).toBeInTheDocument();
    // 3 rows → 3 section divs
    expect(container.querySelectorAll('.actor-node__section')).toHaveLength(3);
    // 2 active rows → 2 segment spans
    expect(container.querySelectorAll('.actor-node__segment')).toHaveLength(2);
    expect(container.firstChild).toHaveClass('actor-node--accent');
  });

  it('StateNode applies state-node--danger class when data.state is danger', () => {
    const { container } = render(
      <RoundedNode
        {...createNodeProps('danger-node', {
          text: ['Failed'],
          state: 'danger',
        })}
        type="state"
      />,
    );

    expect(container.firstChild).toHaveClass('rounded-node--danger');
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('BlockNode renders subtitle when provided and omits it when absent', () => {
    const { rerender } = render(
      <RoundedNode
        {...createNodeProps('block-1', {
          text: [{ $mdtype: 'Tag', name: 'Paragraph', attributes: {}, children: ['Title'] }],
          subtitle: [{ $mdtype: 'Tag', name: 'Paragraph', attributes: {}, children: ['Sub'] }],
          state: 'default',
        })}
        type="block"
      />,
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Sub')).toBeInTheDocument();

    rerender(
      <RoundedNode
        {...createNodeProps('block-1', {
          text: [{ $mdtype: 'Tag', name: 'Paragraph', attributes: {}, children: ['Title'] }],
          state: 'default',
        })}
        type="block"
      />,
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.queryByText('Sub')).not.toBeInTheDocument();
  });

  it('BlockLayer applies block-layer--accent class when data.state is accent', () => {
    const { container } = render(
      <BlockLayer
        {...createNodeProps('layer-1', {
          title: [{ $mdtype: 'Tag', name: 'Paragraph', attributes: {}, children: ['My Layer'] }],
          state: 'accent',
        })}
      />,
    );

    expect(container.firstChild).toHaveClass('block-layer--accent');
    expect(screen.getByText('My Layer')).toBeInTheDocument();
  });

  it('EntityNode renders the correct number of row elements', () => {
    const { container } = render(
      <EntityNode
        {...createNodeProps('entity-rows', {
          header: [{ $mdtype: 'Tag', name: 'Paragraph', attributes: {}, children: ['Order'] }],
          rows: [
            { name: 'id', value: 'ord_1', handle: 'id' },
            { name: 'amount', value: '100', handle: null },
            { name: 'status', value: 'paid', handle: 'status' },
          ],
          handles: ['id', 'status'],
        })}
      />,
    );

    expect(container.querySelectorAll('.entity-node__row')).toHaveLength(3);
    expect(screen.getByText('ord_1')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('paid')).toBeInTheDocument();
  });

  it('OverviewIconNode renders the icon label', () => {
    render(
      <OverviewIconNode
        {...createNodeProps('icon-1', {
          icon: 'terminal',
          label: 'Terminal',
          text: [],
          size: 'auto',
          color: 'accent',
        })}
      />,
    );

    expect(screen.getByText('Terminal')).toBeInTheDocument();
  });

  it('OverviewTextNode renders text content', () => {
    render(
      <OverviewTextNode
        {...createNodeProps('text-1', {
          text: [{ $mdtype: 'Tag', name: 'Paragraph', attributes: {}, children: ['Hello world'] }],
          size: 'medium',
          color: 'default',
        })}
      />,
    );

    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });
});
