import { PROJECT_DIAGRAM_THEME_FILENAME } from '../engine/diagram-tokens';
import { parseDiagramFileMetadata, type DiagramDefinition } from '../engine/schema';

export interface FileSystemExampleFile {
  diagramName?: string;
  diagramType: DiagramDefinition['type'];
  filename: string;
  relativePath: string;
  segments: string[];
  source: string;
}

export interface FileSystemExamplesDirectory {
  files: FileSystemExampleFile[];
  themeSource: string | null;
}

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: 'read' | 'readwrite';
  }) => Promise<FileSystemDirectoryHandle>;
};

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options?: {
    excludeAcceptAllOption?: boolean;
    suggestedName?: string;
    types?: Array<{
      accept: Record<string, string[]>;
      description?: string;
    }>;
  }) => Promise<FileSystemFileHandle>;
};

type FileSystemPermissionDescriptor = {
  mode?: 'read' | 'readwrite';
};

type PermissionAwareDirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission?: (
    descriptor?: FileSystemPermissionDescriptor,
  ) => Promise<PermissionState>;
  requestPermission?: (
    descriptor?: FileSystemPermissionDescriptor,
  ) => Promise<PermissionState>;
};

function sortFiles(left: FileSystemExampleFile, right: FileSystemExampleFile) {
  return left.relativePath.localeCompare(right.relativePath);
}

export function supportsDirectoryPicker() {
  const windowWithDirectoryPicker = window as DirectoryPickerWindow;

  return (
    typeof window !== 'undefined' &&
    'showDirectoryPicker' in windowWithDirectoryPicker &&
    typeof windowWithDirectoryPicker.showDirectoryPicker === 'function'
  );
}

export function supportsSaveFilePicker() {
  const windowWithSavePicker = window as SaveFilePickerWindow;

  return (
    typeof window !== 'undefined' &&
    'showSaveFilePicker' in windowWithSavePicker &&
    typeof windowWithSavePicker.showSaveFilePicker === 'function'
  );
}

const EXCLUDED_DIRECTORY_NAMES = new Set([
  'dist',
  'build',
  'node_modules',
  '.next',
  '.vite',
  'out',
  'coverage',
]);

const FILE_HANDLE_DATABASE_NAME = 'diagram-engine/file-system-handles';
const FILE_HANDLE_STORE_NAME = 'handles';
const FILE_HANDLE_DATABASE_VERSION = 1;

function supportsFileHandleStorage() {
  return typeof indexedDB !== 'undefined';
}

function openFileHandleDatabase() {
  if (!supportsFileHandleStorage()) {
    return Promise.resolve(null);
  }

  return new Promise<IDBDatabase | null>((resolve, reject) => {
    const request = indexedDB.open(
      FILE_HANDLE_DATABASE_NAME,
      FILE_HANDLE_DATABASE_VERSION,
    );

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(FILE_HANDLE_STORE_NAME)) {
        database.createObjectStore(FILE_HANDLE_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open file handle storage.'));
  });
}

async function withFileHandleStore<T>(
  mode: IDBTransactionMode,
  action: (
    store: IDBObjectStore,
    setResult: (value: T | null) => void,
  ) => void,
) {
  const database = await openFileHandleDatabase();

  if (!database) {
    return null;
  }

  return new Promise<T | null>((resolve, reject) => {
    let result: T | null = null;
    let settled = false;

    const finish = (value: T | null) => {
      if (settled) {
        return;
      }

      settled = true;
      database.close();
      resolve(value);
    };

    const fail = (error: unknown) => {
      if (settled) {
        return;
      }

      settled = true;
      database.close();
      reject(error);
    };

    try {
      const transaction = database.transaction(FILE_HANDLE_STORE_NAME, mode);
      const store = transaction.objectStore(FILE_HANDLE_STORE_NAME);

      transaction.oncomplete = () => finish(result);
      transaction.onabort = () => fail(transaction.error ?? new Error('File handle storage aborted.'));
      transaction.onerror = () => fail(transaction.error ?? new Error('File handle storage failed.'));

      action(store, (value) => {
        result = value;
      });
    } catch (caught) {
      fail(caught);
    }
  });
}

export async function storeDirectoryHandle(
  key: string,
  directoryHandle: FileSystemDirectoryHandle,
) {
  try {
    await withFileHandleStore('readwrite', (store) => {
      store.put(directoryHandle, key);
    });
  } catch {
    // Some browsers expose folder picking without allowing handles in IndexedDB.
  }
}

export async function loadDirectoryHandle(key: string) {
  try {
    const handle = await withFileHandleStore<FileSystemDirectoryHandle>(
      'readonly',
      (store, setResult) => {
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result as unknown;
          setResult(
            typeof result === 'object' &&
              result !== null &&
              (result as FileSystemDirectoryHandle).kind === 'directory'
              ? (result as FileSystemDirectoryHandle)
              : null,
          );
        };
      },
    );

    return handle;
  } catch {
    return null;
  }
}

export async function deleteDirectoryHandle(key: string) {
  try {
    await withFileHandleStore('readwrite', (store) => {
      store.delete(key);
    });
  } catch {
    // Ignore cleanup failures; stale handles will be ignored on future loads.
  }
}

