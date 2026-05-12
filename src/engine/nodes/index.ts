import type { NodeTypes } from '@xyflow/react';
import { EntityNode } from './EntityNode';
import { OverviewIconNode } from './OverviewIconNode';
import { OverviewTextNode } from './OverviewTextNode';
import { SequenceActionNode } from './SequenceActionNode';
import { SequenceActorNode } from './SequenceActorNode';
import { RoundedNode } from './RoundedNode';
import { BlockLayer } from './BlockLayer';

export const nodeTypes = {
  sequenceActor: SequenceActorNode,
  sequenceAction: SequenceActionNode,
  entity: EntityNode,
  icon: OverviewIconNode,
  text: OverviewTextNode,
  state: RoundedNode,
  block: RoundedNode,
  layer: BlockLayer,
} satisfies NodeTypes;
