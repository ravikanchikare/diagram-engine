import { memo } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import { renderMarkdocNodes } from '../markdoc';
import type { BlockLayerFlowNode } from '../layout';
import { LAYOUT } from '../layout';
import { FourSideHandles } from './FourSideHandles';
import { areNodePropsEqual } from './memo';

function BlockLayerComponent({ data, selected, width }: NodeProps<BlockLayerFlowNode>) {
  const variant = data.state ?? 'default';
  const maxWidth = Math.max(LAYOUT.blockLayerMaxWidth, width ?? 0);

  return (
    <div className={`block-layer block-layer--${variant}`}>
      <NodeResizer
        isVisible={selected}
        minWidth={LAYOUT.blockLayerMinWidth}
        maxWidth={maxWidth}
        minHeight={LAYOUT.blockLayerMinHeight}
        maxHeight={LAYOUT.blockLayerMaxHeight}
        lineStyle={{ border: 'none' }}
        handleStyle={{ width: 8, height: 8 }}
      />
      <FourSideHandles />
      <div className="block-layer__title">{renderMarkdocNodes(data.title)}</div>
    </div>
  );
}

export const BlockLayer = memo(
  BlockLayerComponent,
  (left, right) => areNodePropsEqual(left, right, ['title', 'state']),
);
