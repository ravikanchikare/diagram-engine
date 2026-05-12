import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { INSPECTOR_WIDTH_STORAGE_KEY } from './app/layout-constants';
import { workspaceExampleFiles } from './data/libraryRegistry';
import { BROWSER_DRAFTS_STORAGE_KEY } from './lib/browser-drafts';
import type { FileSystemExamplesDirectory } from './lib/file-system';

const {
  toJpegMock,
  toPngMock,
  deleteDirectoryHandleMock,
  loadDirectoryHandleMock,
  pickExamplesDirectoryMock,
  readExamplesDirectoryMock,
  saveTextFileToDiskMock,
  storeDirectoryHandleMock,
  supportsDirectoryPickerMock,
  supportsSaveFilePickerMock,
  toastSuccessMock,
  toastErrorMock,
  writeExampleFileMock,
} = vi.hoisted(() => {
  return {
    toJpegMock: vi.fn(),
    toPngMock: vi.fn(),
    deleteDirectoryHandleMock: vi.fn(),
    loadDirectoryHandleMock: vi.fn(),
    pickExamplesDirectoryMock: vi.fn(),
    readExamplesDirectoryMock: vi.fn(),
    saveTextFileToDiskMock: vi.fn(),
    storeDirectoryHandleMock: vi.fn(),
    supportsDirectoryPickerMock: vi.fn(),
    supportsSaveFilePickerMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
    writeExampleFileMock: vi.fn(),
  };
});

vi.mock('html-to-image', () => ({
  toJpeg: toJpegMock,
  toPng: toPngMock,
}));

vi.mock('sonner', async () => {
  const React = await import('react');

  return {
    Toaster: ({
      position,
      theme,
    }: {
      position?: string;
      theme?: string;
    }) => (
      <div
        data-position={position}
        data-testid="toaster"
        data-theme={theme}
      />
    ),
    toast: {
      success: toastSuccessMock,
      error: toastErrorMock,
    },
  };
});

vi.mock('./lib/file-system', async () => {
  const actual = await vi.importActual<typeof import('./lib/file-system')>('./lib/file-system');

  return {
    ...actual,
    deleteDirectoryHandle: deleteDirectoryHandleMock,
    loadDirectoryHandle: loadDirectoryHandleMock,
    pickExamplesDirectory: pickExamplesDirectoryMock,
    readExamplesDirectory: readExamplesDirectoryMock,
    saveTextFileToDisk: saveTextFileToDiskMock,
    storeDirectoryHandle: storeDirectoryHandleMock,
    supportsDirectoryPicker: supportsDirectoryPickerMock,
    supportsSaveFilePicker: supportsSaveFilePickerMock,
    writeExampleFile: writeExampleFileMock,
  };
});

vi.mock('./components/json-editor-pane', async () => {
  const React = await import('react');

  return {
    JsonEditorPane: React.forwardRef(function MockJsonEditorPane(
      {
        invalid,
        onChangeText,
        value,
      }: {
        invalid?: boolean;
        onChangeText: (value: string) => void;
        value: string;
      },
      ref: React.ForwardedRef<HTMLTextAreaElement>,
    ) {
      return (
        <textarea
          aria-invalid={Boolean(invalid)}
          aria-label="Diagram JSON"
          onChange={(event) => onChangeText(event.target.value)}
          ref={ref}
          value={value}
        />
      );
    }),
  };
});

vi.mock('./engine/DiagramCanvas', () => ({
  DiagramCanvas: ({
    definition,
    gridColor,
    inspectorPortalTarget,
    onDefinitionChange,
    revision,
    statusNotice,
    viewportToken,
  }: {
    definition: { type: string; description: string };
    gridColor?: string;
    inspectorPortalTarget?: HTMLElement | null;
    onDefinitionChange?: (definition: { type: string; description: string }) => void;
    revision: number;
    statusNotice?: string;
    viewportToken?: string;
  }) => (
    <div>
      <div
        data-grid-color={gridColor}
        data-testid="diagram-canvas"
        data-has-inspector-target={inspectorPortalTarget ? 'true' : 'false'}
        data-viewport-token={viewportToken}
      >
        {definition.type}:{definition.description || '(no description)'} / rev {revision}
      </div>
      {statusNotice ? (
        <div
          data-testid="canvas-status-notice"
          role="status"
        >
          {statusNotice}
        </div>
      ) : null}
      {onDefinitionChange ? (
        <button
          onClick={() =>
            onDefinitionChange({
              ...definition,
              description: `${definition.description} (edited)`,
            })
          }
          type="button"
        >
          Apply visual edit
        </button>
      ) : null}
    </div>
  ),
}));

