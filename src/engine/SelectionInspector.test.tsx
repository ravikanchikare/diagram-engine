import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SelectionInspector } from './SelectionInspector';

function renderInspector({
  selectionCount,
  deleteLabel = 'Delete selected',
  onDelete = vi.fn(),
}: {
  selectionCount: number;
  deleteLabel?: string;
  onDelete?: () => void;
} = { selectionCount: 1 }) {
  render(
    <SelectionInspector
      deleteLabel={deleteLabel}
      onDelete={onDelete}
      selectionCount={selectionCount}
    />,
  );

  return { onDelete };
}

describe('SelectionInspector', () => {
  it('shows singular label for one item', () => {
    renderInspector({ selectionCount: 1 });
    expect(screen.getByText('One item selected')).toBeInTheDocument();
  });

  it('shows plural label for multiple items', () => {
    renderInspector({ selectionCount: 3 });
    expect(screen.getByText('3 items selected')).toBeInTheDocument();
  });

  it('fires onDelete when the delete button is clicked', () => {
    const { onDelete } = renderInspector({ selectionCount: 2 });

    fireEvent.click(screen.getByRole('button', { name: 'Delete selected' }));

    expect(onDelete).toHaveBeenCalled();
  });

  it('renders with a custom delete label', () => {
    renderInspector({ selectionCount: 1, deleteLabel: 'Remove edge' });

    expect(screen.getByRole('button', { name: 'Remove edge' })).toBeInTheDocument();
  });
});
