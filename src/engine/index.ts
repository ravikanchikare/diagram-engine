// Public entrypoint for the diagram-engine package.
// Consumers (e.g. case-study-template) should import from `diagram-engine`
// rather than reach into `./src/engine/...` directly.

export {
  assertDiagramDefinition,
  assertDiagramThemeDefinition,
  assertSequenceDiagramDefinition,
  parseDiagramFileMetadata,
  type DiagramDefinition,
  type DiagramFileMetadata,
  type DiagramHandlePosition,
  type DiagramNodeStateTokenSet,
  type DiagramNodeTokenSet,
  type DiagramPosition,
  type DiagramPositioning,
  type DiagramSize,
  type DiagramThemeDefinition,
  type DiagramTokenSet,
  type DiagramTokens,
  type EntityDiagramDefinition,
  type EntityElement,
  type EntityRow,
  type MarkdocContent,
  type MarkdocNode,
  type MarkdocTag,
  type OverviewDiagramDefinition,
  type OverviewIconElement,
  type OverviewTextElement,
  type SequenceActionElement,
  type SequenceActorElement,
  type SequenceDiagramDefinition,
  type StateDiagramDefinition,
  type StateEdgeElement,
  type StateNodeElement,
  type BlockDiagramDefinition,
  type BlockNodeElement,
  type BlockLayerElement,
  type BlockEdgeElement,
} from './schema';

export {
  buildDiagramFlow,
  getDiagramContentHeight,
  LAYOUT,
  type DiagramEdge,
  type DiagramNode,
} from './layout';

export {
  buildDiagramCssVariables,
  DEFAULT_CONNECTOR_LABEL_BACKGROUND,
  DEFAULT_DIAGRAM_GRID_COLOR,
  mergeDiagramTokenSets,
  PROJECT_DIAGRAM_THEME_FILENAME,
  parseDiagramThemeSource,
  resolveActiveDiagramTokens,
  resolveDiagramTheme,
  type ResolvedDiagramTheme,
} from './diagram-tokens';

export { nodeTypes } from './nodes';
export { edgeTypes } from './edges';

export {
  extractMarkdocText,
  formatMarkdocForInspector,
  isMarkdocContentValue,
  isMarkdocNodeValue,
  markdocFromPlainText,
  normalizeMarkdocNodes,
  renderMarkdocNode,
  renderMarkdocNodes,
  renderMarkdocTag,
  truncateMarkdocNodes,
} from './markdoc';

export {
  getOverviewIconMeta,
  humanizeOverviewIconName,
  type OverviewIconSet,
} from './overview-icons';
