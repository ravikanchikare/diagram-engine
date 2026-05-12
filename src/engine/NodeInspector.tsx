import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DeleteInspectorFooter } from './DeleteInspectorFooter';
import { SelectField } from './SelectField';
import type { DiagramNode } from './layout';
import type { MarkdocContent } from './schema';
import {
  extractMarkdocText,
  formatMarkdocForInspector,
  parseMarkdocInspectorInput,
  renderMarkdocNodes,
} from './markdoc';

const STATE_OPTIONS = [
  { label: 'Default', value: 'default' },
  { label: 'Accent', value: 'accent' },
  { label: 'Success', value: 'success' },
  { label: 'Warning', value: 'warning' },
  { label: 'Danger', value: 'danger' },
] as const;

interface NodeMarkdocField {
  key: string;
  label: string;
  path: string;
  value: MarkdocContent;
}

function getNodeMarkdocFields(node: DiagramNode): NodeMarkdocField[] {
  switch (node.type) {
    case 'entity':
      return [
        {
          key: 'header',
          label: 'Header',
          path: 'data.header',
          value: node.data.header,
        },
        ...node.data.rows.map((row, index) => ({
          key: `row-${index}`,
          label: `Row: ${row.name}`,
          path: `data.rows[${index}].value`,
          value: row.value,
        })),
      ];
    case 'icon':
    case 'text':
    case 'state':
    case 'block':
      return [
        {
          key: 'text',
          label: 'Text',
          path: 'data.text',
          value: node.data.text,
        },
        ...(node.type === 'block' && node.data.subtitle
          ? [
              {
                key: 'subtitle',
                label: 'Subtitle',
                path: 'data.subtitle',
                value: node.data.subtitle,
              },
            ]
          : []),
      ];
    case 'layer':
      return [
        {
          key: 'title',
          label: 'Title',
          path: 'data.title',
          value: node.data.title,
        },
      ];
    default:
      return [];
  }
}

function getNodeInspectorTitle(node: DiagramNode) {
  switch (node.type) {
    case 'entity':
      return extractMarkdocText(node.data.header).trim() || node.id;
    case 'icon':
      return node.data.label?.trim() || extractMarkdocText(node.data.text).trim() || node.id;
    case 'text':
    case 'state':
    case 'block':
      return extractMarkdocText(node.data.text).trim() || node.id;
    case 'layer':
      return extractMarkdocText(node.data.title).trim() || node.id;
    default:
      return node.id;
  }
}

export function NodeInspector({
  node,
  onMarkdocChange,
  onDelete,
  onStateChange,
}: {
  node: DiagramNode;
  onMarkdocChange: (nodeId: string, fieldKey: string, content: MarkdocContent) => void;
  onDelete: () => void;
  onStateChange: (nodeId: string, state: string | undefined) => void;
}) {
  const fields = useMemo(() => getNodeMarkdocFields(node), [node]);
  const [selectedFieldKey, setSelectedFieldKey] = useState(fields[0]?.key ?? '');
  const selectedField = fields.find((field) => field.key === selectedFieldKey) ?? fields[0];
  const formattedValue = useMemo(
    () => (selectedField ? formatMarkdocForInspector(selectedField.value) : ''),
    [selectedField],
  );
  const [draft, setDraft] = useState(formattedValue);
  const parsedDraft = useMemo(() => parseMarkdocInspectorInput(draft), [draft]);

  useEffect(() => {
    if (!selectedField) {
      setSelectedFieldKey('');
      setDraft('');
      return;
    }

    if (!fields.some((field) => field.key === selectedFieldKey)) {
      setSelectedFieldKey(selectedField.key);
    }
  }, [fields, selectedField, selectedFieldKey]);

  useEffect(() => {
    setDraft(formattedValue);
  }, [formattedValue, selectedFieldKey, node.id]);

  if (!selectedField) {
    return null;
  }

  const applyDraft = () => {
    if (parsedDraft.error) {
      return;
    }

    onMarkdocChange(node.id, selectedField.key, parsedDraft.content ?? selectedField.value);
  };

  const previewContent: MarkdocContent = parsedDraft.error
    ? selectedField.value
    : parsedDraft.content ?? selectedField.value;

  return (
    <aside
      aria-label="Node inspector"
      className="diagram-edge-inspector diagram-node-inspector"
    >
      <div className="diagram-edge-inspector__header">
        <div>
          <p className="diagram-edge-inspector__eyebrow">Node</p>
          <h3 className="diagram-edge-inspector__title">{getNodeInspectorTitle(node)}</h3>
        </div>
      </div>

      {node.type === 'state' || node.type === 'block' || node.type === 'layer' ? (
        <section className="diagram-edge-inspector__section">
          <h4 className="diagram-edge-inspector__section-title">Appearance</h4>
          <div className="diagram-edge-inspector__grid">
            <SelectField
              label="State"
              onChange={(value) => {
                onStateChange(node.id, value === 'default' ? undefined : value);
              }}
              options={STATE_OPTIONS}
              value={node.data.state ?? 'default'}
            />
          </div>
        </section>
      ) : null}

      <section className="diagram-edge-inspector__section">
        <h4 className="diagram-edge-inspector__section-title">Content</h4>
        <div className="diagram-edge-inspector__grid">
          {fields.length > 1 ? (
            <SelectField
              label="Markdoc field"
              onChange={setSelectedFieldKey}
              options={fields.map((field) => ({ value: field.key, label: field.label }))}
              value={selectedField.key}
            />
          ) : null}

          <div className="diagram-edge-inspector__field diagram-edge-inspector__field--wide">
            <span className="diagram-edge-inspector__label">
              Markdoc
              <span className="diagram-edge-inspector__meta">{selectedField.path}</span>
            </span>
            <textarea
              aria-label="Markdoc"
              className="diagram-edge-inspector__textarea"
              onChange={(event) => {
                setDraft(event.target.value);
              }}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault();
                  applyDraft();
                }
              }}
              spellCheck={false}
              value={draft}
            />
            <p className="diagram-edge-inspector__hint">
              Enter plain text for simple paragraphs, or paste Markdoc JSON for structured content.
            </p>
            {parsedDraft.error ? (
              <p className="diagram-edge-inspector__error">{parsedDraft.error}</p>
            ) : null}
          </div>
        </div>

        <div className="diagram-edge-inspector__actions">
          <Button
            disabled={Boolean(parsedDraft.error)}
            onClick={applyDraft}
            size="sm"
            type="button"
          >
            Apply Markdoc
          </Button>
          <Button
            onClick={() => {
              setDraft(formattedValue);
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            Revert draft
          </Button>
        </div>
      </section>

      <section className="diagram-edge-inspector__section">
        <h4 className="diagram-edge-inspector__section-title">Preview</h4>
        <div className="diagram-edge-inspector__preview-surface">
          {renderMarkdocNodes(previewContent)}
        </div>
      </section>

      <DeleteInspectorFooter label="Delete node" onDelete={onDelete} />
    </aside>
  );
}
