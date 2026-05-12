export interface MarkdocTag {
  $$mdtype?: 'Tag';
  name: string;
  attributes?: Record<string, unknown>;
  children?: MarkdocNode[];
}

export type MarkdocNode = string | MarkdocTag;
export type MarkdocContent = MarkdocNode | MarkdocNode[];

export interface DiagramPosition {
  x: number;
  y: number;
}

export type DiagramSize = 'small' | 'medium' | 'large';
export type DiagramPositioning = 'auto' | 'manual';
export type DiagramHandlePosition = 'top' | 'right' | 'bottom' | 'left';
export type DiagramConnectorState = 'default' | 'accent' | 'success' | 'warning' | 'danger';
export type DiagramConnectorLineStyle = 'solid' | 'dashed';
export type DiagramConnectorInheritance = 'auto' | 'source' | 'target' | 'none';

export interface DiagramCanvasTokenSet {
  background?: string;
  gridColor?: string;
}

export interface DiagramNodeTextTokenSet {
  default?: string;
  heading?: string;
  label?: string;
  muted?: string;
  faint?: string;
  link?: string;
}

export interface DiagramStateSurfaceTokenSet {
  background?: string;
  border?: string;
}

export interface DiagramNodeStateTokenSet {
  accent?: DiagramStateSurfaceTokenSet;
  success?: DiagramStateSurfaceTokenSet;
  warning?: DiagramStateSurfaceTokenSet;
  danger?: DiagramStateSurfaceTokenSet;
}

export interface DiagramNodeTokenSet {
  background?: string;
  backgroundRaised?: string;
  backgroundSubtle?: string;
  border?: string;
  separator?: string;
  separatorSubtle?: string;
  shadow?: string;
  text?: DiagramNodeTextTokenSet;
  states?: DiagramNodeStateTokenSet;
}

export interface DiagramConnectorTokenSet {
  default?: string;
  accent?: string;
  success?: string;
  warning?: string;
  danger?: string;
  labelBackground?: string;
}

export interface DiagramSequenceActorTokenSet {
  default?: string;
  accent?: string;
  success?: string;
  warning?: string;
  lifeline?: string;
}

export interface DiagramTokenSet {
  canvas?: DiagramCanvasTokenSet;
  node?: DiagramNodeTokenSet;
  connector?: DiagramConnectorTokenSet;
  sequenceActor?: DiagramSequenceActorTokenSet;
}

export interface DiagramTokens {
  light?: DiagramTokenSet;
  dark?: DiagramTokenSet;
}

export interface DiagramConnectorAppearance {
  state?: DiagramConnectorState;
  color?: string;
  lineStyle?: DiagramConnectorLineStyle;
  inheritColorFrom?: DiagramConnectorInheritance;
}

