# diagram-engine

A React + TypeScript library for rendering structured diagram payloads as interactive visualizations, built on [React Flow](https://reactflow.dev).

## Installation

```bash
npm install diagram-engine
```

## Peer dependencies

```bash
npm install react react-dom @xyflow/react
```

## Quick start

```tsx
import { ReactFlow } from '@xyflow/react';
import {
  buildDiagramFlow,
  nodeTypes,
  edgeTypes,
  resolveDiagramTheme,
  buildDiagramCssVariables,
  type DiagramDefinition,
} from 'diagram-engine';
import 'diagram-engine/diagram.css';

const definition: DiagramDefinition = {
  type: 'state',
  description: 'Order lifecycle',
  size: 'medium',
  positioning: 'auto',
  elements: [
    { id: 'pending', type: 'state', col: 0, row: 0, data: { text: 'Pending' } },
    { id: 'shipped', type: 'state', col: 1, row: 0, data: { text: 'Shipped' } },
    { from: 'pending', to: 'shipped', label: 'ship' },
  ],
};

const { nodes, edges } = buildDiagramFlow(definition);
const theme = resolveDiagramTheme({ darkMode: false });
const cssVars = buildDiagramCssVariables(theme.tokens);

export function MyDiagram() {
  return (
    <div style={{ width: '100%', height: 400, ...cssVars }}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView />
    </div>
  );
}
```

## Token customization

```ts
const theme = resolveDiagramTheme({
  darkMode: false,
  projectTokens: {
    light: {
      canvas: { background: '#f8fafc', gridColor: '#dde7f3' },
      node: { background: '#ffffff', border: '#d1dce8' },
      connector: { default: '#9aa7b8' },
    },
  },
});
```

## Exported API

### Core functions

| Export | Description |
|--------|-------------|
| `assertDiagramDefinition(value)` | Runtime validation — throws with a descriptive message if the value is not a valid diagram definition |
| `buildDiagramFlow(definition)` | Converts a `DiagramDefinition` into React Flow `nodes` and `edges` |
| `resolveDiagramTheme(options)` | Merges project and diagram tokens for the active light/dark mode |
| `buildDiagramCssVariables(tokens)` | Generates a CSS variable map from a resolved token set |
| `parseDiagramFileMetadata(source)` | Extracts `type` and `name` from a JSON string without full validation |
| `renderMarkdocNodes(content)` | Renders `MarkdocContent` to React nodes |
| `extractMarkdocText(content)` | Extracts plain text from `MarkdocContent` |

### React Flow integration

| Export | Description |
|--------|-------------|
| `nodeTypes` | React Flow `nodeTypes` map — pass directly to `<ReactFlow nodeTypes={nodeTypes} />` |
| `edgeTypes` | React Flow `edgeTypes` map — pass directly to `<ReactFlow edgeTypes={edgeTypes} />` |
| `LAYOUT` | Layout constants (widths, heights, spacing) used by the built-in renderers |

### Key types

| Type | Description |
|------|-------------|
| `DiagramDefinition` | Union of all five diagram definition types |
| `DiagramTokens` | Theme token object with `light` and `dark` variants |
| `DiagramTokenSet` | Single-mode token set (canvas, node, connector, sequenceActor) |
| `MarkdocContent` | Rich text content — a string, tag object, or array of nodes |
| `DiagramSize` | `"small" \| "medium" \| "large"` |
| `DiagramPositioning` | `"auto" \| "manual"` |
| `SequenceDiagramDefinition` | Sequence diagram with actors and actions |
| `StateDiagramDefinition` | State machine with nodes and edges |
| `EntityDiagramDefinition` | Entity-relationship diagram |
| `OverviewDiagramDefinition` | Architecture overview with icons and text |
| `BlockDiagramDefinition` | Block/flowchart diagram |

## CSS

Import the bundled stylesheet for node and edge styles:

```ts
import 'diagram-engine/diagram.css';
```
