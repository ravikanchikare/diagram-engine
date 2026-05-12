import { describe, expect, it } from 'vitest';
import checkoutLifecycleDefinition from '../data/library/sequence/checkout-lifecycle.json';
import taxTransactionEntityDefinition from '../data/library/entity/tax-transaction.json';
import {
  assertDiagramDefinition,
  assertDiagramThemeDefinition,
  assertDiagramTokens,
  parseDiagramFileMetadata,
  assertSequenceDiagramDefinition,
} from './schema';
import type {
  EntityDiagramDefinition,
  SequenceDiagramDefinition,
} from './schema';

const checkoutLifecycle = checkoutLifecycleDefinition as SequenceDiagramDefinition;
const taxTransaction = taxTransactionEntityDefinition as EntityDiagramDefinition;

describe('assertDiagramDefinition', () => {
  it('accepts the bundled Checkout Lifecycle sample', () => {
    expect(() => {
      assertDiagramDefinition(checkoutLifecycle);
    }).not.toThrow();
  });

  it('accepts the entity, overview, and state fixtures', () => {
    expect(() => assertDiagramDefinition(taxTransaction)).not.toThrow();
  });

  it('accepts numeric overview text widths', () => {
    expect(() => {
      assertDiagramDefinition({
        type: 'overview',
        description: 'Overview width',
        size: 'medium',
        positioning: 'manual',
        elements: [
          {
            id: 'note',
            type: 'text',
            width: 220,
            data: {
              text: ['Note'],
              size: 'medium',
              color: 'default',
            },
            position: { x: 0, y: 0 },
          },
        ],
      });
    }).not.toThrow();
  });

  it('rejects an empty elements array', () => {
    expect(() => {
      assertDiagramDefinition({
        type: 'sequence',
        description: 'Bad payload',
        size: 'large',
        positioning: 'auto',
        elements: [],
      });
    }).toThrow('Diagram definition requires a non-empty elements array.');
  });

  it('accepts sequence position and event fields for compatibility', () => {
    expect(() => {
      assertDiagramDefinition({
        type: 'sequence',
        description: 'Legacy payload',
        size: 'large',
        positioning: 'auto',
        elements: [
          {
            id: 'client',
            type: 'sequenceActor',
            data: {
              heading: [],
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
              heading: [],
              index: 1,
              color: 'default',
              rows: 1,
            },
          },
          {
            id: 'action-1',
            type: 'sequenceAction',
            data: {
              row: 1,
              from: 'client',
              to: 'server',
              text: [],
              event: 'checkout.session.completed',
            },
            position: { x: 10, y: 10 },
          },
        ],
      });
    }).not.toThrow();
  });

  it('accepts per-diagram token overrides', () => {
    expect(() => {
      assertDiagramDefinition({
        type: 'state',
        name: 'Tokenized state flow',
        description: 'Tokenized state flow',
        size: 'medium',
        positioning: 'manual',
        tokens: {
          light: {
            canvas: {
              background: '#ffffff',
              gridColor: '#dde7f3',
            },
            connector: {
              default: '#8899aa',
              labelBackground: '#f7f9fd',
            },
            node: {
              text: {
                heading: '#223344',
              },
              states: {
                accent: {
                  background: '#eef4ff',
                  border: '#99b8ff',
                },
              },
            },
          },
        },
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
        ],
      });
    }).not.toThrow();
  });

  it('accepts manual routing overrides on state edges', () => {
    expect(() => {
      assertDiagramDefinition({
        type: 'state',
        description: 'Editable routing',
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
            y: 120,
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
            routing: {
              sourceOffset: 16,
              bendX: 160,
            },
          },
        ],
      });
    }).not.toThrow();
  });

  it('accepts overview icons with an explicit label override', () => {
    expect(() => {
      assertDiagramDefinition({
        type: 'overview',
        name: 'Overview with label override',
        description: 'Overview with label override',
        size: 'medium',
        positioning: 'manual',
        elements: [
          {
            id: 'processor',
            type: 'icon',
            data: {
              icon: 'platform',
              label: 'Processor',
              text: [],
              size: 'auto',
              color: 'default',
            },
            position: { x: 0, y: 0 },
          },
        ],
      });
    }).not.toThrow();
  });

  it('rejects malformed token sections on diagrams', () => {
    expect(() => {
      assertDiagramDefinition({
        type: 'state',
        description: 'Broken tokens',
        size: 'medium',
        positioning: 'manual',
        tokens: {
          light: {
            connector: {
              default: 5,
            },
          },
        },
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
        ],
      });
    }).toThrow('tokens.light.connector.default must be a string.');
  });

  it('rejects malformed entity rows', () => {
    expect(() => {
      assertDiagramDefinition({
        type: 'entity',
        description: 'Broken entity',
        size: 'medium',
        positioning: 'manual',
        elements: [
          {
            id: 'invoice',
            type: 'entity',
            data: {
              header: [],
              rows: [
                {
                  name: 'id',
                  value: 'in_123',
                  handle: 5,
                },
              ],
              handles: ['id'],
            },
            position: { x: 0, y: 0 },
          },
        ],
      });
    }).toThrow('Entity element invoice row 0 is invalid.');
  });

  it('rejects state edges without from/to references', () => {
    expect(() => {
      assertDiagramDefinition({
        type: 'state',
        description: 'Broken state edge',
        size: 'medium',
        positioning: 'manual',
        elements: [
          {
            id: 'pending',
            type: 'state',
            x: 0,
            y: 0,
            data: {
              text: [],
            },
          },
          {
            label: 'missing refs',
          },
        ],
      });
    }).toThrow('State edge 1 is missing from or to.');
  });

  it('rejects non-numeric state routing values', () => {
    expect(() => {
      assertDiagramDefinition({
        type: 'state',
        description: 'Broken routing',
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
            y: 120,
            data: {
              text: ['Review'],
            },
          },
          {
            from: 'draft',
            to: 'review',
            routing: {
              trackY: 'high',
            },
          },
        ],
      });
    }).toThrow('State edge 2 routing.trackY must be a number.');
  });

  it('rejects a non-string diagram name', () => {
    expect(() => {
      assertDiagramDefinition({
        type: 'state',
        name: 123,
        description: 'Broken name',
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
        ],
      });
    }).toThrow('Diagram definition name must be a string.');
  });

  it('accepts state nodes with grid (col/row) coordinates instead of x/y', () => {
    expect(() => {
      assertDiagramDefinition({
        type: 'state',
        description: 'Grid-based state diagram',
        size: 'medium',
        positioning: 'manual',
        elements: [
          { id: 'a', type: 'state', col: 0, row: 0, data: { text: ['A'] } },
          { id: 'b', type: 'state', col: 1, row: 0, data: { text: ['B'] } },
          { from: 'a', to: 'b' },
        ],
      });
    }).not.toThrow();
  });

  it('accepts block nodes with grid (col/row) coordinates instead of x/y', () => {
    expect(() => {
      assertDiagramDefinition({
        type: 'block',
        description: 'Grid-based block diagram',
        size: 'medium',
        positioning: 'manual',
        elements: [
          { id: 'a', type: 'block', col: 0, row: 0, data: { text: ['A'] } },
          { id: 'b', type: 'block', col: 1, row: 0, data: { text: ['B'] } },
          { id: 'e1', from: 'a', to: 'b' },
        ],
      });
    }).not.toThrow();
  });

  it('rejects non-numeric block routing values', () => {
    expect(() => {
      assertDiagramDefinition({
        type: 'block',
        description: 'Broken block routing',
        size: 'medium',
        positioning: 'manual',
        elements: [
          { id: 'a', type: 'block', col: 0, row: 0, data: { text: ['A'] } },
          { id: 'b', type: 'block', col: 1, row: 0, data: { text: ['B'] } },
          {
            id: 'e1',
            from: 'a',
            to: 'b',
            routing: {
              trackY: 'high',
            },
          },
        ],
      });
    }).toThrow('Block edge 2 routing.trackY must be a number.');
  });

  it('rejects state nodes missing both x/y and col/row', () => {
    expect(() => {
      assertDiagramDefinition({
        type: 'state',
        description: 'Missing position',
        size: 'medium',
        positioning: 'manual',
        elements: [
          { id: 'orphan', type: 'state', data: { text: ['Orphan'] } },
        ],
      });
    }).toThrow(/State node orphan is missing id, position .x\/y or col\/row., or data\.text\./);
  });

  it('rejects state nodes with only one of x or y (incomplete pair)', () => {
    expect(() => {
      assertDiagramDefinition({
        type: 'state',
        description: 'Half position',
        size: 'medium',
        positioning: 'manual',
        elements: [
          { id: 'half', type: 'state', x: 100, data: { text: ['Half'] } },
        ],
      });
    }).toThrow(/State node half is missing/);
  });

  it('accepts state nodes with an explicit height', () => {
    expect(() => {
      assertDiagramDefinition({
        type: 'state',
        description: 'With height',
        size: 'medium',
        positioning: 'manual',
        elements: [
          { id: 'tall', type: 'state', x: 0, y: 0, height: 72, data: { text: ['Tall'] } },
        ],
      });
    }).not.toThrow();
  });

  it('rejects state nodes with a non-number height', () => {
    expect(() => {
      assertDiagramDefinition({
        type: 'state',
        description: 'Bad height',
        size: 'medium',
        positioning: 'manual',
        elements: [
          { id: 'bad', type: 'state', x: 0, y: 0, height: '72px' as unknown as number, data: { text: ['Bad'] } },
        ],
      });
    }).toThrow(/State node bad height/);
  });
});