export interface DiagramConnectionElement extends DiagramConnectorAppearance {
  id: string;
  type: string;
  source: string;
  target: string;
  arrowHeadType?: 'arrowclosed';
  label?: string;
  labelStyle?: Record<string, unknown>;
  labelBgStyle?: Record<string, unknown>;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface SequenceActorElement {
  id: string;
  type: 'sequenceActor';
  data: {
    heading: MarkdocContent;
    index: number;
    color: 'default' | 'success' | 'accent' | 'warning';
    rows: number;
  };
  position?: DiagramPosition;
}

export interface SequenceActionElement {
  id: string;
  type: 'sequenceAction';
  data: {
    text: MarkdocContent;
    row: number;
    from: string;
    to: string;
    event?: MarkdocContent | string;
  };
  position?: DiagramPosition;
}

export interface SequenceEdgeElement extends DiagramConnectionElement {
  type: 'smoothstep' | 'dashed' | string;
}

export interface SequenceDiagramDefinition {
  type: 'sequence';
  name?: string;
  description: string;
  size: DiagramSize;
  height?: number;
  positioning: DiagramPositioning;
  tokens?: DiagramTokens;
  elements: Array<
    SequenceActorElement | SequenceActionElement | SequenceEdgeElement
  >;
}

export interface EntityRow {
  name: string;
  value: MarkdocContent;
  handle: string | null;
}

export interface EntityElement {
  id: string;
  type: 'entity';
  data: {
    header: MarkdocContent;
    rows: EntityRow[];
    handles: string[];
  };
  position: DiagramPosition;
}

export interface EntityEdgeElement extends DiagramConnectionElement {
  type: 'step' | 'bend' | 'default' | 'straight' | string;
}

export interface EntityDiagramDefinition {
  type: 'entity';
  name?: string;
  description: string;
  size: DiagramSize;
  height?: number;
  positioning: DiagramPositioning;
  tokens?: DiagramTokens;
  elements: Array<EntityElement | EntityEdgeElement>;
}

export interface OverviewIconElement {
  id: string;
  type: 'icon';
  data: {
    icon: string;
    label?: string;
    text: MarkdocContent;
    size: 'auto' | 'small' | 'medium' | 'large';
    color: string;
  };
  position: DiagramPosition;
}

export interface OverviewTextElement {
  id: string;
  type: 'text';
  width?: number;
  data: {
    text: MarkdocContent;
    size: 'auto' | 'small' | 'medium' | 'large';
    color: string;
  };
  position: DiagramPosition;
}

export interface OverviewEdgeElement extends DiagramConnectionElement {
  type: 'default' | 'straight' | 'step' | 'bend' | 'raised' | string;
  routing?: EdgeRouting;
}

export interface OverviewDiagramDefinition {
  type: 'overview';
  name?: string;
  description: string;
  size: DiagramSize;
  height?: number;
  positioning: DiagramPositioning;
  tokens?: DiagramTokens;
  elements: Array<OverviewIconElement | OverviewTextElement | OverviewEdgeElement>;
}

export interface StateNodeElement {
  id: string;
  type: 'state';
  x?: number;
  y?: number;
  col?: number;
  row?: number;
  width?: number;
  height?: number;
  data: {
    text: MarkdocContent;
    state?: string;
  };
}

export interface BlockNodeElement {
  id: string;
  type: 'block';
  x?: number;
  y?: number;
  col?: number;
  row?: number;
  width?: number;
  height?: number;
  data: {
    text: MarkdocContent;
    state?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
    subtitle?: MarkdocContent;
  };
}

export interface BlockLayerElement {
  id: string;
  type: 'layer';
  x: number;
  y: number;
  width: number;
  height: number;
  data: {
    title: MarkdocContent;
    children?: string[];
    state?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
  };
}
export interface EdgeRouting {
  sourceOffset?: number;
  targetOffset?: number;
  bendX?: number;
  bendY?: number;
  elbowX?: number;
  elbowY?: number;
  trackY?: number;
}

export interface StateEdgeElement {
  id?: string;
  from: string;
  to: string;
  fromPosition?: DiagramHandlePosition | 'auto';
  toPosition?: DiagramHandlePosition | 'auto';
  routing?: EdgeRouting;
  label?: string;
  type?: 'default' | 'straight' | 'step' | 'bend' | 'raised' | string;
  style?: 'default' | 'straight' | 'step' | 'bend' | 'raised' | string;
  arrowHeadType?: 'arrowclosed';
  labelStyle?: Record<string, unknown>;
  labelBgStyle?: Record<string, unknown>;
  state?: DiagramConnectorState;
  color?: string;
  lineStyle?: DiagramConnectorLineStyle;
  inheritColorFrom?: DiagramConnectorInheritance;
}

export interface BlockEdgeElement {
  id?: string;
  from: string;
  to: string;
  type?: 'straight' | 'step' | 'bend';
  label?: string;
  labelStyle?: Record<string, unknown>;
  labelBgStyle?: Record<string, unknown>;
  state?: DiagramConnectorState;
  color?: string;
  lineStyle?: DiagramConnectorLineStyle;
  routing?: EdgeRouting;
  arrowHeadType?: 'arrowclosed';
  fromPosition?: DiagramHandlePosition;
  toPosition?: DiagramHandlePosition;
}

export interface StateDiagramDefinition {
  type: 'state';
  name?: string;
  description: string;
  size: DiagramSize;
  height?: number;
  positioning: DiagramPositioning;
  tokens?: DiagramTokens;
  elements: Array<StateNodeElement | StateEdgeElement>;
}
export interface BlockDiagramDefinition {
  type: 'block';
  name?: string;
  description: string;
  size: DiagramSize;
  height?: number;
  positioning: DiagramPositioning;
  tokens?: DiagramTokens;
  elements: Array<BlockNodeElement | BlockLayerElement | BlockEdgeElement>;
}


export type DiagramDefinition =
  | SequenceDiagramDefinition
  | EntityDiagramDefinition
  | OverviewDiagramDefinition
  | StateDiagramDefinition
  | BlockDiagramDefinition;

export interface DiagramThemeDefinition {
  type: 'diagram-theme';
  tokens: DiagramTokens;
}

export interface DiagramFileMetadata {
  name?: string;
  type: DiagramDefinition['type'];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasString(value: Record<string, unknown>, key: string) {
  return typeof value[key] === 'string';
}

function hasNumber(value: Record<string, unknown>, key: string) {
  return typeof value[key] === 'number';
}

function hasDefinedProperty(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key) && value[key] !== undefined;
}

function isPosition(value: unknown): value is DiagramPosition {
  return isObject(value) && typeof value.x === 'number' && typeof value.y === 'number';
}

function isMarkdocContent(value: unknown) {
  return typeof value === 'string' || Array.isArray(value) || isObject(value);
}

function assertOptionalString(
  value: unknown,
  path: string,
): asserts value is string | undefined {
  if (value !== undefined && typeof value !== 'string') {
    throw new Error(`${path} must be a string.`);
  }
}

function assertOptionalNumber(
  value: unknown,
  path: string,
): asserts value is number | undefined {
  if (value !== undefined && typeof value !== 'number') {
    throw new Error(`${path} must be a number.`);
  }
}

function assertOptionalTokenSurface(
  value: unknown,
  path: string,
): asserts value is DiagramStateSurfaceTokenSet | undefined {
  if (value === undefined) {
    return;
  }

  if (!isObject(value)) {
    throw new Error(`${path} must be an object.`);
  }

  assertOptionalString(value.background, `${path}.background`);
  assertOptionalString(value.border, `${path}.border`);
}

function assertOptionalDiagramTokenSet(
  value: unknown,
  path: string,
): asserts value is DiagramTokenSet | undefined {
  if (value === undefined) {
    return;
  }

  if (!isObject(value)) {
    throw new Error(`${path} must be an object.`);
  }

  if (value.canvas !== undefined) {
    if (!isObject(value.canvas)) {
      throw new Error(`${path}.canvas must be an object.`);
    }

    assertOptionalString(value.canvas.background, `${path}.canvas.background`);
    assertOptionalString(value.canvas.gridColor, `${path}.canvas.gridColor`);
  }

  if (value.node !== undefined) {
    if (!isObject(value.node)) {
      throw new Error(`${path}.node must be an object.`);
    }

    assertOptionalString(value.node.background, `${path}.node.background`);
    assertOptionalString(
      value.node.backgroundRaised,
      `${path}.node.backgroundRaised`,
    );
    assertOptionalString(
      value.node.backgroundSubtle,
      `${path}.node.backgroundSubtle`,
    );
    assertOptionalString(value.node.border, `${path}.node.border`);
    assertOptionalString(value.node.separator, `${path}.node.separator`);
    assertOptionalString(
      value.node.separatorSubtle,
      `${path}.node.separatorSubtle`,
    );
    assertOptionalString(value.node.shadow, `${path}.node.shadow`);

    if (value.node.text !== undefined) {
      if (!isObject(value.node.text)) {
        throw new Error(`${path}.node.text must be an object.`);
      }

      assertOptionalString(value.node.text.default, `${path}.node.text.default`);
      assertOptionalString(value.node.text.heading, `${path}.node.text.heading`);
      assertOptionalString(value.node.text.label, `${path}.node.text.label`);
      assertOptionalString(value.node.text.muted, `${path}.node.text.muted`);
      assertOptionalString(value.node.text.faint, `${path}.node.text.faint`);
      assertOptionalString(value.node.text.link, `${path}.node.text.link`);
    }

    if (value.node.states !== undefined) {
      if (!isObject(value.node.states)) {
        throw new Error(`${path}.node.states must be an object.`);
      }

      assertOptionalTokenSurface(
        value.node.states.accent,
        `${path}.node.states.accent`,
      );
      assertOptionalTokenSurface(
        value.node.states.success,
        `${path}.node.states.success`,
      );
      assertOptionalTokenSurface(
        value.node.states.warning,
        `${path}.node.states.warning`,
      );
      assertOptionalTokenSurface(
        value.node.states.danger,
        `${path}.node.states.danger`,
      );
    }
  }

  if (value.connector !== undefined) {
    if (!isObject(value.connector)) {
      throw new Error(`${path}.connector must be an object.`);
    }

    assertOptionalString(value.connector.default, `${path}.connector.default`);
    assertOptionalString(value.connector.accent, `${path}.connector.accent`);
    assertOptionalString(value.connector.success, `${path}.connector.success`);
    assertOptionalString(value.connector.warning, `${path}.connector.warning`);
    assertOptionalString(value.connector.danger, `${path}.connector.danger`);
    assertOptionalString(
      value.connector.labelBackground,
      `${path}.connector.labelBackground`,
    );
  }

  if (value.sequenceActor !== undefined) {
    if (!isObject(value.sequenceActor)) {
      throw new Error(`${path}.sequenceActor must be an object.`);
    }

    assertOptionalString(
      value.sequenceActor.default,
      `${path}.sequenceActor.default`,
    );
    assertOptionalString(
      value.sequenceActor.accent,
      `${path}.sequenceActor.accent`,
    );
    assertOptionalString(
      value.sequenceActor.success,
      `${path}.sequenceActor.success`,
    );
    assertOptionalString(
      value.sequenceActor.warning,
      `${path}.sequenceActor.warning`,
    );
    assertOptionalString(
      value.sequenceActor.lifeline,
      `${path}.sequenceActor.lifeline`,
    );
  }
}

export function assertDiagramTokens(
  value: unknown,
  path = 'tokens',
): asserts value is DiagramTokens {
  if (!isObject(value)) {
    throw new Error(`${path} must be an object.`);
  }

  assertOptionalDiagramTokenSet(value.light, `${path}.light`);
  assertOptionalDiagramTokenSet(value.dark, `${path}.dark`);
}

function assertCommonDefinitionShape(value: Record<string, unknown>) {
  assertOptionalString(value.name, 'Diagram definition name');

  if (!hasString(value, 'description')) {
    throw new Error('Diagram definition requires a string description.');
  }

  if (!Array.isArray(value.elements) || value.elements.length === 0) {
    throw new Error('Diagram definition requires a non-empty elements array.');
  }
}

function assertConnectionElement(
  element: Record<string, unknown>,
  index: number,
  idForMessage?: string,
) {
  if (!hasString(element, 'source') || !hasString(element, 'target')) {
    throw new Error(
      `Edge element ${idForMessage ?? index} is missing source or target.`,
    );
  }
}

function assertSequenceElements(elements: SequenceDiagramDefinition['elements']) {
  elements.forEach((element, index) => {
    if (!isObject(element) || !hasString(element, 'id') || !hasString(element, 'type')) {
      throw new Error(`Element ${index} is missing an id or type.`);
    }

    if (element.type === 'sequenceActor') {
      if (
        !isObject(element.data) ||
        typeof element.data.index !== 'number' ||
        typeof element.data.rows !== 'number' ||
        !isMarkdocContent(element.data.heading)
      ) {
        throw new Error(`Actor element ${element.id} is missing data.index.`);
      }

      return;
    }

    if (element.type === 'sequenceAction') {
      if (
        !isObject(element.data) ||
        typeof element.data.row !== 'number' ||
        typeof element.data.from !== 'string' ||
        typeof element.data.to !== 'string' ||
        !isMarkdocContent(element.data.text)
      ) {
        throw new Error(
          `Action element ${element.id} is missing row, from, or to data.`,
        );
      }

      return;
    }

    assertConnectionElement(element, index, element.id);
  });
}

function assertEntityElements(elements: EntityDiagramDefinition['elements']) {
  elements.forEach((element, index) => {
    if (!isObject(element) || !hasString(element, 'id')) {
      throw new Error(`Element ${index} is missing an id.`);
    }

    if (element.type === 'entity') {
      if (
        !isPosition(element.position) ||
        !isObject(element.data) ||
        !isMarkdocContent(element.data.header) ||
        !Array.isArray(element.data.rows) ||
        !Array.isArray(element.data.handles)
      ) {
        throw new Error(
          `Entity element ${element.id} is missing position, header, rows, or handles.`,
        );
      }

      element.data.rows.forEach((row, rowIndex) => {
        if (
          !isObject(row) ||
          typeof row.name !== 'string' ||
          !isMarkdocContent(row.value) ||
          !(typeof row.handle === 'string' || row.handle === null)
        ) {
          throw new Error(
            `Entity element ${element.id} row ${rowIndex} is invalid.`,
          );
        }
      });

      return;
    }

    assertConnectionElement(element, index, element.id);
  });
}

function assertOverviewElements(elements: OverviewDiagramDefinition['elements']) {
  elements.forEach((element, index) => {
    if (!isObject(element) || !hasString(element, 'id')) {
      throw new Error(`Element ${index} is missing an id.`);
    }

    if (element.type === 'icon') {
      if (
        !isPosition(element.position) ||
        !isObject(element.data) ||
        typeof element.data.icon !== 'string'
      ) {
        throw new Error(
          `Overview icon element ${element.id} is missing position or data.icon.`,
        );
      }

      assertOptionalString(
        element.data.label,
        `Overview icon element ${element.id} data.label`,
      );

      return;
    }

    if (element.type === 'text') {
      if (
        !isPosition(element.position) ||
        !isObject(element.data) ||
        !isMarkdocContent(element.data.text)
      ) {
        throw new Error(
          `Overview text element ${element.id} is missing position or data.text.`,
        );
      }

      assertOptionalNumber(element.width, `Overview text element ${element.id} width`);

      return;
    }

    assertConnectionElement(element, index, element.id);
  });
}

function hasGridOrAbsolutePosition(element: Record<string, unknown>) {
  const hasXY = hasNumber(element, 'x') && hasNumber(element, 'y');
  const hasGrid = hasNumber(element, 'col') && hasNumber(element, 'row');
  return hasXY || hasGrid;
}

function assertOptionalEdgeRouting(
  routing: unknown,
  path: string,
): asserts routing is EdgeRouting | undefined {
  if (routing === undefined) {
    return;
  }

  if (!isObject(routing)) {
    throw new Error(`${path} must be an object.`);
  }

  assertOptionalNumber(routing.sourceOffset, `${path}.sourceOffset`);
  assertOptionalNumber(routing.targetOffset, `${path}.targetOffset`);
  assertOptionalNumber(routing.bendX, `${path}.bendX`);
  assertOptionalNumber(routing.bendY, `${path}.bendY`);
  assertOptionalNumber(routing.elbowX, `${path}.elbowX`);
  assertOptionalNumber(routing.elbowY, `${path}.elbowY`);
  assertOptionalNumber(routing.trackY, `${path}.trackY`);
}

function assertStateElements(elements: StateDiagramDefinition['elements']) {
  elements.forEach((element, index) => {
    if (!isObject(element)) {
      throw new Error(`Element ${index} is invalid.`);
    }

    if (element.type === 'state') {
      if (
        !hasString(element, 'id') ||
        !hasGridOrAbsolutePosition(element) ||
        !isObject(element.data) ||
        !isMarkdocContent(element.data.text)
      ) {
        throw new Error(
          `State node ${hasString(element, 'id') ? element.id : index} is missing id, position (x/y or col/row), or data.text.`,
        );
      }

      assertOptionalNumber(element.width, `State node ${element.id} width`);
      assertOptionalNumber(element.height, `State node ${element.id} height`);

      return;
    }

    if (typeof element.from !== 'string' || typeof element.to !== 'string') {
      throw new Error(`State edge ${index} is missing from or to.`);
    }

    assertOptionalEdgeRouting(element.routing, `State edge ${index} routing`);
  });
}

function assertBlockElements(elements: BlockDiagramDefinition['elements']) {
  elements.forEach((element, index) => {
    if (!isObject(element)) {
      throw new Error(`Element ${index} is invalid.`);
    }

    if (element.type === 'block') {
      if (
        !hasString(element, 'id') ||
        !hasGridOrAbsolutePosition(element) ||
        !isObject(element.data) ||
        !isMarkdocContent(element.data.text)
      ) {
        throw new Error(
          `Block node ${hasString(element, 'id') ? element.id : index} is missing id, position (x/y or col/row), or data.text.`,
        );
      }

      assertOptionalNumber(element.width, `Block node ${element.id} width`);
      assertOptionalNumber(element.height, `Block node ${element.id} height`);

      return;
    }

    if (element.type === 'layer') {
      if (
        !hasString(element, 'id') ||
        !hasNumber(element, 'x') ||
        !hasNumber(element, 'y') ||
        !hasNumber(element, 'width') ||
        !hasNumber(element, 'height') ||
        !isObject(element.data) ||
        !isMarkdocContent(element.data.title)
      ) {
        throw new Error(
          `Block layer ${hasString(element, 'id') ? element.id : index} is missing id, x, y, width, height, or data.title.`,
        );
      }

      return;
    }

    if (typeof element.from !== 'string' || typeof element.to !== 'string') {
      throw new Error(`Block edge ${index} is missing from or to.`);
    }

    assertOptionalEdgeRouting(element.routing, `Block edge ${index} routing`);
  });
}

/**
 * Validates that `value` is a well-formed {@link DiagramDefinition}.
 * Throws a descriptive `Error` if validation fails.
 *
 * @example
 * const raw = JSON.parse(source);
 * assertDiagramDefinition(raw); // throws if invalid
 * // raw is now typed as DiagramDefinition
 */
export function assertDiagramDefinition(
  value: unknown,
): asserts value is DiagramDefinition {
  if (!isObject(value)) {
    throw new Error('Diagram definition must be an object.');
  }

  if (!hasString(value, 'type')) {
    throw new Error('Diagram definition requires a string type.');
  }

  if (value.type === 'diagram-theme') {
    throw new Error('Use assertDiagramThemeDefinition() for diagram theme files.');
  }

  if (hasDefinedProperty(value, 'tokens')) {
    assertDiagramTokens(value.tokens);
  }

  assertCommonDefinitionShape(value);

  switch (value.type) {
    case 'sequence':
      assertSequenceElements(
        value.elements as SequenceDiagramDefinition['elements'],
      );
      return;
    case 'entity':
      assertEntityElements(value.elements as EntityDiagramDefinition['elements']);
      return;
    case 'overview':
      assertOverviewElements(
        value.elements as OverviewDiagramDefinition['elements'],
      );
      return;
    case 'state':
      assertStateElements(value.elements as StateDiagramDefinition['elements']);
      return;
    case 'block':
      assertBlockElements(value.elements as BlockDiagramDefinition['elements']);
      return;
    default:
      throw new Error(
        `Unsupported diagram type "${value.type}". Expected sequence, entity, overview, state, or block.`,
      );
  }
}

export function assertDiagramThemeDefinition(
  value: unknown,
): asserts value is DiagramThemeDefinition {
  if (!isObject(value)) {
    throw new Error('Diagram theme definition must be an object.');
  }

  if (value.type !== 'diagram-theme') {
    throw new Error('Diagram theme definition requires type "diagram-theme".');
  }

  if (!hasDefinedProperty(value, 'tokens')) {
    throw new Error('Diagram theme definition requires a tokens object.');
  }

  assertDiagramTokens(value.tokens);
}

export function assertSequenceDiagramDefinition(
  value: unknown,
): asserts value is SequenceDiagramDefinition {
  assertDiagramDefinition(value);

  if (value.type !== 'sequence') {
    throw new Error('Only diagrams with type "sequence" are supported.');
  }
}

export function parseDiagramFileMetadata(source: string): DiagramFileMetadata | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(source) as unknown;
  } catch {
    return null;
  }

  if (!isObject(parsed) || !hasString(parsed, 'type')) {
    return null;
  }

  if (
    (parsed.type !== 'sequence' &&
      parsed.type !== 'entity' &&
      parsed.type !== 'overview' &&
      parsed.type !== 'state' &&
      parsed.type !== 'block') ||
    !hasString(parsed, 'size') ||
    !hasString(parsed, 'positioning')
  ) {
    return null;
  }

  const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';

  return {
    name: name.length > 0 ? name : undefined,
    type: parsed.type,
  };
}
