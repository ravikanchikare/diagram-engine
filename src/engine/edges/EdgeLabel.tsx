import { EdgeLabelRenderer } from '@xyflow/react';
import type { CSSProperties } from 'react';
import { DEFAULT_CONNECTOR_LABEL_BACKGROUND } from '../diagram-tokens';

export function EdgeLabel({
  label,
  labelBgStyle,
  labelStyle,
  position,
  onClick,
  pointerEvents = 'all',
  cursor,
  title,
}: {
  label: string;
  labelBgStyle?: { fill?: string; filter?: string };
  labelStyle?: CSSProperties;
  position: { x: number; y: number };
  onClick?: (event: React.MouseEvent) => void;
  pointerEvents?: CSSProperties['pointerEvents'];
  cursor?: CSSProperties['cursor'];
  title?: string;
}) {
  const backgroundColor =
    typeof labelBgStyle?.fill === 'string'
      ? labelBgStyle.fill
      : DEFAULT_CONNECTOR_LABEL_BACKGROUND;
  const shadow =
    typeof labelBgStyle?.filter === 'string' ? labelBgStyle.filter : undefined;

  return (
    <EdgeLabelRenderer>
      <div
        className="react-flow__edge-label nodrag nopan diagram-edge-label"
        onClick={onClick}
        style={{
          position: 'absolute',
          transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
          pointerEvents,
          backgroundColor,
          filter: shadow,
          cursor,
          ...(labelStyle ?? {}),
        }}
        title={title}
      >
        {label}
      </div>
    </EdgeLabelRenderer>
  );
}
