import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  Check,
  Copy,
  Files,
  ImageDown,
  Menu,
  Moon,
  MoreVertical,
  Save,
  Sun,
} from 'lucide-react';
import { JsonEditorPane } from '@/components/json-editor-pane';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  bundledWorkspaceThemeTokens,
  workspaceExampleFiles as bundledWorkspaceExampleFiles,
} from './data/libraryRegistry';
import type { DiagramExample, WorkspaceExampleFile } from './data/types';
import { DiagramCanvas } from './engine/DiagramCanvas';
import { HelpView } from './app/HelpView';
import { resolveDiagramTheme } from './engine/diagram-tokens';
import { supportsManualCorrections } from './engine/editing';
import {
  type DiagramDefinition,
  parseDiagramFileMetadata,
} from './engine/schema';
import {
  getNextBrowserDraftFilename,
  readBrowserDrafts,
  toBrowserDraftDocuments,
  upsertBrowserDraft,
  writeBrowserDrafts,
} from './lib/browser-drafts';
import {
  downloadDataUrl,
  downloadSvgFile,
  sanitizeFilename,
} from './lib/downloads';
import {
  findDocumentForLocation,
  hasDiagramLocationTarget,
} from './lib/diagram-url';
import {
  loadStoredProjects,
  projectToStored,
  saveStoredProjects,
  tokensFromStored,
} from './lib/connected-projects';
import {
  deleteDirectoryHandle,
  ensureDirectoryWritePermission,
  getLibraryFilePathCandidates,
  isFilePickerAbort,
  isRecoverableFileSystemError,
  loadDirectoryHandle,
  pickExamplesDirectory,
  readExamplesDirectory,
  resolveLibraryFilePath,
  storeDirectoryHandle,
  supportsDirectoryPicker,
  writeExampleFile,
} from './lib/file-system';
import {
  DEFAULT_INSPECTOR_WIDTH,
  DEFAULT_SIDEBAR_WIDTH,
  INSPECTOR_WIDTH_STORAGE_KEY,
  SIDEBAR_WIDTH_STORAGE_KEY,
  clampInspectorWidth,
  clampSidebarWidth,
} from './app/layout-constants';
import {
  buildUrlForState,
  createConnectedProjectId,
  describeDocument,
  findConnectedProjectByHandle,
  findDocumentById,
  findPendingNavigationForLocation,
  getDocumentFilename,
  getInitialDraftDisplayName,
  initialDocument,
  isHelpHash,
  parseDefinition,
  parseProjectTheme,
  shouldIncludeExportNode,
  stringifyDefinition,
  toConnectedProjectFiles,
} from './app/document-helpers';
import {
  DiscardNavigationDialog,
  DraftNamingDialog,
  FatalErrorDialog,
} from './app/app-dialogs';
import { AppSidebar } from './app/app-sidebar';
import {
  InspectorTabButton,
  ResizableInspectorRail,
  WorkspaceAlert,
} from './app/inspector';
import type { AppError, ConnectedProject, MainView, PendingNavigation } from './app/types';

const LIBRARY_SOURCE_HANDLE_STORAGE_KEY = 'library-source';

function projectDirectoryHandleStorageKey(projectId: string) {
  return `project:${projectId}`;
}