describe('<App />', () => {
  function createDirectoryHandle(
    name: string,
    options: {
      resolvablePaths?: string[];
      queryPermission?: PermissionState;
      requestPermission?: PermissionState;
    } = {},
  ) {
    const resolvablePaths = new Set(
      options.resolvablePaths?.map((path) => path.split('/').filter(Boolean).join('/')) ?? [],
    );

    const hasDirectory = (path: string) => {
      return Array.from(resolvablePaths).some(
        (filePath) => filePath === path || filePath.startsWith(`${path}/`),
      );
    };

    const makeDirectory = (prefix = ''): FileSystemDirectoryHandle => {
      const directoryName = prefix.split('/').filter(Boolean).at(-1) ?? name;
      const handle = {
        async getDirectoryHandle(segment: string) {
          const nextPrefix = [prefix, segment].filter(Boolean).join('/');

          if (!hasDirectory(nextPrefix)) {
            throw new DOMException('Directory not found.', 'NotFoundError');
          }

          return makeDirectory(nextPrefix);
        },
        async getFileHandle(filename: string) {
          const filePath = [prefix, filename].filter(Boolean).join('/');

          if (!resolvablePaths.has(filePath)) {
            throw new DOMException('File not found.', 'NotFoundError');
          }

          return {
            kind: 'file',
            name: filename,
          } as unknown as FileSystemFileHandle;
        },
        isSameEntry: vi.fn(async (other: { name?: string }) => other?.name === name),
        kind: 'directory',
        name: directoryName,
      } as unknown as FileSystemDirectoryHandle & {
        queryPermission?: () => Promise<PermissionState>;
        requestPermission?: () => Promise<PermissionState>;
      };

      if (!prefix && options.queryPermission) {
        handle.queryPermission = vi.fn(async () => options.queryPermission!);
      }

      if (!prefix && options.requestPermission) {
        handle.requestPermission = vi.fn(async () => options.requestPermission!);
      }

      return handle;
    };

    return makeDirectory();
  }

  function createConnectedProjectFile(options: {
    description: string;
    filename: string;
    label: string;
    projectId: string;
    projectName: string;
    relativePath?: string;
  }) {
    const relativePath = options.relativePath ?? options.filename;

    return {
      filename: options.filename,
      id: `workspace:${options.projectId}:${relativePath.replace(/\.json$/i, '')}`,
      kind: 'workspace',
      label: options.label,
      projectId: options.projectId,
      projectName: options.projectName,
      relativePath,
      segments: relativePath.split('/'),
      source: createStateSource(options.description, {
        name: options.label,
      }),
      sourceKind: 'connected',
    } as const;
  }

  function createDirectoryFile(options: {
    description: string;
    filename: string;
    label?: string;
    relativePath?: string;
  }): FileSystemExamplesDirectory['files'][number] {
    const relativePath = options.relativePath ?? options.filename;

    return {
      diagramName: options.label,
      diagramType: 'state',
      filename: options.filename,
      relativePath,
      segments: relativePath.split('/'),
      source: createStateSource(options.description, {
        name: options.label,
      }),
    };
  }

  function writeStoredProjects(
    projects: Array<{
      files: unknown[];
      id: string;
      name: string;
    }>,
  ) {
    window.localStorage.setItem(
      'diagram-engine/connected-projects',
      JSON.stringify(projects),
    );
  }

  function editDescription(nextDescription: string) {
    fireEvent.change(getEditor(), {
      target: {
        value: getEditor().value.replace(
          /"description":\s*"[^"]+"/,
          `"description": "${nextDescription}"`,
        ),
      },
    });
  }

  function createStateSource(
    description: string,
    options?: {
      name?: string;
    },
  ) {
    return JSON.stringify({
      name: options?.name,
      description,
      elements: [
        {
          data: { text: ['Only node'] },
          id: 'only',
          type: 'state',
          x: 0,
          y: 0,
        },
      ],
      positioning: 'manual',
      size: 'medium',
      type: 'state',
    });
  }

  function createDirectoryResult(
    files: FileSystemExamplesDirectory['files'],
    themeSource: string | null = null,
  ): FileSystemExamplesDirectory {
    return {
      files,
      themeSource,
    };
  }

  function getEditor() {
    const existingEditor = screen.queryByRole('textbox', {
      name: /diagram json/i,
    });

    if (existingEditor) {
      return existingEditor as HTMLTextAreaElement;
    }

    const expandInspector = screen.queryByRole('button', { name: /expand inspector/i });
    if (expandInspector) {
      fireEvent.click(expandInspector);
    }

    const jsonTab =
      screen.queryByRole('tab', { name: /json view/i }) ??
      screen.queryByRole('button', { name: /json view/i });

    if (jsonTab) {
      fireEvent.click(jsonTab);
    }

    return screen.getByRole('textbox', {
      name: /diagram json/i,
    }) as HTMLTextAreaElement;
  }

  function getCanvasStatusNotice() {
    return screen.getByTestId('canvas-status-notice');
  }

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
    vi.restoreAllMocks();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    deleteDirectoryHandleMock.mockReset();
    loadDirectoryHandleMock.mockReset();
    pickExamplesDirectoryMock.mockReset();
    readExamplesDirectoryMock.mockReset();
    saveTextFileToDiskMock.mockReset();
    storeDirectoryHandleMock.mockReset();
    supportsDirectoryPickerMock.mockReset();
    supportsSaveFilePickerMock.mockReset();
    toJpegMock.mockReset();
    toPngMock.mockReset();
    toJpegMock.mockResolvedValue('data:image/jpeg;base64,abc');
    toPngMock.mockResolvedValue('data:image/png;base64,abc');
    writeExampleFileMock.mockReset();
    deleteDirectoryHandleMock.mockResolvedValue(undefined);
    loadDirectoryHandleMock.mockResolvedValue(null);
    storeDirectoryHandleMock.mockResolvedValue(undefined);
    supportsDirectoryPickerMock.mockReturnValue(false);
    supportsSaveFilePickerMock.mockReturnValue(false);
  });

  it('renders the flattened sidebar shell, project empty state, and workspace inspector by default', () => {
    render(<App />);

    expect(screen.getByText('AI SYSTEMS DESIGNER')).toBeInTheDocument();
    expect(
      screen.queryByText(
        /Browse live project files, starter diagrams, and saved drafts in one place\./i,
      ),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/^Workspace$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Projects$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Library$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/^Projects$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Library$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Drafts$/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Examples$/i)).not.toBeInTheDocument();
    expect(screen.getByText(/No projects yet/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Map transitions, statuses, and decision points\./i),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /add project/i }).length).toBeGreaterThan(0);
    expect(screen.getByText(/No drafts yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Save$/i })).toBeEnabled();
    expect(screen.getByRole('heading', { name: /api-discovery-flow-block\.json/i })).toBeInTheDocument();
    expect(screen.getByTestId('workspace-editor-pane')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-preview-pane')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /expand inspector/i }));
    expect(screen.getByRole('tab', { name: /^Inspector$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^JSON view$/i })).toBeInTheDocument();
    expect(getEditor().value).toContain('"type": "block"');
    expect(screen.getByTestId('diagram-canvas')).toHaveTextContent(
      'block:Incremental discovery flow as a block diagram: see the landscape, narrow the scope, preview the request, then execute with structured output. / rev 0',
    );
    expect(screen.getByTestId('diagram-canvas').getAttribute('data-grid-color')).toContain('#d4dff0');
  });

  it('loads another bundled library diagram from the Library section', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /^state$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Decision Rule$/i }));

    expect(getEditor().value).toContain('"type": "state"');
    expect(screen.getByTestId('diagram-canvas')).toHaveTextContent(
      'state:The decision rule: Claude Code delegates only when the intermediate work does not need to stay visible in the main thread. / rev 1',
    );
    expect(window.location.hash).toBe('#/project/state/decision-rule.json');
  });

  it('uses the diagram name for bundled library entries when available', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /^overview$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^state$/i }));

    expect(screen.getByRole('button', { name: /^Routing$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Theme Override Demo$/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^routing\.json$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^theme-override-demo\.json$/i }),
    ).not.toBeInTheDocument();
  });

  it('shows a validation error for invalid JSON payloads', () => {
    render(<App />);

    fireEvent.change(getEditor(), {
      target: {
        value: JSON.stringify({
          type: 'sequence',
          description: 'Broken payload',
          size: 'large',
          positioning: 'auto',
          elements: [],
        }),
      },
    });

    expect(getEditor()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent(
      /requires a non-empty elements array/i,
    );
  });

  it('syncs visual edits back into the JSON editor and shows a save prompt', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /^state$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Decision Rule$/i }));
    fireEvent.click(screen.getByRole('button', { name: /apply visual edit/i }));

    expect(getEditor().value).toContain('(edited)');
    expect(getCanvasStatusNotice()).toHaveTextContent(
      /visual edits sync to json/i,
    );
  });

  it('prompts for a draft name and uses it for new browser drafts', () => {
    render(<App />);

    fireEvent.click(screen.getAllByRole('button', { name: /clone/i })[0]!);

    const draftDialog = screen.getByRole('dialog');

    expect(draftDialog).toHaveTextContent(/name draft/i);
    fireEvent.change(within(draftDialog).getByLabelText(/draft name/i), {
      target: {
        value: 'Prompt iteration copy',
      },
    });
    fireEvent.click(within(draftDialog).getByRole('button', { name: /^clone$/i }));

    let storedDrafts = JSON.parse(
      window.localStorage.getItem(BROWSER_DRAFTS_STORAGE_KEY) ?? '[]',
    ) as Array<{ displayName: string; filename: string }>;

    expect(storedDrafts).toHaveLength(1);
    expect(storedDrafts[0]?.displayName).toBe('Prompt iteration copy');
    expect(storedDrafts[0]?.filename).toBe('Prompt-iteration-copy_1.json');
    expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /prompt iteration copy/i }),
    ).toBeInTheDocument();
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Created Prompt iteration copy in browser storage.',
    );

    fireEvent.click(screen.getByRole('button', { name: /^sequence$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Claude Code With Subagents$/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /clone/i })[0]!);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^clone$/i }));

    storedDrafts = JSON.parse(
      window.localStorage.getItem(BROWSER_DRAFTS_STORAGE_KEY) ?? '[]',
    ) as Array<{ displayName: string; filename: string }>;

    expect(storedDrafts).toHaveLength(2);
    expect(storedDrafts.map((draft) => draft.displayName)).toEqual(
      expect.arrayContaining(['Prompt iteration copy', 'Claude Code With Subagents']),
    );
  });

  it('supports selecting and deleting multiple browser drafts', () => {
    render(<App />);

    fireEvent.click(screen.getAllByRole('button', { name: /clone/i })[0]!);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^clone$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^state$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Decision Rule$/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /clone/i })[0]!);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^clone$/i }));

    fireEvent.click(screen.getByRole('checkbox', { name: /select api discovery flow \(block\)/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /select decision rule/i }));
    fireEvent.click(screen.getByRole('button', { name: /delete selected/i }));

    expect(screen.getByText(/No drafts yet/i)).toBeInTheDocument();
    expect(toastSuccessMock).toHaveBeenCalledWith('Removed 2 drafts.');
  });

  it('keeps the bundled workspace file order stable', () => {
    expect(workspaceExampleFiles[0]?.relativePath).toBe('block/api-discovery-flow-block.json');
  });

  it('switches the right panel between inspector and json view as mutually exclusive modes', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /expand inspector/i }));

    expect(screen.getByTestId('diagram-canvas')).toHaveAttribute(
      'data-has-inspector-target',
      'true',
    );

    fireEvent.click(screen.getByRole('tab', { name: /^JSON view$/i }));

    expect(screen.getByRole('textbox', { name: /diagram json/i })).toBeInTheDocument();
    expect(screen.getByTestId('diagram-canvas')).toHaveAttribute(
      'data-has-inspector-target',
      'false',
    );
    expect(screen.getByTestId('workspace-preview-pane')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /^Inspector$/i }));

    expect(screen.queryByRole('textbox', { name: /diagram json/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('diagram-canvas')).toHaveAttribute(
      'data-has-inspector-target',
      'true',
    );
  });

  it('keeps the inspector shell at the saved width when collapsed and expanded', () => {
    window.localStorage.setItem(INSPECTOR_WIDTH_STORAGE_KEY, '512');

    render(<App />);

    const inspectorPane = screen.getByTestId('workspace-editor-pane');
    const inspectorWrap = inspectorPane.parentElement!;
    expect(inspectorPane).toHaveAttribute('data-collapsed', 'true');
    expect(inspectorWrap).toHaveStyle({ '--diagram-inspector-width': '512px' });
    expect(inspectorWrap).toHaveClass('diagram-inspector-shell-wrap');

    fireEvent.click(screen.getByRole('button', { name: /expand inspector/i }));

    expect(inspectorPane).toHaveAttribute('data-collapsed', 'false');
    expect(inspectorWrap).toHaveStyle({ '--diagram-inspector-width': '512px' });
  });

  it('shows the sonner toaster at the bottom center', () => {
    render(<App />);

    expect(screen.getByTestId('toaster')).toHaveAttribute(
      'data-position',
      'bottom-center',
    );
  });

  it('opens Help as a dedicated main view and updates the hash', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /^Help$/i }));

    expect(screen.getByRole('heading', { name: /^Help$/i })).toBeInTheDocument();
    expect(screen.getAllByText(/diagram types/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole('textbox', { name: /diagram json/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Export$/i })).not.toBeInTheDocument();

    await waitFor(() => {
      expect(window.location.hash).toBe('#/help');
    });
  });

  it('restores a nested project diagram from the URL hash on reload', () => {
    window.history.replaceState({}, '', '/#/project/state/prompt-iteration-process.json');

    render(<App />);

    expect(getEditor().value).toContain('"Ship polished prompt"');
    expect(screen.getByTestId('diagram-canvas')).toHaveTextContent(
      'state:A staged prompt-development workflow: build test cases, draft a prompt, iterate with evals, validate on held-out cases, and ship the polished version. / rev 0',
    );
  });

  it('restores a browser draft from the URL hash on reload', () => {
    window.localStorage.setItem(
      BROWSER_DRAFTS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'draft:2026-04-11T10:00:00.000Z:abc123',
          filename: 'saved-flow.json',
          source: JSON.stringify({
            type: 'state',
            description: 'Draft flow',
            size: 'medium',
            positioning: 'manual',
            elements: [
              {
                id: 'only',
                type: 'state',
                x: 0,
                y: 0,
                data: { text: ['Only node'] },
              },
            ],
          }),
          updatedAt: '2026-04-11T10:00:00.000Z',
        },
      ]),
    );
    window.history.replaceState(
      {},
      '',
      '/#/draft/draft%3A2026-04-11T10%3A00%3A00.000Z%3Aabc123',
    );

    render(<App />);

    expect(getEditor().value).toContain('"description":"Draft flow"');
    expect(screen.getByRole('button', { name: /saved-flow/i })).toBeInTheDocument();
    expect(screen.getByTestId('diagram-canvas')).toHaveTextContent('state:Draft flow / rev 0');
  });

  it('opens the matching library branch when the hash changes to a nested bundled file', async () => {
    render(<App />);

    window.history.replaceState({}, '', '/#/project/state/prompt-iteration-process.json');
    window.dispatchEvent(new Event('hashchange'));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /^Prompt Iteration Process$/i }),
      ).toBeInTheDocument();
      expect(getEditor().value).toContain('"Ship polished prompt"');
    });
  });

  it('loads a bundled library diagram from the main query parameter', async () => {
    window.history.replaceState(
      {},
      '',
      '/?main=src/data/library/state/prompt-iteration-process.json',
    );

    render(<App />);

    expect(getEditor().value).toContain('"Ship polished prompt"');

    await waitFor(() => {
      expect(window.location.hash).toBe('#/project/state/prompt-iteration-process.json');
      expect(window.location.search).toBe('?main=project%2Fstate%2Fprompt-iteration-process.json');
    });
  });

  it('loads a browser draft from the main query parameter', () => {
    window.localStorage.setItem(
      BROWSER_DRAFTS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'draft:2026-04-11T10:00:00.000Z:abc123',
          filename: 'saved-flow.json',
          source: JSON.stringify({
            type: 'state',
            description: 'Draft flow',
            size: 'medium',
            positioning: 'manual',
            elements: [
              {
                id: 'only',
                type: 'state',
                x: 0,
                y: 0,
                data: { text: ['Only node'] },
              },
            ],
          }),
          updatedAt: '2026-04-11T10:00:00.000Z',
        },
      ]),
    );
    window.history.replaceState({}, '', '/?main=draft/saved-flow.json');

    render(<App />);

    expect(getEditor().value).toContain('"description":"Draft flow"');
    expect(screen.getByRole('button', { name: /saved-flow/i })).toBeInTheDocument();
  });

  it('connects multiple project folders, shows refresh actions, and switches the active project', async () => {
    supportsDirectoryPickerMock.mockReturnValue(true);
    const alphaHandle = createDirectoryHandle('Alpha Project');
    const betaHandle = createDirectoryHandle('Beta Project');

    pickExamplesDirectoryMock
      .mockResolvedValueOnce(alphaHandle)
      .mockResolvedValueOnce(betaHandle);
    readExamplesDirectoryMock
      .mockResolvedValueOnce(
        createDirectoryResult([
          {
            diagramType: 'state',
            filename: 'payments.json',
            relativePath: 'payments.json',
            segments: ['payments.json'],
            source: createStateSource('Alpha payment flow'),
          },
        ]),
      )
      .mockResolvedValueOnce(
        createDirectoryResult([
          {
            diagramType: 'state',
            filename: 'release.json',
            relativePath: 'flows/release.json',
            segments: ['flows', 'release.json'],
            source: createStateSource('Beta release flow'),
          },
        ]),
      );

    render(<App />);

    fireEvent.click(screen.getAllByRole('button', { name: /add project/i })[0]!);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /^alpha project/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/^1 project$/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add project/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /^alpha project/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /^beta project/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/^2 projects$/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /refresh alpha project/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh beta project/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^beta project/i }));
    fireEvent.click(screen.getByRole('button', { name: /flows/i }));
    fireEvent.click(screen.getByRole('button', { name: /release\.json/i }));

    expect(getEditor().value).toContain('"description":"Beta release flow"');
    expect(window.location.hash).toBe('#/connected/beta-project/flows/release.json');
  });

  it('uses the JSON name in the connected project tree', async () => {
    supportsDirectoryPickerMock.mockReturnValue(true);
    const handle = createDirectoryHandle('Named Project');

    pickExamplesDirectoryMock.mockResolvedValue(handle);
    readExamplesDirectoryMock.mockResolvedValue(
      createDirectoryResult([
        {
          diagramName: 'Payments review',
          diagramType: 'state',
          filename: 'payments.json',
          relativePath: 'payments.json',
          segments: ['payments.json'],
          source: createStateSource('Named payment flow', {
            name: 'Payments review',
          }),
        },
      ]),
    );

    render(<App />);

    fireEvent.click(screen.getAllByRole('button', { name: /add project/i })[0]!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^named project/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^payments review$/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /^payments\.json$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^package\.json$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^payments review$/i }));

    expect(getEditor().value).toContain('"name":"Payments review"');
    expect(screen.getByRole('heading', { name: /payments\.json/i })).toBeInTheDocument();
  });

  it('shows Save only for connected project diagrams and persists edits back to the project', async () => {
    supportsDirectoryPickerMock.mockReturnValue(true);
    const handle = createDirectoryHandle('Delta Project');

    pickExamplesDirectoryMock.mockResolvedValue(handle);
    readExamplesDirectoryMock.mockResolvedValue(
      createDirectoryResult([
        {
          diagramName: 'Delta payments',
          diagramType: 'state',
          filename: 'payments.json',
          relativePath: 'payments.json',
          segments: ['payments.json'],
          source: createStateSource('Delta payment flow', {
            name: 'Delta payments',
          }),
        },
      ]),
    );

    render(<App />);

    expect(screen.getByRole('button', { name: /^Save$/i })).toBeEnabled();

    fireEvent.click(screen.getAllByRole('button', { name: /add project/i })[0]!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^delta project/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^delta payments$/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^delta payments$/i }));

    expect(screen.getByRole('button', { name: /^Save$/i })).toBeEnabled();
    expect(screen.getAllByRole('button', { name: /clone/i }).length).toBeGreaterThan(0);

    fireEvent.change(getEditor(), {
      target: {
        value: createStateSource('Delta payment flow updated', {
          name: 'Delta payments updated',
        }),
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => {
      expect(writeExampleFileMock).toHaveBeenCalledWith(
        handle,
        'payments.json',
        expect.stringContaining('Delta payment flow updated'),
      );
      expect(
        screen.getByRole('button', { name: /^delta payments updated$/i }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /clone/i })[0]!);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^clone$/i }));

    expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
  });

  it.each([
    ['repo root', (relativePath: string) => `src/data/library/${relativePath}`],
    ['src/data', (relativePath: string) => `library/${relativePath}`],
    ['src/data/library', (relativePath: string) => relativePath],
  ])('saves bundled Library diagrams directly after connecting %s', async (_label, toDiskPath) => {
    supportsDirectoryPickerMock.mockReturnValue(true);
    const libraryDocument = workspaceExampleFiles[0]!;
    const handle = createDirectoryHandle('diagram-engine', {
      resolvablePaths: [toDiskPath(libraryDocument.relativePath)],
    });

    pickExamplesDirectoryMock.mockResolvedValue(handle);

    render(<App />);

    editDescription('Library file saved directly');
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => {
      expect(writeExampleFileMock).toHaveBeenCalledWith(
        handle,
        toDiskPath(libraryDocument.relativePath),
        expect.stringContaining('Library file saved directly'),
      );
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(toastSuccessMock).toHaveBeenCalledWith(
      `Saved ${libraryDocument.relativePath} to Library.`,
    );
  });

  it('reuses an added project handle when it points at the bundled Library source', async () => {
    supportsDirectoryPickerMock.mockReturnValue(true);
    const libraryDocument = workspaceExampleFiles[0]!;
    const handle = createDirectoryHandle('diagram-engine', {
      resolvablePaths: [`src/data/library/${libraryDocument.relativePath}`],
    });

    pickExamplesDirectoryMock.mockResolvedValueOnce(handle);
    readExamplesDirectoryMock.mockResolvedValueOnce(
      createDirectoryResult([
        createDirectoryFile({
          description: 'Library source flow',
          filename: libraryDocument.filename,
          label: 'Library source flow',
          relativePath: `src/data/library/${libraryDocument.relativePath}`,
        }),
      ]),
    );

    render(<App />);

    fireEvent.click(screen.getAllByRole('button', { name: /add project/i })[0]!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^diagram-engine/i })).toBeInTheDocument();
    });

    editDescription('Library save through added handle');
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => {
      expect(writeExampleFileMock).toHaveBeenCalledWith(
        handle,
        `src/data/library/${libraryDocument.relativePath}`,
        expect.stringContaining('Library save through added handle'),
      );
    });

    expect(pickExamplesDirectoryMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows an error when a bundled Library save is connected to the wrong folder', async () => {
    supportsDirectoryPickerMock.mockReturnValue(true);
    const wrongHandle = createDirectoryHandle('wrong-folder');

    pickExamplesDirectoryMock.mockResolvedValue(wrongHandle);

    render(<App />);

    editDescription('Dirty library change');
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        expect.stringContaining('Choose the repository root, src/data, or src/data/library'),
      );
    });

    expect(writeExampleFileMock).not.toHaveBeenCalled();
    expect(getCanvasStatusNotice()).toHaveTextContent(/unsaved json changes/i);
  });

  it('reconnects a restored project before saving its current file', async () => {
    supportsDirectoryPickerMock.mockReturnValue(true);
    const projectFile = createConnectedProjectFile({
      description: 'Restored payment flow',
      filename: 'payments.json',
      label: 'Restored payments',
      projectId: 'restored-project',
      projectName: 'Restored Project',
    });
    const directoryFile = createDirectoryFile({
      description: 'Restored payment flow',
      filename: 'payments.json',
      label: 'Restored payments',
    });
    const handle = createDirectoryHandle('Restored Project');

    writeStoredProjects([
      {
        files: [projectFile],
        id: 'restored-project',
        name: 'Restored Project',
      },
    ]);
    pickExamplesDirectoryMock.mockResolvedValueOnce(handle);
    readExamplesDirectoryMock.mockResolvedValueOnce(createDirectoryResult([directoryFile]));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: /^Restored payments$/i }));
    editDescription('Restored payment flow saved');
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => {
      expect(writeExampleFileMock).toHaveBeenCalledWith(
        handle,
        'payments.json',
        expect.stringContaining('Restored payment flow saved'),
      );
    });
  });

  it('reconnects the current restored project even when another project is writable', async () => {
    supportsDirectoryPickerMock.mockReturnValue(true);
    const targetProjectFile = createConnectedProjectFile({
      description: 'Target payment flow',
      filename: 'payments.json',
      label: 'Target payments',
      projectId: 'target-project',
      projectName: 'Target Project',
    });
    const targetDirectoryFile = createDirectoryFile({
      description: 'Target payment flow',
      filename: 'payments.json',
      label: 'Target payments',
    });
    const otherDirectoryFile = createDirectoryFile({
      description: 'Other flow',
      filename: 'other.json',
      label: 'Other flow',
    });
    const otherHandle = createDirectoryHandle('Other Project');
    const targetHandle = createDirectoryHandle('Target Project');

    writeStoredProjects([
      {
        files: [targetProjectFile],
        id: 'target-project',
        name: 'Target Project',
      },
    ]);
    pickExamplesDirectoryMock
      .mockResolvedValueOnce(otherHandle)
      .mockResolvedValueOnce(targetHandle);
    readExamplesDirectoryMock
      .mockResolvedValueOnce(createDirectoryResult([otherDirectoryFile]))
      .mockResolvedValueOnce(createDirectoryResult([targetDirectoryFile]));

    render(<App />);

    fireEvent.click(screen.getAllByRole('button', { name: /add project/i })[0]!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Other Project/i })).toBeInTheDocument();
    });

    fireEvent.click(await screen.findByRole('button', { name: /^Target payments$/i }));
    editDescription('Target payment flow saved');
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => {
      expect(writeExampleFileMock).toHaveBeenCalledWith(
        targetHandle,
        'payments.json',
        expect.stringContaining('Target payment flow saved'),
      );
    });

    expect(writeExampleFileMock).not.toHaveBeenCalledWith(
      otherHandle,
      'payments.json',
      expect.any(String),
    );
  });

  it('reconnects and retries once when a project write loses file-system access', async () => {
    supportsDirectoryPickerMock.mockReturnValue(true);
    const staleHandle = createDirectoryHandle('Delta Project');
    const freshHandle = createDirectoryHandle('Delta Project');
    const directoryFile = createDirectoryFile({
      description: 'Delta payment flow',
      filename: 'payments.json',
      label: 'Delta payments',
    });

    pickExamplesDirectoryMock
      .mockResolvedValueOnce(staleHandle)
      .mockResolvedValueOnce(freshHandle);
    readExamplesDirectoryMock
      .mockResolvedValueOnce(createDirectoryResult([directoryFile]))
      .mockResolvedValueOnce(createDirectoryResult([directoryFile]));
    writeExampleFileMock.mockRejectedValueOnce(
      new DOMException('Access was lost.', 'NotAllowedError'),
    );

    render(<App />);

    fireEvent.click(screen.getAllByRole('button', { name: /add project/i })[0]!);

    fireEvent.click(await screen.findByRole('button', { name: /^Delta payments$/i }));
    editDescription('Delta payment flow saved after reconnect');
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => {
      expect(writeExampleFileMock).toHaveBeenCalledTimes(2);
      expect(writeExampleFileMock).toHaveBeenNthCalledWith(
        1,
        staleHandle,
        'payments.json',
        expect.stringContaining('Delta payment flow saved after reconnect'),
      );
      expect(writeExampleFileMock).toHaveBeenNthCalledWith(
        2,
        freshHandle,
        'payments.json',
        expect.stringContaining('Delta payment flow saved after reconnect'),
      );
    });

    expect(toastSuccessMock).toHaveBeenCalledWith('Saved payments.json to Delta Project.');
  });

  it('restores the bundled Library source handle after reload and saves without reopening the picker', async () => {
    supportsDirectoryPickerMock.mockReturnValue(true);
    const libraryDocument = workspaceExampleFiles[0]!;
    const restoredHandle = createDirectoryHandle('diagram-engine', {
      queryPermission: 'granted',
      resolvablePaths: [`src/data/library/${libraryDocument.relativePath}`],
    });

    loadDirectoryHandleMock.mockImplementation(async (key: string) =>
      key === 'library-source' ? restoredHandle : null,
    );

    render(<App />);

    await waitFor(() => {
      expect(loadDirectoryHandleMock).toHaveBeenCalledWith('library-source');
    });

    editDescription('Library saved through restored handle');
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => {
      expect(writeExampleFileMock).toHaveBeenCalledWith(
        restoredHandle,
        `src/data/library/${libraryDocument.relativePath}`,
        expect.stringContaining('Library saved through restored handle'),
      );
    });

    expect(pickExamplesDirectoryMock).not.toHaveBeenCalled();
  });

  it('restores a connected project handle after reload and saves without reopening the picker', async () => {
    supportsDirectoryPickerMock.mockReturnValue(true);
    const projectFile = createConnectedProjectFile({
      description: 'Reloaded project flow',
      filename: 'payments.json',
      label: 'Reloaded payments',
      projectId: 'reloaded-project',
      projectName: 'Reloaded Project',
    });
    const restoredHandle = createDirectoryHandle('Reloaded Project', {
      queryPermission: 'granted',
    });

    writeStoredProjects([
      {
        files: [projectFile],
        id: 'reloaded-project',
        name: 'Reloaded Project',
      },
    ]);
    loadDirectoryHandleMock.mockImplementation(async (key: string) =>
      key === 'project:reloaded-project' ? restoredHandle : null,
    );

    render(<App />);

    await screen.findByRole('button', { name: /^Refresh Reloaded Project$/i });

    fireEvent.click(screen.getByRole('button', { name: /^Reloaded payments$/i }));
    editDescription('Reloaded project saved through restored handle');
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

    await waitFor(() => {
      expect(writeExampleFileMock).toHaveBeenCalledWith(
        restoredHandle,
        'payments.json',
        expect.stringContaining('Reloaded project saved through restored handle'),
      );
    });

    expect(pickExamplesDirectoryMock).not.toHaveBeenCalled();
  });

  it('loads connected-project theme tokens and excludes the reserved theme file from navigation', async () => {
    supportsDirectoryPickerMock.mockReturnValue(true);
    const handle = createDirectoryHandle('Gamma Project');
    const themeSource = JSON.stringify({
      type: 'diagram-theme',
      tokens: {
        light: {
          canvas: {
            gridColor: '#123456',
          },
          connector: {
            labelBackground: '#fedcba',
          },
        },
      },
    });

    pickExamplesDirectoryMock.mockResolvedValue(handle);
    readExamplesDirectoryMock.mockResolvedValue(
      createDirectoryResult(
        [
          {
            diagramType: 'state',
            filename: 'review.json',
            relativePath: 'flows/review.json',
            segments: ['flows', 'review.json'],
            source: createStateSource('Review flow'),
          },
        ],
        themeSource,
      ),
    );

    const { container } = render(<App />);

    fireEvent.click(screen.getAllByRole('button', { name: /add project/i })[0]!);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /^gamma project/i }),
      ).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /diagram-theme\.json/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /flows/i }));
    fireEvent.click(screen.getByRole('button', { name: /review\.json/i }));

    expect(screen.getByTestId('diagram-canvas')).toHaveAttribute(
      'data-grid-color',
      '#123456',
    );
    const previewPanel = container.querySelector('.preview-panel');

    expect(previewPanel).toHaveStyle({
      '--connector-label-background': '#fedcba',
      '--diagram-grid-color': '#123456',
    });
  });

  it('applies per-diagram theme overrides from a bundled library file', () => {
    const { container } = render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /^state$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Theme Override Demo$/i }));

    expect(screen.getByTestId('diagram-canvas')).toHaveAttribute(
      'data-grid-color',
      '#d7e2ff',
    );
    const previewPanel = container.querySelector('.preview-panel');

    expect(previewPanel).toHaveStyle({
      '--connector-label-background': '#f8fbff',
      '--diagram-grid-color': '#d7e2ff',
      '--node-state-danger-border': '#ef8a7d',
      '--node-text': '#2a3655',
    });
  });

  it('exports the themed diagram canvas without forcing a hardcoded background color', async () => {
    render(<App />);

    fireEvent.pointerDown(screen.getByRole('button', { name: /^Export$/i }));
    fireEvent.click(await screen.findByText(/export png/i));

    await waitFor(() => {
      expect(toPngMock).toHaveBeenCalledTimes(1);
    });

    const [, options] = toPngMock.mock.calls[0] as [Element, Record<string, unknown>];

    expect(options).not.toHaveProperty('backgroundColor');
    expect(options).toMatchObject({
      cacheBust: true,
      pixelRatio: 2,
    });
  });

  it('uses a confirmation dialog before discarding unsaved changes during navigation', () => {
    render(<App />);

    fireEvent.change(getEditor(), {
      target: {
        value: getEditor().value.replace(
          'Incremental discovery flow as a block diagram',
          'changed locally',
        ),
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /^state$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Decision Rule$/i }));

    expect(screen.getByRole('dialog')).toHaveTextContent(/discard unsaved changes/i);

    fireEvent.click(screen.getByRole('button', { name: /stay here/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(getCanvasStatusNotice()).toHaveTextContent(/unsaved json changes/i);
    expect(getEditor().value).toContain('"type": "block"');
  });

  it('opens Help after confirming the discard dialog', async () => {
    render(<App />);

    fireEvent.change(getEditor(), {
      target: {
        value: getEditor().value.replace(
          'Incremental discovery flow as a block diagram',
          'changed locally',
        ),
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Help$/i }));

    expect(screen.getByRole('dialog')).toHaveTextContent(/continue to help/i);

    fireEvent.click(screen.getByRole('button', { name: /discard changes/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/diagram types/i).length).toBeGreaterThan(0);
      expect(window.location.hash).toBe('#/help');
    });
  });

  it('loads the requested document after confirming the discard dialog', () => {
    render(<App />);

    fireEvent.change(getEditor(), {
      target: {
        value: getEditor().value.replace(
          'Incremental discovery flow as a block diagram',
          'changed locally',
        ),
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /^state$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Decision Rule$/i }));
    fireEvent.click(screen.getByRole('button', { name: /discard changes/i }));

    expect(getEditor().value).toContain('"type": "state"');
    expect(window.location.hash).toBe('#/project/state/decision-rule.json');
  });

  // T15 — dark mode toggle integration test
  it('toggles dark mode on and off and persists the preference', () => {
    render(<App />);

    // starts in light mode (localStorage is clear, matchMedia defaults to light in jsdom)
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: /switch to dark mode/i }));

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem('diagram-engine/dark-mode')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: /switch to light mode/i }));

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(window.localStorage.getItem('diagram-engine/dark-mode')).toBe('false');
  });
});
