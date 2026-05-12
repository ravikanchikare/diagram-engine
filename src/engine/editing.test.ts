import { describe, expect, it } from 'vitest';
import taxTransactionEntityDefinition from '../data/library/entity/tax-transaction.json';
import { buildDiagramFlow } from './layout';
import { applyFlowEditsToDefinition, supportsManualCorrections } from './editing';
import type {
  BlockFlowNode,
  BlockLayerFlowNode,
  DiagramEdge,
  EntityFlowNode,
  OverviewIconFlowNode,
  OverviewTextFlowNode,
  StateFlowNode,
} from './layout';
import type {
  BlockDiagramDefinition,
  EntityDiagramDefinition,
  OverviewDiagramDefinition,
  StateDiagramDefinition,
  StateEdgeElement,
} from './schema';

const taxTransaction = taxTransactionEntityDefinition as EntityDiagramDefinition;

describe('supportsManualCorrections', () => {
  it('enables direct manipulation for non-sequence diagram types', () => {
    expect(supportsManualCorrections(taxTransaction)).toBe(true);
  });
});

describe('applyFlowEditsToDefinition', () => {
  it('writes entity node positions and handle reconnects back into JSON', () => {
    const flow = buildDiagramFlow(taxTransaction);
    const nodes = flow.nodes.map((node) => {
      return node.id === 'invoice'
        ? {
            ...node,
            position: { x: 820, y: -64 },
          }
        : node;
    });
    const edges = flow.edges.map((edge) => {
      return edge.id === 'edge-source_id-invoice-right-left bottom'
        ? {
            ...edge,
            sourceHandle: 'tax_transaction_idLi',
          }
        : edge;
    });

    const nextDefinition = applyFlowEditsToDefinition(
      taxTransaction,
      nodes,
      edges,
    );
    const invoice = nextDefinition.elements.find((element) => {
      return 'id' in element && element.id === 'invoice';
    });
    const relationship = nextDefinition.elements.find((element) => {
      return 'id' in element && element.id === 'edge-source_id-invoice-right-left bottom';
    });

    if (!invoice || !relationship || !('position' in invoice) || !('sourceHandle' in relationship)) {
      throw new Error('Expected updated entity elements.');
    }

    expect(invoice.position).toEqual({ x: 816, y: -64 });
    expect(relationship.sourceHandle).toBe('tax_transaction_idLi');
  });











  it('preserves connector appearance fields when serializing edited state edges', () => {
    const definition: StateDiagramDefinition = {
      type: 'state',
      description: 'Preserve connector styling',
      size: 'medium',
      positioning: 'manual',
      elements: [
        {
          id: 'start',
          type: 'state',
          x: 0,
          y: 0,
          data: {
            text: ['Start'],
            state: 'accent',
          },
        },
        {
          id: 'finish',
          type: 'state',
          x: 240,
          y: 0,
          data: {
            text: ['Finish'],
          },
        },
        {
          id: 'edge-start-finish',
          from: 'start',
          to: 'finish',
          fromPosition: 'right',
          toPosition: 'left',
          type: 'straight',
          label: 'ship',
          state: 'danger',
          color: '#654321',
          lineStyle: 'dashed',
          inheritColorFrom: 'none',
        },
      ],
    };
    const flow = buildDiagramFlow(definition);
    const edges = flow.edges.map((edge) => {
      return edge.id === 'edge-start-finish'
        ? {
            ...edge,
            sourceHandle: 'bottom',
            targetHandle: 'top',
          }
        : edge;
    });

    const nextDefinition = applyFlowEditsToDefinition(
      definition,
      flow.nodes,
      edges,
    );
    const connector = nextDefinition.elements.find(
      (element): element is StateEdgeElement => {
        return ('type' in element ? element.type !== 'state' : true)
          && element.id === 'edge-start-finish';
      },
    );

    if (!connector) {
      throw new Error('Expected updated connector.');
    }

    expect(connector.state).toBe('danger');
    expect(connector.color).toBe('#654321');
    expect(connector.lineStyle).toBe('dashed');
    expect(connector.inheritColorFrom).toBe('none');
    expect(connector.fromPosition).toBe('bottom');
    expect(connector.toPosition).toBe('top');
  });

  it('writes edited state edge labels back into JSON', () => {
    const definition: StateDiagramDefinition = {
      type: 'state',
      description: 'State edge label persistence',
      size: 'medium',
      positioning: 'manual',
      elements: [
        {
          id: 'start',
          type: 'state',
          x: 0,
          y: 0,
          data: {
            text: ['Start'],
          },
        },
        {
          id: 'finish',
          type: 'state',
          x: 240,
          y: 0,
          data: {
            text: ['Finish'],
          },
        },
        {
          id: 'edge-start-finish',
          from: 'start',
          to: 'finish',
          fromPosition: 'right',
          toPosition: 'left',
          type: 'straight',
          label: 'old label',
        },
      ],
    };
    const flow = buildDiagramFlow(definition);
    const edges = flow.edges.map((edge) => {
      return edge.id === 'edge-start-finish'
        ? {
            ...edge,
            label: 'ship',
          }
        : edge;
    });

    const nextDefinition = applyFlowEditsToDefinition(
      definition,
      flow.nodes,
      edges,
    );
    const connector = nextDefinition.elements.find(
      (element): element is StateEdgeElement => {
        return ('type' in element ? element.type !== 'state' : true)
          && element.id === 'edge-start-finish';
      },
    );

    if (!connector) {
      throw new Error('Expected updated connector.');
    }

    expect(connector.label).toBe('ship');
  });


  it('writes edited overview edge inspector fields back into JSON', () => {
    const definition: OverviewDiagramDefinition = {
      type: 'overview',
      description: 'Overview edge edits',
      size: 'medium',
      positioning: 'manual',
      elements: [
        {
          id: 'source',
          type: 'text',
          position: { x: 0, y: 0 },
          data: {
            text: ['Source'],
            size: 'auto',
            color: 'default',
          },
        },
        {
          id: 'target',
          type: 'text',
          position: { x: 240, y: 120 },
          data: {
            text: ['Target'],
            size: 'auto',
            color: 'default',
          },
        },
        {
          id: 'edge-source-target',
          type: 'step',
          source: 'source',
          target: 'target',
          sourceHandle: 'right',
          targetHandle: 'left',
          label: 'old',
        },
      ],
    };
    const flow = buildDiagramFlow(definition);
    const edges = flow.edges.map((edge) => {
      return edge.id === 'edge-source-target'
        ? {
            ...edge,
            label: 'updated',
            data: {
              ...(((edge as DiagramEdge).data as object | undefined) ?? {}),
              lineStyle: 'dashed',
              routing: { bendX: 192 },
              variant: 'bend',
            },
          }
        : edge;
    });

    const nextDefinition = applyFlowEditsToDefinition(
      definition,
      flow.nodes,
      edges,
    ) as OverviewDiagramDefinition;
    const connector = nextDefinition.elements.find(
      (
        element,
      ): element is Extract<typeof nextDefinition.elements[number], { source: string }> => {
        return !('position' in element) && element.id === 'edge-source-target';
      },
    );

    if (!connector) {
      throw new Error('Expected updated overview connector.');
    }

    expect(connector.type).toBe('bend');
    expect(connector.label).toBe('updated');
    expect(connector.lineStyle).toBe('dashed');
    expect(connector.routing).toEqual({ bendX: 192 });
  });

  it('writes edited entity header and row markdoc back into JSON', () => {
    const flow = buildDiagramFlow(taxTransaction);
    const nodes = flow.nodes.map((node) => {
      if (node.id !== 'invoice' || node.type !== 'entity') {
        return node;
      }

      const entityNode = node as EntityFlowNode;

      return {
        ...entityNode,
        data: {
          ...entityNode.data,
          header: [
            {
              $$mdtype: 'Tag' as const,
              name: 'Paragraph',
              attributes: {},
              children: ['Invoice v2'],
            },
          ],
          rows: entityNode.data.rows.map((row, index) =>
            index === 0
              ? {
                  ...row,
                  value: [
                    {
                      $$mdtype: 'Tag' as const,
                      name: 'Paragraph',
                      attributes: {},
                      children: ['Updated sample value'],
                    },
                  ],
                }
              : row),
        },
      } satisfies EntityFlowNode;
    });

    const nextDefinition = applyFlowEditsToDefinition(
      taxTransaction,
      nodes,
      flow.edges,
    );
    const invoice = nextDefinition.elements.find(
      (
        element,
      ): element is Extract<typeof nextDefinition.elements[number], { type: 'entity' }> => {
        return 'type' in element && element.type === 'entity' && element.id === 'invoice';
      },
    );

    if (!invoice) {
      throw new Error('Expected updated entity node.');
    }

    expect(invoice.data.header).toEqual([
      {
        $$mdtype: 'Tag',
        name: 'Paragraph',
        attributes: {},
        children: ['Invoice v2'],
      },
    ]);
    expect(invoice.data.rows[0]?.value).toEqual([
      {
        $$mdtype: 'Tag',
        name: 'Paragraph',
        attributes: {},
        children: ['Updated sample value'],
      },
    ]);
  });

  it('persists manual routing and assigns an explicit id for edited state edges', () => {
    const definition: StateDiagramDefinition = {
      type: 'state',
      description: 'Manual routing',
      size: 'medium',
      positioning: 'manual',
      elements: [
        {
          id: 'draft',
          type: 'state',
          x: 0,
          y: 0,
          data: {
            text: ['Draft'],
          },
        },
        {
          id: 'review',
          type: 'state',
          x: 320,
          y: 160,
          data: {
            text: ['Review'],
          },
        },
        {
          from: 'draft',
          to: 'review',
          fromPosition: 'right',
          toPosition: 'left',
          type: 'bend',
        },
      ],
    };
    const flow = buildDiagramFlow(definition);
    const edges = flow.edges.map<DiagramEdge>((edge) => {
      return edge.id.startsWith('edge-draft-review')
        ? {
            ...edge,
            data: {
              ...((((edge as DiagramEdge).data as object | undefined) ?? {})),
              routing: {
                sourceOffset: 16,
                bendX: 240,
              },
            },
          }
        : edge;
    });

    const nextDefinition = applyFlowEditsToDefinition(
      definition,
      flow.nodes,
      edges,
    );
    const connector = nextDefinition.elements.find(
      (element): element is StateEdgeElement => {
        return ('type' in element ? element.type !== 'state' : true);
      },
    );

    if (!connector) {
      throw new Error('Expected updated connector.');
    }

    expect(connector.id).toBe('edge-draft-review');
    expect(connector.routing).toEqual({
      sourceOffset: 16,
      bendX: 240,
    });
  });

  it('clears incompatible routing fields when reconnects change the edge orientation', () => {
    const definition: StateDiagramDefinition = {
      type: 'state',
      description: 'Reconnect cleanup',
      size: 'medium',
      positioning: 'manual',
      elements: [
        {
          id: 'draft',
          type: 'state',
          x: 0,
          y: 0,
          data: {
            text: ['Draft'],
          },
        },
        {
          id: 'review',
          type: 'state',
          x: 320,
          y: 160,
          data: {
            text: ['Review'],
          },
        },
        {
          id: 'edge-draft-review',
          from: 'draft',
          to: 'review',
          fromPosition: 'right',
          toPosition: 'left',
          type: 'bend',
          routing: {
            sourceOffset: 16,
            bendX: 240,
          },
        },
      ],
    };
    const flow = buildDiagramFlow(definition);
    const edges = flow.edges.map((edge) => {
      return edge.id === 'edge-draft-review'
        ? {
            ...edge,
            sourceHandle: 'top',
            targetHandle: 'bottom',
          }
        : edge;
    });

    const nextDefinition = applyFlowEditsToDefinition(
      definition,
      flow.nodes,
      edges,
    );
    const connector = nextDefinition.elements.find(
      (element): element is StateEdgeElement => {
        return ('type' in element ? element.type !== 'state' : true)
          && element.id === 'edge-draft-review';
      },
    );

    if (!connector) {
      throw new Error('Expected updated connector.');
    }

    expect(connector.fromPosition).toBe('top');
    expect(connector.toPosition).toBe('bottom');
    expect(connector.routing).toEqual({
      sourceOffset: 0,
    });
  });

  it('persists edited line style on state edges', () => {
    const definition: StateDiagramDefinition = {
      type: 'state',
      description: 'Line style persistence',
      size: 'medium',
      positioning: 'manual',
      elements: [
        {
          id: 'draft',
          type: 'state',
          x: 0,
          y: 0,
          data: {
            text: ['Draft'],
          },
        },
        {
          id: 'review',
          type: 'state',
          x: 240,
          y: 0,
          data: {
            text: ['Review'],
          },
        },
        {
          id: 'edge-draft-review',
          from: 'draft',
          to: 'review',
          fromPosition: 'right',
          toPosition: 'left',
          type: 'straight',
        },
      ],
    };
    const flow = buildDiagramFlow(definition);
    const edges = flow.edges.map((edge) => {
      return edge.id === 'edge-draft-review'
        ? {
            ...edge,
            data: {
              ...(((edge as DiagramEdge).data as object | undefined) ?? {}),
              lineStyle: 'dashed',
            },
            style: {
              ...(edge.style ?? {}),
              strokeDasharray: '6 6',
            },
          }
        : edge;
    });

    const nextDefinition = applyFlowEditsToDefinition(
      definition,
      flow.nodes,
      edges,
    );
    const connector = nextDefinition.elements.find(
      (element): element is StateEdgeElement => {
        return ('type' in element ? element.type !== 'state' : true)
          && element.id === 'edge-draft-review';
      },
    );

    if (!connector) {
      throw new Error('Expected updated connector.');
    }

    expect(connector.lineStyle).toBe('dashed');
  });

  it('writes edited block and layer inspector fields back into JSON', () => {
    const definition: BlockDiagramDefinition = {
      type: 'block',
      description: 'Block edits',
      size: 'medium',
      positioning: 'manual',
      elements: [
        {
          id: 'layer',
          type: 'layer',
          x: 0,
          y: 0,
          width: 400,
          height: 160,
          data: {
            title: ['Old layer'],
            children: ['block'],
          },
        },
        {
          id: 'block',
          type: 'block',
          x: 32,
          y: 64,
          data: {
            text: ['Old block'],
            subtitle: ['Old subtitle'],
          },
        },
        {
          id: 'target',
          type: 'block',
          x: 360,
          y: 64,
          data: {
            text: ['Target'],
          },
        },
        {
          id: 'edge-block-target',
          from: 'block',
          to: 'target',
          fromPosition: 'right',
          toPosition: 'left',
          type: 'straight',
        },
      ],
    };
    const flow = buildDiagramFlow(definition);
    const nodes = flow.nodes.map((node) => {
      if (node.id === 'layer' && node.type === 'layer') {
        const layer = node as BlockLayerFlowNode;
        return {
          ...layer,
          data: {
            ...layer.data,
            state: 'warning',
            title: ['Updated layer'],
          },
        } satisfies BlockLayerFlowNode;
      }

      if (node.id === 'block' && node.type === 'block') {
        const block = node as BlockFlowNode;
        return {
          ...block,
          data: {
            ...block.data,
            state: 'success',
            subtitle: ['Updated subtitle'],
            text: ['Updated block'],
          },
        } satisfies BlockFlowNode;
      }

      return node;
    });
    const edges = flow.edges.map((edge) => {
      return edge.id === 'edge-block-target'
        ? {
            ...edge,
            label: 'updated',
            data: {
              ...(((edge as DiagramEdge).data as object | undefined) ?? {}),
              lineStyle: 'dashed',
              routing: { bendX: 240 },
              variant: 'bend',
            },
          }
        : edge;
    });

    const nextDefinition = applyFlowEditsToDefinition(definition, nodes, edges);
    const layer = nextDefinition.elements.find(
      (
        element,
      ): element is Extract<typeof nextDefinition.elements[number], { type: 'layer' }> => {
        return 'type' in element && element.type === 'layer' && element.id === 'layer';
      },
    );
    const block = nextDefinition.elements.find(
      (
        element,
      ): element is Extract<typeof nextDefinition.elements[number], { type: 'block' }> => {
        return 'type' in element && element.type === 'block' && element.id === 'block';
      },
    );
    const connector = nextDefinition.elements.find(
      (element): element is Extract<typeof nextDefinition.elements[number], { from: string }> => {
        return 'from' in element && element.id === 'edge-block-target';
      },
    );

    if (!layer || !block || !connector) {
      throw new Error('Expected updated block elements.');
    }

    expect(layer.data.title).toEqual(['Updated layer']);
    expect(layer.data.state).toBe('warning');
    expect(block.data.text).toEqual(['Updated block']);
    expect(block.data.subtitle).toEqual(['Updated subtitle']);
    expect(block.data.state).toBe('success');
    expect(connector.type).toBe('bend');
    expect(connector.label).toBe('updated');
    expect(connector.lineStyle).toBe('dashed');
    expect(connector.routing).toEqual({ bendX: 240 });
  });


  it('keeps state edges in JSON after a handle change followed by another commit', () => {
    const definition: StateDiagramDefinition = {
      type: 'state',
      description: 'Handle change round-trip',
      size: 'medium',
      positioning: 'manual',
      elements: [
        { id: 'a', type: 'state', col: 0, row: 0, data: { text: ['A'] } },
        { id: 'b', type: 'state', col: 1, row: 0, data: { text: ['B'] } },
        { from: 'a', to: 'b', label: 'go' },
      ],
    };
    const flow = buildDiagramFlow(definition);
    const edge = flow.edges[0]!;

    // First commit: user changes the source handle from inferred 'right' to 'top'.
    const firstEdges: DiagramEdge[] = [
      { ...edge, sourceHandle: 'top' },
    ];
    const afterFirst = applyFlowEditsToDefinition(
      definition,
      flow.nodes,
      firstEdges,
    ) as StateDiagramDefinition;

    const firstEdge = afterFirst.elements.find(
      (element) => 'from' in element && element.from === 'a' && element.to === 'b',
    ) as StateEdgeElement | undefined;
    expect(firstEdge?.fromPosition).toBe('top');

    // Second commit (any subsequent edit). The canvas does NOT bump revision
    // on canvas-originated edits, so the RF edges still carry the *original*
    // ids (before the handle change baked fromPosition into JSON). The edge
    // must survive the lookup against the now-modified definition.
    const afterSecond = applyFlowEditsToDefinition(
      afterFirst,
      flow.nodes,
      firstEdges,
    ) as StateDiagramDefinition;

    const secondEdge = afterSecond.elements.find(
      (element) => 'from' in element && element.from === 'a' && element.to === 'b',
    ) as StateEdgeElement | undefined;
    expect(secondEdge).toBeDefined();
    expect(secondEdge?.from).toBe('a');
    expect(secondEdge?.to).toBe('b');
    expect(secondEdge?.fromPosition).toBe('top');
  });
});