async function listJsonFilesRecursive(
  directoryHandle: FileSystemDirectoryHandle,
  prefix = '',
): Promise<FileSystemExamplesDirectory> {
  const files: FileSystemExampleFile[] = [];
  let themeSource: string | null = null;

  for await (const entry of directoryHandle.values()) {
    if (entry.kind === 'directory') {
      if (EXCLUDED_DIRECTORY_NAMES.has(entry.name)) {
        continue;
      }

      const nestedFiles = await listJsonFilesRecursive(
        entry,
        `${prefix}${entry.name}/`,
      );
      files.push(...nestedFiles.files);
      continue;
    }

    if (!entry.name.endsWith('.json')) {
      continue;
    }

    const relativePath = `${prefix}${entry.name}`;
    const source = await (await entry.getFile()).text();

    if (prefix === '' && entry.name === PROJECT_DIAGRAM_THEME_FILENAME) {
      themeSource = source;
      continue;
    }

    const metadata = parseDiagramFileMetadata(source);

    if (!metadata) {
      continue;
    }

    files.push({
      diagramName: metadata.name,
      diagramType: metadata.type,
      filename: entry.name,
      relativePath,
      segments: relativePath.split('/'),
      source,
    });
  }

  return {
    files: files.sort(sortFiles),
    themeSource,
  };
}

export async function pickExamplesDirectory() {
  const windowWithDirectoryPicker = window as unknown as Required<DirectoryPickerWindow>;

  return windowWithDirectoryPicker.showDirectoryPicker({
    id: 'diagram-engine-examples',
    mode: 'readwrite',
  });
}

export async function saveTextFileToDisk(options: {
  filename: string;
  text: string;
}) {
  const windowWithSavePicker = window as unknown as Required<SaveFilePickerWindow>;
  const fileHandle = await windowWithSavePicker.showSaveFilePicker({
    excludeAcceptAllOption: false,
    suggestedName: options.filename,
    types: [
      {
        description: 'JSON file',
        accept: {
          'application/json': ['.json'],
        },
      },
    ],
  });
  const writable = await fileHandle.createWritable();
  await writable.write(options.text);
  await writable.close();
}

export async function ensureDirectoryWritePermission(
  directoryHandle: FileSystemDirectoryHandle,
) {
  const handle = directoryHandle as PermissionAwareDirectoryHandle;

  if (typeof handle.queryPermission !== 'function') {
    return true;
  }

  const descriptor = { mode: 'readwrite' } satisfies FileSystemPermissionDescriptor;
  const currentPermission = await handle.queryPermission(descriptor);

  if (currentPermission === 'granted') {
    return true;
  }

  if (currentPermission === 'denied') {
    return false;
  }

  if (typeof handle.requestPermission !== 'function') {
    return true;
  }

  return (await handle.requestPermission(descriptor)) === 'granted';
}

export function isFilePickerAbort(caught: unknown) {
  return caught instanceof DOMException && caught.name === 'AbortError';
}

export function isRecoverableFileSystemError(caught: unknown) {
  if (!(caught instanceof DOMException)) {
    return false;
  }

  return [
    'InvalidModificationError',
    'InvalidStateError',
    'NoModificationAllowedError',
    'NotAllowedError',
    'NotFoundError',
    'NotReadableError',
    'SecurityError',
  ].includes(caught.name);
}

export async function readExamplesDirectory(
  directoryHandle: FileSystemDirectoryHandle,
) {
  return listJsonFilesRecursive(directoryHandle);
}

export async function readExampleFile(
  directoryHandle: FileSystemDirectoryHandle,
  relativePath: string,
) {
  const fileHandle = await getFileHandleForPath(directoryHandle, relativePath);
  const file = await fileHandle.getFile();
  return file.text();
}

export async function writeExampleFile(
  directoryHandle: FileSystemDirectoryHandle,
  relativePath: string,
  source: string,
) {
  const fileHandle = await getFileHandleForPath(directoryHandle, relativePath, true);
  const writable = await fileHandle.createWritable();
  await writable.write(source);
  await writable.close();
}

export function getLibraryFilePathCandidates(relativePath: string) {
  const normalizedPath = relativePath.split('/').filter(Boolean).join('/');

  return Array.from(
    new Set([
      normalizedPath,
      `library/${normalizedPath}`,
      `src/data/library/${normalizedPath}`,
    ]),
  );
}

export async function resolveLibraryFilePath(
  directoryHandle: FileSystemDirectoryHandle,
  relativePath: string,
) {
  for (const candidatePath of getLibraryFilePathCandidates(relativePath)) {
    try {
      await getFileHandleForPath(directoryHandle, candidatePath);
      return candidatePath;
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'NotFoundError') {
        continue;
      }

      throw caught;
    }
  }

  throw new DOMException(
    `Choose the repository root, src/data, or src/data/library folder so ${relativePath} can be saved.`,
    'NotFoundError',
  );
}

async function getFileHandleForPath(
  directoryHandle: FileSystemDirectoryHandle,
  relativePath: string,
  create = false,
) {
  const segments = relativePath.split('/').filter(Boolean);

  if (segments.length === 0) {
    throw new Error('Expected a relative JSON file path.');
  }

  let currentDirectory = directoryHandle;

  for (const segment of segments.slice(0, -1)) {
    currentDirectory = await currentDirectory.getDirectoryHandle(segment, {
      create,
    });
  }

  return currentDirectory.getFileHandle(segments[segments.length - 1]!, {
    create,
  });
}
