import { describe, expect, it } from 'vitest';
import { buildDiagramFlow } from '../engine/layout';
import { PROJECT_DIAGRAM_THEME_FILENAME } from '../engine/diagram-tokens';
import { assertDiagramDefinition } from '../engine/schema';
import {
  bundledWorkspaceThemeTokens,
  workspaceExampleFiles,
} from './libraryRegistry';

const expectedCounts = {
  'workspace:sequence__claude-code-with-subagents': { nodes: 12, edges: 18 },
  'workspace:sequence__claude-code-without-subagents': { nodes: 8, edges: 12 },
  'workspace:state__prompt-iteration-process': { nodes: 6, edges: 6 },
  'workspace:overview__control-description-field': { nodes: 6, edges: 6 },
  'workspace:state__decision-rule-top-to-bottom': { nodes: 5, edges: 5 },
  'workspace:state__decision-rule': { nodes: 5, edges: 4 },
  'workspace:state__agent-workflow': { nodes: 4, edges: 4 },
  'workspace:sequence__api-discovery-flow': { nodes: 15, edges: 24 },
  'workspace:overview__output-modes': { nodes: 8, edges: 7 },
  'workspace:state__permission-evaluation-flow': { nodes: 6, edges: 5 },
  'workspace:overview__spec-driven-architecture': { nodes: 6, edges: 5 },
  'workspace:state__prompt-eval-loop': { nodes: 5, edges: 5 },
  'workspace:block__api-discovery-flow-block': { nodes: 9, edges: 3 },
  'workspace:block__prompt-engineering-flow': { nodes: 7, edges: 7 },
  'workspace:state__prompt-chaining': { nodes: 7, edges: 8 },
  'workspace:state__routing': { nodes: 5, edges: 6 },
  'workspace:state__parallelization': { nodes: 7, edges: 8 },
  'workspace:sequence__orchestrator-workers': { nodes: 11, edges: 14 },
  'workspace:sequence__evaluator-optimizer': { nodes: 11, edges: 16 },
  'workspace:state__autonomous-agent': { nodes: 6, edges: 7 },
  'workspace:state__theme-override-demo': { nodes: 5, edges: 5 },
  'workspace:entity__tax-transaction': { nodes: 6, edges: 5 },
  'workspace:sequence__checkout-lifecycle': { nodes: 12, edges: 16 },
} as const;

describe('diagram example fixtures', () => {
  it('excludes the reserved project theme file from the example tree', () => {
    expect(
      workspaceExampleFiles.some(
        (example) => example.filename === PROJECT_DIAGRAM_THEME_FILENAME,
      ),
    ).toBe(false);
    expect(bundledWorkspaceThemeTokens).toBeDefined();
  });

  it('uses diagram names from bundled library JSON when available', () => {
    expect(
      workspaceExampleFiles.find(e => e.relativePath === 'state/routing.json')?.label,
    ).toBe('Routing');
    expect(
      workspaceExampleFiles.find(e => e.relativePath === 'state/theme-override-demo.json')?.label,
    ).toBe('Theme Override Demo');
  });

  for (const example of workspaceExampleFiles) {
    it(`accepts ${example.id}`, () => {
      const definition: unknown = JSON.parse(example.source);

      expect(() => {
        assertDiagramDefinition(definition);
      }).not.toThrow();

      assertDiagramDefinition(definition);
      const flow = buildDiagramFlow(definition);
      const expected = expectedCounts[example.id as keyof typeof expectedCounts];

      expect(flow.nodes).toHaveLength(expected.nodes);
      expect(flow.edges).toHaveLength(expected.edges);
    });
  }
});
