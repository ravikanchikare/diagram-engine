import type { BlockFlowNode, StateFlowNode } from './layout';
import type { BlockEdgeElement, StateEdgeElement } from './schema';

type PositionedNode = {
  id: string;
  position: {
    x: number;
    y: number;
  };
};

type DiagramEdgeElement = {
  from: string;
  to: string;
};

function cloneNodes<TNode extends PositionedNode>(nodes: TNode[]) {
  return nodes.map((node) => ({
    ...node,
    position: { ...node.position },
  }));
}

function groupRows<TNode extends PositionedNode>(nodes: TNode[]) {
  const rows = new Map<number, TNode[]>();

  for (const node of nodes) {
    const row = rows.get(node.position.y) ?? [];
    row.push(node);
    rows.set(node.position.y, row);
  }

  return [...rows.entries()]
    .sort(([left], [right]) => left - right)
    .map(([y, rowNodes]) => ({
      y,
      nodes: rowNodes.sort((left, right) => left.position.x - right.position.x),
    }));
}

function getValidEdges<TNode extends PositionedNode>(
  nodesById: ReadonlyMap<string, TNode>,
  edges: DiagramEdgeElement[],
) {
  return edges.filter((edge) => {
    if (edge.from === edge.to) {
      return false;
    }

    const source = nodesById.get(edge.from);
    const target = nodesById.get(edge.to);

    return Boolean(source && target && source.position.y !== target.position.y);
  });
}

function orientation(
  a: PositionedNode['position'],
  b: PositionedNode['position'],
  c: PositionedNode['position'],
) {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
}

function segmentsCross(
  a: PositionedNode['position'],
  b: PositionedNode['position'],
  c: PositionedNode['position'],
  d: PositionedNode['position'],
) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);

  return o1 * o2 < 0 && o3 * o4 < 0;
}

export function countCrossings<TNode extends PositionedNode>(
  nodes: TNode[],
  edges: DiagramEdgeElement[],
) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const validEdges = getValidEdges(nodesById, edges);
  let crossings = 0;

  for (let leftIndex = 0; leftIndex < validEdges.length; leftIndex += 1) {
    const left = validEdges[leftIndex]!;
    const leftSource = nodesById.get(left.from);
    const leftTarget = nodesById.get(left.to);

    if (!leftSource || !leftTarget) {
      continue;
    }

    for (let rightIndex = leftIndex + 1; rightIndex < validEdges.length; rightIndex += 1) {
      const right = validEdges[rightIndex]!;

      if (
        left.from === right.from ||
        left.from === right.to ||
        left.to === right.from ||
        left.to === right.to
      ) {
        continue;
      }

      const rightSource = nodesById.get(right.from);
      const rightTarget = nodesById.get(right.to);

      if (
        rightSource &&
        rightTarget &&
        segmentsCross(
          leftSource.position,
          leftTarget.position,
          rightSource.position,
          rightTarget.position,
        )
      ) {
        crossings += 1;
      }
    }
  }

  return crossings;
}

function getNeighborXs<TNode extends PositionedNode>(
  node: TNode,
  nodesById: ReadonlyMap<string, TNode>,
  edges: DiagramEdgeElement[],
  neighborRowY: number,
) {
  const xs: number[] = [];

  for (const edge of edges) {
    const neighborId =
      edge.from === node.id ? edge.to : edge.to === node.id ? edge.from : undefined;

    if (!neighborId) {
      continue;
    }

    const neighbor = nodesById.get(neighborId);

    if (neighbor?.position.y === neighborRowY) {
      xs.push(neighbor.position.x);
    }
  }

  return xs;
}

function barycenter(values: number[]) {
  if (values.length === 0) {
    return undefined;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function runBarycenterPass<TNode extends PositionedNode>(
  nodes: TNode[],
  edges: DiagramEdgeElement[],
  direction: 'top-down' | 'bottom-up',
) {
  const nextNodes = cloneNodes(nodes);
  const nodesById = new Map(nextNodes.map((node) => [node.id, node]));
  const rows = groupRows(nextNodes);
  const orderedRows = direction === 'top-down' ? rows : [...rows].reverse();

  for (let index = 1; index < orderedRows.length; index += 1) {
    const row = orderedRows[index]!;
    const neighborRow = orderedRows[index - 1]!;
    const slots = row.nodes.map((node) => node.position.x).sort((left, right) => left - right);
    const originalIndex = new Map(row.nodes.map((node, nodeIndex) => [node.id, nodeIndex]));
    const sortedNodes = [...row.nodes].sort((left, right) => {
      const leftBarycenter = barycenter(
        getNeighborXs(left, nodesById, edges, neighborRow.y),
      );
      const rightBarycenter = barycenter(
        getNeighborXs(right, nodesById, edges, neighborRow.y),
      );

      if (leftBarycenter === undefined && rightBarycenter === undefined) {
        return (originalIndex.get(left.id) ?? 0) - (originalIndex.get(right.id) ?? 0);
      }

      if (leftBarycenter === undefined) {
        return 1;
      }

      if (rightBarycenter === undefined) {
        return -1;
      }

      if (leftBarycenter === rightBarycenter) {
        return (originalIndex.get(left.id) ?? 0) - (originalIndex.get(right.id) ?? 0);
      }

      return leftBarycenter - rightBarycenter;
    });

    sortedNodes.forEach((node, slotIndex) => {
      const nextNode = nodesById.get(node.id);
      const x = slots[slotIndex];

      if (nextNode && x !== undefined) {
        nextNode.position.x = x;
      }
    });
  }

  return nextNodes;
}

export function minimizeCrossings<TNode extends PositionedNode>(
  nodes: TNode[],
  edges: DiagramEdgeElement[],
) {
  const originalCrossings = countCrossings(nodes, edges);
  const topDown = runBarycenterPass(nodes, edges, 'top-down');
  const topDownCrossings = countCrossings(topDown, edges);
  const bottomUp = runBarycenterPass(topDown, edges, 'bottom-up');
  const bottomUpCrossings = countCrossings(bottomUp, edges);

  if (topDownCrossings < originalCrossings && topDownCrossings <= bottomUpCrossings) {
    return topDown;
  }

  if (bottomUpCrossings < originalCrossings && bottomUpCrossings < topDownCrossings) {
    return bottomUp;
  }

  return nodes;
}

export function minimizeStateCrossings(
  nodes: StateFlowNode[],
  edges: StateEdgeElement[],
) {
  return minimizeCrossings(nodes, edges);
}

export function minimizeBlockCrossings(
  nodes: BlockFlowNode[],
  edges: BlockEdgeElement[],
) {
  const nodeIds = new Set(nodes.map((node) => node.id));
  return minimizeCrossings(
    nodes,
    edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to)),
  );
}
