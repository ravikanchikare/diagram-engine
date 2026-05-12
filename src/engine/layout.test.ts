import { describe, expect, it } from 'vitest';
import checkoutLifecycleDefinition from '../data/library/sequence/checkout-lifecycle.json';
import taxTransactionEntityDefinition from '../data/library/entity/tax-transaction.json';
import { extractMarkdocText } from './markdoc';
import {
  LAYOUT,
  buildDiagramFlow,
  buildSequenceFlow,
  getLaneSpacing,
  type SequenceActionFlowNode,
} from './layout';
import type {
  BlockDiagramDefinition,
  EntityDiagramDefinition,
  OverviewDiagramDefinition,
  SequenceDiagramDefinition,
  StateDiagramDefinition,
} from './schema';

const checkoutLifecycle = checkoutLifecycleDefinition as SequenceDiagramDefinition;
const taxTransaction = taxTransactionEntityDefinition as EntityDiagramDefinition;

describe('buildSequenceFlow', () => {
  it('builds the expected node and edge counts for the Checkout sample', () => {
    const flow = buildSequenceFlow(checkoutLifecycle);

    expect(flow.nodes).toHaveLength(12);
    expect(flow.edges).toHaveLength(16);
  });

  it('places actor lanes by index and action cards by row', () => {
    const flow = buildSequenceFlow(checkoutLifecycle);
    const client = flow.nodes.find((node) => node.id === 'client');
    const server = flow.nodes.find((node) => node.id === 'server');
    const paymentApi = flow.nodes.find((node) => node.id === 'paymentApi');
    const createSession = flow.nodes.find(
      (node) => node.id === 'node-1-server-paymentApi',
    );
    const mountElements = flow.nodes.find(
      (node) => node.id === 'node-3-client-paymentUi',
    );
    const paymentUi = flow.nodes.find(
      (node) => node.id === 'paymentUi',
    );
    const loopback = flow.nodes.find(
      (node) => node.id === 'node-4-paymentUi-paymentUi',
    );
    const laneSpacing = getLaneSpacing(4);

    expect(client?.position).toEqual({ x: 0, y: 0 });
    expect(server?.position).toEqual({ x: laneSpacing, y: 0 });
    expect(paymentApi?.position).toEqual({ x: laneSpacing * 2, y: 0 });
    expect(createSession?.position.y).toBe(
      LAYOUT.headerHeight +
        LAYOUT.rowHeight -
        LAYOUT.rowHeight / 2 -
        LAYOUT.actionHeight / 2,
    );
    expect(createSession?.position.x).toBeGreaterThan(server!.position.x);
    expect(createSession?.position.x).toBeLessThan(paymentApi!.position.x);
    expect(Number(createSession?.style?.width)).toBeGreaterThan(
      LAYOUT.minActionWidth,
    );
    expect(Number(mountElements?.style?.width)).toBeGreaterThan(
      Number(createSession?.style?.width),
    );
    expect(loopback?.position.x).toBeGreaterThan(
      paymentUi!.position.x + LAYOUT.actorLineX,
    );
  });

  it('derives lane spacing from the actor count', () => {
    expect(getLaneSpacing(2)).toBeGreaterThan(getLaneSpacing(4));
    expect(getLaneSpacing(4)).toBeGreaterThanOrEqual(LAYOUT.minLaneSpacing);
    expect(getLaneSpacing(4)).toBeLessThanOrEqual(LAYOUT.maxLaneSpacing);
  });

  it('styles webhook edges as dashed', () => {
    const flow = buildSequenceFlow(checkoutLifecycle);
    const webhookEdge = flow.edges.find(
      (edge) => edge.id === 'edge-5-paymentApi-server-1',
    );

    expect(webhookEdge?.type).toBe('dashed');
    expect(webhookEdge?.style).toMatchObject({
      strokeDasharray: '6 6',
      strokeWidth: 1.75,
    });
  });

  it('supports explicit connector color state and line style from sequence JSON', () => {
    const styledDefinition: SequenceDiagramDefinition = {
      type: 'sequence',
      description: 'Styled sequence',
      size: 'medium',
      positioning: 'auto',
      elements: [
        {
          id: 'client',
          type: 'sequenceActor',
          data: {
            heading: ['Client'],
            index: 0,
            color: 'default',
            rows: 1,
          },
        },
        {
          id: 'server',
          type: 'sequenceActor',
          data: {
            heading: ['Server'],
            index: 1,
            color: 'default',
            rows: 1,
          },
        },
        {
          id: 'request',
          type: 'sequenceAction',
          data: {
            text: ['Run request'],
            row: 1,
            from: 'client',
            to: 'server',
          },
        },
        {
          id: 'edge-client-request',
          type: 'smoothstep',
          source: 'client',
          target: 'request',
          sourceHandle: 'client-1-right',
          targetHandle: 'left',
          state: 'accent',
          lineStyle: 'dashed',
        },
      ],
    };

    const flow = buildSequenceFlow(styledDefinition);
    const edge = flow.edges.find((candidate) => candidate.id === 'edge-client-request');

    expect(edge?.style).toMatchObject({
      stroke: 'var(--connector-stroke-accent, #2e7bf6)',
      strokeDasharray: '6 6',
      strokeWidth: 1.75,
    });
    expect(edge?.markerEnd).toMatchObject({
      color: 'var(--connector-stroke-accent, #2e7bf6)',
    });
  });

  it('inherits sequence connector color from non-default actor styling', () => {
    const styledDefinition: SequenceDiagramDefinition = {
      type: 'sequence',
      description: 'Inherited sequence styling',
      size: 'medium',
      positioning: 'auto',
      elements: [
        {
          id: 'agent',
          type: 'sequenceActor',
          data: {
            heading: ['Agent'],
            index: 0,
            color: 'accent',
            rows: 1,
          },
        },
        {
          id: 'tool',
          type: 'sequenceActor',
          data: {
            heading: ['Tool'],
            index: 1,
            color: 'success',
            rows: 1,
          },
        },
        {
          id: 'call-tool',
          type: 'sequenceAction',
          data: {
            text: ['Call tool'],
            row: 1,
            from: 'agent',
            to: 'tool',
          },
        },
        {
          id: 'edge-agent-call-tool',
          type: 'smoothstep',
          source: 'agent',
          target: 'call-tool',
          sourceHandle: 'agent-1-right',
          targetHandle: 'left',
        },
        {
          id: 'edge-call-tool-tool',
          type: 'smoothstep',
          source: 'call-tool',
          target: 'tool',
          sourceHandle: 'right',
          targetHandle: 'tool-1-left',
        },
      ],
    };

    const flow = buildSequenceFlow(styledDefinition);
    const edge = flow.edges.find((candidate) => candidate.id === 'edge-agent-call-tool');
    const continuationEdge = flow.edges.find((candidate) => candidate.id === 'edge-call-tool-tool');

    expect(edge?.style).toMatchObject({
      stroke: 'var(--sequence-actor-accent, #2e7bf6)',
      strokeWidth: 1.75,
    });
    expect(edge?.markerEnd).toMatchObject({
      color: 'var(--sequence-actor-accent, #2e7bf6)',
    });
    expect(continuationEdge?.style).toMatchObject({
      stroke: 'var(--sequence-actor-success, #f5b731)',
      strokeWidth: 1.75,
    });
    expect(continuationEdge?.markerEnd).toMatchObject({
      color: 'var(--sequence-actor-success, #f5b731)',
    });
  });

  it('routes the self-flow return edge orthogonally while keeping the entry edge on the left handle', () => {
    const flow = buildSequenceFlow(checkoutLifecycle);
    const enterEdge = flow.edges.find(
      (edge) => edge.id === 'edge-4-paymentUi-paymentUi-1',
    );
    const returnEdge = flow.edges.find(
      (edge) => edge.id === 'edge-4-paymentUi-paymentUi-2',
    );

    expect(enterEdge?.type).toBe('smoothstep');
    expect(enterEdge?.targetHandle).toBe('left');
    expect(returnEdge?.type).toBe('orthogonal');
  });

  it('truncates long action copy to stay within two lines', () => {
    const longDefinition: SequenceDiagramDefinition = {
      type: 'sequence',
      description: 'Long copy',
      size: 'large',
      positioning: 'auto',
      elements: [
        {
          id: 'client',
          type: 'sequenceActor',
          data: {
            heading: [
              {
                $$mdtype: 'Tag',
                name: 'Paragraph',
                attributes: {},
                children: ['Client'],
              },
            ],
            index: 0,
            color: 'default',
            rows: 1,
          },
          position: { x: 0, y: 0 },
        },
        {
          id: 'server',
          type: 'sequenceActor',
          data: {
            heading: [
              {
                $$mdtype: 'Tag',
                name: 'Paragraph',
                attributes: {},
                children: ['Server'],
              },
            ],
            index: 1,
            color: 'default',
            rows: 1,
          },
        },
        {
          id: 'long-action',
          type: 'sequenceAction',
          data: {
            text: [
              {
                $$mdtype: 'Tag',
                name: 'Paragraph',
                attributes: {},
                children: [
                  'This action copy is intentionally far too long to fit inside a single row without truncation.',
                ],
              },
            ],
            row: 1,
            from: 'client',
            to: 'server',
            event: 'ignored.event',
          },
          position: { x: 10, y: 10 },
        },
      ],
    };

    const flow = buildSequenceFlow(longDefinition);
    const action = flow.nodes.find(
      (node) => node.id === 'long-action',
    ) as SequenceActionFlowNode | undefined;

    expect(action).toBeDefined();
    expect(action?.data.isTruncated).toBe(true);
    expect(extractMarkdocText(action?.data.text ?? [])).toContain('…');
    expect(Number(action?.style?.height)).toBe(LAYOUT.actionHeight);
  });

  it('throws when an action references an unknown actor lane', () => {
    const invalidDefinition: SequenceDiagramDefinition = {
      type: 'sequence',
      description: 'Broken references',
      size: 'large',
      positioning: 'auto',
      elements: [
        {
          id: 'client',
          type: 'sequenceActor',
          data: {
            heading: [
              {
                $$mdtype: 'Tag',
                name: 'Paragraph',
                attributes: {},
                children: ['Client'],
              },
            ],
            index: 0,
            color: 'default',
            rows: 1,
          },
        },
        {
          id: 'bad-action',
          type: 'sequenceAction',
          data: {
            text: [
              {
                $$mdtype: 'Tag',
                name: 'Paragraph',
                attributes: {},
                children: ['Broken'],
              },
            ],
            row: 1,
            from: 'client',
            to: 'server',
          },
        },
      ],
    };

    expect(() => buildSequenceFlow(invalidDefinition)).toThrow(
      'Action bad-action references an unknown actor lane.',
    );
  });
});

