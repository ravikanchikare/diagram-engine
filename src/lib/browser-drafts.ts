import type { BrowserDraftDocument } from '@/data/types';

function createBrowserDraftDocument(draft: {
  displayName?: string;
  filename: string;
  id: string;
  source: string;
  updatedAt: string;
}): BrowserDraftDocument {
  const displayName = draft.displayName?.trim() || draft.filename.replace(/\.json$/i, '');

  return {
    displayName,
    id: draft.id,
    kind: 'draft',
    filename: draft.filename,
    label: displayName,
    source: draft.source,
    updatedAt: draft.updatedAt,
  };
}

export interface StoredBrowserDraft {
  displayName: string;
  id: string;
  filename: string;
  source: string;
  updatedAt: string;
}

export const BROWSER_DRAFTS_STORAGE_KEY = 'diagram-engine/browser-drafts';

function normalizeFilename(filename: string) {
  const trimmed = filename.trim();
  const safeStem = trimmed
    .replace(/\.json$/i, '')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${safeStem || 'draft'}.json`;
}

function normalizeDisplayName(displayName: string, filename: string) {
  return displayName.trim() || filename.replace(/\.json$/i, '') || 'Draft';
}

function sortDrafts(left: StoredBrowserDraft, right: StoredBrowserDraft) {
  return right.updatedAt.localeCompare(left.updatedAt);
}

function createUniqueFilename(
  filename: string,
  previousDrafts: StoredBrowserDraft[],
  ignoreDraftId?: string,
) {
  const normalizedFilename = normalizeFilename(filename);
  const [stem, extension = 'json'] = normalizedFilename.split(/\.([^.]+)$/);
  let candidate = normalizedFilename;
  let counter = 2;

  while (
    previousDrafts.some((draft) => {
      return draft.id !== ignoreDraftId && draft.filename === candidate;
    })
  ) {
    candidate = `${stem}-${counter}.${extension}`;
    counter += 1;
  }

  return candidate;
}

export function readBrowserDrafts() {
  if (typeof window === 'undefined') {
    return [] as StoredBrowserDraft[];
  }

  const rawValue = window.localStorage.getItem(BROWSER_DRAFTS_STORAGE_KEY);

  if (!rawValue) {
    return [] as StoredBrowserDraft[];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsed)) {
      return [] as StoredBrowserDraft[];
    }

    return parsed
      .filter((draft): draft is StoredBrowserDraft => {
        return (
          typeof draft === 'object' &&
          draft !== null &&
          typeof draft.id === 'string' &&
          (draft.displayName === undefined || typeof draft.displayName === 'string') &&
          typeof draft.filename === 'string' &&
          typeof draft.source === 'string' &&
          typeof draft.updatedAt === 'string'
        );
      })
      .map((draft) => ({
        ...draft,
        filename: normalizeFilename(draft.filename),
        displayName: normalizeDisplayName(draft.displayName ?? '', draft.filename),
      }))
      .sort(sortDrafts);
  } catch {
    return [] as StoredBrowserDraft[];
  }
}

export function writeBrowserDrafts(drafts: StoredBrowserDraft[]) {
  window.localStorage.setItem(
    BROWSER_DRAFTS_STORAGE_KEY,
    JSON.stringify(drafts.sort(sortDrafts)),
  );
}

export function upsertBrowserDraft(options: {
  displayName: string;
  existingId?: string;
  filename: string;
  previousDrafts: StoredBrowserDraft[];
  source: string;
}) {
  const normalizedFilename = createUniqueFilename(
    options.filename,
    options.previousDrafts,
    options.existingId,
  );
  const updatedAt = new Date().toISOString();
  const displayName = normalizeDisplayName(options.displayName, normalizedFilename);

  if (options.existingId) {
    return {
      drafts: options.previousDrafts
      .map((draft) => {
        if (draft.id !== options.existingId) {
          return draft;
        }

        return {
          ...draft,
          displayName,
          filename: normalizedFilename,
          source: options.source,
          updatedAt,
        };
      })
      .sort(sortDrafts),
      savedDraftId: options.existingId,
    };
  }

  const nextDraft: StoredBrowserDraft = {
    displayName,
    id: `draft:${updatedAt}:${Math.random().toString(36).slice(2, 8)}`,
    filename: normalizedFilename,
    source: options.source,
    updatedAt,
  };

  return {
    drafts: [nextDraft, ...options.previousDrafts].sort(sortDrafts),
    savedDraftId: nextDraft.id,
  };
}

export function toBrowserDraftDocuments(drafts: StoredBrowserDraft[]) {
  return drafts
    .map<BrowserDraftDocument>((draft) => createBrowserDraftDocument(draft))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function getNextBrowserDraftFilename(
  previousDrafts: StoredBrowserDraft[],
  options?: {
    prefix?: string;
  },
) {
  const prefix = options?.prefix?.trim() || 'draft';
  let counter = 1;
  let candidate = normalizeFilename(`${prefix}_${counter}`);

  while (previousDrafts.some((draft) => normalizeFilename(draft.filename) === candidate)) {
    counter += 1;
    candidate = normalizeFilename(`${prefix}_${counter}`);
  }

  return candidate;
}
