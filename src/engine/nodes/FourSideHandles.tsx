import { Fragment } from 'react';
import { Handle, Position } from '@xyflow/react';

const HANDLE_POSITIONS = [
  { id: 'top', position: Position.Top },
  { id: 'right', position: Position.Right },
  { id: 'bottom', position: Position.Bottom },
  { id: 'left', position: Position.Left },
] as const;

export function FourSideHandles() {
  return HANDLE_POSITIONS.map(({ id, position }) => (
    <Fragment key={id}>
      <Handle id={id} type="source" position={position} />
      <Handle id={id} type="target" position={position} />
    </Fragment>
  ));
}