describe('buildDiagramFlow', () => {


  it('falls back to the shared overview icon registry label when JSON label is omitted', () => {
    const definition: OverviewDiagramDefinition = {
      type: 'overview',
      description: 'Fallback overview label',
      size: 'medium',
      positioning: 'manual',
      elements: [
        {
          id: 'reader',
          type: 'icon',
          data: {
            icon: 'terminal',
            text: [],
            size: 'auto',
            color: 'default',
          },
          position: { x: 0, y: 0 },
        },
      ],
    };

    const flow = buildDiagramFlow(definition);
    const reader = flow.nodes.find((node) => node.id === 'reader');

    expect((reader?.data as { label?: string } | undefined)?.label).toBe('Terminal');
  });

  it('inherits connector colors from overview nodes and allows explicit overrides', () => {
    const styledDefinition: OverviewDiagramDefinition = {
      type: 'overview',
      description: 'Connector styling',
      size: 'medium',
      positioning: 'manual',
      elements: [
        {
          id: 'entry',
          type: 'icon',
          data: {
            icon: 'user',
            text: [],
            size: 'auto',
            color: 'accent',
          },
          position: { x: 0, y: 0 },
        },
        {
          id: 'decision',
          type: 'text',
          data: {
            text: ['Decision'],
            size: 'medium',
            color: 'default',
          },
          position: { x: 240, y: 0 },
        },
        {
          id: 'yes-flow',
          type: 'straight',
          source: 'entry',
          target: 'decision',
          sourceHandle: 'right',
          targetHandle: 'left',
          label: 'Yes',
        },
        {
          id: 'no-flow',
          type: 'straight',
          source: 'decision',
          target: 'entry',
          sourceHandle: 'left',
          targetHandle: 'right',
          label: 'No',
          color: '#aa5500',
          lineStyle: 'dashed',
        },
      ],
    };

    const flow = buildDiagramFlow(styledDefinition);
    const yesFlow = flow.edges.find((edge) => edge.id === 'yes-flow');
    const noFlow = flow.edges.find((edge) => edge.id === 'no-flow');

    expect(yesFlow?.style).toMatchObject({
      stroke: 'var(--connector-stroke-accent, #2e7bf6)',
      strokeWidth: 1.75,
    });
    expect(yesFlow?.markerEnd).toMatchObject({
      color: 'var(--connector-stroke-accent, #2e7bf6)',
    });
    expect(noFlow?.style).toMatchObject({
      stroke: '#aa5500',
      strokeDasharray: '6 6',
      strokeWidth: 1.75,
    });
    expect(noFlow?.markerEnd).toMatchObject({
      color: '#aa5500',
    });
  });


  it('keeps short state nodes at the CSS minimum width', () => {
    const flow = buildDiagramFlow({
      type: 'state',
      description: 'Short labels',
      size: 'medium',
      positioning: 'manual',
      elements: [
        {
          id: 'edit',
          type: 'state',
          x: 0,
          y: 48,
          data: {
            text: ['Edit prompt'],
          },
        },
      ],
    });

    expect(flow.nodes[0]?.style?.width).toBe(LAYOUT.stateMinWidth);
    expect(flow.nodes[0]?.style?.height).toBe(LAYOUT.stateHeight);
  });

  it('reroutes same-row backward state edges to loop handles without changing forward edges', () => {
    const loopDefinition: StateDiagramDefinition = {
      type: 'state',
      description: 'Loopback routing',
      size: 'medium',
      positioning: 'manual',
      elements: [
        {
          id: 'testCases',
          type: 'state',
          x: 0,
          y: 144,
          data: {
            text: ['Test prompt against cases'],
          },
        },
        {
          id: 'refine',
          type: 'state',
          x: 360,
          y: 144,
          data: {
            text: ['Refine prompt'],
          },
        },
        {
          from: 'testCases',
          to: 'refine',
          fromPosition: 'right',
          toPosition: 'left',
          type: 'straight',
          label: 'forward',
        },
        {
          from: 'refine',
          to: 'testCases',
          fromPosition: 'right',
          toPosition: 'left',
          type: 'bend',
          label: 'loop',
        },
      ],
    };

    const flow = buildDiagramFlow(loopDefinition);
    const forwardEdge = flow.edges.find((edge) => edge.label === 'forward');
    const loopEdge = flow.edges.find((edge) => edge.label === 'loop');

    expect(forwardEdge?.sourceHandle).toBe('right');
    expect(forwardEdge?.targetHandle).toBe('left');
    expect(loopEdge?.sourceHandle).toBe('top');
    expect(loopEdge?.targetHandle).toBe('top');
  });

  it('compacts oversized same-row horizontal state gaps based on each edge label', () => {
    const spacedDefinition: StateDiagramDefinition = {
      type: 'state',
      description: 'Spacing',
      size: 'large',
      positioning: 'auto',
      elements: [
        {
          id: 'first',
          type: 'state',
          x: 0,
          y: 144,
          data: {
            text: ['First stage'],
          },
        },
        {
          id: 'second',
          type: 'state',
          x: 500,
          y: 144,
          data: {
            text: ['Second stage'],
          },
        },
        {
          id: 'third',
          type: 'state',
          x: 1000,
          y: 144,
          data: {
            text: ['Third stage'],
          },
        },
        {
          from: 'first',
          to: 'second',
          fromPosition: 'right',
          toPosition: 'left',
          type: 'straight',
          label: 'promote candidate',
        },
        {
          from: 'second',
          to: 'third',
          fromPosition: 'right',
          toPosition: 'left',
          type: 'straight',
          label: 'ship',
        },
      ],
    };

    const flow = buildDiagramFlow(spacedDefinition);
    const first = flow.nodes.find((node) => node.id === 'first');
    const second = flow.nodes.find((node) => node.id === 'second');
    const third = flow.nodes.find((node) => node.id === 'third');

    if (!first || !second || !third) {
      throw new Error('Expected compacted state nodes.');
    }

    expect(second.position.x).toBeLessThan(500);
    expect(third.position.x).toBeLessThan(1000);

    const firstGap = second.position.x - (first.position.x + Number(first.style?.width));
    const secondGap = third.position.x - (second.position.x + Number(second.style?.width));

    expect(firstGap).toBeGreaterThan(secondGap);
    expect(secondGap).toBeGreaterThanOrEqual(72);
  });

  it('inherits connector colors from state nodes and lets JSON overrides win', () => {
    const styledDefinition: StateDiagramDefinition = {
      type: 'state',
      description: 'Connector appearance',
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
            state: 'accent',
          },
        },
        {
          id: 'review',
          type: 'state',
          x: 260,
          y: 0,
          data: {
            text: ['Review'],
          },
        },
        {
          id: 'approved',
          type: 'state',
          x: 520,
          y: 0,
          data: {
            text: ['Approved'],
            state: 'success',
          },
        },
        {
          id: 'edge-inherit-source',
          from: 'draft',
          to: 'review',
          fromPosition: 'right',
          toPosition: 'left',
          type: 'straight',
          label: 'submit',
        },
        {
          id: 'edge-inherit-target',
          from: 'review',
          to: 'approved',
          fromPosition: 'right',
          toPosition: 'left',
          type: 'straight',
          label: 'approve',
        },
        {
          id: 'edge-override-state',
          from: 'draft',
          to: 'approved',
          fromPosition: 'right',
          toPosition: 'left',
          type: 'straight',
          label: 'escalate',
          state: 'danger',
          lineStyle: 'dashed',
        },
        {
          id: 'edge-override-color',
          from: 'approved',
          to: 'review',
          fromPosition: 'right',
          toPosition: 'left',
          type: 'straight',
          label: 'recheck',
          color: '#123456',
          inheritColorFrom: 'none',
        },
      ],
    };

    const flow = buildDiagramFlow(styledDefinition);
    const sourceInherited = flow.edges.find((edge) => edge.id === 'edge-inherit-source');
    const targetInherited = flow.edges.find((edge) => edge.id === 'edge-inherit-target');
    const stateOverride = flow.edges.find((edge) => edge.id === 'edge-override-state');
    const colorOverride = flow.edges.find((edge) => edge.id === 'edge-override-color');

    expect(sourceInherited?.style).toMatchObject({
      stroke: 'var(--connector-stroke-accent, #2e7bf6)',
      strokeWidth: 1.75,
    });
    expect(targetInherited?.style).toMatchObject({
      stroke: 'var(--connector-stroke-success, #49b53f)',
      strokeWidth: 1.75,
    });
    expect(stateOverride?.style).toMatchObject({
      stroke: 'var(--connector-stroke-danger, #a2483f)',
      strokeDasharray: '6 6',
      strokeWidth: 1.75,
    });
    expect(colorOverride?.style).toMatchObject({
      stroke: '#123456',
      strokeWidth: 1.75,
    });
    expect(colorOverride?.markerEnd).toMatchObject({
      color: '#123456',
    });
  });

  it('resolves state node grid coordinates (col/row) into pixel positions', () => {
    const definition: StateDiagramDefinition = {
      type: 'state',
      description: 'Grid-resolved state nodes',
      size: 'medium',
      positioning: 'manual',
      elements: [
        { id: 'a', type: 'state', col: 0, row: 0, data: { text: ['A'] } },
        { id: 'b', type: 'state', col: 2, row: 1, data: { text: ['B'] } },
        { id: 'c', type: 'state', x: 999, y: 42, data: { text: ['C'] } },
      ],
    };
    const flow = buildDiagramFlow(definition);
    const a = flow.nodes.find((n) => n.id === 'a');
    const b = flow.nodes.find((n) => n.id === 'b');
    const c = flow.nodes.find((n) => n.id === 'c');

    expect(a?.position).toEqual({ x: 0, y: 0 });
    expect(b?.position).toEqual({ x: 2 * LAYOUT.gridColStep, y: 1 * LAYOUT.gridRowStep });
    expect(c?.position).toEqual({ x: 999, y: 42 });
  });

  it('infers state edge handles and type from grid deltas when omitted', () => {
    const definition: StateDiagramDefinition = {
      type: 'state',
      description: 'Inference cases',
      size: 'medium',
      positioning: 'manual',
      elements: [
        { id: 'origin', type: 'state', col: 1, row: 1, data: { text: ['Origin'] } },
        { id: 'right', type: 'state', col: 2, row: 1, data: { text: ['Right'] } },
        { id: 'below', type: 'state', col: 1, row: 2, data: { text: ['Below'] } },
        { id: 'upRight', type: 'state', col: 2, row: 0, data: { text: ['Up-right'] } },
        { from: 'origin', to: 'right', label: 'sameRowForward' },
        { from: 'origin', to: 'below', label: 'sameColDown' },
        { from: 'origin', to: 'upRight', label: 'diagonalUpRight' },
      ],
    };
    const flow = buildDiagramFlow(definition);
    const sameRow = flow.edges.find((e) => e.label === 'sameRowForward');
    const sameCol = flow.edges.find((e) => e.label === 'sameColDown');
    const diagonal = flow.edges.find((e) => e.label === 'diagonalUpRight');

    expect(sameRow?.sourceHandle).toBe('right');
    expect(sameRow?.targetHandle).toBe('left');
    expect((sameRow as { data?: { variant?: string } } | undefined)?.data).toMatchObject({
      variant: 'straight',
    });

    expect(sameCol?.sourceHandle).toBe('bottom');
    expect(sameCol?.targetHandle).toBe('top');
    expect((sameCol as { data?: { variant?: string } } | undefined)?.data).toMatchObject({
      variant: 'straight',
    });

    expect(diagonal?.sourceHandle).toBe('right');
    expect(diagonal?.targetHandle).toBe('bottom');
    expect((diagonal as { data?: { variant?: string } } | undefined)?.data).toMatchObject({
      variant: 'bend',
    });
  });

  it('preserves explicit edge handles and type when provided', () => {
    const definition: StateDiagramDefinition = {
      type: 'state',
      description: 'Explicit overrides win',
      size: 'medium',
      positioning: 'manual',
      elements: [
        { id: 'a', type: 'state', col: 0, row: 0, data: { text: ['A'] } },
        { id: 'b', type: 'state', col: 1, row: 0, data: { text: ['B'] } },
        {
          from: 'a',
          to: 'b',
          fromPosition: 'top',
          toPosition: 'bottom',
          type: 'bend',
          label: 'override',
        },
      ],
    };
    const flow = buildDiagramFlow(definition);
    const edge = flow.edges.find((e) => e.label === 'override');

    expect(edge?.sourceHandle).toBe('top');
    expect(edge?.targetHandle).toBe('bottom');
    expect((edge as { data?: { variant?: string } } | undefined)?.data).toMatchObject({
      variant: 'bend',
    });
  });

  it('uses explicit width field on a state node instead of computed content width', () => {
    const flow = buildDiagramFlow({
      type: 'state',
      description: 'Explicit width',
      size: 'medium',
      positioning: 'manual',
      elements: [
        {
          id: 'node-a',
          type: 'state',
          x: 0,
          y: 0,
          width: 300,
          data: { text: ['Short'] },
        },
      ],
    });

    expect(flow.nodes[0]?.style?.width).toBe(300);
  });

  it('uses explicit width field on an overview text node instead of computed content width', () => {
    const flow = buildDiagramFlow({
      type: 'overview',
      description: 'Explicit overview text width',
      size: 'medium',
      positioning: 'manual',
      elements: [
        {
          id: 'note',
          type: 'text',
          width: 260,
          data: {
            text: ['Short note'],
            size: 'medium',
            color: 'default',
          },
          position: { x: 0, y: 0 },
        },
      ],
    });

    expect(flow.nodes[0]?.style?.width).toBe(260);
  });

  it('snaps overview text nodes to the nearest 16px grid while leaving icons untouched', () => {
    const definition: OverviewDiagramDefinition = {
      type: 'overview',
      description: 'Overview text grid alignment',
      size: 'medium',
      positioning: 'manual',
      elements: [
        {
          id: 'off-grid-icon',
          type: 'icon',
          data: {
            icon: 'terminal',
            text: [],
            size: 'auto',
            color: 'default',
          },
          position: { x: 23, y: -9 },
        },
        {
          id: 'positive-text',
          type: 'text',
          data: {
            text: ['Positive odd position'],
            size: 'medium',
            color: 'default',
          },
          position: { x: 23, y: -9 },
        },
        {
          id: 'negative-text',
          type: 'text',
          data: {
            text: ['Negative odd position'],
            size: 'medium',
            color: 'default',
          },
          position: { x: -25, y: 25 },
        },
      ],
    };

    const flow = buildDiagramFlow(definition);
    const icon = flow.nodes.find((node) => node.id === 'off-grid-icon');
    const positiveText = flow.nodes.find((node) => node.id === 'positive-text');
    const negativeText = flow.nodes.find((node) => node.id === 'negative-text');

    expect(icon?.position).toEqual({ x: 23, y: -9 });
    expect(positiveText?.position).toEqual({ x: 16, y: -16 });
    expect(negativeText?.position).toEqual({ x: -32, y: 32 });
  });

  it('resolves block node grid coordinates and infers block edge routing', () => {
    const definition: BlockDiagramDefinition = {
      type: 'block',
      description: 'Grid-resolved block diagram',
      size: 'medium',
      positioning: 'manual',
      elements: [
        { id: 'src', type: 'block', col: 0, row: 0, data: { text: ['Src'] } },
        { id: 'dst', type: 'block', col: 1, row: 1, data: { text: ['Dst'] } },
        { id: 'e1', from: 'src', to: 'dst' },
      ],
    };
    const flow = buildDiagramFlow(definition);
    const src = flow.nodes.find((n) => n.id === 'src');
    const dst = flow.nodes.find((n) => n.id === 'dst');
    const edge = flow.edges.find((e) => e.id === 'e1');

    expect(src?.position).toEqual({ x: 0, y: 0 });
    expect(dst?.position).toEqual({ x: LAYOUT.gridColStep, y: LAYOUT.gridRowStep });
    expect(edge?.sourceHandle).toBe('right');
    expect(edge?.targetHandle).toBe('top');
    expect((edge as { data?: { variant?: string } } | undefined)?.data).toMatchObject({
      variant: 'bend',
    });
  });

  it('auto-spaces state columns using the longest label between adjacent columns', () => {
    const definition: StateDiagramDefinition = {
      type: 'state',
      description: 'State column spacing',
      size: 'medium',
      positioning: 'auto',
      elements: [
        { id: 'first', type: 'state', col: 0, row: 0, data: { text: ['First'] } },
        { id: 'second', type: 'state', col: 1, row: 1, data: { text: ['Second'] } },
        { id: 'third', type: 'state', col: 2, row: 0, data: { text: ['Third'] } },
        {
          from: 'first',
          to: 'second',
          label: 'a much longer transition label',
        },
        {
          from: 'second',
          to: 'third',
          label: 'ok',
        },
      ],
    };

    const flow = buildDiagramFlow(definition);
    const first = flow.nodes.find((node) => node.id === 'first');
    const second = flow.nodes.find((node) => node.id === 'second');
    const third = flow.nodes.find((node) => node.id === 'third');

    if (!first || !second || !third) {
      throw new Error('Expected state nodes.');
    }

    const firstGap = second.position.x - (first.position.x + Number(first.style?.width));
    const secondGap = third.position.x - (second.position.x + Number(second.style?.width));

    expect(firstGap).toBeGreaterThan(secondGap);
  });

  it('keeps manual state column coordinates unchanged', () => {
    const definition: StateDiagramDefinition = {
      type: 'state',
      description: 'Manual state spacing',
      size: 'medium',
      positioning: 'manual',
      elements: [
        { id: 'first', type: 'state', x: 0, y: 0, data: { text: ['First'] } },
        { id: 'second', type: 'state', x: 500, y: 172, data: { text: ['Second'] } },
        { id: 'third', type: 'state', x: 1000, y: 0, data: { text: ['Third'] } },
        { from: 'first', to: 'second', label: 'a much longer transition label' },
        { from: 'second', to: 'third', label: 'ok' },
      ],
    };

    const flow = buildDiagramFlow(definition);

    expect(flow.nodes.find((node) => node.id === 'first')?.position.x).toBe(0);
    expect(flow.nodes.find((node) => node.id === 'second')?.position.x).toBe(500);
    expect(flow.nodes.find((node) => node.id === 'third')?.position.x).toBe(1000);
  });

  it('auto-spaces top-level block columns using content widths and labels', () => {
    const definition: BlockDiagramDefinition = {
      type: 'block',
      description: 'Block column spacing',
      size: 'medium',
      positioning: 'auto',
      elements: [
        {
          id: 'first',
          type: 'block',
          col: 0,
          row: 0,
          width: 260,
          data: { text: ['First'] },
        },
        { id: 'second', type: 'block', col: 1, row: 1, data: { text: ['Second'] } },
        { id: 'third', type: 'block', col: 2, row: 0, data: { text: ['Third'] } },
        {
          from: 'first',
          to: 'second',
          label: 'a much longer block connector label',
        },
        {
          from: 'second',
          to: 'third',
          label: 'ok',
        },
      ],
    };

    const flow = buildDiagramFlow(definition);
    const first = flow.nodes.find((node) => node.id === 'first');
    const second = flow.nodes.find((node) => node.id === 'second');
    const third = flow.nodes.find((node) => node.id === 'third');

    if (!first || !second || !third) {
      throw new Error('Expected block nodes.');
    }

    const firstGap = second.position.x - (first.position.x + Number(first.style?.width));
    const secondGap = third.position.x - (second.position.x + Number(second.style?.width));

    expect(first.style?.width).toBe(260);
    expect(firstGap).toBeGreaterThan(secondGap);
  });

  it('keeps manual block column coordinates unchanged', () => {
    const definition: BlockDiagramDefinition = {
      type: 'block',
      description: 'Manual block spacing',
      size: 'medium',
      positioning: 'manual',
      elements: [
        { id: 'first', type: 'block', x: 0, y: 0, data: { text: ['First'] } },
        { id: 'second', type: 'block', x: 500, y: 172, data: { text: ['Second'] } },
        { id: 'third', type: 'block', x: 1000, y: 0, data: { text: ['Third'] } },
        { from: 'first', to: 'second', label: 'a much longer block connector label' },
        { from: 'second', to: 'third', label: 'ok' },
      ],
    };

    const flow = buildDiagramFlow(definition);

    expect(flow.nodes.find((node) => node.id === 'first')?.position.x).toBe(0);
    expect(flow.nodes.find((node) => node.id === 'second')?.position.x).toBe(500);
    expect(flow.nodes.find((node) => node.id === 'third')?.position.x).toBe(1000);
  });

  it('equalizes block heights within the same resolved row', () => {
    const definition: BlockDiagramDefinition = {
      type: 'block',
      description: 'Same-row block height normalization',
      size: 'medium',
      positioning: 'manual',
      elements: [
        { id: 'short', type: 'block', col: 0, row: 0, data: { text: ['Short'] } },
        {
          id: 'wrapped',
          type: 'block',
          col: 1,
          row: 0,
          data: {
            text: ['Wrapped'],
            subtitle: ['A longer subtitle that needs more vertical space'],
          },
        },
        { id: 'other-row', type: 'block', col: 0, row: 1, data: { text: ['Other row'] } },
        { id: 'explicit', type: 'block', col: 1, row: 1, height: 120, data: { text: ['Explicit'] } },
      ],
    };

    const flow = buildDiagramFlow(definition);
    const short = flow.nodes.find((node) => node.id === 'short');
    const wrapped = flow.nodes.find((node) => node.id === 'wrapped');
    const otherRow = flow.nodes.find((node) => node.id === 'other-row');
    const explicit = flow.nodes.find((node) => node.id === 'explicit');

    expect(short?.style?.height).toBe(wrapped?.style?.height);
    expect(Number(short?.style?.height)).toBeGreaterThan(LAYOUT.blockHeight);
    expect(otherRow?.style?.height).toBe(120);
    expect(explicit?.style?.height).toBe(120);
  });

  it('preserves block layer child positioning during auto-spacing', () => {
    const definition: BlockDiagramDefinition = {
      type: 'block',
      description: 'Layer child spacing',
      size: 'medium',
      positioning: 'auto',
      elements: [
        {
          id: 'layer',
          type: 'layer',
          x: 100,
          y: 80,
          width: 520,
          height: 180,
          data: {
            title: ['Layer'],
            children: ['child-a', 'child-b'],
          },
        },
        { id: 'child-a', type: 'block', col: 0, row: 0, data: { text: ['Child A'] } },
        { id: 'child-b', type: 'block', col: 1, row: 0, data: { text: ['Child B'] } },
        { id: 'outside', type: 'block', col: 2, row: 0, data: { text: ['Outside'] } },
      ],
    };

    const flow = buildDiagramFlow(definition);
    const childA = flow.nodes.find((node) => node.id === 'child-a');
    const childB = flow.nodes.find((node) => node.id === 'child-b');

    expect(childA?.position.x).toBeGreaterThanOrEqual(100);
    expect(childB?.position.x).toBeLessThanOrEqual(620);
    expect(childA?.position.y).toBeGreaterThan(80);
    expect(childB?.position.y).toBeGreaterThan(80);
  });
});
