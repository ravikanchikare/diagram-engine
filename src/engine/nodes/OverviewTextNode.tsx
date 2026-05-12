import { memo } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import { renderMarkdocNodes } from '../markdoc';
import type { OverviewTextFlowNode } from '../layout';
import { LAYOUT } from '../layout';
import { FourSideHandles } from './FourSideHandles';
import { areNodePropsEqual } from './memo';

function OverviewTextNodeComponent({ data, selected }: NodeProps<OverviewTextFlowNode>) {
  return (
    <div className={`overview-text-node overview-text-node--${data.size} overview-text-node--${data.color}`}>
      <NodeResizer isVisible={selected} minWidth={LAYOUT.overviewTextMinWidth} maxWidth={LAYOUT.overviewTextMaxWidth} lineStyle={{ border: 'none' }} handleStyle={{ width: 8, height: 8 }} />
      <FourSideHandles />
      <div className="overview-text-node__content">{renderMarkdocNodes(data.text)}</div>
    </div>
  );
}

export const OverviewTextNode = memo(
  OverviewTextNodeComponent,
  (left, right) => areNodePropsEqual(left, right, ['text', 'color']),
);
