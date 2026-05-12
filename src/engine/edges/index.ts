import type { EdgeTypes } from '@xyflow/react';
import { DashedEdge } from './DashedEdge';
import { OrthogonalEdge } from './OrthogonalEdge';
import { RaisedEdge } from './RaisedEdge';
import { RoutableEdge } from './RoutableEdge';

export const edgeTypes = {
  dashed: DashedEdge,
  orthogonal: OrthogonalEdge,
  raised: RaisedEdge,
  smoothstep: OrthogonalEdge,
  routable: RoutableEdge,
} satisfies EdgeTypes;
