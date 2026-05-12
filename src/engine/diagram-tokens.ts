import type {
  DiagramNodeStateTokenSet,
  DiagramTokenSet,
  DiagramThemeDefinition,
  DiagramTokens,
} from './schema';
import { assertDiagramThemeDefinition } from './schema';

export const PROJECT_DIAGRAM_THEME_FILENAME = 'diagram-theme.json';
export const DEFAULT_DIAGRAM_GRID_COLOR = 'var(--diagram-grid-color, #d4dff0)';
export const DEFAULT_CONNECTOR_LABEL_BACKGROUND =
  'var(--connector-label-background, #f6f8fa)';

export interface ResolvedDiagramTheme {
  activeMode: 'light' | 'dark';
  cssVariables: Record<string, string>;
  gridColor: string;
  tokens: DiagramTokenSet;
}

function mergeStateSurfaces(
  base: DiagramNodeStateTokenSet | undefined,
  override: DiagramNodeStateTokenSet | undefined,
) {
  return {
    accent: {
      ...(base?.accent ?? {}),
      ...(override?.accent ?? {}),
    },
    success: {
      ...(base?.success ?? {}),
      ...(override?.success ?? {}),
    },
    danger: {
      ...(base?.danger ?? {}),
      ...(override?.danger ?? {}),
    },
    warning: {
      ...(base?.warning ?? {}),
      ...(override?.warning ?? {}),
    },
  };
}

export function mergeDiagramTokenSets(
  base: DiagramTokenSet | undefined,
  override: DiagramTokenSet | undefined,
): DiagramTokenSet {
  return {
    canvas: {
      ...(base?.canvas ?? {}),
      ...(override?.canvas ?? {}),
    },
    node: {
      ...(base?.node ?? {}),
      ...(override?.node ?? {}),
      text: {
        ...(base?.node?.text ?? {}),
        ...(override?.node?.text ?? {}),
      },
      states: mergeStateSurfaces(base?.node?.states, override?.node?.states),
    },
    connector: {
      ...(base?.connector ?? {}),
      ...(override?.connector ?? {}),
    },
    sequenceActor: {
      ...(base?.sequenceActor ?? {}),
      ...(override?.sequenceActor ?? {}),
    },
  };
}

function activeModeTokens(
  tokens: DiagramTokens | undefined,
  darkMode: boolean,
) {
  if (!tokens) {
    return undefined;
  }

  return darkMode ? tokens.dark : tokens.light;
}

export function resolveActiveDiagramTokens(options: {
  darkMode: boolean;
  diagramTokens?: DiagramTokens;
  projectTokens?: DiagramTokens;
}) {
  const projectModeTokens = activeModeTokens(options.projectTokens, options.darkMode);
  const diagramModeTokens = activeModeTokens(options.diagramTokens, options.darkMode);

  return mergeDiagramTokenSets(projectModeTokens, diagramModeTokens);
}

function addCssVariable(
  cssVariables: Record<string, string>,
  name: string,
  value: string | undefined,
) {
  if (!value) {
    return;
  }

  cssVariables[name] = value;
}

/**
 * Converts a {@link DiagramTokenSet} into a CSS variable map.
 * Spread the result onto a container element's `style` prop.
 *
 * @example
 * const vars = buildDiagramCssVariables(theme.tokens);
 * // { '--node-bg': '#fff', '--connector-stroke-default': '#b8c3d4', ... }
 */
