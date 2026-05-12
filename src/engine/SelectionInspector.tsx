import { DeleteInspectorFooter } from './DeleteInspectorFooter';

export function SelectionInspector({
  deleteLabel,
  onDelete,
  selectionCount,
}: {
  deleteLabel: string;
  onDelete: () => void;
  selectionCount: number;
}) {
  return (
    <aside
      aria-label="Selection inspector"
      className="diagram-edge-inspector"
    >
      <div className="diagram-edge-inspector__header">
        <div>
          <p className="diagram-edge-inspector__eyebrow">Selection</p>
          <h3 className="diagram-edge-inspector__title">
            {selectionCount === 1 ? 'One item selected' : `${selectionCount} items selected`}
          </h3>
        </div>
      </div>

      <section className="diagram-edge-inspector__section">
        <h4 className="diagram-edge-inspector__section-title">Actions</h4>
        <p className="diagram-edge-inspector__hint">
          This selection does not have a dedicated editor, but you can still remove it here.
        </p>
      </section>

      <DeleteInspectorFooter label={deleteLabel} onDelete={onDelete} />
    </aside>
  );
}
