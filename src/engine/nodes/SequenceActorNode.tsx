import { Fragment, memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { renderMarkdocNodes } from '../markdoc';
import {
  LAYOUT,
  type SequenceActorFlowNode,
  type SequenceActorNodeData,
} from '../layout';
import { areNodePropsEqual } from './memo';

function colorClass(color: SequenceActorNodeData['color']) {
  switch (color) {
    case 'success':
      return 'actor-node--success';
    case 'accent':
      return 'actor-node--accent';
    case 'warning':
      return 'actor-node--warning';
    default:
      return 'actor-node--default';
  }
}

function SequenceActorNodeComponent({
  id,
  data,
}: NodeProps<SequenceActorFlowNode>) {
  const rows = Array.from({ length: data.rows }, (_, index) => index + 1);
  const laneOffset = LAYOUT.actorLabelHeight + LAYOUT.actorLaneGap;
  const connectorTop = LAYOUT.actorAccentTop + LAYOUT.actorAccentHeight - 1;
  const connectorHeight =
    LAYOUT.actorLabelHeight + LAYOUT.actorLaneGap - connectorTop;

  return (
    <div className={`actor-node ${colorClass(data.color)}`}>
      <div
        className="actor-node__label"
        style={{
          height: LAYOUT.actorLabelHeight,
          paddingLeft: data.lineX + 10,
        }}
      >
        <span
          className="actor-node__accent"
          style={{
            left: data.lineX - 2,
            top: LAYOUT.actorAccentTop,
            height: LAYOUT.actorAccentHeight,
          }}
        />
        <div className="actor-node__heading">{renderMarkdocNodes(data.heading)}</div>
      </div>

      <span
        className="actor-node__connector"
        style={{
          left: data.lineX,
          top: connectorTop,
          height: connectorHeight,
        }}
      />

      <div
        className="actor-node__lane"
        style={{
          height: `calc(100% - ${LAYOUT.actorLabelHeight}px)`,
          marginTop: LAYOUT.actorLaneGap,
        }}
      >
        <div
          className="actor-node__lifeline"
          style={{ left: data.lineX }}
        />

        {data.activeRows.map((row) => {
          const center =
            LAYOUT.headerHeight + row * LAYOUT.rowHeight - LAYOUT.rowHeight / 2 - laneOffset;

          return (
            <span
              key={`${id}-segment-${row}`}
              className="actor-node__segment"
              style={{
                top: center - LAYOUT.actorSegmentHeight / 2,
                left: data.lineX,
                height: LAYOUT.actorSegmentHeight,
              }}
            />
          );
        })}

        {rows.map((row) => (
          <div
            key={`${id}-row-${row}`}
            className="actor-node__section"
            style={{ height: LAYOUT.rowHeight }}
          />
        ))}
      </div>

      {rows.map((row) => {
        const top = LAYOUT.headerHeight + row * LAYOUT.rowHeight - LAYOUT.rowHeight / 2;
        const leftId = `${id}-${row}-left`;
        const rightId = `${id}-${row}-right`;

        return (
          <Fragment key={`${id}-handles-${row}`}>
            <Handle
              id={leftId}
              type="source"
              position={Position.Left}
              style={{
                top,
                left: data.lineX,
                right: 'auto',
                transform: 'translate(-50%, -50%)',
              }}
            />
            <Handle
              id={leftId}
              type="target"
              position={Position.Left}
              style={{
                top,
                left: data.lineX,
                right: 'auto',
                transform: 'translate(-50%, -50%)',
              }}
            />
            <Handle
              id={rightId}
              type="source"
              position={Position.Right}
              style={{
                top,
                left: data.lineX,
                right: 'auto',
                transform: 'translate(-50%, -50%)',
              }}
            />
            <Handle
              id={rightId}
              type="target"
              position={Position.Right}
              style={{
                top,
                left: data.lineX,
                right: 'auto',
                transform: 'translate(-50%, -50%)',
              }}
            />
          </Fragment>
        );
      })}
    </div>
  );
}

export const SequenceActorNode = memo(
  SequenceActorNodeComponent,
  (left, right) =>
    areNodePropsEqual(left, right, ['heading', 'rows', 'color', 'activeRows', 'lineX']),
);
