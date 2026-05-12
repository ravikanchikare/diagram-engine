import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DIAGRAM_GRID_COLOR,
  buildDiagramCssVariables,
  parseDiagramThemeSource,
  resolveDiagramTheme,
} from './diagram-tokens';

describe('resolveDiagramTheme', () => {
  it('merges project tokens and per-diagram overrides for the active mode', () => {
    const resolved = resolveDiagramTheme({
      darkMode: false,
      projectTokens: {
        light: {
          canvas: {
            background: 'linear-gradient(#fff, #eef2f8)',
            gridColor: '#dde7f3',
          },
          connector: {
            default: '#9aa7b8',
          },
          node: {
            text: {
              heading: '#223344',
            },
          },
        },
      },
      diagramTokens: {
        light: {
          canvas: {
            gridColor: '#123456',
          },
          connector: {
            labelBackground: '#f6f8fa',
          },
          node: {
            states: {
              accent: {
                border: '#5577aa',
              },
              warning: {
                background: '#fff2cc',
              },
            },
          },
        },
      },
    });

    expect(resolved.gridColor).toBe('#123456');
    expect(resolved.tokens.canvas).toEqual({
      background: 'linear-gradient(#fff, #eef2f8)',
      gridColor: '#123456',
    });
    expect(resolved.tokens.connector).toEqual({
      default: '#9aa7b8',
      labelBackground: '#f6f8fa',
    });
    expect(resolved.cssVariables).toMatchObject({
      '--connector-label-background': '#f6f8fa',
      '--connector-stroke-default': '#9aa7b8',
      '--diagram-grid-color': '#123456',
      '--node-state-accent-border': '#5577aa',
      '--node-state-warning-bg': '#fff2cc',
      '--node-text-heading': '#223344',
    });
  });

  it('uses only the active-mode token block and otherwise falls back to CSS defaults', () => {
    const resolved = resolveDiagramTheme({
      darkMode: true,
      projectTokens: {
        light: {
          canvas: {
            gridColor: '#ffffff',
          },
        },
        dark: {
          connector: {
            success: '#73c96a',
          },
        },
      },
    });

    expect(resolved.gridColor).toBe(DEFAULT_DIAGRAM_GRID_COLOR);
    expect(resolved.cssVariables).toMatchObject({
      '--connector-stroke-success': '#73c96a',
    });
    expect(resolved.cssVariables).not.toHaveProperty('--diagram-grid-color');
  });
});

describe('buildDiagramCssVariables', () => {
  it('maps curated token fields onto CSS variables', () => {
    expect(
      buildDiagramCssVariables({
        connector: {
          accent: '#2e7bf6',
        },
        sequenceActor: {
          lifeline: 'linear-gradient(#111, #222)',
        },
      }),
    ).toEqual({
      '--connector-stroke-accent': '#2e7bf6',
      '--sequence-actor-lifeline': 'linear-gradient(#111, #222)',
    });
  });
});

describe('parseDiagramThemeSource', () => {
  it('parses valid theme JSON and returns its tokens', () => {
    const tokens = parseDiagramThemeSource(
      JSON.stringify({
        type: 'diagram-theme',
        tokens: {
          light: {
            canvas: {
              background: '#ffffff',
            },
          },
        },
      }),
      'project/diagram-theme.json',
    );

    expect(tokens).toEqual({
      light: {
        canvas: {
          background: '#ffffff',
        },
      },
    });
  });

  it('adds file context to invalid theme errors', () => {
    expect(() => {
      parseDiagramThemeSource(
        JSON.stringify({
          type: 'diagram-theme',
          tokens: {
            light: {
              connector: {
                default: 3,
              },
            },
          },
        }),
        'project/diagram-theme.json',
      );
    }).toThrow(
      'project/diagram-theme.json is not a valid diagram theme. tokens.light.connector.default must be a string.',
    );
  });
});
