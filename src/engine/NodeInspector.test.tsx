import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NodeInspector } from './NodeInspector';
import type { DiagramNode } from './layout';

function renderInspector({
  node,
  onMarkdocChange = vi.fn(),
  onDelete = vi.fn(),
  onStateChange = vi.fn(),
}: {
  node: DiagramNode;
  onMarkdocChange?: any;
  onDelete?: any;
  onStateChange?: any;
}) {
  render(
    <NodeInspector
      node={node}
      onMarkdocChange={onMarkdocChange}
      onDelete={onDelete}
      onStateChange={onStateChange}
    />,
  );

  return { onMarkdocChange, onDelete, onStateChange };
}

describe('NodeInspector', () => {
  it('converts plain text into paragraph markdoc on apply', () => {
    const node = {
      id: 'draft',
      type: 'state',
      position: { x: 0, y: 0 },
      data: {
        text: ['Draft'],
      },
    } as DiagramNode;

    const { onMarkdocChange } = renderInspector({ node });

    fireEvent.change(screen.getByLabelText('Markdoc'), {
      target: {
        value: 'Review failures',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply Markdoc' }));

    expect(onMarkdocChange).toHaveBeenCalledWith('draft', 'text', [
      {
        $$mdtype: 'Tag',
        name: 'Paragraph',
        attributes: {},
        children: ['Review failures'],
      },
    ]);
  });

  it('supports editing entity row markdoc fields', () => {
    const node = {
      id: 'invoice',
      type: 'entity',
      position: { x: 0, y: 0 },
      data: {
        header: ['Invoice'],
        handles: ['total'],
        rows: [
          {
            name: 'total',
            value: ['amount due'],
            handle: 'total',
          },
        ],
      },
    } as DiagramNode;

    const { onMarkdocChange } = renderInspector({ node });

    fireEvent.change(screen.getByLabelText('Markdoc field'), {
      target: {
        value: 'row-0',
      },
    });
    fireEvent.change(screen.getByLabelText('Markdoc'), {
      target: {
        value: 'updated amount',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply Markdoc' }));

    expect(onMarkdocChange).toHaveBeenCalledWith('invoice', 'row-0', [
      {
        $$mdtype: 'Tag',
        name: 'Paragraph',
        attributes: {},
        children: ['updated amount'],
      },
    ]);
  });

  it('validates markdoc json before applying', () => {
    const node = {
      id: 'draft',
      type: 'state',
      position: { x: 0, y: 0 },
      data: {
        text: ['Draft'],
      },
    } as DiagramNode;

    const { onMarkdocChange } = renderInspector({ node });

    fireEvent.change(screen.getByLabelText('Markdoc'), {
      target: {
        value: '{"name":42}',
      },
    });

    expect(screen.getByText('Markdoc JSON must be a string, a tag object, or an array of Markdoc nodes.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply Markdoc' })).toBeDisabled();
    expect(onMarkdocChange).not.toHaveBeenCalled();
  });

  it('lets state nodes change their visual state from the inspector', () => {
    const node = {
      id: 'draft',
      type: 'state',
      position: { x: 0, y: 0 },
      data: {
        text: ['Draft'],
        state: 'accent',
      },
    } as DiagramNode;

    const { onStateChange } = renderInspector({ node });

    fireEvent.change(screen.getByLabelText('State'), {
      target: {
        value: 'success',
      },
    });

    expect(onStateChange).toHaveBeenCalledWith('draft', 'success');
  });
});
