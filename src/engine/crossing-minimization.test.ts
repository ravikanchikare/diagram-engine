import { describe, expect, it } from 'vitest';
import {
  countCrossings,
  minimizeBlockCrossings,
  minimizeStateCrossings,
} from './crossing-minimization';
import { buildDiagramFlow, type BlockFlowNode, type StateFlowNode } from './layout';
import type { BlockDiagramDefinition, StateDiagramDefinition } from './schema';

function stateNode(id: string, x: number, y: number): StateFlowNode {
  return {
    id,
    type: 'state',
    position: { x, y },
    data: { text: [id] },
  } as StateFlowNode;
}

function blockNode(id: string, x: number, y: number): BlockFlowNode {
  return {
    id,
    type: 'block',
    position: { x, y },
    data: { text: [id] },
  } as BlockFlowNode;
}

describe('crossing minimization', () => {
  it('reduces a crossed state layout to zero crossings', () => {
    const nodes = [
      stateNode('top-left', 0, 0),
      stateNode('top-right', 100, 0),
      stateNode('bottom-left', 0, 100),
      stateNode('bottom-right', 100, 100),
    ];
    const edges = [
      { from: 'top-left', to: 'bottom-right' },
      { from: 'top-right', to: 'bottom-left' },
    ];

    expect(countCrossings(nodes, edges)).toBe(1);

    const minimized = minimizeStateCrossings(nodes, edges);

    expect(countCrossings(minimized, edges)).toBe(0);
  });

  it('keeps an already optimal state layout order unchanged', () => {
    const nodes = [
      stateNode('top-left', 0, 0),
      stateNode('top-right', 100, 0),
      stateNode('bottom-left', 0, 100),
      stateNode('bottom-right', 100, 100),
    ];
    const edges = [
      { from: 'top-left', to: 'bottom-left' },
      { from: 'top-right', to: 'bottom-right' },
    ];

    const minimized = minimizeStateCrossings(nodes, edges);

    expect(minimized.map((node) => [node.id, node.position.x])).toEqual(
      nodes.map((node) => [node.id, node.position.x]),
    );
  });

  it('reduces a crossed block layout to zero crossings', () => {
    const nodes = [
      blockNode('top-left', 0, 0),
      blockNode('top-right', 100, 0),
      blockNode('bottom-left', 0, 100),
      blockNode('bottom-right', 100, 100),
    ];
    const edges = [
      { from: 'top-left', to: 'bottom-right' },
      { from: 'top-right', to: 'bottom-left' },
    ];

    expect(countCrossings(nodes, edges)).toBe(1);

    const minimized = minimizeBlockCrossings(nodes, edges);

    expect(countCrossings(minimized, edges)).toBe(0);
  });

  it('does not reorder manual state diagrams through buildDiagramFlow', () => {
    const definition: StateDiagramDefinition = {
      type: 'state',
      description: 'Manual crossed state',
      size: 'medium',
      positioning: 'manual',
      elements: [
        { id: 'a', type: 'state', x: 0, y: 0, data: { text: ['A'] } },
        { id: 'b', type: 'state', x: 100, y: 0, data: { text: ['B'] } },
        { id: 'c', type: 'state', x: 0, y: 100, data: { text: ['C'] } },
        { id: 'd', type: 'state', x: 100, y: 100, data: { text: ['D'] } },
        { from: 'a', to: 'd' },
        { from: 'b', to: 'c' },
      ],
    };

    const flow = buildDiagramFlow(definition);

    expect(flow.nodes.find((node) => node.id === 'c')?.position.x).toBe(0);
    expect(flow.nodes.find((node) => node.id === 'd')?.position.x).toBe(100);
  });

  it('does not reorder manual block diagrams through buildDiagramFlow', () => {
    const definition: BlockDiagramDefinition = {
      type: 'block',
      description: 'Manual crossed block',
      size: 'medium',
      positioning: 'manual',
      elements: [
        { id: 'a', type: 'block', x: 0, y: 0, data: { text: ['A'] } },
        { id: 'b', type: 'block', x: 100, y: 0, data: { text: ['B'] } },
        { id: 'c', type: 'block', x: 0, y: 100, data: { text: ['C'] } },
        { id: 'd', type: 'block', x: 100, y: 100, data: { text: ['D'] } },
        { from: 'a', to: 'd' },
        { from: 'b', to: 'c' },
      ],
    };

    const flow = buildDiagramFlow(definition);

    expect(flow.nodes.find((node) => node.id === 'c')?.position.x).toBe(0);
    expect(flow.nodes.find((node) => node.id === 'd')?.position.x).toBe(100);
  });
});
