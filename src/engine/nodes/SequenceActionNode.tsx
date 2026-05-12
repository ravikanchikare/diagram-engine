import { memo, useLayoutEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { LAYOUT } from '../layout';
import { renderMarkdocNodes } from '../markdoc';
import type { SequenceActionFlowNode } from '../layout';
import { areNodePropsEqual } from './memo';

function SequenceActionNodeComponent({ data }: NodeProps<SequenceActionFlowNode>) {
  const loopback = data.from === data.to;
  const contentRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const style = window.getComputedStyle(el);
    const lineHeight = Number.parseFloat(style.lineHeight);
    const fontSize = Number.parseFloat(style.fontSize);
    const resolvedFontSize = Number.isNaN(fontSize) ? 13 : fontSize;
    const resolvedLineHeight = Number.isNaN(lineHeight)
      ? resolvedFontSize * 1.3
      : lineHeight;
    const maxContentHeight = resolvedLineHeight * LAYOUT.actionMaxLines;
    setOverflows(el.scrollHeight > maxContentHeight + 2);
  }, [data.text]);

  return (
    <div
      className={`action-node ${loopback ? 'action-node--loopback' : ''}`}
      data-overflow={overflows ? 'true' : undefined}
    >
      <Handle id="top" type="target" position={Position.Top} />
      <Handle id="left" type="source" position={Position.Left} />
      <Handle id="left" type="target" position={Position.Left} />
      <Handle id="bottom" type="source" position={Position.Bottom} />
      <Handle id="right" type="source" position={Position.Right} />
      <Handle id="right" type="target" position={Position.Right} />
      <div className="action-node__content" ref={contentRef}>
        {renderMarkdocNodes(data.text)}
      </div>
    </div>
  );
}

export const SequenceActionNode = memo(
  SequenceActionNodeComponent,
  (left, right) => areNodePropsEqual(left, right, ['text', 'from', 'to', 'isTruncated']),
);
