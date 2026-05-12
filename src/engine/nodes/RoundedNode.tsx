import { memo } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import { renderMarkdocNodes, normalizeMarkdocNodes } from '../markdoc';
import type { BlockFlowNode, StateFlowNode } from '../layout';
import type { MarkdocContent } from '../schema';
import { LAYOUT } from '../layout';
import { FourSideHandles } from './FourSideHandles';
import { areNodePropsEqual } from './memo';

type RoundedNodeFlowNode = BlockFlowNode | StateFlowNode;

function RoundedNodeComponent({ type, data, selected }: NodeProps<RoundedNodeFlowNode>) {
  const shape = type === 'state' ? 'pill' : 'rounded';
  const variant = data.state ?? (shape === 'pill' ? 'neutral' : 'default');

  if (shape === 'pill') {
    return (
      <div className={`rounded-node rounded-node--pill rounded-node--${variant}`}>
        <NodeResizer
          isVisible={selected}
          minWidth={LAYOUT.stateMinWidth}
          maxWidth={400}
          minHeight={LAYOUT.stateMinHeight}
          maxHeight={200}
          lineStyle={{ border: 'none' }}
          handleStyle={{ width: 8, height: 8 }}
        />
        <FourSideHandles />
        <div className="rounded-node__content">{renderMarkdocNodes(data.text)}</div>
      </div>
    );
  }

  const titleNodes = normalizeMarkdocNodes(data.text);
  const subtitleNodes = 'subtitle' in data && data.subtitle
    ? normalizeMarkdocNodes(data.subtitle as MarkdocContent)
    : [];

  return (
    <div className={`rounded-node rounded-node--rounded rounded-node--${variant}`}>
      <NodeResizer
        isVisible={selected}
        minWidth={LAYOUT.blockMinWidth}
        maxWidth={400}
        lineStyle={{ border: 'none' }}
        handleStyle={{ width: 8, height: 8 }}
      />
      <FourSideHandles />
      <div className="rounded-node__content">
        {titleNodes.length > 0 && (
          <div className="rounded-node__title">{renderMarkdocNodes(titleNodes)}</div>
        )}
        {subtitleNodes.length > 0 && (
          <div className="rounded-node__subtitle">{renderMarkdocNodes(subtitleNodes)}</div>
        )}
      </div>
    </div>
  );
}

export const RoundedNode = memo(
  RoundedNodeComponent,
  (left, right) =>
    areNodePropsEqual(left, right, left.type === 'state'
      ? ['text', 'state']
      : ['text', 'state', 'subtitle']),
);
