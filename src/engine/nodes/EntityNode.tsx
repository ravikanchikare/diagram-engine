import { memo, useEffect, useState } from 'react';
import {
  Handle,
  Position,
  type NodeProps,
  useUpdateNodeInternals,
} from '@xyflow/react';
import { renderMarkdocNodes } from '../markdoc';
import { LAYOUT, type EntityFlowNode } from '../layout';
import { areNodePropsEqual } from './memo';

function EntityNodeComponent({ id, data }: NodeProps<EntityFlowNode>) {
  const [expanded, setExpanded] = useState(true);
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, expanded, updateNodeInternals]);

  const incomingHandleTop =
    LAYOUT.entityHeaderHeight +
    Math.max(data.rows.length - 0.5, 0.5) * LAYOUT.entityRowHeight;

  return (
    <div className={`entity-node ${expanded ? '' : 'entity-node--collapsed'}`}>
      <Handle
        id="left bottom"
        type="target"
        position={Position.Left}
        style={{
          top: incomingHandleTop,
          left: 0,
          transform: 'translate(-50%, -50%)',
        }}
      />

      <div className="entity-node__header">{renderMarkdocNodes(data.header)}</div>

      <div className="entity-node__table">
        {data.rows.map((row, index) => {
          const handleTop =
            LAYOUT.entityHeaderHeight +
            index * LAYOUT.entityRowHeight +
            LAYOUT.entityRowHeight / 2;

          return (
            <div key={`${id}-${row.name}-${index}`} className="entity-node__row">
              <div className="entity-node__cell entity-node__cell--name">{row.name}</div>
              <div className="entity-node__cell entity-node__cell--value">
                {expanded ? renderMarkdocNodes(row.value) : null}
              </div>

              {row.handle ? (
                <Handle
                  id={row.handle}
                  type="source"
                  position={Position.Right}
                  style={{
                    top: handleTop,
                    right: 0,
                    transform: 'translate(50%, -50%)',
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <button
        className="entity-node__toggle nodrag nopan"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        {expanded ? 'hide sample arguments' : 'show sample arguments'}
      </button>
    </div>
  );
}

export const EntityNode = memo(
  EntityNodeComponent,
  (left, right) => areNodePropsEqual(left, right, ['header', 'rows', 'handles']),
);
