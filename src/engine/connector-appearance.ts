import type {
  DiagramConnectorAppearance,
  DiagramConnectorInheritance,
  DiagramConnectorLineStyle,
  DiagramConnectorState,
} from './schema';

export interface ConnectorEndpointAppearance {
  color?: string;
}

export interface ResolvedConnectorAppearance {
  color: string;
  markerColor: string;
  lineStyle: DiagramConnectorLineStyle;
}

const DEFAULT_CONNECTOR_COLOR = 'var(--connector-stroke-default, #b8c3d4)';
const ACCENT_CONNECTOR_COLOR = 'var(--connector-stroke-accent, #2e7bf6)';
const SUCCESS_CONNECTOR_COLOR = 'var(--connector-stroke-success, #49b53f)';
const WARNING_CONNECTOR_COLOR = 'var(--connector-stroke-warning, #d4a03a)';
const DANGER_CONNECTOR_COLOR = 'var(--connector-stroke-danger, #a2483f)';

// Sequence lane edge colors — match the lane's visual color so arrows
// originating from or merging into a lane use that lane's accent.
const SEQ_LANE_DEFAULT = 'var(--sequence-actor-default, #49b53f)';
const SEQ_LANE_ACCENT  = 'var(--sequence-actor-accent, #2e7bf6)';
const SEQ_LANE_SUCCESS = 'var(--sequence-actor-success, #f5b731)';
const SEQ_LANE_WARNING = 'var(--sequence-actor-warning, #e5722c)';

function resolveSemanticConnectorColor(state: DiagramConnectorState) {
  switch (state) {
    case 'accent':
      return ACCENT_CONNECTOR_COLOR;
    case 'success':
      return SUCCESS_CONNECTOR_COLOR;
    case 'warning':
      return WARNING_CONNECTOR_COLOR;
    case 'danger':
      return DANGER_CONNECTOR_COLOR;
    default:
      return DEFAULT_CONNECTOR_COLOR;
  }
}

function resolveInheritedColor(
  strategy: DiagramConnectorInheritance | undefined,
  endpoints: {
    source?: ConnectorEndpointAppearance;
    target?: ConnectorEndpointAppearance;
  },
) {
  switch (strategy ?? 'auto') {
    case 'source':
      return endpoints.source?.color;
    case 'target':
      return endpoints.target?.color;
    case 'none':
      return undefined;
    case 'auto':
    default:
      return endpoints.source?.color ?? endpoints.target?.color;
  }
}

export function resolveConnectorAppearance(
  edge: Pick<
    DiagramConnectorAppearance,
    'color' | 'state' | 'lineStyle' | 'inheritColorFrom'
  > & {
    type?: string;
  },
  endpoints: {
    source?: ConnectorEndpointAppearance;
    target?: ConnectorEndpointAppearance;
  } = {},
  _mode: 'light' | 'dark' = 'light',
): ResolvedConnectorAppearance {
  const lineStyle =
    edge.lineStyle ?? (edge.type === 'dashed' ? 'dashed' : 'solid');
  const inheritedColor = resolveInheritedColor(edge.inheritColorFrom, endpoints);

  const color =
    edge.color ??
    (edge.state ? resolveSemanticConnectorColor(edge.state) : undefined) ??
    inheritedColor ??
    DEFAULT_CONNECTOR_COLOR;

  return {
    color,
    markerColor: color,
    lineStyle,
  };
}

export function getStateNodeConnectorColor(state?: string) {
  switch (state) {
    case 'accent':
      return resolveSemanticConnectorColor('accent');
    case 'success':
      return resolveSemanticConnectorColor('success');
    case 'warning':
      return resolveSemanticConnectorColor('warning');
    case 'danger':
      return resolveSemanticConnectorColor('danger');
    default:
      return undefined;
  }
}

export function getSequenceActorConnectorColor(color: string) {
  switch (color) {
    case 'accent':
      return SEQ_LANE_ACCENT;
    case 'success':
      return SEQ_LANE_SUCCESS;
    case 'warning':
      return SEQ_LANE_WARNING;
    default:
      return SEQ_LANE_DEFAULT;
  }
}

export function getOverviewNodeConnectorColor(color?: string) {
  switch (color) {
    case 'accent':
      return resolveSemanticConnectorColor('accent');
    case 'success':
      return resolveSemanticConnectorColor('success');
    case 'danger':
      return resolveSemanticConnectorColor('danger');
    case 'default':
    case undefined:
    case null:
      return undefined;
    default:
      return color;
  }
}