export function App() {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [browserDrafts, setBrowserDrafts] = useState(() => readBrowserDrafts());
  const initialBrowserDraftDocuments = toBrowserDraftDocuments(browserDrafts);
  const initialView = isHelpHash(window.location.hash) ? 'help' : 'document';
  const preserveRequestedLocationRef = useRef(
    !isHelpHash(window.location.hash) &&
      hasDiagramLocationTarget({
        hash: window.location.hash,
        search: window.location.search,
      }) &&
      findDocumentForLocation({
        hash: window.location.hash,
        search: window.location.search,
        browserDrafts: initialBrowserDraftDocuments,
        workspaceFiles: bundledWorkspaceExampleFiles,
      }) === null,
  );
  const initialSelectedDocumentRef = useRef(
    findDocumentForLocation({
      hash: window.location.hash,
      search: window.location.search,
      browserDrafts: initialBrowserDraftDocuments,
      workspaceFiles: bundledWorkspaceExampleFiles,
    }) ?? initialDocument,
  );
  const initialSelectedDocument = initialSelectedDocumentRef.current;
  const [definition, setDefinition] = useState<DiagramDefinition>(() =>
    parseDefinition(initialSelectedDocument.source),
  );
  const [draft, setDraft] = useState(initialSelectedDocument.source);
  const [baselineSource, setBaselineSource] = useState(initialSelectedDocument.source);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [selectedDocumentId, setSelectedDocumentId] = useState(initialSelectedDocument.id);
  const [changeOrigin, setChangeOrigin] = useState<'editor' | 'canvas' | null>(null);
  const [currentView, setCurrentView] = useState<MainView>(initialView);
  const [connectedProjects, setConnectedProjects] = useState<ConnectedProject[]>([]);
  const [libraryWorkspaceFiles, setLibraryWorkspaceFiles] = useState<WorkspaceExampleFile[]>(
    () => bundledWorkspaceExampleFiles,
  );
  const [librarySourceHandle, setLibrarySourceHandle] =
    useState<FileSystemDirectoryHandle | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);
  const [pendingDraftName, setPendingDraftName] = useState('');
  const [draftNamingOpen, setDraftNamingOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const [inspectorTab, setInspectorTab] = useState<'inspector' | 'json'>('inspector');
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    const parsed = stored ? Number.parseInt(stored, 10) : Number.NaN;

    return Number.isFinite(parsed) ? clampSidebarWidth(parsed) : DEFAULT_SIDEBAR_WIDTH;
  });
  const [inspectorWidth, setInspectorWidth] = useState(() => {
    const stored = localStorage.getItem(INSPECTOR_WIDTH_STORAGE_KEY);
    const parsed = stored ? Number.parseInt(stored, 10) : Number.NaN;

    return Number.isFinite(parsed)
      ? clampInspectorWidth(parsed)
      : DEFAULT_INSPECTOR_WIDTH;
  });
  const [inspectorPortalTarget, setInspectorPortalTarget] = useState<HTMLDivElement | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('diagram-engine/dark-mode');
    return stored ? stored === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [sidebarMinimized, setSidebarMinimized] = useState(true);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(true);
  const [fatalError, setFatalError] = useState<AppError | null>(null);

  const toggleInspectorCollapsed = useCallback(() => {
    setInspectorCollapsed((prev) => !prev);
  }, []);

  const handleInspectorToggleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      event.preventDefault();
      toggleInspectorCollapsed();
    },
    [toggleInspectorCollapsed],
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('diagram-engine/dark-mode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    localStorage.setItem(INSPECTOR_WIDTH_STORAGE_KEY, String(inspectorWidth));
  }, [inspectorWidth]);

  useEffect(() => {
    let cancelled = false;
    const stored = loadStoredProjects();

    void loadDirectoryHandle(LIBRARY_SOURCE_HANDLE_STORAGE_KEY).then((handle) => {
      if (!cancelled && handle) {
        setLibrarySourceHandle(handle);
      }
    });

    if (stored.length === 0) {
      return () => {
        cancelled = true;
      };
    }

    const restored: ConnectedProject[] = stored.map((storedProject) => ({
      files: storedProject.files,
      handle: null,
      id: storedProject.id,
      name: storedProject.name,
      tokens: tokensFromStored(storedProject),
    }));

    setConnectedProjects(restored);
    setActiveProjectId(restored[0]?.id ?? null);

    void Promise.all(
      stored.map(async (storedProject) => {
        const handle = await loadDirectoryHandle(
          projectDirectoryHandleStorageKey(storedProject.id),
        );

        return [storedProject.id, handle] as const;
      }),
    ).then((entries) => {
      if (cancelled) {
        return;
      }

      const handlesByProjectId = new Map(
        entries.filter((entry): entry is readonly [string, FileSystemDirectoryHandle] =>
          entry[1] !== null,
        ),
      );

      if (handlesByProjectId.size === 0) {
        return;
      }

      setConnectedProjects((current) =>
        current.map((project) => {
          const handle = handlesByProjectId.get(project.id);

          return handle ? { ...project, handle } : project;
        }),
      );

      // Re-read files from disk to replace stale localStorage-cached sources
      void Promise.all(
        Array.from(handlesByProjectId.entries()).map(async ([projectId, handle]) => {
          try {
            const freshDir = await readExamplesDirectory(handle);
            return [projectId, freshDir] as const;
          } catch {
            return [projectId, null] as const;
          }
        }),
      ).then((results) => {
        if (cancelled) return;

        setConnectedProjects((current) =>
          current.map((project) => {
            const result = results.find(([id]) => id === project.id);
            if (!result?.[1]?.files) return project;

            const freshDir = result[1];
            const freshFiles = toConnectedProjectFiles(project, freshDir.files);
            const tokens = parseProjectTheme(
              project.name,
              freshDir.themeSource,
            );

            return { ...project, files: freshFiles, tokens };
          }),
        );
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const browserDraftDocuments = useMemo(() => {
    return toBrowserDraftDocuments(browserDrafts);
  }, [browserDrafts]);
  const connectedWorkspaceFiles = useMemo(
    () => connectedProjects.flatMap((project) => project.files),
    [connectedProjects],
  );

  // Persist connected projects to localStorage whenever they change
  useEffect(() => {
    saveStoredProjects(connectedProjects.map(projectToStored));
  }, [connectedProjects]);
  const workspaceFiles = useMemo(() => {
    return [...connectedWorkspaceFiles, ...libraryWorkspaceFiles];
  }, [connectedWorkspaceFiles, libraryWorkspaceFiles]);
  const currentDocument = useMemo(() => {
    return (
      findDocumentById(selectedDocumentId, workspaceFiles, browserDraftDocuments) ??
      initialSelectedDocument
    );
  }, [browserDraftDocuments, initialSelectedDocument, selectedDocumentId, workspaceFiles]);
  const currentConnectedProject = useMemo(() => {
    if (currentDocument.kind !== 'workspace' || currentDocument.sourceKind !== 'connected') {
      return null;
    }

    return (
      connectedProjects.find((project) => project.id === currentDocument.projectId) ?? null
    );
  }, [connectedProjects, currentDocument]);
  const activeProject = useMemo(() => {
    return connectedProjects.find((project) => project.id === activeProjectId) ?? null;
  }, [activeProjectId, connectedProjects]);
  const currentProjectTokens = useMemo(() => {
    if (currentDocument.kind !== 'workspace') {
      return undefined;
    }

    if (currentDocument.sourceKind === 'connected') {
      return currentConnectedProject?.tokens;
    }

    return bundledWorkspaceThemeTokens;
  }, [currentConnectedProject, currentDocument]);
  const resolvedDiagramTheme = useMemo(() => {
    return resolveDiagramTheme({
      darkMode,
      diagramTokens: definition.tokens,
      projectTokens: currentProjectTokens,
    });
  }, [currentProjectTokens, darkMode, definition]);
  const isDirty = draft !== baselineSource;
  const canPersistText = draft.trim().length > 0;
  const canExportImage = currentView === 'document' && error === null;
  const canSaveToDisk =
    currentView === 'document' &&
    currentDocument.kind === 'workspace' &&
    canPersistText &&
    error === null;
  const canCreateDraft = currentView === 'document' && currentDocument.kind !== 'draft';
  const canSaveDraft = currentView === 'document' && currentDocument.kind === 'draft';
  const draftActionLabel = currentDocument.kind === 'draft' ? 'Save Draft' : 'Clone';

  useEffect(() => {
    if (!isDirty && pendingNavigation) {
      setPendingNavigation(null);
    }
  }, [isDirty, pendingNavigation]);

  useEffect(() => {
    const availableDraftIds = new Set(browserDraftDocuments.map((draftDocument) => draftDocument.id));

    setSelectedDraftIds((current) => {
      const next = current.filter((draftId) => availableDraftIds.has(draftId));
      return next.length === current.length ? current : next;
    });
  }, [browserDraftDocuments]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  useEffect(() => {
    if (currentDocument.kind !== 'workspace' || currentDocument.sourceKind !== 'connected') {
      return;
    }

    setActiveProjectId(currentDocument.projectId);
  }, [currentDocument]);

  useEffect(() => {
    if (connectedProjects.length === 0) {
      if (activeProjectId !== null) {
        setActiveProjectId(null);
      }
      return;
    }

    if (!connectedProjects.some((project) => project.id === activeProjectId)) {
      setActiveProjectId(connectedProjects[0]!.id);
    }
  }, [activeProjectId, connectedProjects]);

  const applyDocumentState = (
    document: DiagramExample,
    nextView: MainView = 'document',
  ) => {
    setCurrentView(nextView);
    setSelectedDocumentId(document.id);
    setDraft(document.source);
    setBaselineSource(document.source);
    setChangeOrigin(null);
    setPendingNavigation(null);

    try {
      const parsed = parseDefinition(document.source);
      setError(null);
      startTransition(() => {
        setDefinition(parsed);
        setRevision((current) => current + 1);
      });
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Unknown parse failure.';
      setError(message);
    }
  };

  const loadDocument = (document: DiagramExample) => {
    applyDocumentState(document, 'document');
  };

  const showSuccessToast = (message: string) => {
    toast.success(message);
  };

  const showErrorToast = (message: string) => {
    toast.error(message);
  };

  const replaceBrowserLocation = useCallback(
    (nextView: MainView, nextDocument: DiagramExample) => {
      const nextUrl = buildUrlForState({
        document: nextDocument,
        view: nextView,
      });
      const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

      if (currentUrl === nextUrl) {
        return;
      }

      window.history.replaceState(window.history.state, '', nextUrl);
    },
    [],
  );

  const navigateToPendingTarget = useCallback(
    (target: PendingNavigation) => {
      if (target.kind === 'help') {
        setCurrentView('help');
        setPendingNavigation(null);
        return;
      }

      loadDocument(target.nextDocument);
    },
    [loadDocument],
  );

  const requestNavigation = (target: PendingNavigation) => {
    preserveRequestedLocationRef.current = false;

    if (target.kind === 'help') {
      if (currentView === 'help') {
        return;
      }
    } else if (target.nextDocument.id === selectedDocumentId) {
      setCurrentView('document');
      return;
    }

    if (!isDirty) {
      navigateToPendingTarget(target);
      return;
    }

    setPendingNavigation(target);
  };

  useEffect(() => {
    if (preserveRequestedLocationRef.current) {
      const requestedDocument = findDocumentForLocation({
        hash: window.location.hash,
        search: window.location.search,
        browserDrafts: browserDraftDocuments,
        workspaceFiles,
      });

      if (!requestedDocument) {
        return;
      }

      preserveRequestedLocationRef.current = false;
      return;
    }

    replaceBrowserLocation(currentView, currentDocument);
  }, [
    browserDraftDocuments,
    currentDocument,
    currentView,
    replaceBrowserLocation,
    workspaceFiles,
  ]);

  useEffect(() => {
    const handleLocationChange = () => {
      const nextNavigation = findPendingNavigationForLocation({
        hash: window.location.hash,
        search: window.location.search,
        browserDrafts: browserDraftDocuments,
        workspaceFiles,
      });

      if (!nextNavigation) {
        return;
      }

      if (nextNavigation.kind === 'help') {
        if (currentView === 'help') {
          return;
        }

        if (isDirty) {
          setPendingNavigation(nextNavigation);
          replaceBrowserLocation(currentView, currentDocument);
          return;
        }

        setCurrentView('help');
        return;
      }

      if (nextNavigation.nextDocument.id === selectedDocumentId) {
        setCurrentView('document');
        return;
      }

      if (isDirty) {
        setPendingNavigation(nextNavigation);
        replaceBrowserLocation(currentView, currentDocument);
        return;
      }

      loadDocument(nextNavigation.nextDocument);
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [
    browserDraftDocuments,
    currentDocument,
    currentView,
    isDirty,
    replaceBrowserLocation,
    selectedDocumentId,
    workspaceFiles,
  ]);

  useEffect(() => {
    if (isDirty) {
      return;
    }

    const nextNavigation = findPendingNavigationForLocation({
      hash: window.location.hash,
      search: window.location.search,
      browserDrafts: browserDraftDocuments,
      workspaceFiles,
    });

    if (!nextNavigation || nextNavigation.kind === 'help') {
      return;
    }

    if (currentView === 'document' && nextNavigation.nextDocument.id === selectedDocumentId) {
      return;
    }

    loadDocument(nextNavigation.nextDocument);
  }, [
    browserDraftDocuments,
    currentView,
    isDirty,
    selectedDocumentId,
    workspaceFiles,
  ]);

  const handleDocumentSelect = (document: DiagramExample) => {
    requestNavigation({
      kind: 'document',
      nextDocument: document,
    });
  };

  const handleHelpSelect = () => {
    requestNavigation({
      kind: 'help',
    });
  };

  const handleStayOnCurrentDocument = () => {
    setPendingNavigation(null);
  };

  const discardCurrentChanges = () => {
    setDraft(baselineSource);
    setChangeOrigin(null);

    try {
      const parsed = parseDefinition(baselineSource);
      setError(null);
      startTransition(() => {
        setDefinition(parsed);
        setRevision((current) => current + 1);
      });
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Unknown parse failure.';
      setError(message);
    }
  };

  const handleDiscardAndContinue = () => {
    if (!pendingNavigation) {
      return;
    }

    if (pendingNavigation.kind === 'help') {
      discardCurrentChanges();
    }

    navigateToPendingTarget(pendingNavigation);
  };

  const handleEditorChange = (nextDraft: string) => {
    setDraft(nextDraft);
    setChangeOrigin('editor');

    try {
      const parsed = parseDefinition(nextDraft);
      setError(null);
      startTransition(() => {
        setDefinition(parsed);
        setRevision((current) => current + 1);
      });
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Unknown parse failure.';
      setError(message);
    }
  };

  const handleCanvasDefinitionChange = (nextDefinition: DiagramDefinition) => {
    const nextDraft = stringifyDefinition(nextDefinition);

    setDraft(nextDraft);
    setError(null);
    setChangeOrigin('canvas');
    setDefinition(nextDefinition);
  };

  const persistBrowserDraft = (options: {
    displayName: string;
    filename?: string;
  }) => {
    if (!canPersistText) {
      return;
    }

    const existingDraftId = currentDocument.kind === 'draft' ? currentDocument.id : undefined;
    const nextFilename =
      options.filename ??
      (
        currentDocument.kind === 'draft'
          ? currentDocument.filename
          : getNextBrowserDraftFilename(browserDrafts, {
              prefix: options.displayName,
            })
      );
    const { drafts: nextDrafts, savedDraftId } = upsertBrowserDraft({
      displayName: options.displayName,
      existingId: existingDraftId,
      filename: nextFilename,
      previousDrafts: browserDrafts,
      source: draft,
    });
    const savedDraft = nextDrafts.find((entry) => entry.id === savedDraftId);

    writeBrowserDrafts(nextDrafts);
    setBrowserDrafts(nextDrafts);
    setSelectedDocumentId(savedDraftId);
    setBaselineSource(draft);
    setChangeOrigin(null);
    setDraftNamingOpen(false);
    setPendingNavigation(null);
    showSuccessToast(
      existingDraftId
        ? `Saved ${savedDraft?.displayName ?? options.displayName} to browser storage.`
        : `Created ${savedDraft?.displayName ?? options.displayName} in browser storage.`,
    );
  };

  const handleSaveBrowserDraft = () => {
    if (!canPersistText) {
      return;
    }

    if (currentDocument.kind === 'draft') {
      persistBrowserDraft({
        displayName: currentDocument.displayName,
        filename: currentDocument.filename,
      });
      return;
    }

    setPendingDraftName(getInitialDraftDisplayName(currentDocument));
    setDraftNamingOpen(true);
  };

  const handleConfirmDraftNaming = () => {
    const displayName = pendingDraftName.trim();

    if (!displayName) {
      return;
    }

    persistBrowserDraft({
      displayName,
      filename: getNextBrowserDraftFilename(browserDrafts, {
        prefix: displayName,
      }),
    });
  };

  const handleToggleDraftSelection = (draftId: string) => {
    setSelectedDraftIds((current) =>
      current.includes(draftId)
        ? current.filter((entry) => entry !== draftId)
        : [...current, draftId],
    );
  };

  const handleDeleteDrafts = (draftIds: string[]) => {
    if (draftIds.length === 0) {
      return;
    }

    const removingCurrentDraft =
      currentDocument.kind === 'draft' && draftIds.includes(currentDocument.id);

    if (removingCurrentDraft && isDirty) {
      showErrorToast('Save or discard changes before removing the current draft.');
      return;
    }

    const nextDrafts = browserDrafts.filter((draftEntry) => !draftIds.includes(draftEntry.id));
    const nextDraftDocuments = toBrowserDraftDocuments(nextDrafts);
    const fallbackDocument =
      nextDraftDocuments[0] ??
      connectedProjects.flatMap((project) => project.files)[0] ??
      bundledWorkspaceExampleFiles[0]!;

    writeBrowserDrafts(nextDrafts);
    setBrowserDrafts(nextDrafts);
    setSelectedDraftIds((current) => current.filter((draftId) => !draftIds.includes(draftId)));

    if (removingCurrentDraft) {
      applyDocumentState(fallbackDocument, currentView);
    }

    showSuccessToast(
      draftIds.length === 1 ? 'Removed draft.' : `Removed ${draftIds.length} drafts.`,
    );
  };

  const ensureWritableDirectory = async (
    directoryHandle: FileSystemDirectoryHandle,
  ) => {
    if (await ensureDirectoryWritePermission(directoryHandle)) {
      return;
    }

    throw new DOMException(
      'Write permission was not granted for this folder.',
      'NotAllowedError',
    );
  };

  const updateSavedWorkspaceState = (options: {
    document: WorkspaceExampleFile;
    projectId?: string;
    source: string;
  }) => {
    const savedMetadata = parseDiagramFileMetadata(options.source);

    if (options.projectId) {
      setConnectedProjects((current) =>
        current.map((project) => {
          if (project.id !== options.projectId) {
            return project;
          }

          return {
            ...project,
            files: project.files.map((file) =>
              file.id === options.document.id
                ? {
                    ...file,
                    label: savedMetadata?.name ?? file.filename,
                    source: options.source,
                  }
                : file,
            ),
          };
        }),
      );
    } else {
      setLibraryWorkspaceFiles((current) =>
        current.map((file) =>
          file.id === options.document.id
            ? {
                ...file,
                label: savedMetadata?.name ?? file.filename,
                source: options.source,
              }
            : file,
        ),
      );
    }

    setBaselineSource(options.source);
    setChangeOrigin(null);
    setPendingNavigation(null);
  };

  const reconnectProjectForSave = async (
    project: ConnectedProject,
    requiredRelativePath: string,
  ) => {
    if (!supportsDirectoryPicker()) {
      throw new Error('This browser does not support folder access.');
    }

    const directoryHandle = await pickExamplesDirectory();
    const directory = await readExamplesDirectory(directoryHandle);

    if (!directory.files.some((file) => file.relativePath === requiredRelativePath)) {
      throw new DOMException(
        `Choose the ${project.name} folder containing ${requiredRelativePath}.`,
        'NotFoundError',
      );
    }

    const nextProject: ConnectedProject = {
      ...project,
      files: toConnectedProjectFiles(project, directory.files),
      handle: directoryHandle,
      tokens: parseProjectTheme(directoryHandle.name, directory.themeSource),
    };

    setConnectedProjects((current) =>
      current.map((entry) => (entry.id === project.id ? nextProject : entry)),
    );
    setActiveProjectId(project.id);
    void storeDirectoryHandle(
      projectDirectoryHandleStorageKey(project.id),
      directoryHandle,
    );

    return nextProject;
  };

  const connectLibrarySourceFolder = async (document: WorkspaceExampleFile) => {
    if (!supportsDirectoryPicker()) {
      throw new Error('This browser does not support folder access.');
    }

    const directoryHandle = await pickExamplesDirectory();
    const relativePath = await resolveLibraryFilePath(
      directoryHandle,
      document.relativePath,
    );

    setLibrarySourceHandle(directoryHandle);
    void storeDirectoryHandle(LIBRARY_SOURCE_HANDLE_STORAGE_KEY, directoryHandle);

    return {
      handle: directoryHandle,
      relativePath,
    };
  };

  const findExistingLibrarySaveTarget = async (document: WorkspaceExampleFile) => {
    if (librarySourceHandle) {
      await ensureWritableDirectory(librarySourceHandle);

      return {
        handle: librarySourceHandle,
        relativePath: await resolveLibraryFilePath(
          librarySourceHandle,
          document.relativePath,
        ),
      };
    }

    const candidatePaths = getLibraryFilePathCandidates(document.relativePath);

    for (const project of connectedProjects) {
      if (!project.handle) {
        continue;
      }

      const relativePath = candidatePaths.find((candidatePath) =>
        project.files.some((file) => file.relativePath === candidatePath),
      );

      if (relativePath) {
        setLibrarySourceHandle(project.handle);
        void storeDirectoryHandle(LIBRARY_SOURCE_HANDLE_STORAGE_KEY, project.handle);
        return {
          handle: project.handle,
          relativePath,
        };
      }
    }

    return null;
  };

  const writeLibraryFile = async (
    target: {
      handle: FileSystemDirectoryHandle;
      relativePath: string;
    },
    source: string,
  ) => {
    await ensureWritableDirectory(target.handle);
    await writeExampleFile(target.handle, target.relativePath, source);
  };

  const handleSaveLibraryFile = async (document: WorkspaceExampleFile) => {
    let target: {
      handle: FileSystemDirectoryHandle;
      relativePath: string;
    } | null = null;

    try {
      target = await findExistingLibrarySaveTarget(document);
    } catch (caught) {
      if (!isRecoverableFileSystemError(caught)) {
        throw caught;
      }
    }

    if (!target) {
      target = await connectLibrarySourceFolder(document);
    }

    try {
      await writeLibraryFile(target, draft);
    } catch (caught) {
      if (!isRecoverableFileSystemError(caught)) {
        throw caught;
      }

      const reconnectedTarget = await connectLibrarySourceFolder(document);
      await writeLibraryFile(reconnectedTarget, draft);
    }

    updateSavedWorkspaceState({
      document,
      source: draft,
    });
    showSuccessToast(`Saved ${document.relativePath} to Library.`);
  };

  const writeConnectedProjectFile = async (
    project: ConnectedProject,
    document: WorkspaceExampleFile,
    source: string,
  ) => {
    if (!project.handle) {
      throw new DOMException(
        `Reconnect ${project.name} to save ${document.relativePath}.`,
        'NotAllowedError',
      );
    }

    await ensureWritableDirectory(project.handle);
    await writeExampleFile(project.handle, document.relativePath, source);
  };

  const handleSaveProjectFile = async (
    project: ConnectedProject,
    document: WorkspaceExampleFile,
  ) => {
    let projectForSave = project;

    if (!projectForSave.handle) {
      projectForSave = await reconnectProjectForSave(
        projectForSave,
        document.relativePath,
      );
    }

    try {
      await writeConnectedProjectFile(projectForSave, document, draft);
    } catch (caught) {
      if (!isRecoverableFileSystemError(caught)) {
        throw caught;
      }

      projectForSave = await reconnectProjectForSave(project, document.relativePath);
      await writeConnectedProjectFile(projectForSave, document, draft);
    }

    updateSavedWorkspaceState({
      document,
      projectId: project.id,
      source: draft,
    });
    showSuccessToast(`Saved ${document.relativePath} to ${project.name}.`);
  };

  const handleSave = async () => {
    if (!canSaveToDisk || currentDocument.kind !== 'workspace') {
      return;
    }

    try {
      if (currentDocument.sourceKind === 'bundled') {
        await handleSaveLibraryFile(currentDocument);
        return;
      }

      if (!currentConnectedProject) {
        showErrorToast('Reconnect the project folder before saving.');
        return;
      }

      await handleSaveProjectFile(currentConnectedProject, currentDocument);
    } catch (caught) {
      if (isFilePickerAbort(caught)) {
        return;
      }

      const message =
        caught instanceof Error || caught instanceof DOMException
          ? caught.message
          : 'Unable to save the diagram file.';
      showErrorToast(message);
    }
  };

  const handleExportImage = async (format: 'png' | 'jpeg') => {
    if (!canExportImage || !previewRef.current) {
      return;
    }

    try {
      const exportNode = previewRef.current;
      const { toJpeg, toPng } = await import('html-to-image');
      const baseName = sanitizeFilename(getDocumentFilename(currentDocument), 'diagram');
      const dataUrl =
        format === 'png'
          ? await toPng(exportNode, {
              cacheBust: true,
              filter: shouldIncludeExportNode,
              pixelRatio: 2,
            })
          : await toJpeg(exportNode, {
              cacheBust: true,
              filter: shouldIncludeExportNode,
              pixelRatio: 2,
              quality: 0.96,
            });

      downloadDataUrl(dataUrl, `${baseName}.${format}`);
      showSuccessToast(`Exported ${baseName}.${format} to your browser downloads.`);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Unable to export the diagram image.';
      setFatalError({ title: 'Export failed', detail: message, recoverable: true });
    }
  };

  const handleExportSvg = async () => {
    if (!canExportImage || !previewRef.current) return;
    try {
      const { toSvg } = await import('html-to-image');
      const baseName = sanitizeFilename(getDocumentFilename(currentDocument), 'diagram');
      const svgString = await toSvg(previewRef.current, {
        cacheBust: true,
        filter: shouldIncludeExportNode,
        pixelRatio: 2,
      });
      downloadSvgFile(svgString, `${baseName}.svg`);
      showSuccessToast(`Exported ${baseName}.svg to your browser downloads.`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to export the diagram as SVG.';
      setFatalError({ title: 'SVG export failed', detail: message, recoverable: true });
    }
  };

  const handleConnectProjectFolder = async () => {
    if (!supportsDirectoryPicker()) {
      showErrorToast(
        'This browser does not support folder access. Use local file save or browser drafts instead.',
      );
      return;
    }

    try {
      const directoryHandle = await pickExamplesDirectory();
      const directory = await readExamplesDirectory(directoryHandle);
      const existingProject = await findConnectedProjectByHandle(
        connectedProjects,
        directoryHandle,
      );

      if (existingProject) {
        const nextFiles = toConnectedProjectFiles(existingProject, directory.files);
        const nextTokens = parseProjectTheme(directoryHandle.name, directory.themeSource);
        setConnectedProjects((current) =>
          current.map((project) => {
            return project.id === existingProject.id
              ? {
                  ...project,
                  files: nextFiles,
                  handle: directoryHandle,
                  name: directoryHandle.name,
                  tokens: nextTokens,
                }
              : project;
          }),
        );
        setActiveProjectId(existingProject.id);
        void storeDirectoryHandle(
          projectDirectoryHandleStorageKey(existingProject.id),
          directoryHandle,
        );

        if (
          !isDirty &&
          currentDocument.kind === 'workspace' &&
          currentDocument.sourceKind === 'connected' &&
          currentDocument.projectId === existingProject.id
        ) {
          const replacement = nextFiles.find(
            (file) => file.relativePath === currentDocument.relativePath,
          );

          if (replacement) {
            loadDocument(replacement);
          }
        }

        showSuccessToast(`Refreshed connected project: ${directoryHandle.name}.`);
        return;
      }

      const projectId = createConnectedProjectId(directoryHandle.name, connectedProjects);
      const nextProject: ConnectedProject = {
        files: toConnectedProjectFiles(
          {
            id: projectId,
            name: directoryHandle.name,
          },
          directory.files,
        ),
        handle: directoryHandle,
        id: projectId,
        name: directoryHandle.name,
        tokens: parseProjectTheme(directoryHandle.name, directory.themeSource),
      };

      setConnectedProjects((current) => [...current, nextProject]);
      setActiveProjectId((current) => current ?? projectId);
      void storeDirectoryHandle(
        projectDirectoryHandleStorageKey(projectId),
        directoryHandle,
      );
      showSuccessToast(`Connected project: ${directoryHandle.name}.`);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') {
        return;
      }

      const message =
        caught instanceof Error ? caught.message : 'Unable to connect the project folder.';
      showErrorToast(message);
    }
  };

  const handleRemoveConnectedProject = (projectId: string) => {
    const project = connectedProjects.find((entry) => entry.id === projectId);

    if (!project) {
      return;
    }

    const removingCurrentProjectDocument =
      currentDocument.kind === 'workspace' &&
      currentDocument.sourceKind === 'connected' &&
      currentDocument.projectId === projectId;

    if (removingCurrentProjectDocument && isDirty) {
      showErrorToast('Save or discard changes before removing the current project.');
      return;
    }

    const remainingProjects = connectedProjects.filter((entry) => entry.id !== projectId);
    const fallbackDocument =
      remainingProjects.flatMap((entry) => entry.files)[0] ??
      browserDraftDocuments[0] ??
      bundledWorkspaceExampleFiles[0]!;

    setConnectedProjects(remainingProjects);
    setActiveProjectId((current) => (current === projectId ? remainingProjects[0]?.id ?? null : current));
    void deleteDirectoryHandle(projectDirectoryHandleStorageKey(projectId));

    if (removingCurrentProjectDocument) {
      applyDocumentState(fallbackDocument, currentView);
    }

    showSuccessToast(`Removed project: ${project.name}.`);
  };

  const handleRefreshConnectedProject = async (projectId: string) => {
    const project = connectedProjects.find((entry) => entry.id === projectId);

    if (!project?.handle) {
      return;
    }

    try {
      const directory = await readExamplesDirectory(project.handle);
      const nextFiles = toConnectedProjectFiles(project, directory.files);
      const nextTokens = parseProjectTheme(project.name, directory.themeSource);

      setConnectedProjects((current) =>
        current.map((entry) => {
          return entry.id === project.id
            ? { ...entry, files: nextFiles, tokens: nextTokens }
            : entry;
        }),
      );
      setActiveProjectId(project.id);
      void storeDirectoryHandle(
        projectDirectoryHandleStorageKey(project.id),
        project.handle,
      );

      if (
        !isDirty &&
        currentDocument.kind === 'workspace' &&
        currentDocument.sourceKind === 'connected' &&
        currentDocument.projectId === project.id
      ) {
        const replacement = nextFiles.find(
          (file) => file.relativePath === currentDocument.relativePath,
        );

        if (replacement) {
          loadDocument(replacement);
        } else if (nextFiles[0]) {
          loadDocument(nextFiles[0]);
        }
      }

      showSuccessToast(`Reloaded ${project.name}.`);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : `Unable to refresh ${project.name}.`;
      showErrorToast(message);
    }
  };

  const handleReconnectProject = async (projectId: string) => {
    const project = connectedProjects.find((entry) => entry.id === projectId);

    if (!project || project.handle) {
      return;
    }

    if (!supportsDirectoryPicker()) {
      showErrorToast('This browser does not support folder access.');
      return;
    }

    try {
      const directoryHandle = await pickExamplesDirectory();
      const directory = await readExamplesDirectory(directoryHandle);
      const nextFiles = toConnectedProjectFiles(project, directory.files);
      const nextTokens = parseProjectTheme(directoryHandle.name, directory.themeSource);

      setConnectedProjects((current) =>
        current.map((entry) => {
          return entry.id === project.id
            ? { ...entry, files: nextFiles, handle: directoryHandle, tokens: nextTokens }
            : entry;
        }),
      );
      void storeDirectoryHandle(
        projectDirectoryHandleStorageKey(project.id),
        directoryHandle,
      );

      if (
        !isDirty &&
        currentDocument.kind === 'workspace' &&
        currentDocument.sourceKind === 'connected' &&
        currentDocument.projectId === project.id
      ) {
        const replacement = nextFiles.find(
          (file) => file.relativePath === currentDocument.relativePath,
        );

        if (replacement) {
          loadDocument(replacement);
        }
      }

      showSuccessToast(`Reconnected ${project.name}.`);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') {
        return;
      }

      const message =
        caught instanceof Error ? caught.message : 'Unable to reconnect the project folder.';
      showErrorToast(message);
    }
  };

  const dirtyActionLabel =
    currentDocument.kind === 'draft'
      ? 'Save Draft'
      : currentDocument.kind === 'workspace'
        ? 'Save or Clone'
        : 'Clone';
  const canvasStatusNotice =
    isDirty && currentView === 'document'
      ? changeOrigin === 'canvas' && supportsManualCorrections(definition)
        ? `Visual edits sync to JSON. ${dirtyActionLabel} when ready.`
        : 'Unsaved JSON changes.'
      : undefined;
  const headerPath =
    currentView === 'help' ? '' : describeDocument(currentDocument);
  const lastSlash = headerPath.lastIndexOf('/');
  const headerDirPath = lastSlash !== -1 ? headerPath.slice(0, lastSlash) : '';
  const headerFilename = lastSlash !== -1 ? headerPath.slice(lastSlash + 1) : headerPath;

  const handleCopyPath = useCallback(() => {
    navigator.clipboard.writeText(headerPath).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [headerPath]);
  const activeProjectDocumentSelected =
    currentView === 'document' &&
    currentDocument.kind === 'workspace' &&
    currentDocument.sourceKind === 'connected' &&
    currentDocument.projectId === activeProject?.id;

  return (
    <TooltipProvider>
      <SidebarProvider
        defaultOpen
        style={{ '--sidebar-width': `${sidebarWidth}px` } as CSSProperties}
      >
        <AppSidebar
          activeProject={activeProject}
          activeProjectDocumentSelected={activeProjectDocumentSelected}
          activeProjectId={activeProjectId}
          browserDraftDocuments={browserDraftDocuments}
          connectedProjects={connectedProjects}
          currentView={currentView}
          libraryWorkspaceFiles={libraryWorkspaceFiles}
          onConnectProjectFolder={handleConnectProjectFolder}
          onDeleteDrafts={handleDeleteDrafts}
          onDocumentSelect={handleDocumentSelect}
          onHelpSelect={handleHelpSelect}
          onRefreshConnectedProject={handleRefreshConnectedProject}
          onReconnectProject={handleReconnectProject}
          onRemoveConnectedProject={handleRemoveConnectedProject}
          onSaveBrowserDraft={handleSaveBrowserDraft}
          onToggleDraftSelection={handleToggleDraftSelection}
          selectedDocumentId={selectedDocumentId}
          selectedDraftIds={selectedDraftIds}
          setActiveProjectId={setActiveProjectId}
          setSelectedDraftIds={setSelectedDraftIds}
          setSidebarWidth={setSidebarWidth}
          sidebarMinimized={sidebarMinimized}
          sidebarWidth={sidebarWidth}
          onToggleSidebarMinimized={() => setSidebarMinimized((prev) => !prev)}
        />

        <SidebarInset className="bg-transparent">
          {currentView === 'help' ? (
            <HelpView />
          ) : (
            <>
              <div
                className="workspace-floating-toolbar absolute top-2 z-30 flex items-center justify-between gap-2 rounded-lg border border-border/70 px-2 py-1.5 shadow-lg"
                style={{
                  left: `${sidebarWidth + 64}px`,
                  width: `max(0px, min(680px, calc(100% - ${sidebarWidth + inspectorWidth + 96}px)))`,
                }}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 group/header-path">
                      <h1 className="flex min-w-0 items-center gap-1 text-base leading-none">
                        {headerDirPath ? (
                          <span className="truncate text-muted-foreground">{headerDirPath}/</span>
                        ) : null}
                        <span className="truncate font-semibold">{headerFilename}</span>
                      </h1>
                      <button
                        aria-label="Copy file path"
                        className="shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-accent group-hover/header-path:opacity-100"
                        onClick={handleCopyPath}
                        type="button"
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                    onClick={() => setDarkMode(!darkMode)}
                    size="icon-sm"
                    title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                    variant="outline"
                  >
                    {darkMode ? <Sun /> : <Moon />}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        aria-label="Export"
                        disabled={!canExportImage}
                        size="icon-sm"
                        title="Export"
                        variant="outline"
                      >
                        <MoreVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleExportImage('png')}>
                        <ImageDown />
                        Export PNG
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExportImage('jpeg')}>
                        <ImageDown />
                        Export JPEG
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { void handleExportSvg(); }}>
                        <ImageDown />
                        Export SVG
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {canCreateDraft || canSaveDraft ? (
                    <Button
                      aria-label={draftActionLabel}
                      disabled={!canPersistText}
                      onClick={handleSaveBrowserDraft}
                      size="icon-sm"
                      title={draftActionLabel}
                      variant="outline"
                    >
                      <Files />
                    </Button>
                  ) : null}
                  <Button
                    aria-label="Save"
                    disabled={!canSaveToDisk}
                    onClick={handleSave}
                    size="icon-sm"
                    title="Save"
                    variant="default"
                  >
                    <Save />
                  </Button>
                </div>
              </div>

              {error ? (
                <div className="absolute top-16 left-4 right-4 z-20">
                  <WorkspaceAlert title="Invalid JSON" variant="destructive">
                    Preview stays on the last valid diagram until the editor is fixed. {error}
                  </WorkspaceAlert>
                </div>
              ) : null}

              <main
                className="preview-panel absolute inset-0 overflow-hidden"
                data-testid="workspace-preview-pane"
                ref={previewRef}
                style={resolvedDiagramTheme.cssVariables as CSSProperties}
              >
                <DiagramCanvas
                  definition={definition}
                  gridColor={resolvedDiagramTheme.gridColor}
                  inspectorPortalTarget={inspectorTab === 'inspector' ? inspectorPortalTarget : null}
                  onDefinitionChange={handleCanvasDefinitionChange}
                  revision={revision}
                  statusNotice={canvasStatusNotice}
                  viewportToken="workspace"
                />
              </main>

              <div
                className="diagram-inspector-shell-wrap absolute right-2 top-2 bottom-2 z-20 flex transition-transform duration-200 ease-linear"
                data-collapsed={inspectorCollapsed ? 'true' : 'false'}
                style={{ '--diagram-inspector-width': `${inspectorWidth}px` } as CSSProperties}
              >
                {!inspectorCollapsed ? <ResizableInspectorRail onResize={setInspectorWidth} /> : null}
                <section
                  className="diagram-inspector-shell rounded-lg border border-border shadow-lg"
                  data-collapsed={inspectorCollapsed ? 'true' : 'false'}
                  data-testid="workspace-editor-pane"
                >
                  <div
                    className="diagram-inspector-shell__header cursor-pointer select-none"
                    onClick={toggleInspectorCollapsed}
                    onKeyDown={handleInspectorToggleKeyDown}
                    role="button"
                    tabIndex={0}
                    aria-label={inspectorCollapsed ? 'Expand inspector' : 'Collapse inspector'}
                    title={inspectorCollapsed ? 'Expand inspector' : 'Collapse inspector'}
                  >
                    <Button
                      aria-hidden
                      size="icon-sm"
                      tabIndex={-1}
                      variant="ghost"
                    >
                      <Menu />
                    </Button>
                    <h2 className="diagram-inspector-shell__title">Inspector</h2>
                  </div>

                  {!inspectorCollapsed ? (
                  <div className="diagram-inspector-shell__body">
                    <div
                      aria-label="Inspector tabs"
                      className="diagram-inspector-shell__tabs"
                      role="tablist"
                    >
                      <InspectorTabButton
                        active={inspectorTab === 'inspector'}
                        label="Inspector"
                        onClick={() => setInspectorTab('inspector')}
                      />
                      <InspectorTabButton
                        active={inspectorTab === 'json'}
                        label="JSON view"
                        onClick={() => setInspectorTab('json')}
                      />
                    </div>
                    {inspectorTab === 'inspector' ? (
                      <div
                        className="diagram-inspector-shell__panel diagram-inspector-shell__panel--inspector"
                      >
                        <div
                          className="diagram-inspector-shell__portal"
                          ref={setInspectorPortalTarget}
                        />
                      </div>
                    ) : (
                      <div className="diagram-inspector-shell__panel diagram-inspector-shell__panel--json">
                        <JsonEditorPane
                          className="min-h-0 flex-1"
                          invalid={Boolean(error)}
                          onChangeText={handleEditorChange}
                          value={draft}
                        />
                      </div>
                    )}
                  </div>
                  ) : null}
                </section>
              </div>
            </>
          )}
        </SidebarInset>
      </SidebarProvider>
      <DraftNamingDialog
        draftNamingOpen={draftNamingOpen}
        onConfirm={handleConfirmDraftNaming}
        pendingDraftName={pendingDraftName}
        setDraftNamingOpen={setDraftNamingOpen}
        setPendingDraftName={setPendingDraftName}
      />
      <DiscardNavigationDialog
        currentDocument={currentDocument}
        onDiscardAndContinue={handleDiscardAndContinue}
        onStay={handleStayOnCurrentDocument}
        pendingNavigation={pendingNavigation}
      />
      <FatalErrorDialog
        fatalError={fatalError}
        setFatalError={setFatalError}
      />
      <Toaster
        closeButton
        position="bottom-center"
        richColors
        theme={darkMode ? 'dark' : 'light'}
      />
    </TooltipProvider>
  );
}