export function buildDiagramCssVariables(tokens: DiagramTokenSet) {
  const cssVariables: Record<string, string> = {};

  addCssVariable(cssVariables, '--diagram-grid-color', tokens.canvas?.gridColor);
  addCssVariable(cssVariables, '--node-bg', tokens.node?.background);
  addCssVariable(cssVariables, '--node-bg-raised', tokens.node?.backgroundRaised);
  addCssVariable(cssVariables, '--node-bg-subtle', tokens.node?.backgroundSubtle);
  addCssVariable(cssVariables, '--node-border', tokens.node?.border);
  addCssVariable(cssVariables, '--node-separator', tokens.node?.separator);
  addCssVariable(
    cssVariables,
    '--node-separator-subtle',
    tokens.node?.separatorSubtle,
  );
  addCssVariable(cssVariables, '--node-shadow', tokens.node?.shadow);
  addCssVariable(cssVariables, '--node-text', tokens.node?.text?.default);
  addCssVariable(cssVariables, '--node-text-heading', tokens.node?.text?.heading);
  addCssVariable(cssVariables, '--node-text-label', tokens.node?.text?.label);
  addCssVariable(cssVariables, '--node-text-muted', tokens.node?.text?.muted);
  addCssVariable(cssVariables, '--node-text-faint', tokens.node?.text?.faint);
  addCssVariable(cssVariables, '--node-link', tokens.node?.text?.link);
  addCssVariable(
    cssVariables,
    '--node-state-accent-bg',
    tokens.node?.states?.accent?.background,
  );
  addCssVariable(
    cssVariables,
    '--node-state-accent-border',
    tokens.node?.states?.accent?.border,
  );
  addCssVariable(
    cssVariables,
    '--node-state-success-bg',
    tokens.node?.states?.success?.background,
  );
  addCssVariable(
    cssVariables,
    '--node-state-success-border',
    tokens.node?.states?.success?.border,
  );
  addCssVariable(
    cssVariables,
    '--node-state-danger-bg',
    tokens.node?.states?.danger?.background,
  );
  addCssVariable(
    cssVariables,
    '--node-state-danger-border',
    tokens.node?.states?.danger?.border,
  );
  addCssVariable(
    cssVariables,
    '--node-state-warning-bg',
    tokens.node?.states?.warning?.background,
  );
  addCssVariable(
    cssVariables,
    '--node-state-warning-border',
    tokens.node?.states?.warning?.border,
  );
  addCssVariable(
    cssVariables,
    '--connector-stroke-default',
    tokens.connector?.default,
  );
  addCssVariable(
    cssVariables,
    '--connector-stroke-accent',
    tokens.connector?.accent,
  );
  addCssVariable(
    cssVariables,
    '--connector-stroke-success',
    tokens.connector?.success,
  );
  addCssVariable(
    cssVariables,
    '--connector-stroke-danger',
    tokens.connector?.danger,
  );
  addCssVariable(
    cssVariables,
    '--connector-stroke-warning',
    tokens.connector?.warning,
  );
  addCssVariable(
    cssVariables,
    '--connector-label-background',
    tokens.connector?.labelBackground,
  );
  addCssVariable(
    cssVariables,
    '--sequence-actor-default',
    tokens.sequenceActor?.default,
  );
  addCssVariable(
    cssVariables,
    '--sequence-actor-accent',
    tokens.sequenceActor?.accent,
  );
  addCssVariable(
    cssVariables,
    '--sequence-actor-success',
    tokens.sequenceActor?.success,
  );
  addCssVariable(
    cssVariables,
    '--sequence-actor-warning',
    tokens.sequenceActor?.warning,
  );
  addCssVariable(
    cssVariables,
    '--sequence-actor-lifeline',
    tokens.sequenceActor?.lifeline,
  );

  return cssVariables;
}

/**
 * Merges project-level and diagram-level tokens for the active light/dark mode.
 * Returns resolved CSS variables and the active token set.
 */
export function resolveDiagramTheme(options: {
  darkMode: boolean;
  diagramTokens?: DiagramTokens;
  projectTokens?: DiagramTokens;
}): ResolvedDiagramTheme {
  const tokens = resolveActiveDiagramTokens(options);

  return {
    activeMode: options.darkMode ? 'dark' : 'light',
    cssVariables: buildDiagramCssVariables(tokens),
    gridColor: tokens.canvas?.gridColor ?? DEFAULT_DIAGRAM_GRID_COLOR,
    tokens,
  };
}

export function parseDiagramThemeSource(
  source: string,
  label = PROJECT_DIAGRAM_THEME_FILENAME,
) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(source) as unknown;
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Unknown parse failure.';
    throw new Error(`${label} contains invalid JSON. ${message}`);
  }

  try {
    assertDiagramThemeDefinition(parsed);
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : 'Unknown validation failure.';
    throw new Error(`${label} is not a valid diagram theme. ${message}`);
  }

  return (parsed as DiagramThemeDefinition).tokens;
}
