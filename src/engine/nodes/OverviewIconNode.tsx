import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { extractMarkdocText, renderMarkdocNodes } from '../markdoc';
import { getOverviewIconMeta } from '../overview-icons';
import type { OverviewIconFlowNode } from '../layout';
import { areNodePropsEqual } from './memo';

function OverviewIconNodeComponent({ data }: NodeProps<OverviewIconFlowNode>) {
  const detail = extractMarkdocText(data.text).trim();
  const { Glyph, iconSet } = getOverviewIconMeta(data.icon);

  const glyphProps =
    iconSet === 'lucide'
      ? { 'aria-hidden': true, className: 'overview-icon-node__svg', size: 28, strokeWidth: 1.6 }
      : { 'aria-hidden': true, className: 'overview-icon-node__svg', width: 28, height: 28 };

  return (
    <div className={`overview-icon-node overview-icon-node--${data.color}`}>
      <div className="overview-icon-node__glyph">
        <Handle id="top" type="source" position={Position.Top} />
        <Handle id="top" type="target" position={Position.Top} />
        <Handle id="right" type="source" position={Position.Right} />
        <Handle id="right" type="target" position={Position.Right} />
        <Handle id="left" type="source" position={Position.Left} />
        <Handle id="left" type="target" position={Position.Left} />
        <Glyph {...glyphProps} />
      </div>
      <Handle id="bottom" type="source" position={Position.Bottom} />
      <Handle id="bottom" type="target" position={Position.Bottom} />
      <div className="overview-icon-node__label">{data.label}</div>
      {detail ? (
        <div className="overview-icon-node__detail">{renderMarkdocNodes(data.text)}</div>
      ) : null}
    </div>
  );
}

export const OverviewIconNode = memo(
  OverviewIconNodeComponent,
  (left, right) => areNodePropsEqual(left, right, ['icon', 'label', 'text', 'color']),
);