describe('assertSequenceDiagramDefinition', () => {
  it('still rejects non-sequence diagrams', () => {
    expect(() => {
      assertSequenceDiagramDefinition({ type: 'state', description: 'test', size: 'medium', positioning: 'manual', elements: [{ id: 'x', type: 'state', x: 0, y: 0, data: { text: ['X'] } }] });
    }).toThrow('Only diagrams with type "sequence" are supported.');
  });
});

describe('parseDiagramFileMetadata', () => {
  it('extracts a supported diagram type and optional name', () => {
    expect(
      parseDiagramFileMetadata(
        JSON.stringify({
          type: 'state',
          name: 'Payments flow',
          description: 'Payments flow',
          size: 'medium',
          positioning: 'manual',
          elements: [],
        }),
      ),
    ).toEqual({
      type: 'state',
      name: 'Payments flow',
    });
  });

  it('returns null for non-diagram JSON payloads', () => {
    expect(
      parseDiagramFileMetadata(
        JSON.stringify({
          type: 'diagram-theme',
          tokens: {},
        }),
      ),
    ).toBeNull();
    expect(
      parseDiagramFileMetadata(
        JSON.stringify({
          hello: 'world',
        }),
      ),
    ).toBeNull();
  });
});

describe('assertDiagramThemeDefinition', () => {
  it('accepts a valid diagram theme file', () => {
    expect(() => {
      assertDiagramThemeDefinition({
        type: 'diagram-theme',
        tokens: {
          dark: {
            canvas: {
              background: '#0f1724',
            },
            sequenceActor: {
              success: '#f5b731',
            },
          },
        },
      });
    }).not.toThrow();
  });

  it('rejects malformed theme tokens', () => {
    expect(() => {
      assertDiagramThemeDefinition({
        type: 'diagram-theme',
        tokens: {
          light: {
            node: {
              text: 'bad',
            },
          },
        },
      });
    }).toThrow('tokens.light.node.text must be an object.');
  });

  it('validates standalone token objects', () => {
    expect(() => {
      assertDiagramTokens({
        light: {
          connector: {
            accent: '#2e7bf6',
          },
        },
      });
    }).not.toThrow();
  });
});
