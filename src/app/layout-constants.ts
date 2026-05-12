export const SIDEBAR_WIDTH_STORAGE_KEY = 'diagram-engine/sidebar-width';
export const DEFAULT_SIDEBAR_WIDTH = 320;
export const MIN_SIDEBAR_WIDTH = 272;
export const MAX_SIDEBAR_WIDTH = 448;

export const INSPECTOR_WIDTH_STORAGE_KEY = 'diagram-engine/inspector-width';
export const DEFAULT_INSPECTOR_WIDTH = 372;
export const MIN_INSPECTOR_WIDTH = 320;
export const MAX_INSPECTOR_WIDTH = 560;

export function clampSidebarWidth(width: number) {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));
}

export function clampInspectorWidth(width: number) {
  return Math.min(MAX_INSPECTOR_WIDTH, Math.max(MIN_INSPECTOR_WIDTH, width));
}
